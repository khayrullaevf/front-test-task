import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  DAY_MS,
  facet,
  formatNumber,
  normalizeSearch,
  parseNumber,
  toInputDate,
  type ColumnDef,
  type FilterValue,
  type NormRow,
} from '@/shared/lib/dataset';
import { Icon, Popover } from '@/shared/ui';
import { EMPTY_LABEL, sortLabels } from '../lib/describe';

interface Props {
  col: ColumnDef;
  anchor: HTMLElement;
  /** Shu ustundan tashqari barcha filtrlar qo'llangan qatorlar — ro'yxat va sonlar shundan (Excel kabi). */
  rows: NormRow[];
  value?: FilterValue;
  sortDir?: 'asc' | 'desc';
  onSort: (desc: boolean) => void;
  onApply: (f: FilterValue | undefined) => void;
  onClose: () => void;
}

const MAX_ITEMS = 500;

/**
 * Excel'dagi avtofiltr: tepada saralash, ostida tur bo'yicha filtr.
 * Uchala sahifada bitta komponent — shuning uchun filtrlar hamma joyda bir xil ishlaydi.
 */
export function FilterPopover({ col, anchor, rows, value, sortDir, onSort, onApply, onClose }: Props) {
  const [asc, desc] = sortLabels(col.type);
  const apply = (f: FilterValue | undefined) => {
    onApply(f);
    onClose();
  };

  let body: ReactNode;
  if (col.type === 'number') body = <RangeBody col={col} rows={rows} value={value} onApply={apply} onCancel={onClose} />;
  else if (col.type === 'date') body = <DatesBody col={col} value={value} onApply={apply} onCancel={onClose} />;
  else body = <ValuesBody col={col} rows={rows} value={value} onApply={apply} onCancel={onClose} />;

  return (
    <Popover anchor={anchor} onClose={onClose} label={`"${col.title}" ustuni filtri`} width={300}>
      <div className="fp-head">
        <span className="fp-title">{col.title}</span>
        {col.auto && <span className="tag-new">yangi maydon</span>}
      </div>
      <div className="fp-sort">
        <button className={sortDir === 'asc' ? 'is-active' : ''} onClick={() => (onSort(false), onClose())}>
          <Icon name="arrowUp" size={14} /> {asc}
        </button>
        <button className={sortDir === 'desc' ? 'is-active' : ''} onClick={() => (onSort(true), onClose())}>
          <Icon name="arrowDown" size={14} /> {desc}
        </button>
      </div>
      {body}
    </Popover>
  );
}

interface BodyProps {
  col: ColumnDef;
  value?: FilterValue;
  onApply: (f: FilterValue | undefined) => void;
  onCancel: () => void;
}

function Footer({ canApply, hasValue, onClear, onCancel }: { canApply: boolean; hasValue: boolean; onClear: () => void; onCancel: () => void }) {
  return (
    <div className="fp-foot">
      <button type="button" className="btn btn-ghost" onClick={onClear} disabled={!hasValue}>
        Filtrni olib tashlash
      </button>
      <span className="spacer" />
      <button type="button" className="btn" onClick={onCancel}>
        Bekor
      </button>
      <button type="submit" className="btn btn-primary" disabled={!canApply}>
        OK
      </button>
    </div>
  );
}

