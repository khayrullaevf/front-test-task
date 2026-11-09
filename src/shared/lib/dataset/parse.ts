export interface Parsed<T> {
  value: T | null;
  issue?: string;
}

const show = (v: unknown) => (typeof v === 'string' ? `"${v}"` : JSON.stringify(v));

/**
 * Sonni "kechirimli" o'qiydi: 16, "16", "12,5", "1 200,5".
 * Matndan o'qilgan son ham ⚠ oladi — qiymat ishlaydi, lekin manba noto'g'ri formatda ekani ko'rinib turadi.
 */
export function parseNumber(v: unknown): Parsed<number> {
  if (v === null || v === undefined || v === '') return { value: null };
  if (typeof v === 'number') {
    return Number.isFinite(v) ? { value: v } : { value: null, issue: `Noto'g'ri son: ${show(v)}` };
  }
  if (typeof v === 'string') {
    const s = v.trim().replace(/[\s  ]/g, '').replace(',', '.');
    if (/^[-+]?\d+(\.\d+)?$/.test(s)) {
      return { value: Number(s), issue: `Son matn ko'rinishida kelgan: ${show(v)}` };
    }
  }
  return { value: null, issue: `Son kutilgan edi: ${show(v)}` };
}

export interface ParsedDate {
  ms: number;
  hasTime: boolean;
}

const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const DMY_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T](\d{1,2}):(\d{2}))?$/;

function localDate(y: number, m: number, d: number, hh = 0, mm = 0): number | null {
  const dt = new Date(y, m - 1, d, hh, mm);
  // 31.02.2026 kabi "siljib ketgan" sanalarni rad etamiz
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt.getTime();
}

/**
 * Qo'llab-quvvatlanadi: ISO 8601 (vaqt bilan/vaqtsiz), DD.MM.YYYY, unix timestamp (s/ms).
 * ISO bo'lmagan format ishlaydi, lekin ⚠ oladi.
 */
export function parseDate(v: unknown): Parsed<ParsedDate> {
  if (v === null || v === undefined || v === '') return { value: null };
  if (typeof v === 'number' && Number.isFinite(v)) {
    const ms = v > 1e11 ? v : v * 1000;
    return { value: { ms, hasTime: true }, issue: `Sana raqam (timestamp) ko'rinishida: ${v}` };
  }
  if (typeof v !== 'string') return { value: null, issue: `Sana kutilgan edi: ${show(v)}` };
  const s = v.trim();

  const iso = ISO_RE.exec(s);
  if (iso) {
    const [, y, m, d, hh, mi, , tz] = iso;
    if (hh === undefined) {
      const ms = localDate(+y, +m, +d);
      return ms === null ? { value: null, issue: `Mavjud bo'lmagan sana: ${show(v)}` } : { value: { ms, hasTime: false } };
    }
    const ms = tz ? Date.parse(s) : localDate(+y, +m, +d, +hh, +mi);
    if (ms === null || Number.isNaN(ms)) return { value: null, issue: `Mavjud bo'lmagan sana: ${show(v)}` };
    return { value: { ms, hasTime: true } };
  }

  const dmy = DMY_RE.exec(s);
  if (dmy) {
    const [, d, m, y, hh, mi] = dmy;
    const ms = localDate(+y, +m, +d, hh ? +hh : 0, mi ? +mi : 0);
    if (ms === null) return { value: null, issue: `Mavjud bo'lmagan sana: ${show(v)}` };
    return { value: { ms, hasTime: hh !== undefined }, issue: `Sana nostandart formatda: ${show(v)}` };
  }

  return { value: null, issue: `Sanani o'qib bo'lmadi: ${show(v)}` };
}

export function parseBoolean(v: unknown): Parsed<boolean> {
  if (v === null || v === undefined || v === '') return { value: null };
  if (typeof v === 'boolean') return { value: v };
  const s = String(v).trim().toLowerCase();
  if (['true', '1', 'ha', 'yes'].includes(s)) return { value: true, issue: `Mantiqiy qiymat matn ko'rinishida: ${show(v)}` };
  if (['false', '0', "yo'q", 'no'].includes(s)) return { value: false, issue: `Mantiqiy qiymat matn ko'rinishida: ${show(v)}` };
  return { value: null, issue: `Ha/Yo'q kutilgan edi: ${show(v)}` };
}

/** Har qanday qiymatni o'qiladigan matnga aylantiradi (obyekt/massiv ham yo'qolmaydi). */
export function toText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return v.map(toText).filter(Boolean).join(', ');
  if (typeof v === 'object') {
    return Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== null && x !== undefined && x !== '')
      .map(([k, x]) => `${k}: ${toText(x)}`)
      .join('; ');
  }
  return String(v);
}

/** Qidiruv uchun: kichik harf, o'zbekcha apostrof variantlarini birxillashtirish. */
export function normalizeSearch(s: string): string {
  return s
    .toLocaleLowerCase('uz')
    .replace(/[ʻʼ‘’`´']/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
