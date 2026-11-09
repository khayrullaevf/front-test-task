import { useCallback, useMemo, useState } from 'react';
import { ActiveFilters, FilterPopover } from '@/features/column-filter';
import { ColumnMenu, useColumnPrefs } from '@/features/column-settings';
import { ExportCsvButton } from '@/features/export-csv';
import { SearchInput } from '@/features/grid-search';
import { useDataset } from '@/shared/api';
import {
  filterRows,
  formatDate,
  isFilterActive,
  nextSort,
  sortRows,
  type Dataset,
  type FilterValue,
  type NormRow,
  type PageConfig,
} from '@/shared/lib/dataset';
import { usePersistentState } from '@/shared/lib/storage';
import { Icon } from '@/shared/ui';
import { useQueryState } from '../model/useQueryState';
import { DataGrid } from './DataGrid';
import { Notices } from './Notices';
import { RowDrawer } from './RowDrawer';

/** Sahifa = shu widget + entity konfiguratsiyasi. Uchala sahifa bir xil ko'rinadi va bir xil ishlaydi. */
export function DataTable({ config }: { config: PageConfig }) {
  const { state, reload } = useDataset(config);

  return (
    <section className="page">
      <header className="page-head">
        <div>
          <h1>{config.title}</h1>
          <p className="page-sub">{config.subtitle}</p>
        </div>
        <div className="page-head-right">
          {state.status === 'ready' && (
            <span className="loaded-at" title="Ma'lumot yuklangan vaqt">
              {formatDate(state.loadedAt, true)}
            </span>
          )}
          <button className="btn" onClick={reload} disabled={state.status === 'loading'} title="Faylni qayta o'qish">
            <Icon name="refresh" />
            <span className="btn-label">Yangilash</span>
          </button>
        </div>
      </header>

      {state.status === 'loading' && <SkeletonTable />}
      {state.status === 'error' && (
        <div className="state-box state-error" role="alert">
          <Icon name="warning" size={28} />
          <h2>{state.message}</h2>
          <p>
            Fayl: <code>data/{config.file}</code>. Fayl mavjudligi va to'g'ri JSON ekanini tekshiring.
          </p>
          {state.detail && <pre className="state-detail">{state.detail}</pre>}
          <button className="btn btn-primary" onClick={reload}>
            <Icon name="refresh" /> Qayta urinish
          </button>
        </div>
      )}
      {state.status === 'ready' && <TableView key={state.loadedAt} config={config} ds={state.ds} />}
    </section>
  );
}