/* ---------------- Matn / ro'yxat / holat ustunlari: qiymatlar ro'yxati ---------------- */
function ValuesBody({ col, rows, value, onApply, onCancel }: BodyProps & { rows: NormRow[] }) {
  const items = useMemo(() => facet(rows, col), [rows, col]);
  const labelOf = (k: string, label: string) => (k === '' ? EMPTY_LABEL : label);

  const [search, setSearch] = useState(value?.type === 'contains' ? value.q : '');
  const [selected, setSelected] = useState<Set<string>>(() => {
    if (value?.type === 'values') return new Set(value.values);
    if (value?.type === 'contains') {
      const q = normalizeSearch(value.q);
      return new Set(items.filter((i) => normalizeSearch(i.label).includes(q)).map((i) => i.key));
    }
    return new Set(items.map((i) => i.key));
  });

  const q = normalizeSearch(search);
  const visible = q ? items.filter((i) => normalizeSearch(labelOf(i.key, i.label)).includes(q)) : items;
  const checkedVisible = visible.filter((i) => selected.has(i.key));
  const allChecked = visible.length > 0 && checkedVisible.length === visible.length;
  const someChecked = checkedVisible.length > 0 && !allChecked;

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });
  const toggleAll = () =>
    setSelected((s) => {
      const n = new Set(s);
      visible.forEach((i) => (allChecked ? n.delete(i.key) : n.add(i.key)));
      return n;
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q) {
      // Excel kabi: qidiruv bilan OK — faqat ko'rinib turgan belgilanganlar
      if (!checkedVisible.length) return;
      const plainText = checkedVisible.length === visible.length && !checkedVisible.some((i) => i.key === '');
      // Hammasi tanlangan bo'lsa — "o'z ichiga oladi" sifatida saqlaymiz: keyin qo'shilgan mos qiymatlar ham tushadi
      onApply(plainText ? { type: 'contains', q: search.trim() } : { type: 'values', values: checkedVisible.map((i) => i.key) });
      return;
    }
    const chosen = items.filter((i) => selected.has(i.key));
    if (!chosen.length) return;
    onApply(chosen.length === items.length ? undefined : { type: 'values', values: chosen.map((i) => i.key) });
  };

  return (
    <form onSubmit={submit}>
      <div className="fp-body">
        <div className="search search-sm">
          <Icon name="search" className="search-icon" size={14} />
          <input
            autoFocus
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qiymatlar ichidan qidirish"
            aria-label="Qiymatlar ichidan qidirish"
          />
        </div>
        <div className="fp-list" role="group" aria-label="Qiymatlar">
          <label className="fp-item fp-item-all">
            <input
              type="checkbox"
              checked={allChecked}
              ref={(el) => {
                if (el) el.indeterminate = someChecked;
              }}
              onChange={toggleAll}
            />
            <span className="fp-label">{q ? '(Natijalarning hammasi)' : '(Hammasini tanlash)'}</span>
            <span className="fp-count">{visible.reduce((s, i) => s + i.count, 0)}</span>
          </label>
          {visible.slice(0, MAX_ITEMS).map((i) => {
            const tone = col.options?.[i.key]?.tone;
            return (
              <label key={i.key} className={`fp-item${i.key === '' ? ' is-empty' : ''}`}>
                <input type="checkbox" checked={selected.has(i.key)} onChange={() => toggle(i.key)} />
                {tone && <span className={`dot tone-${tone}`} />}
                <span className="fp-label" title={labelOf(i.key, i.label)}>
                  {labelOf(i.key, i.label)}
                </span>
                <button
                  type="button"
                  className="fp-only"
                  onClick={(e) => {
                    e.preventDefault();
                    setSelected(new Set([i.key]));
                  }}
                  title="Faqat shu qiymatni tanlash"
                >
                  faqat
                </button>
                <span className="fp-count">{i.count}</span>
              </label>
            );
          })}
          {!visible.length && <div className="fp-none">Mos qiymat yo'q</div>}
          {visible.length > MAX_ITEMS && (
            <div className="fp-none">Yana {visible.length - MAX_ITEMS} ta — qidiruv bilan toraytiring</div>
          )}
        </div>
      </div>
      <Footer canApply={q ? checkedVisible.length > 0 : selected.size > 0} hasValue={!!value} onClear={() => onApply(undefined)} onCancel={onCancel} />
    </form>
  );
}

