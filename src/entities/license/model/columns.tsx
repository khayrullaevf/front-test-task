import { daysFromToday, parseDate, type PageConfig } from '@/shared/lib/dataset';
import { Badge, Plate } from '@/shared/ui';

/** Muddati shu kundan kam qolgan litsenziya "tugayapti" deb belgilanadi. */
export const EXPIRING_DAYS = 30;

function daysLeft(validTo: unknown): number | null {
  const d = parseDate(validTo).value;
  return d ? daysFromToday(d.ms) : null;
}

export const licensesConfig: PageConfig = {
  id: 'licenses',
  title: 'Litsenziyalar',
  subtitle: 'Tashuvchilar litsenziyalari reestri',
  file: 'licenses.json',
  recordsPath: 'data.licenses',
  rowKey: 'id',
  titleOf: (r) => `Litsenziya ${r.cells.license?.text ?? r.key}`,
  defaultSort: [
    { id: 'state', desc: false },
    { id: 'valid_to', desc: false },
  ],
  columns: [
    {
      id: 'license',
      title: 'Litsenziya',
      type: 'text',
      width: 120,
      get: (raw) => [raw.series, raw.number].filter(Boolean).join(' ') || null,
      uses: ['series', 'number'],
      render: (c) => <span className="mono">{c.text}</span>,
    },
    {
      id: 'state',
      title: 'Holati',
      type: 'enum',
      width: 168,
      get: (raw) => {
        const d = daysLeft(raw.valid_to);
        if (d === null) return 'unknown';
        if (d < 0) return 'expired';
        if (d <= EXPIRING_DAYS) return 'expiring';
        return 'valid';
      },
      description: `Amal qilish muddatidan hisoblanadi. "Tugayapti" — ${EXPIRING_DAYS} kun yoki kamroq qolgan.`,
      options: {
        expired: { label: "Muddati o'tgan", tone: 'red', order: 1 },
        expiring: { label: 'Tugayapti', tone: 'amber', order: 2 },
        valid: { label: 'Amalda', tone: 'green', order: 3 },
        unknown: { label: "Muddati noma'lum", tone: 'gray', order: 4 },
      },
    },
    {
      id: 'valid_to',
      path: 'valid_to',
      title: 'Amal qilish muddati',
      type: 'date',
      width: 150,
      emptyText: "Ko'rsatilmagan",
    },
    {
      id: 'days_left',
      title: 'Qolgan kun',
      type: 'number',
      digits: 0,
      width: 110,
      align: 'right',
      get: (raw) => daysLeft(raw.valid_to),
      description: "Bugundan amal qilish muddatigacha kun. Manfiy — muddati o'tganiga necha kun bo'lgani.",
      render: (c) => {
        const d = c.value as number;
        const tone = d < 0 ? 'neg' : d <= EXPIRING_DAYS ? 'warn' : '';
        return <span className={`days ${tone}`}>{d === 0 ? 'bugun' : c.text}</span>;
      },
    },
    { id: 'owner', path: 'owner.name', title: 'Egasi', type: 'text', width: 170 },
    { id: 'address', path: 'owner.address', title: 'Manzil', type: 'text', width: 120, emptyText: "Ko'rsatilmagan" },
    { id: 'plate', path: 'vehicle.plate', title: 'Davlat raqami', type: 'text', width: 128, render: (c) => <Plate value={c.text} /> },
    {
      id: 'vehicle_kind',
      path: 'vehicle.kind',
      title: 'Transport turi',
      type: 'enum',
      width: 128,
      strict: true,
      options: {
        power: { label: 'Tortuvchi', tone: 'blue', order: 1 },
        trailer: { label: 'Tirkama', tone: 'teal', order: 2 },
      },
    },
    { id: 'model', path: 'vehicle.model', title: 'Model', type: 'text', width: 110 },
    { id: 'driver', path: 'driver.name', title: 'Haydovchi', type: 'text', width: 160, emptyText: 'Biriktirilmagan' },
    {
      id: 'files',
      path: 'files',
      title: 'Hujjatlar',
      type: 'array',
      width: 190,
      emptyText: 'Hujjat yuklanmagan',
      render: (c) => (
        <span className="chips">
          {(c.value as string[]).map((f) => (
            <Badge key={f} tone={f.endsWith('.pdf') ? 'red' : 'violet'}>
              {f}
            </Badge>
          ))}
        </span>
      ),
    },
    { id: 'issuer', path: 'issuer', title: 'Bergan tashkilot', type: 'text', width: 150, emptyText: "Ko'rsatilmagan" },
    { id: 'series', path: 'series', title: 'Seriya', type: 'enum', width: 90, hidden: true },
    { id: 'number', path: 'number', title: 'Raqam', type: 'text', width: 100, hidden: true },
    { id: 'id', path: 'id', title: 'ID', type: 'text', width: 70, hidden: true },
  ],
};
