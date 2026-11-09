import { licensesConfig } from '@/entities/license';
import { DataTable } from '@/widgets/data-table';

export default function LicensesPage() {
  return <DataTable config={licensesConfig} />;
}