function TableView({ config, ds }: { config: PageConfig; ds: Dataset }) {
  const { query, update, row: openKey, setRow } = useQueryState(config, ds.columns);
  const prefs = useColumnPrefs(config.id, ds.columns);
  const [density, setDensity] = usePersistentState<'compact' | 'normal'>('crm-density', 'normal');
  const [popover, setPopover] = useState<{ id: string; anchor: HTMLElement } | null>(null);

  const filtered = useMemo(() => filterRows(ds.rows, query), [ds.rows, query]);
  const rows = useMemo(() => sortRows(filtered, query.sort), [filtered, query.sort]);

  // Filtr oynasidagi ro'yxat: shu ustundan boshqa hamma filtrlar qo'llangan qatorlar (Excel'dagidek)
  const facetRows = useMemo(
    () => (popover ? filterRows(ds.rows, query, popover.id) : []),
    [popover, ds.rows, query],
  );

  const activeFilterCount = Object.values(query.filters).filter(isFilterActive).length;
  const anythingActive = activeFilterCount > 0 || !!query.q || query.issuesOnly;

  const setFilter = useCallback(
    (id: string, f: FilterValue | undefined) => {
      const next = { ...query.filters };
      if (f) next[id] = f;
      else delete next[id];
      update({ filters: next });
    },
    [query.filters, update],
  );
  const clearAll = () => update({ q: '', filters: {}, issuesOnly: false });
  const onSort = useCallback((id: string, multi: boolean) => update({ sort: nextSort(query.sort, id, multi) }), [query.sort, update]);
  const onOpenRow = useCallback((r: NormRow) => setRow(r.key), [setRow]);
  const onOpenFilter = useCallback(
    (id: string, anchor: HTMLElement) => setPopover((p) => (p?.id === id ? null : { id, anchor })),
    [],
  );
  const closePopover = useCallback(() => setPopover(null), []);

  // Ochiq yozuv: filtrdan chiqib ketsa ham panel yopilib qolmaydi (ds.rows'dan olinadi)
  const openIdx = openKey ? rows.findIndex((r) => r.key === openKey) : -1;
  const openRow = openKey ? (openIdx >= 0 ? rows[openIdx] : ds.rows.find((r) => r.key === openKey)) : undefined;

  const popCol = popover ? ds.columns.find((c) => c.id === popover.id) : undefined;
  const popSort = popover ? query.sort.find((s) => s.id === popover.id) : undefined;

  const sortText = query.sort
    .map((s) => `${ds.columns.find((c) => c.id === s.id)?.title ?? s.id} ${s.desc ? '↓' : '↑'}`)
    .join(', ');
  const isDefaultSort =
    query.sort.length === config.defaultSort.length &&
    query.sort.every((s, i) => s.id === config.defaultSort[i].id && s.desc === config.defaultSort[i].desc);

  return (
    <div className={`table-view${openRow ? ' has-drawer' : ''}`}>
      <div className="toolbar">
        <SearchInput value={query.q} onChange={(q) => update({ q })} placeholder={`${config.title} bo'yicha qidirish…`} />
        {ds.meta.issueRows > 0 && (
          <button
            className={`btn btn-warn${query.issuesOnly ? ' is-active' : ''}`}
            onClick={() => update({ issuesOnly: !query.issuesOnly })}
            aria-pressed={query.issuesOnly}
            title="Ma'lumoti to'liq bo'lmagan yoki noto'g'ri formatdagi qatorlar. Bosing — faqat shularni ko'rsatish."
          >
            <Icon name="warning" />
            <span className="btn-label">{ds.meta.issueRows} ta qatorda muammo</span>
          </button>
        )}
        <span className="spacer" />
        <button
          className="btn"
          onClick={() => setDensity(density === 'compact' ? 'normal' : 'compact')}
          title={density === 'compact' ? 'Oddiy qatorlar' : 'Zich qatorlar (ekranga ko\'proq sig\'adi)'}
          aria-pressed={density === 'compact'}
        >
          <Icon name="rows" />
          <span className="btn-label">{density === 'compact' ? 'Zich' : 'Oddiy'}</span>
        </button>
        <ColumnMenu prefs={prefs} />
        <ExportCsvButton columns={prefs.visible} rows={rows} fileBase={config.id} />
      </div>

      {(activeFilterCount > 0 || anythingActive) && (
        <div className="filterbar">
          <ActiveFilters columns={ds.columns} filters={query.filters} onEdit={onOpenFilter} onRemove={(id) => setFilter(id, undefined)} />
          {anythingActive && (
            <button className="link-btn" onClick={clearAll}>
              <Icon name="x" size={12} /> Hammasini tozalash
            </button>
          )}
        </div>
      )}

      <Notices ds={ds} config={config} />

      <div className="grid-wrap">
        <div className="grid-scroll" onScroll={popover ? closePopover : undefined}>
          <DataGrid
            columns={prefs.visible}
            rows={rows}
            widthOf={prefs.widthOf}
            onResize={prefs.setWidth}
            onMove={prefs.move}
            sort={query.sort}
            onSort={onSort}
            filters={query.filters}
            openFilterId={popover?.id ?? null}
            onOpenFilter={onOpenFilter}
            activeKey={openRow?.key ?? null}
            onOpenRow={onOpenRow}
            density={density}
            empty={
              <div className="state-box state-empty">
                <Icon name="search" size={28} />
                <h2>Hech narsa topilmadi</h2>
                <p>{ds.rows.length ? "Qidiruv yoki filtr shartlariga mos yozuv yo'q." : "Faylda yozuvlar yo'q."}</p>
                {anythingActive && (
                  <button className="btn btn-primary" onClick={clearAll}>
                    Filtrlarni tozalash
                  </button>
                )}
              </div>
            }
          />
        </div>
        {openRow && (
          <RowDrawer
            title={config.titleOf?.(openRow) ?? openRow.key}
            row={openRow}
            position={openIdx >= 0 ? openIdx + 1 : 0}
            total={rows.length}
            columns={prefs.ordered}
            isVisible={prefs.isVisible}
            onPrev={openIdx > 0 ? () => setRow(rows[openIdx - 1].key) : undefined}
            onNext={openIdx >= 0 && openIdx < rows.length - 1 ? () => setRow(rows[openIdx + 1].key) : undefined}
            onClose={() => setRow(null)}
          />
        )}
      </div>

      <footer className="statusbar">
        <span>
          <b>{rows.length}</b> ta yozuv
          {rows.length !== ds.rows.length && <> · jami {ds.rows.length}</>}
        </span>
        {sortText && (
          <span className="statusbar-sort">
            Saralash: {sortText}
            {!isDefaultSort && (
              <button className="link-btn" onClick={() => update({ sort: config.defaultSort })}>
                standart
              </button>
            )}
          </span>
        )}
        <span className="spacer" />
        <span className="hints">
          <kbd>/</kbd> qidiruv · <kbd>Shift</kbd>+bosish — bir necha ustun bo'yicha saralash · <kbd>↑</kbd>
          <kbd>↓</kbd> <kbd>Enter</kbd> — qatorlar
        </span>
      </footer>

      {popover && popCol && (
        <FilterPopover
          key={popCol.id}
          col={popCol}
          anchor={popover.anchor}
          rows={facetRows}
          value={query.filters[popCol.id]}
          sortDir={popSort ? (popSort.desc ? 'desc' : 'asc') : undefined}
          onSort={(desc) => update({ sort: [{ id: popCol.id, desc }] })}
          onApply={(f) => setFilter(popCol.id, f)}
          onClose={closePopover}
        />
      )}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="skeleton" aria-busy="true" aria-label="Yuklanmoqda">
      <div className="sk-bar" style={{ width: 320 }} />
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className="sk-row" style={{ opacity: 1 - i * 0.08 }} />
      ))}
    </div>
  );
}
