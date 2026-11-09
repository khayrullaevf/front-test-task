import { counterpartiesConfig } from '@/entities/counterparty';
import { DataTable } from '@/widgets/data-table';

export default function CounterpartiesPage() {
  return <DataTable config={counterpartiesConfig} />;
}
