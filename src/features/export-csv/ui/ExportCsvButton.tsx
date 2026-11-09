import type { ColumnDef, NormRow } from '@/shared/lib/dataset';
import { downloadText } from '@/shared/lib/download';
import { Icon } from '@/shared/ui';
import { toCsv } from '../lib/toCsv';

interface Props {
  columns: ColumnDef[];
  rows: NormRow[];
  fileBase: string;
}

/** Ekranda ko'rinib turgan narsani (ustunlar, filtr, saralash) Excel'ga eksport qiladi. */
export function ExportCsvButton({ columns, rows, fileBase }: Props) {
  const onClick = () => {
    const d = new Date();
    const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    downloadText(`${fileBase}_${stamp}.csv`, toCsv(columns, rows));
  };
  return (
    <button className="btn" onClick={onClick} disabled={!rows.length} title={`Ko'rinib turgan ${rows.length} ta qatorni Excel uchun CSV'ga yuklab olish`}>
      <Icon name="download" />
      <span className="btn-label">Excel</span>
    </button>
  );
}
