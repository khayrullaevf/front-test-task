import { tripsConfig } from '@/entities/trip';
import { DataTable } from '@/widgets/data-table';

export default function TripsPage() {
  return <DataTable config={tripsConfig} />;
}
