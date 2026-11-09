import { collectPaths, extractRecords, flatten, isPlainObject } from './extract';
import { formatDate, formatNumber, humanizePath } from './format';
import { normalizeSearch, parseBoolean, parseDate, parseNumber, toText } from './parse';
import type { Cell, ColType, ColumnDef, Dataset, FlatRow, NormRow, PageConfig, RawRow } from './types';

const isBlank = (v: unknown) =>
  v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

/** Noma'lum (konfiguratsiyada yo'q) maydon turini qiymatlar namunasi bo'yicha aniqlaydi. */
export function inferType(values: unknown[]): ColType {
  const vals = values.filter((v) => !isBlank(v));
  if (!vals.length) return 'text';
  if (vals.some(Array.isArray)) return 'array';
  if (vals.every((v) => typeof v === 'boolean')) return 'boolean';
  // "300000001" kabi ID/STIRlar son bo'lib qolmasligi uchun: kamida bitta haqiqiy number bo'lishi shart
  if (vals.some((v) => typeof v === 'number') && vals.every((v) => parseNumber(v).value !== null)) return 'number';
  if (vals.every((v) => typeof v === 'string' && v.length >= 8 && parseDate(v).value !== null)) return 'date';
  if (vals.every((v) => typeof v === 'string')) {
    const distinct = new Set(vals as string[]).size;
    if (distinct <= 12 && distinct <= Math.ceil(vals.length / 2)) return 'enum';
  }
  return 'text';
}

const emptyCell = (): Cell => ({ value: null, text: '', sortKey: null, filterKeys: [''], empty: true });

/** Xom qiymatni ustun turiga ko'ra Cell'ga aylantiradi. Hech qachon xato tashlamaydi va qiymatni yo'qotmaydi. */
export function makeCell(col: ColumnDef, v: unknown): Cell {
  if (isBlank(v) && col.type !== 'array') return emptyCell();

  switch (col.type) {
    case 'number': {
      const p = parseNumber(v);
      if (p.value === null) return { ...emptyCell(), text: toText(v), empty: false, filterKeys: [toText(v)], issue: p.issue };
      return {
        value: p.value,
        text: formatNumber(p.value, col.digits ?? 2),
        sortKey: [p.value],
        filterKeys: [String(p.value)],
        empty: false,
        issue: p.issue,
      };
    }
    case 'date': {
      const p = parseDate(v);
      if (p.value === null) return { ...emptyCell(), text: toText(v), empty: false, filterKeys: [toText(v)], issue: p.issue };
      return {
        value: p.value.ms,
        text: formatDate(p.value.ms, p.value.hasTime),
        sortKey: [p.value.ms],
        filterKeys: [],
        empty: false,
        issue: p.issue,
        hasTime: p.value.hasTime,
      };
    }
    case 'boolean': {
      const p = parseBoolean(v);
      if (p.value === null) return { ...emptyCell(), text: toText(v), empty: false, filterKeys: [toText(v)], issue: p.issue };
      return {
        value: p.value,
        text: p.value ? 'Ha' : "Yo'q",
        sortKey: [p.value ? 1 : 0],
        filterKeys: [String(p.value)],
        empty: false,
        issue: p.issue,
      };
    }
    case 'enum': {
      const s = isPlainObject(v) || Array.isArray(v) ? toText(v) : String(v);
      const opt = col.options?.[s];
      return {
        value: s,
        text: opt?.label ?? s,
        sortKey: [opt?.order ?? 999, opt?.label ?? s],
        filterKeys: [s],
        empty: false,
        issue: col.strict && col.options && !opt ? `Noma'lum qiymat: "${s}"` : undefined,
      };
    }
    case 'array': {
      if (v === null || v === undefined) return { ...emptyCell(), value: [] };
      const arr = Array.isArray(v) ? v : [v];
      const keys = arr.map((x) => (isPlainObject(x) || Array.isArray(x) ? toText(x) : String(x))).filter((x) => x !== '');
      const labels = keys.map((k) => col.options?.[k]?.label ?? k);
      return {
        value: keys,
        text: labels.join(', '),
        sortKey: keys.length ? [keys.length, labels.join(', ')] : null,
        filterKeys: keys.length ? keys : [''],
        empty: keys.length === 0,
        issue: Array.isArray(v) ? undefined : `Ro'yxat kutilgan edi: ${JSON.stringify(v)}`,
      };
    }
    default: {
      const text = toText(v);
      return {
        value: text,
        text,
        sortKey: [text],
        filterKeys: [text],
        empty: text === '',
        issue: isPlainObject(v) || Array.isArray(v) ? 'Matn kutilgan edi, murakkab qiymat keldi' : undefined,
      };
    }
  }
}

