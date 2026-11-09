import { formatDate, formatNumber, type ColumnDef, type FilterValue } from '@/shared/lib/dataset';

const ymdToText = (s: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? formatDate(new Date(+m[1], +m[2] - 1, +m[3]).getTime()) : s;
};

export const EMPTY_LABEL = "(Bo'sh)";

/** Faol filtrning qisqa matni — "chip"da ko'rsatiladi. */
export function describeFilter(col: ColumnDef, f: FilterValue): string {
  switch (f.type) {
    case 'values': {
      const labels = f.values.map((v) => (v === '' ? EMPTY_LABEL : col.options?.[v]?.label ?? v));
      if (labels.length <= 2) return labels.join(', ');
      return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`;
    }
    case 'contains':
      return `"${f.q}" bor`;
    case 'range': {
      const d = col.digits ?? 2;
      if (f.min !== undefined && f.max !== undefined) return `${formatNumber(f.min, d)} – ${formatNumber(f.max, d)}`;
      if (f.min !== undefined) return `≥ ${formatNumber(f.min, d)}`;
      return `≤ ${formatNumber(f.max!, d)}`;
    }
    case 'dates':
      if (f.from && f.to) return f.from === f.to ? ymdToText(f.from) : `${ymdToText(f.from)} – ${ymdToText(f.to)}`;
      if (f.from) return `${ymdToText(f.from)} dan`;
      return `${ymdToText(f.to!)} gacha`;
  }
}

export function sortLabels(type: ColumnDef['type']): [string, string] {
  switch (type) {
    case 'number':
      return ['Kichikdan kattaga', 'Kattadan kichikka'];
    case 'date':
      return ['Eskidan yangiga', 'Yangidan eskiga'];
    default:
      return ['A dan Z gacha', 'Z dan A gacha'];
  }
}
