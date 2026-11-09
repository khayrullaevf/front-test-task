import { daysFromToday, type PageConfig } from '@/shared/lib/dataset';
import { Badge, Muted, Phone } from '@/shared/ui';

export const counterpartiesConfig: PageConfig = {
  id: 'counterparties',
  title: 'Kontragentlar',
  subtitle: 'Kompaniyalar va jismoniy shaxslar',
  file: 'counterparties.json',
  recordsPath: '',
  rowKey: 'key',
  titleOf: (r) => r.cells.name?.text || r.key,
  defaultSort: [{ id: 'name', desc: false }],
  columns: [
    { id: 'name', path: 'name', title: 'Nomi', type: 'text', width: 230 },
    {
      id: 'kind',
      path: 'kind',
      title: 'Shaxs turi',
      type: 'enum',
      width: 136,
      strict: true,
      options: {
        legal: { label: 'Yuridik', tone: 'blue', order: 1 },
        physical: { label: 'Jismoniy', tone: 'violet', order: 2 },
      },
    },
    {
      id: 'roles',
      path: 'roles',
      title: 'Rollari',
      type: 'array',
      width: 260,
      emptyText: 'Rol belgilanmagan',
      options: {
        cargo_owner: { label: 'Yuk egasi', tone: 'amber' },
        carrier: { label: 'Tashuvchi', tone: 'blue' },
        forwarder: { label: 'Ekspeditor', tone: 'violet' },
        vehicle_owner: { label: 'Transport egasi', tone: 'teal' },
        driver: { label: 'Haydovchi', tone: 'green' },
      },
    },
    { id: 'phone', path: 'phone', title: 'Telefon', type: 'text', width: 156, render: (c) => <Phone value={c.text} /> },
    {
      id: 'tax_id',
      title: 'STIR / JShShIR',
      type: 'text',
      width: 170,
      get: (raw) => raw.inn ?? raw.pinfl,
      uses: ['inn', 'pinfl'],
      description: 'Yuridik shaxs uchun STIR (INN), jismoniy shaxs uchun JShShIR (PINFL).',
      render: (c, r) => (
        <span className="mono">
          {c.text} <Muted>{r.raw.inn ? 'STIR' : 'JShShIR'}</Muted>
        </span>
      ),
      validate: (_c, raw) => {
        if (raw.kind === 'legal' && !raw.inn) return "Yuridik shaxsda STIR yo'q";
        if (raw.kind === 'physical' && !raw.pinfl) return "Jismoniy shaxsda JShShIR yo'q";
        return undefined;
      },
    },
    { id: 'inn', path: 'inn', title: 'STIR (INN)', type: 'text', width: 120, hidden: true },
    { id: 'pinfl', path: 'pinfl', title: 'JShShIR (PINFL)', type: 'text', width: 160, hidden: true },
    { id: 'rows', path: 'rows', title: 'Yozuvlar soni', type: 'number', digits: 0, width: 116, align: 'right', footer: 'sum' },
    {
      id: 'since',
      path: 'since',
      title: 'Hamkorlik boshlangan',
      type: 'date',
      width: 160,
      emptyText: "Noma'lum",
      validate: (c) => (typeof c.value === 'number' && daysFromToday(c.value) > 0 ? 'Sana kelajakda' : undefined),
    },
    {
      id: 'dup',
      path: 'has_duplicates',
      title: 'Dublikat',
      type: 'boolean',
      width: 110,
      align: 'center',
      description: "Bazada shu kontragentning takroriy yozuvlari bor (birlashtirish kerak bo'lishi mumkin).",
      render: (c) => (c.value ? <Badge tone="amber">Dublikat bor</Badge> : <Muted>—</Muted>),
    },
    { id: 'key', path: 'key', title: 'Kalit', type: 'text', width: 80, hidden: true },
  ],
};