function readValue(col: ColumnDef, raw: RawRow, flat: FlatRow): unknown {
  if (col.get) return col.get(raw, flat);
  if (col.path === undefined) return undefined;
  if (col.path in flat) return flat[col.path];
  // Yo'l obyektga ishora qilsa (masalan, "vehicle" butunlay), uning ichidagilarni yig'ib beramiz
  const prefix = col.path + '.';
  const nested = Object.keys(flat).filter((k) => k.startsWith(prefix));
  if (nested.length) return Object.fromEntries(nested.map((k) => [k.slice(prefix.length), flat[k]]));
  return undefined;
}

function columnPresent(col: ColumnDef, flats: FlatRow[]): boolean {
  const paths = [...(col.path ? [col.path] : []), ...(col.uses ?? [])];
  if (!paths.length) return true; // faqat hisoblanadigan ustun
  return flats.some((f) => paths.some((p) => p in f || Object.keys(f).some((k) => k.startsWith(p + '.'))));
}

export class DatasetError extends Error {}

export function buildDataset(json: unknown, config: PageConfig): Dataset {
  const ex = extractRecords(json, config.recordsPath);
  if (!ex) throw new DatasetError("Faylda yozuvlar ro'yxati (massiv) topilmadi");

  const flats = ex.records.map((r) => flatten(r));

  // 1. Ma'lum ustunlar + ma'lumotda yo'qligini belgilash
  const known: ColumnDef[] = config.columns.map((c) => ({ ...c, missing: !columnPresent(c, flats) }));

  // 2. Konfiguratsiyada yo'q yo'llar → avtomatik ustunlar (ma'lumot hech qachon yashirin qolib ketmaydi)
  const consumed = new Set<string>(config.ignore ?? []);
  for (const c of known) {
    if (c.path) consumed.add(c.path);
    c.uses?.forEach((u) => consumed.add(u));
  }
  const isConsumed = (p: string) =>
    [...consumed].some((c) => p === c || p.startsWith(c + '.') || c.startsWith(p + '.'));
  const autoCols: ColumnDef[] = collectPaths(flats)
    .filter((p) => !isConsumed(p))
    .map((p) => ({
      id: `~${p}`,
      title: humanizePath(p),
      type: inferType(flats.map((f) => f[p])),
      path: p,
      auto: true,
      description: `Ma'lumotda topilgan yangi maydon: "${p}". Konfiguratsiyada tavsiflanmagan, avtomatik ko'rsatilmoqda.`,
    }));
  const columns = [...known, ...autoCols];

  // 3. Qatorlar
  const usedKeys = new Set<string>();
  const rows: NormRow[] = ex.records.map((raw, index) => {
    const flat = flats[index];
    const cells: Record<string, Cell> = {};
    const issues: NormRow['issues'] = [];
    const searchParts: string[] = [];
    for (const col of columns) {
      let cell: Cell;
      try {
        cell = makeCell(col, readValue(col, raw, flat));
        const extra = col.validate?.(cell, raw, flat);
        if (extra) cell.issue = cell.issue ? `${cell.issue}; ${extra}` : extra;
        if (col.sortKey) cell.sortKey = col.sortKey(cell, raw, flat);
      } catch (e) {
        cell = { ...emptyCell(), issue: `Qiymatni qayta ishlashda xato: ${(e as Error).message}` };
      }
      cells[col.id] = cell;
      if (cell.issue) issues.push({ col: col.id, msg: cell.issue });
      if (cell.text) searchParts.push(cell.text);
    }
    // Asl qiymatlar ham qidiruvga kiradi ("PENDING", "+998900000001", "2026-10-07")
    for (const v of Object.values(flat)) if (!isBlank(v)) searchParts.push(toText(v));

    let key = toText(flat[config.rowKey]) || `#${index + 1}`;
    if (usedKeys.has(key)) key = `${key}#${index + 1}`;
    usedKeys.add(key);

    return { key, index, raw, flat, cells, issues, search: normalizeSearch(searchParts.join(' ¦ ')) };
  });

  const declared = ex.meta.total ?? ex.meta.count;
  return {
    columns,
    rows,
    meta: {
      recordsPath: ex.path,
      pathFallback: ex.fallback,
      declaredTotal: typeof declared === 'number' ? declared : undefined,
      autoColumns: autoCols.map((c) => c.id),
      missingColumns: known.filter((c) => c.missing).map((c) => c.id),
      issueRows: rows.filter((r) => r.issues.length).length,
    },
  };
}
