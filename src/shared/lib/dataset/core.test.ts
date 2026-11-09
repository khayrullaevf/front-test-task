import { describe, expect, it } from 'vitest';
import { collectPaths, extractRecords, flatten } from './extract';
import { formatNumber } from './format';
import { buildDataset, inferType, makeCell } from './normalize';
import { parseDate, parseNumber } from './parse';
import { facet, filterRows, nextSort, sortRows, type QueryState } from './query';
import type { ColumnDef, PageConfig } from './types';

const q = (over: Partial<QueryState> = {}): QueryState => ({ q: '', filters: {}, sort: [], issuesOnly: false, ...over });

describe('parseNumber', () => {
  it('oddiy son', () => expect(parseNumber(16)).toEqual({ value: 16 }));
  it('vergulli matn → son + ogohlantirish', () => {
    const p = parseNumber('12,5');
    expect(p.value).toBe(12.5);
    expect(p.issue).toMatch(/matn/);
  });
  it('bo\'sh joyli summa', () => expect(parseNumber('1 200,5').value).toBe(1200.5));
  it('son emas → null + xato, lekin yiqilmaydi', () => {
    const p = parseNumber('abc');
    expect(p.value).toBeNull();
    expect(p.issue).toBeTruthy();
  });
  it('null/undefined — muammo emas', () => {
    expect(parseNumber(null)).toEqual({ value: null });
    expect(parseNumber(undefined)).toEqual({ value: null });
  });
});

describe('parseDate', () => {
  it('ISO vaqt bilan', () => {
    const p = parseDate('2026-10-07T06:00:00Z');
    expect(p.value?.ms).toBe(Date.UTC(2026, 9, 7, 6));
    expect(p.value?.hasTime).toBe(true);
    expect(p.issue).toBeUndefined();
  });
  it('ISO faqat sana — lokal kun', () => {
    const p = parseDate('2026-11-24');
    expect(new Date(p.value!.ms).getDate()).toBe(24);
    expect(p.value?.hasTime).toBe(false);
  });
  it('DD.MM.YYYY → sana + ogohlantirish', () => {
    const p = parseDate('26.10.2026');
    const d = new Date(p.value!.ms);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 26]);
    expect(p.issue).toMatch(/nostandart/);
  });
  it("mavjud bo'lmagan sana", () => expect(parseDate('31.02.2026').value).toBeNull());
  it('tanilmagan matn', () => expect(parseDate('kecha').issue).toBeTruthy());
});

describe('formatNumber', () => {
  it('guruhlash va kasr', () => {
    expect(formatNumber(37000000, 2)).toBe('37 000 000');
    expect(formatNumber(12.5, 1)).toBe('12,5');
    expect(formatNumber(100, 0)).toBe('100');
    expect(formatNumber(-1500)).toBe('−1 500');
  });
});

describe('extractRecords', () => {
  it('root massiv', () => expect(extractRecords([{ a: 1 }], '')?.records).toHaveLength(1));
  it("ko'rsatilgan yo'l", () => {
    const ex = extractRecords({ items: [{ a: 1 }], total: 1 }, 'items');
    expect(ex?.path).toBe('items');
    expect(ex?.meta.total).toBe(1);
    expect(ex?.fallback).toBe(false);
  });
  it("yo'l o'zgarsa — avtomatik topadi", () => {
    const ex = extractRecords({ payload: { results: [{ a: 1 }, { a: 2 }] }, tags: ['x'] }, 'items');
    expect(ex?.path).toBe('payload.results');
    expect(ex?.fallback).toBe(true);
    expect(ex?.records).toHaveLength(2);
  });
  it('massiv yo\'q → null', () => expect(extractRecords({ a: 1 }, 'items')).toBeNull());
});

describe('flatten / collectPaths', () => {
  it('ichma-ich obyekt', () => {
    expect(flatten({ a: { b: 1, c: { d: 2 } }, t: ['x'] })).toEqual({ 'a.b': 1, 'a.c.d': 2, t: ['x'] });
  });
  it("null obyekt prefiks bo'lsa ustun bo'lmaydi", () => {
    const paths = collectPaths([flatten({ driver: null }), flatten({ driver: { name: 'A' } })]);
    expect(paths).toEqual(['driver.name']);
  });
});

describe('inferType', () => {
  it('turlar', () => {
    expect(inferType([4.5, null, 3])).toBe('number');
    expect(inferType(['300000001', '300000002'])).toBe('text');
    expect(inferType(['2026-10-30T10:00:00Z', undefined])).toBe('date');
    expect(inferType(['VIP', 'VIP', 'VIP'])).toBe('enum');
    expect(inferType([['a'], []])).toBe('array');
    expect(inferType([true, false])).toBe('boolean');
  });
});

