import type { FlatRow, RawRow } from './types';

export const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export function getPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[part];
  }
  return cur;
}

export interface Extracted {
  records: RawRow[];
  path: string;
  fallback: boolean;
  /** Massiv yonidagi skalyar maydonlar (masalan, "total"). */
  meta: Record<string, unknown>;
}

function scoreArray(arr: unknown[]): number {
  return arr.filter(isPlainObject).length;
}

/**
 * JSON ichidan yozuvlar massivini topadi.
 * 1) Konfiguratsiyada ko'rsatilgan yo'l (masalan "data.licenses").
 * 2) Topilmasa — butun daraxtni aylanib, eng ko'p obyekt saqlagan massivni tanlaydi
 *    (teng bo'lsa — sayozrog'i). Shunday qilib backend `items` → `results` ga o'tsa ham jadval bo'sh qolmaydi.
 */
export function extractRecords(json: unknown, hint: string): Extracted | null {
  const hinted = getPath(json, hint);
  let path: string | null = Array.isArray(hinted) ? hint : null;
  let fallback = false;

  if (path === null) {
    let best: { path: string; score: number; depth: number } | null = null;
    const walk = (node: unknown, p: string, depth: number) => {
      if (depth > 6) return;
      if (Array.isArray(node)) {
        const score = scoreArray(node);
        if (score > 0 && (!best || score > best.score || (score === best.score && depth < best.depth))) {
          best = { path: p, score, depth };
        }
        return;
      }
      if (isPlainObject(node)) {
        for (const [k, v] of Object.entries(node)) walk(v, p ? `${p}.${k}` : k, depth + 1);
      }
    };
    walk(json, '', 0);
    if (!best) {
      // Obyektlar yo'q, lekin oddiy qiymatlar massivi bo'lishi mumkin
      if (Array.isArray(json) && json.length) path = '';
      else return null;
    } else {
      path = (best as { path: string }).path;
    }
    fallback = true;
  }

  const arr = getPath(json, path) as unknown[];
  const records = arr.map((el) => (isPlainObject(el) ? el : { value: el }));

  const parentPath = path.includes('.') ? path.slice(0, path.lastIndexOf('.')) : '';
  const parent = path ? getPath(json, parentPath) : undefined;
  const meta: Record<string, unknown> = {};
  if (isPlainObject(parent)) {
    for (const [k, v] of Object.entries(parent)) {
      if (v === null || typeof v !== 'object') meta[k] = v;
    }
  }
  return { records, path, fallback, meta };
}

/**
 * Obyektni nuqtali yo'llarga yoyadi. Massivlar bitta qiymat sifatida qoladi (teglar, rollar, fayllar).
 * { driver: { name: "A" } } → { "driver.name": "A" };  { driver: null } → { "driver": null }
 */
export function flatten(obj: unknown, prefix = '', out: FlatRow = {}): FlatRow {
  if (isPlainObject(obj)) {
    const keys = Object.keys(obj);
    if (keys.length === 0 && prefix) out[prefix] = null;
    for (const k of keys) flatten(obj[k], prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix) {
    out[prefix] = obj;
  }
  return out;
}

/**
 * Barcha qatorlardagi yo'llarni birinchi uchragan tartibda yig'adi.
 * Boshqa yo'lning prefiksi bo'lgan yo'l tashlanadi: bir qatorda driver=null, boshqasida driver.name bor —
 * "driver" alohida ustun emas.
 */
export function collectPaths(flats: FlatRow[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const f of flats) {
    for (const k of Object.keys(f)) {
      if (!seen.has(k)) {
        seen.add(k);
        order.push(k);
      }
    }
  }
  return order.filter((p) => !order.some((o) => o !== p && o.startsWith(p + '.')));
}
