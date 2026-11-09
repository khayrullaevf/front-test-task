import { normalizeSearch } from './parse';
import type { Cell, ColumnDef, NormRow, SortKey } from './types';

export type FilterValue =
  /** Excel'dagi belgilash ro'yxati: tanlangan qiymatlar. */
  | { type: 'values'; values: string[] }
  /** Excel'dagi "Qidirish" maydoni orqali: matnda shu bor. */
  | { type: 'contains'; q: string }
  | { type: 'range'; min?: number; max?: number }
  /** YYYY-MM-DD, ikkala chegara ham kiradi. */
  | { type: 'dates'; from?: string; to?: string };

export type Filters = Record<string, FilterValue>;
export interface SortSpec {
  id: string;
  desc: boolean;
}

export interface QueryState {
  q: string;
  filters: Filters;
  sort: SortSpec[];
  issuesOnly: boolean;
}

function dayBound(ymd: string, end: boolean): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return end ? d.getTime() + 86_400_000 - 1 : d.getTime();
}

export function isFilterActive(f: FilterValue | undefined): boolean {
  if (!f) return false;
  switch (f.type) {
    case 'values':
      return true;
    case 'contains':
      return f.q.trim() !== '';
    case 'range':
      return f.min !== undefined || f.max !== undefined;
    case 'dates':
      return !!f.from || !!f.to;
  }
}

export function matchFilter(cell: Cell | undefined, f: FilterValue): boolean {
  if (!cell) return false;
  switch (f.type) {
    case 'values': {
      const set = new Set(f.values);
      return cell.filterKeys.some((k) => set.has(k));
    }
    case 'contains':
      return normalizeSearch(cell.text).includes(normalizeSearch(f.q));
    case 'range': {
      if (typeof cell.value !== 'number') return false;
      if (f.min !== undefined && cell.value < f.min) return false;
      if (f.max !== undefined && cell.value > f.max) return false;
      return true;
    }
    case 'dates': {
      if (typeof cell.value !== 'number') return false;
      const from = f.from ? dayBound(f.from, false) : null;
      const to = f.to ? dayBound(f.to, true) : null;
      if (from !== null && cell.value < from) return false;
      if (to !== null && cell.value > to) return false;
      return true;
    }
  }
}

/** Qidiruv: so'zlar bo'yicha AND ("bobur toshkent" → ikkalasi ham qatorda bo'lishi kerak). */
export function matchSearch(row: NormRow, q: string): boolean {
  const tokens = normalizeSearch(q).split(' ').filter(Boolean);
  return tokens.every((t) => row.search.includes(t));
}

export function filterRows(rows: NormRow[], state: QueryState, exceptCol?: string): NormRow[] {
  const active = Object.entries(state.filters).filter(([id, f]) => id !== exceptCol && isFilterActive(f));
  const q = state.q.trim();
  return rows.filter((r) => {
    if (state.issuesOnly && r.issues.length === 0) return false;
    if (q && !matchSearch(r, q)) return false;
    return active.every(([id, f]) => matchFilter(r.cells[id], f));
  });
}

const collator = new Intl.Collator('uz', { numeric: true, sensitivity: 'base' });

export function compareKeys(a: SortKey, b: SortKey): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (typeof x === 'number' && typeof y === 'number') return x - y;
    if (typeof x === 'number') return -1;
    if (typeof y === 'number') return 1;
    const c = collator.compare(x, y);
    if (c !== 0) return c;
  }
  return 0;
}

/** Ko'p ustunli barqaror saralash. Bo'sh qiymatlar har doim oxirida (Excel kabi). */
export function sortRows(rows: NormRow[], sort: SortSpec[]): NormRow[] {
  if (!sort.length) return rows;
  return [...rows].sort((ra, rb) => {
    for (const s of sort) {
      const a = ra.cells[s.id]?.sortKey ?? null;
      const b = rb.cells[s.id]?.sortKey ?? null;
      if (a === null || b === null) {
        if (a === b) continue;
        return a === null ? 1 : -1;
      }
      const c = compareKeys(a, b);
      if (c !== 0) return s.desc ? -c : c;
    }
    return ra.index - rb.index;
  });
}

export interface FacetItem {
  key: string;
  label: string;
  count: number;
  order: number;
}

/** Ustundagi noyob qiymatlar va ularning soni (filtr ro'yxati uchun). */
export function facet(rows: NormRow[], col: ColumnDef): FacetItem[] {
  const map = new Map<string, FacetItem>();
  for (const r of rows) {
    const cell = r.cells[col.id];
    if (!cell) continue;
    for (const k of cell.filterKeys) {
      const item = map.get(k);
      if (item) item.count++;
      else {
        const opt = col.options?.[k];
        map.set(k, { key: k, label: k === '' ? '' : opt?.label ?? k, count: 1, order: opt?.order ?? 999 });
      }
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.key === '') return 1;
    if (b.key === '') return -1;
    return a.order - b.order || collator.compare(a.label, b.label);
  });
}

/** Sarlavhani bosish: yo'q → o'sish → kamayish → yo'q. Shift bilan — qo'shimcha saralash darajasi. */
export function nextSort(sort: SortSpec[], id: string, multi: boolean): SortSpec[] {
  const cur = sort.find((s) => s.id === id);
  const next: SortSpec | null = !cur ? { id, desc: false } : !cur.desc ? { id, desc: true } : null;
  if (!multi) return next ? [next] : [];
  const rest = sort.filter((s) => s.id !== id);
  if (!next) return rest;
  return cur ? sort.map((s) => (s.id === id ? next : s)) : [...rest, next];
}
