import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef, FilterValue, Filters, PageConfig, QueryState, SortSpec } from '@/shared/lib/dataset';
import { rememberQuery } from '@/shared/lib/storage';

/*
 * Qidiruv / filtr / saralash / ochiq yozuv → URL.
 * Natija: havolani hamkasbga yuborsa — xuddi shu ko'rinish ochiladi; "Orqaga"/yangilash holatni yo'qotmaydi.
 */

const sameSort = (a: SortSpec[], b: SortSpec[]) =>
  a.length === b.length && a.every((s, i) => s.id === b[i].id && s.desc === b[i].desc);

function isValidFilter(f: unknown): f is FilterValue {
  if (!f || typeof f !== 'object') return false;
  const x = f as Record<string, unknown>;
  const optNum = (v: unknown) => v === undefined || typeof v === 'number';
  const optStr = (v: unknown) => v === undefined || typeof v === 'string';
  switch (x.type) {
    case 'values':
      return Array.isArray(x.values) && x.values.every((v) => typeof v === 'string');
    case 'contains':
      return typeof x.q === 'string';
    case 'range':
      return optNum(x.min) && optNum(x.max);
    case 'dates':
      return optStr(x.from) && optStr(x.to);
  }
  return false;
}

export function decodeQuery(params: URLSearchParams, defaults: SortSpec[], known: Set<string>): QueryState {
  let sort = defaults;
  if (params.has('sort')) {
    sort = (params.get('sort') ?? '')
      .split(',')
      .filter(Boolean)
      .map((s) => (s.startsWith('-') ? { id: s.slice(1), desc: true } : { id: s, desc: false }));
  }
  let filters: Filters = {};
  const f = params.get('f');
  if (f) {
    try {
      const parsed = JSON.parse(f) as Record<string, unknown>;
      for (const [id, v] of Object.entries(parsed)) if (isValidFilter(v)) filters[id] = v;
    } catch {
      filters = {};
    }
  }
  // Eski havoladagi ustun endi yo'q bo'lsa — jadval "jimgina" bo'shab qolmasin
  sort = sort.filter((s) => known.has(s.id));
  filters = Object.fromEntries(Object.entries(filters).filter(([id]) => known.has(id)));
  return { q: params.get('q') ?? '', filters, sort, issuesOnly: params.get('issues') === '1' };
}

export function encodeQuery(s: QueryState, defaults: SortSpec[], row: string | null): URLSearchParams {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (Object.keys(s.filters).length) p.set('f', JSON.stringify(s.filters));
  if (!sameSort(s.sort, defaults)) p.set('sort', s.sort.map((x) => (x.desc ? '-' : '') + x.id).join(','));
  if (s.issuesOnly) p.set('issues', '1');
  if (row) p.set('row', row);
  return p;
}

export function useQueryState(config: PageConfig, columns: ColumnDef[]) {
  const [params, setParams] = useSearchParams();
  const known = useMemo(() => new Set(columns.map((c) => c.id)), [columns]);
  const query = useMemo(() => decodeQuery(params, config.defaultSort, known), [params, config.defaultSort, known]);
  const row = params.get('row');

  const update = useCallback(
    (patch: Partial<QueryState>) =>
      setParams(
        (prev) => encodeQuery({ ...decodeQuery(prev, config.defaultSort, known), ...patch }, config.defaultSort, prev.get('row')),
        { replace: true },
      ),
    [setParams, config.defaultSort, known],
  );

  const setRow = useCallback(
    (key: string | null) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (key) p.set('row', key);
          else p.delete('row');
          return p;
        },
        { replace: true },
      ),
    [setParams],
  );

  useEffect(() => {
    const p = new URLSearchParams(params);
    p.delete('row');
    rememberQuery(config.id, p.toString());
  }, [params, config.id]);

  return { query, update, row, setRow };
}
