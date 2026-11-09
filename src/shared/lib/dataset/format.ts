const NBSP = ' ';

/** 37000000 → "37 000 000", 12.5 → "12,5" (mintaqada odatiy format, Intl'ga bog'liq emas — testlarda barqaror). */
export function formatNumber(n: number, maxDigits = 2): string {
  const neg = n < 0;
  let s = Math.abs(n).toFixed(maxDigits);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  const [int, frac] = s.split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (neg ? '−' : '') + grouped + (frac ? ',' + frac : '');
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(ms: number, withTime = false): string {
  const d = new Date(ms);
  const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  return withTime ? `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}` : date;
}

/** <input type="date"> uchun YYYY-MM-DD (lokal vaqt). */
export function toInputDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function startOfDay(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export const DAY_MS = 86_400_000;

/** Bugundan sanagacha kun soni (manfiy — o'tib ketgan). */
export function daysFromToday(ms: number, today = Date.now()): number {
  return Math.round((startOfDay(ms) - startOfDay(today)) / DAY_MS);
}

/** +998900000001 → "+998 90 000 00 01" */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('998')) {
    return `+998 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return raw;
}

/** "extra.note" → "Extra › Note", "completed_at" → "Completed at" */
export function humanizePath(path: string): string {
  return path
    .split('.')
    .map((p) => {
      const s = p.replace(/[_-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      return s.charAt(0).toUpperCase() + s.slice(1);
    })
    .join(' › ');
}

export function plural(n: number, word: string): string {
  return `${formatNumber(n, 0)} ${word}`;
}