describe('makeCell', () => {
  const statusCol: ColumnDef = {
    id: 's',
    title: 'S',
    type: 'enum',
    strict: true,
    options: { PENDING: { label: 'Kutilmoqda', order: 1 } },
  };
  it("noma'lum enum qiymati yo'qolmaydi", () => {
    const c = makeCell(statusCol, 'ARCHIVED_V2');
    expect(c.text).toBe('ARCHIVED_V2');
    expect(c.issue).toMatch(/Noma'lum/);
  });
  it("massiv o'rniga null — bo'sh, xato emas", () => {
    const c = makeCell({ id: 'f', title: 'F', type: 'array' }, null);
    expect(c.empty).toBe(true);
    expect(c.issue).toBeUndefined();
  });
  it("son kutilgan joyda matn — asl matn saqlanadi", () => {
    const c = makeCell({ id: 'n', title: 'N', type: 'number' }, 'n/a');
    expect(c.text).toBe('n/a');
    expect(c.empty).toBe(false);
    expect(c.issue).toBeTruthy();
  });
});

const cfg: PageConfig = {
  id: 't',
  title: 'T',
  subtitle: '',
  file: '',
  recordsPath: 'items',
  rowKey: 'id',
  defaultSort: [],
  columns: [
    { id: 'id', path: 'id', title: 'ID', type: 'text' },
    { id: 'w', path: 'cargo.weight_t', title: 'W', type: 'number' },
    { id: 'name', path: 'driver.name', title: 'Driver', type: 'text' },
    { id: 'tags', path: 'tags', title: 'Tags', type: 'array' },
    { id: 'gone', path: 'removed_field', title: 'Gone', type: 'text' },
  ],
};

const json = {
  items: [
    { id: 'A', cargo: { weight_t: 10 }, driver: { name: 'Bobur' }, tags: ['ADR'], completed_at: '2026-10-30T10:00:00Z' },
    { id: 'B', cargo: { weight_t: '12,5' }, driver: null, tags: [] },
    { id: 'C', cargo: { weight_t: 2 }, driver: { name: "G'ulom" }, tags: ['TIR', 'ADR'], extra: { note: 'VIP' } },
  ],
  total: 3,
};

describe('buildDataset', () => {
  const ds = buildDataset(json, cfg);
  it("noma'lum maydonlar avtomatik ustun bo'ladi", () => {
    expect(ds.meta.autoColumns).toEqual(['~completed_at', '~extra.note']);
    const completed = ds.columns.find((c) => c.id === '~completed_at');
    expect(completed?.type).toBe('date');
  });
  it("ma'lumotda yo'q ustun belgilanadi", () => expect(ds.meta.missingColumns).toEqual(['gone']));
  it('muammoli qatorlar sanaladi', () => expect(ds.meta.issueRows).toBe(1));
  it('declared total', () => expect(ds.meta.declaredTotal).toBe(3));
  it('qidiruv apostrofga sezgir emas', () => {
    expect(filterRows(ds.rows, q({ q: 'g‘ulom' })).map((r) => r.key)).toEqual(['C']);
  });
  it('qidiruv so\'zlar bo\'yicha AND', () => {
    expect(filterRows(ds.rows, q({ q: 'bobur adr' })).map((r) => r.key)).toEqual(['A']);
    expect(filterRows(ds.rows, q({ q: 'bobur tir' }))).toHaveLength(0);
  });
  it('avto-ustun qiymati ham qidiriladi', () => {
    expect(filterRows(ds.rows, q({ q: 'vip' })).map((r) => r.key)).toEqual(['C']);
  });
  it('qiymatlar filtri (massiv va bo\'sh)', () => {
    expect(filterRows(ds.rows, q({ filters: { tags: { type: 'values', values: ['TIR'] } } })).map((r) => r.key)).toEqual(['C']);
    expect(filterRows(ds.rows, q({ filters: { tags: { type: 'values', values: [''] } } })).map((r) => r.key)).toEqual(['B']);
  });
  it('oraliq filtri — matnli son ham ishlaydi', () => {
    expect(filterRows(ds.rows, q({ filters: { w: { type: 'range', min: 11 } } })).map((r) => r.key)).toEqual(['B']);
  });
  it('saralash: bo\'shlar har doim oxirida', () => {
    expect(sortRows(ds.rows, [{ id: 'name', desc: false }]).map((r) => r.key)).toEqual(['A', 'C', 'B']);
    expect(sortRows(ds.rows, [{ id: 'name', desc: true }]).map((r) => r.key)).toEqual(['C', 'A', 'B']);
  });
  it('raqamli saralash', () => {
    expect(sortRows(ds.rows, [{ id: 'w', desc: true }]).map((r) => r.key)).toEqual(['B', 'A', 'C']);
  });
  it('facet sanog\'i', () => {
    const tagsCol = ds.columns.find((c) => c.id === 'tags')!;
    expect(facet(ds.rows, tagsCol).map((f) => [f.key, f.count])).toEqual([
      ['ADR', 2],
      ['TIR', 1],
      ['', 1],
    ]);
  });
  it("root kaliti o'zgarsa ham qatorlar yo'qolmaydi", () => {
    const moved = buildDataset({ data: { list: json.items } }, cfg);
    expect(moved.rows).toHaveLength(3);
    expect(moved.meta.pathFallback).toBe(true);
  });
});

describe('nextSort', () => {
  it('sikl: asc → desc → yo\'q', () => {
    let s = nextSort([], 'a', false);
    expect(s).toEqual([{ id: 'a', desc: false }]);
    s = nextSort(s, 'a', false);
    expect(s).toEqual([{ id: 'a', desc: true }]);
    expect(nextSort(s, 'a', false)).toEqual([]);
  });
  it('shift — qo\'shimcha daraja', () => {
    const s = nextSort([{ id: 'a', desc: false }], 'b', true);
    expect(s).toEqual([
      { id: 'a', desc: false },
      { id: 'b', desc: false },
    ]);
  });
});
