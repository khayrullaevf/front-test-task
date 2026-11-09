import { isFilterActive, type ColumnDef, type Filters } from '@/shared/lib/dataset';
import { Icon } from '@/shared/ui';
import { describeFilter } from '../lib/describe';

interface Props {
  columns: ColumnDef[];
  filters: Filters;
  onEdit: (colId: string, anchor: HTMLElement) => void;
  onRemove: (colId: string) => void;
}

/** Faol filtrlar "chip"lari: bir qarashda nima filtrlanganini ko'rish, bosib tahrirlash, × bilan olib tashlash. */
export function ActiveFilters({ columns, filters, onEdit, onRemove }: Props) {
  const active = Object.entries(filters).filter(([, f]) => isFilterActive(f));
  if (!active.length) return null;
  return (
    <ul className="filter-chips" aria-label="Faol filtrlar">
      {active.map(([id, f]) => {
        const col = columns.find((c) => c.id === id);
        if (!col) return null;
        const text = describeFilter(col, f);
        return (
          <li key={id} className="filter-chip">
            <button className="filter-chip-main" onClick={(e) => onEdit(id, e.currentTarget)} title="Filtrni o'zgartirish">
              <Icon name="filter" size={12} />
              <span className="filter-chip-col">{col.title}:</span> <span className="filter-chip-val">{text}</span>
            </button>
            <button className="filter-chip-x" onClick={() => onRemove(id)} aria-label={`"${col.title}" filtrini olib tashlash`}>
              <Icon name="x" size={12} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
