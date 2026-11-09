import type { ColumnDef, NormRow } from '@/shared/lib/dataset';

const esc = (s: string) => (/[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/**
 * Excel (uz/ru lokal) to'g'ridan-to'g'ri ochadigan CSV: ";" ajratgich, UTF-8 BOM.
 * Ekranda nima ko'rinsa — shu: ko'rinadigan ustunlar, filtr va saralash qo'llangan qatorlar.
 */
export function toCsv(columns: ColumnDef[], rows: NormRow[]): string {
  const lines = [columns.map((c) => esc(c.title)).join(';')];
  for (const r of rows) {
    lines.push(
      columns
        .map((c) => {
          const cell = r.cells[c.id];
          if (!cell) return '';
          // Sonlarni guruhlash bo'shliqsiz chiqaramiz — Excel ularni son sifatida taniydi
          if (c.type === 'number' && typeof cell.value === 'number') return String(cell.value).replace('.', ',');
          return esc(cell.text);
        })
        .join(';'),
    );
  }
  return '﻿' + lines.join('\r\n');
}
