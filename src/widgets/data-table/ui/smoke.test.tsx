import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { counterpartiesConfig } from '@/entities/counterparty';
import { licensesConfig } from '@/entities/license';
import { tripsConfig } from '@/entities/trip';
import { buildDataset, filterRows, sortRows, type PageConfig } from '@/shared/lib/dataset';
import { DataGrid } from './DataGrid';

const load = (c: PageConfig) =>
  buildDataset(JSON.parse(readFileSync(resolve(__dirname, '../../../../public/data', c.file), 'utf8')), c);

const render = (c: PageConfig) => {
  const ds = load(c);
  const rows = sortRows(filterRows(ds.rows, { q: '', filters: {}, sort: [], issuesOnly: false }), c.defaultSort);
  return renderToStaticMarkup(
    <DataGrid
      columns={ds.columns}
      rows={rows}
      widthOf={() => 120}
      onResize={() => {}}
      onMove={() => {}}
      sort={c.defaultSort}
      onSort={() => {}}
      filters={{}}
      openFilterId={null}
      onOpenFilter={() => {}}
      activeKey={null}
      onOpenRow={() => {}}
      density="normal"
      empty="empty"
    />,
  );
};

describe('real fayllar: trips.json', () => {
  const ds = load(tripsConfig);
  it('barcha yozuvlar o\'qiladi', () => expect(ds.rows).toHaveLength(60));
  it('completed_at avtomatik ustun bo\'ladi', () => expect(ds.meta.autoColumns).toEqual(['~completed_at']));
  it('"12,5" son sifatida o\'qiladi va belgilanadi', () => {
    const c = ds.rows.find((r) => r.key === 'T-1029')!.cells.weight;
    expect(c.value).toBe(12.5);
    expect(c.issue).toBeTruthy();
  });
  it('"26.10.2026" sana sifatida o\'qiladi', () => {
    const c = ds.rows.find((r) => r.key === 'T-1017')!.cells.created_at;
    expect(new Date(c.value as number).getMonth()).toBe(9);
  });
  it('ARCHIVED_V2 yo\'qolmaydi', () => {
    const c = ds.rows.find((r) => r.key === 'T-1023')!.cells.status;
    expect(c.text).toBe('ARCHIVED_V2');
    expect(c.issue).toMatch(/Noma'lum/);
  });
  it('mashinasi yo\'q reys — bo\'sh, xato emas', () => {
    const c = ds.rows.find((r) => r.key === 'T-1013')!.cells.plate;
    expect(c.empty).toBe(true);
  });
  it('render yiqilmaydi', () => expect(render(tripsConfig)).toContain('T-1060'));
});

describe('real fayllar: counterparties.json', () => {
  const ds = load(counterpartiesConfig);
  it('root massiv', () => expect(ds.rows).toHaveLength(50));
  it('extra.* avtomatik ustunlar', () => expect(ds.meta.autoColumns).toEqual(['~extra.note', '~extra.score']));
  it('kelajakdagi sana belgilanadi', () => expect(ds.rows.find((r) => r.key === 'c23')!.cells.since.issue).toBe('Sana kelajakda'));
  it('render yiqilmaydi', () => expect(render(counterpartiesConfig)).toContain('VIP'));
});

describe('real fayllar: licenses.json', () => {
  const ds = load(licensesConfig);
  it('ichma-ich yo\'l', () => expect(ds.rows).toHaveLength(45));
  it('noma\'lum maydon yo\'q, missing yo\'q', () => {
    expect(ds.meta.autoColumns).toEqual([]);
    expect(ds.meta.missingColumns).toEqual([]);
  });
  it('files: null — bo\'sh', () => expect(ds.rows.find((r) => r.key === 'L16')!.cells.files.empty).toBe(true));
  it('holat hisoblanadi', () => {
    const states = new Set(ds.rows.map((r) => r.cells.state.value));
    expect(states).toContain('expired');
    expect(states).toContain('unknown');
  });
  it('render yiqilmaydi', () => expect(render(licensesConfig)).toContain('AB 000001'));
});
