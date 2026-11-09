import type { EnumOption } from '@/shared/lib/dataset';

/** Davlat kodlari (ISO 3166-1 alpha-2) → nomi. Ro'yxatda yo'q kod ham ko'rsatiladi, faqat nomsiz. */
export const COUNTRIES: Record<string, EnumOption> = {
  UZ: { label: "O'zbekiston" },
  KZ: { label: "Qozog'iston" },
  KG: { label: "Qirg'iziston" },
  TJ: { label: 'Tojikiston' },
  TM: { label: 'Turkmaniston' },
  RU: { label: 'Rossiya' },
  CN: { label: 'Xitoy' },
  TR: { label: 'Turkiya' },
  AF: { label: "Afg'oniston" },
};
