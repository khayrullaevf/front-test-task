import { memo, useCallback, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { MAX_WIDTH, MIN_WIDTH } from '@/features/column-settings';
import { formatNumber, isFilterActive, type ColumnDef, type Filters, type NormRow, type SortSpec } from '@/shared/lib/dataset';
import { Icon, renderCell } from '@/shared/ui';

interface Props {
  columns: ColumnDef[];
  rows: NormRow[];
  widthOf: (c: ColumnDef) => number;
  onResize: (id: string, w: number) => void;
  onMove: (fromId: string, toId: string) => void;
  sort: SortSpec[];
  onSort: (id: string, multi: boolean) => void;
  filters: Filters;
  openFilterId: string | null;
  onOpenFilter: (id: string, anchor: HTMLElement) => void;
  activeKey: string | null;
  onOpenRow: (row: NormRow) => void;
  density: 'compact' | 'normal';
  empty: ReactNode;
}

const ROWNUM_W = 48;

/* ---------- Ustun kengligini kontentga moslash (Excel'dagi sarlavha chegarasini ikki marta bosish) ---------- */
let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 7.5;
  measureCtx.font = font;
  return measureCtx.measureText(text).width;
}
function autoFitWidth(col: ColumnDef, rows: NormRow[]): number {
  const font = `13px ${getComputedStyle(document.body).fontFamily}`;
  let max = measure(col.title, `600 ${font}`) + 64; // sarlavha + saralash/filtr tugmalari
  for (const r of rows.slice(0, 1000)) {
    const c = r.cells[col.id];
    if (!c) continue;
    const text = c.empty ? (col.emptyText ?? '—') : c.text + (col.unit ? ` ${col.unit}` : '');
    const extra = col.type === 'array' ? (Array.isArray(c.value) ? c.value.length * 18 : 0) : col.type === 'enum' ? 20 : 0;
    max = Math.max(max, measure(text, font) + extra + 28 + (c.issue ? 18 : 0));
  }
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.ceil(max)));
}