/* ---------------- Son ustunlari: oraliq ---------------- */
function RangeBody({ col, rows, value, onApply, onCancel }: BodyProps & { rows: NormRow[] }) {
  const stats = useMemo(() => {
    const nums = rows.map((r) => r.cells[col.id]?.value).filter((v): v is number => typeof v === 'number');
    return nums.length ? { min: Math.min(...nums), max: Math.max(...nums), count: nums.length } : null;
  }, [rows, col.id]);
  const d = col.digits ?? 2;
  const init: { min?: number; max?: number } = value?.type === 'range' ? value : {};
  const [min, setMin] = useState(init.min !== undefined ? formatNumber(init.min, d).replace(/\s/g, '') : '');
  const [max, setMax] = useState(init.max !== undefined ? formatNumber(init.max, d).replace(/\s/g, '') : '');

  const pMin = parseNumber(min);
  const pMax = parseNumber(max);
  const invalid = (min && pMin.value === null) || (max && pMax.value === null);
  const reversed = pMin.value !== null && pMax.value !== null && pMin.value > pMax.value;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (invalid || reversed) return;
    const f: FilterValue = { type: 'range', min: pMin.value ?? undefined, max: pMax.value ?? undefined };
    onApply(f.min === undefined && f.max === undefined ? undefined : f);
  };

  return (
    <form onSubmit={submit}>
      <div className="fp-body">
        <div className="fp-range">
          <label>
            <span>dan (≥)</span>
            <input autoFocus inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder={stats ? formatNumber(stats.min, d) : ''} />
          </label>
          <span className="fp-dash">—</span>
          <label>
            <span>gacha (≤)</span>
            <input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder={stats ? formatNumber(stats.max, d) : ''} />
          </label>
        </div>
        <div className={`fp-hint${invalid || reversed ? ' is-error' : ''}`}>
          {invalid
            ? 'Son kiriting (masalan, 12,5)'
            : reversed
              ? "Boshlang'ich qiymat oxirgisidan katta"
              : stats
                ? `Ma'lumotda: ${formatNumber(stats.min, d)} – ${formatNumber(stats.max, d)}${col.unit ? ' ' + col.unit : ''}. Bo'sh qiymatli qatorlar filtrda chiqmaydi.`
                : "Bu ustunda son qiymatlar yo'q"}
        </div>
      </div>
      <Footer canApply={!invalid && !reversed} hasValue={!!value} onClear={() => onApply(undefined)} onCancel={onCancel} />
    </form>
  );
}

/* ---------------- Sana ustunlari: davr + tezkor tanlovlar ---------------- */
function DatesBody({ value, onApply, onCancel }: BodyProps) {
  const init: { from?: string; to?: string } = value?.type === 'dates' ? value : {};
  const [from, setFrom] = useState(init.from ?? '');
  const [to, setTo] = useState(init.to ?? '');
  const now = Date.now();
  const today = toInputDate(now);
  const monthStart = toInputDate(new Date(new Date(now).getFullYear(), new Date(now).getMonth(), 1).getTime());
  const presets: [string, string, string][] = [
    ['Bugun', today, today],
    ['Oxirgi 7 kun', toInputDate(now - 6 * DAY_MS), today],
    ['Oxirgi 30 kun', toInputDate(now - 29 * DAY_MS), today],
    ['Shu oy', monthStart, today],
    ['Kelgusi 30 kun', today, toInputDate(now + 30 * DAY_MS)],
    ["O'tgan", '', toInputDate(now - DAY_MS)],
  ];
  const reversed = !!from && !!to && from > to;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (reversed) return;
    onApply(from || to ? { type: 'dates', from: from || undefined, to: to || undefined } : undefined);
  };

  return (
    <form onSubmit={submit}>
      <div className="fp-body">
        <div className="fp-presets">
          {presets.map(([label, f, t]) => (
            <button
              type="button"
              key={label}
              className={`chip-btn${from === f && to === t ? ' is-active' : ''}`}
              onClick={() => {
                setFrom(f);
                setTo(t);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="fp-range">
          <label>
            <span>dan</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <span className="fp-dash">—</span>
          <label>
            <span>gacha</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <div className={`fp-hint${reversed ? ' is-error' : ''}`}>
          {reversed ? "Boshlanish sanasi tugashidan keyin" : "Chegaradagi kunlar ham kiradi. Sanasi yo'q qatorlar filtrda chiqmaydi."}
        </div>
      </div>
      <Footer canApply={!reversed} hasValue={!!value} onClear={() => onApply(undefined)} onCancel={onCancel} />
    </form>
  );
}
