import type { ReactNode } from 'react';

/** Ustun turi — filtr UI, saralash va formatlash shunga qarab tanlanadi. */
export type ColType = 'text' | 'number' | 'date' | 'enum' | 'array' | 'boolean';

export type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'teal';

export interface EnumOption {
  label: string;
  tone?: Tone;
  /** Saralash tartibi (masalan, status hayot sikli bo'yicha). */
  order?: number;
}

export type RawRow = Record<string, unknown>;
export type FlatRow = Record<string, unknown>;
export type SortKey = (string | number)[] | null;

/** Bitta katakning normallashtirilgan ko'rinishi. Bir marta hisoblanadi, keyin faqat o'qiladi. */
export interface Cell {
  /** Normallashtirilgan qiymat: string | number | boolean | string[] | null (sana — ms). */
  value: unknown;
  /** Ekranda / qidiruvda / eksportda ishlatiladigan matn. */
  text: string;
  sortKey: SortKey;
  /** Qiymatlar ro'yxati filtri uchun kalitlar ('' = bo'sh). */
  filterKeys: string[];
  empty: boolean;
  /** Ma'lumot sifati muammosi (⚠ bilan ko'rsatiladi). */
  issue?: string;
  /** Sana katagida vaqt bormi. */
  hasTime?: boolean;
}

export interface NormRow {
  key: string;
  index: number;
  raw: RawRow;
  flat: FlatRow;
  cells: Record<string, Cell>;
  issues: { col: string; msg: string }[];
  /** Global qidiruv uchun tayyorlangan (kichik harf, normallashtirilgan) matn. */
  search: string;
}

export interface ColumnDef {
  id: string;
  title: string;
  type: ColType;
  /** Yoyilgan (flatten) qatordagi nuqtali yo'l: "driver.name". */
  path?: string;
  /** Hisoblanadigan ustun. */
  get?: (raw: RawRow, flat: FlatRow) => unknown;
  /** Hisoblanadigan ustun foydalanadigan yo'llar — ular "noma'lum" ustun sifatida takrorlanmaydi. */
  uses?: string[];
  options?: Record<string, EnumOption>;
  /** true bo'lsa, options'da yo'q qiymat ⚠ bilan belgilanadi. */
  strict?: boolean;
  unit?: string;
  digits?: number;
  width?: number;
  align?: 'left' | 'right' | 'center';
  /** Standart holatda yashirin. */
  hidden?: boolean;
  /** Bo'sh qiymat uchun matn ("—" o'rniga ma'noli izoh). */
  emptyText?: string;
  description?: string;
  validate?: (cell: Cell, raw: RawRow, flat: FlatRow) => string | undefined;
  sortKey?: (cell: Cell, raw: RawRow, flat: FlatRow) => SortKey;
  render?: (cell: Cell, row: NormRow) => ReactNode;
  footer?: 'sum' | 'avg' | ((rows: NormRow[]) => ReactNode);
  /** Ma'lumotda topilgan, lekin konfiguratsiyada yo'q maydon. */
  auto?: boolean;
  /** Konfiguratsiyada bor, lekin ma'lumotda umuman uchramadi (struktura o'zgargan bo'lishi mumkin). */
  missing?: boolean;
}

export interface PageConfig {
  id: string;
  title: string;
  subtitle: string;
  file: string;
  /** Yozuvlar massivi qayerda turishi kutiladi ("items", "data.licenses", "" = root). */
  recordsPath: string;
  rowKey: string;
  /** Eksport fayli nomi va drawer sarlavhasi uchun. */
  titleOf?: (row: NormRow) => string;
  columns: ColumnDef[];
  defaultSort: { id: string; desc: boolean }[];
  /** Avto-ustun sifatida ko'rsatilmaydigan yo'llar. */
  ignore?: string[];
}

export interface Dataset {
  columns: ColumnDef[];
  rows: NormRow[];
  meta: {
    recordsPath: string;
    /** recordsPath'da topilmadi, avtomatik qidiruv bilan topildi. */
    pathFallback: boolean;
    declaredTotal?: number;
    autoColumns: string[];
    missingColumns: string[];
    issueRows: number;
  };
}