function footerValue(col: ColumnDef, rows: NormRow[]): ReactNode {
  if (!col.footer) return null;
  if (typeof col.footer === 'function') return col.footer(rows);
  const nums = rows.map((r) => r.cells[col.id]?.value).filter((v): v is number => typeof v === 'number');
  if (!nums.length) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  const val = col.footer === 'sum' ? sum : sum / nums.length;
  return (
    <span title={col.footer === 'sum' ? 'Yig\'indi' : "O'rtacha"}>
      {col.footer === 'avg' && <span className="unit">o'rt. </span>}
      {formatNumber(val, col.digits ?? 2)}
      {col.unit && <span className="unit"> {col.unit}</span>}
    </span>
  );
}

export function DataGrid(props: Props) {
  const { columns, rows, widthOf, onResize, onMove, sort, onSort, filters, openFilterId, onOpenFilter, activeKey, onOpenRow, density, empty } = props;

  const [live, setLive] = useState<{ id: string; w: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const resizing = useRef(false);

  const w = useCallback((c: ColumnDef) => (live?.id === c.id ? live.w : widthOf(c)), [live, widthOf]);
  const totalWidth = ROWNUM_W + columns.reduce((s, c) => s + w(c), 0);
  const hasFooter = columns.some((c) => c.footer);

  const startResize = (e: React.PointerEvent, col: ColumnDef) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = true;
    const startX = e.clientX;
    const startW = widthOf(col);
    let cur = startW;
    const move = (ev: PointerEvent) => {
      cur = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + ev.clientX - startX));
      setLive({ id: col.id, w: cur });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('is-resizing');
      onResize(col.id, cur);
      setLive(null);
      setTimeout(() => (resizing.current = false));
    };
    document.body.classList.add('is-resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onRowKey = useCallback((e: KeyboardEvent<HTMLTableRowElement>, row: NormRow) => {
    const tr = e.currentTarget;
    const focus = (el: Element | null | undefined) => {
      if (el instanceof HTMLElement) {
        e.preventDefault();
        el.focus();
      }
    };
    switch (e.key) {
      case 'ArrowDown':
        return focus(tr.nextElementSibling);
      case 'ArrowUp':
        return focus(tr.previousElementSibling);
      case 'Home':
        return focus(tr.parentElement?.firstElementChild);
      case 'End':
        return focus(tr.parentElement?.lastElementChild);
      case 'Enter':
      case ' ':
        e.preventDefault();
        return onOpenRow(row);
    }
  }, [onOpenRow]);

  const pinnedId = columns[0]?.id;

  return (
    <table className={`grid density-${density}`} style={{ width: totalWidth }} role="grid" aria-rowcount={rows.length}>
      <colgroup>
        <col style={{ width: ROWNUM_W }} />
        {columns.map((c) => (
          <col key={c.id} style={{ width: w(c) }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          <th className="rownum is-pinned" style={{ left: 0 }} aria-label="Qator raqami">
            #
          </th>
          {columns.map((c) => {
            const sIdx = sort.findIndex((s) => s.id === c.id);
            const s = sort[sIdx];
            const filtered = isFilterActive(filters[c.id]);
            return (
              <th
                key={c.id}
                data-col-id={c.id}
                aria-sort={s ? (s.desc ? 'descending' : 'ascending') : 'none'}
                className={[
                  c.id === pinnedId && 'is-pinned',
                  c.align === 'right' && 'align-right',
                  dragId === c.id && 'is-dragging',
                  dropId === c.id && dragId !== c.id && 'is-drop',
                  filtered && 'is-filtered',
                  c.missing && 'is-missing',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={c.id === pinnedId ? { left: ROWNUM_W } : undefined}
                draggable
                onDragStart={(e) => {
                  if (resizing.current) return e.preventDefault();
                  setDragId(c.id);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', c.title);
                }}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  setDropId(c.id);
                }}
                onDragLeave={() => setDropId((d) => (d === c.id ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId && dragId !== c.id) onMove(dragId, c.id);
                  setDragId(null);
                  setDropId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setDropId(null);
                }}
              >
                <div className="th-inner">
                  <button
                    className="th-sort"
                    onClick={(e) => !resizing.current && onSort(c.id, e.shiftKey)}
                    title={[
                      c.missing ? "⚠ Bu maydon ma'lumotda topilmadi — fayl tuzilishi o'zgargan bo'lishi mumkin." : '',
                      c.description ?? '',
                      "Bosing — saralash. Shift + bosish — qo'shimcha saralash darajasi. Sudrab — ustunni ko'chirish.",
                    ]
                      .filter(Boolean)
                      .join('\n\n')}
                  >
                    <span className="th-title">{c.title}</span>
                    {c.auto && <span className="tag-new">yangi</span>}
                    {c.missing && <Icon name="warning" size={12} className="th-warn" />}
                    {c.description && !c.auto && <Icon name="info" size={12} className="th-info" />}
                    {s && (
                      <span className="th-sort-ind" aria-hidden>
                        <Icon name={s.desc ? 'arrowDown' : 'arrowUp'} size={12} />
                        {sort.length > 1 && <sup>{sIdx + 1}</sup>}
                      </span>
                    )}
                  </button>
                  <button
                    className={`th-filter${filtered ? ' is-active' : ''}${openFilterId === c.id ? ' is-open' : ''}`}
                    onClick={(e) => onOpenFilter(c.id, e.currentTarget)}
                    aria-label={`"${c.title}" bo'yicha filtr${filtered ? ' (faol)' : ''}`}
                    aria-haspopup="dialog"
                    title={filtered ? 'Filtr faol — o\'zgartirish' : 'Filtr va saralash'}
                  >
                    <Icon name="filter" size={13} />
                  </button>
                </div>
                <span
                  className="th-resize"
                  onPointerDown={(e) => startResize(e, c)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onResize(c.id, autoFitWidth(c, rows));
                  }}
                  title="Kenglikni o'zgartirish uchun sudrang, moslash uchun ikki marta bosing"
                  aria-hidden
                />
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr className="empty-row">
            <td colSpan={columns.length + 1}>{empty}</td>
          </tr>
        ) : (
          rows.map((r, i) => (
            <Row
              key={r.key}
              row={r}
              n={i + 1}
              columns={columns}
              pinnedId={pinnedId}
              active={r.key === activeKey}
              tabIndex={(activeKey ? r.key === activeKey : i === 0) ? 0 : -1}
              onOpen={onOpenRow}
              onKey={onRowKey}
            />
          ))
        )}
      </tbody>
      {hasFooter && rows.length > 0 && (
        <tfoot>
          <tr>
            <td className="rownum is-pinned" style={{ left: 0 }} />
            {columns.map((c, i) => (
              <td key={c.id} className={[c.id === pinnedId && 'is-pinned', c.align === 'right' && 'align-right'].filter(Boolean).join(' ')} style={c.id === pinnedId ? { left: ROWNUM_W } : undefined}>
                {footerValue(c, rows) ?? (i === 0 ? <span className="foot-label">Jami</span> : null)}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

interface RowProps {
  row: NormRow;
  n: number;
  columns: ColumnDef[];
  pinnedId?: string;
  active: boolean;
  tabIndex: number;
  onOpen: (r: NormRow) => void;
  onKey: (e: KeyboardEvent<HTMLTableRowElement>, r: NormRow) => void;
}

const Row = memo(function Row({ row, n, columns, pinnedId, active, tabIndex, onOpen, onKey }: RowProps) {
  return (
    <tr
      className={`${active ? 'is-active' : ''}${row.issues.length ? ' has-issues' : ''}`}
      tabIndex={tabIndex}
      aria-selected={active}
      data-row-key={row.key}
      onClick={() => {
        // Matnni belgilab nusxa olayotgan foydalanuvchiga panel ochilib xalaqit bermasin
        if (window.getSelection()?.toString()) return;
        onOpen(row);
      }}
      onKeyDown={(e) => onKey(e, row)}
    >
      <td className="rownum is-pinned" style={{ left: 0 }}>
        {n}
      </td>
      {columns.map((c) => {
        const cell = row.cells[c.id];
        return (
          <td
            key={c.id}
            className={[c.id === pinnedId && 'is-pinned', c.align === 'right' && 'align-right', c.align === 'center' && 'align-center'].filter(Boolean).join(' ')}
            style={c.id === pinnedId ? { left: ROWNUM_W } : undefined}
            title={cell && !cell.empty && !cell.issue ? cell.text : undefined}
          >
            <div className="cell">{renderCell(c, cell, row)}</div>
          </td>
        );
      })}
    </tr>
  );
});
