const PATHS = {
  search: 'M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11ZM11 11l3.5 3.5',
  filter: 'M2 3h12l-4.5 5.5V13l-3 1.5v-6L2 3Z',
  arrowUp: 'M8 13V3M4 7l4-4 4 4',
  arrowDown: 'M8 3v10M4 9l4 4 4-4',
  columns: 'M2 3h12v10H2zM6 3v10M10 3v10',
  download: 'M8 2v8.5M4.5 7 8 10.5 11.5 7M2.5 13.5h11',
  refresh: 'M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3',
  x: 'M4 4l8 8M12 4l-8 8',
  chevronLeft: 'M10 3 5 8l5 5',
  chevronRight: 'M6 3l5 5-5 5',
  chevronUp: 'M3 10l5-5 5 5',
  chevronDown: 'M3 6l5 5 5-5',
  warning: 'M8 1.8 15 14H1L8 1.8ZM8 6.5v3.2M8 11.6v.2',
  info: 'M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM8 7.2v4M8 4.8v.2',
  grip: 'M6 4h.01M10 4h.01M6 8h.01M10 8h.01M6 12h.01M10 12h.01',
  sun: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3 3l1 1M12 12l1 1M3 13l1-1M12 4l1-1',
  moon: 'M13.5 9.5A6 6 0 0 1 6.5 2.5a6 6 0 1 0 7 7Z',
  truck: 'M1.5 4h8v7h-8zM9.5 6.5h3l2 2.5v2h-5M4 13a1.3 1.3 0 1 0 0-2.6A1.3 1.3 0 0 0 4 13ZM11.5 13a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Z',
  users: 'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4M11 2.8a2.5 2.5 0 0 1 0 4.6M12.5 10.3c1.2.6 2 1.9 2 3.7',
  license: 'M3 1.5h7l3 3v10H3zM10 1.5v3h3M5.5 8h5M5.5 10.5h5M5.5 5.5h2',
  eye: 'M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5ZM8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  reset: 'M2.5 8a5.5 5.5 0 1 0 1.6-3.9M2.5 2.5v3h3',
  check: 'M3 8.5 6.5 12 13 4.5',
  copy: 'M5.5 5.5h8v8h-8zM10.5 5.5v-3h-8v8h3',
  link: 'M6.5 9.5l3-3M7 4.5l1.2-1.2a2.8 2.8 0 0 1 4 4L11 8.5M9 11.5l-1.2 1.2a2.8 2.8 0 0 1-4-4L5 7.5',
  rows: 'M2 3.5h12M2 8h12M2 12.5h12',
  keyboard: 'M1.5 4h13v8h-13zM4 6.5h.01M6.5 6.5h.01M9 6.5h.01M11.5 6.5h.01M4.5 9.5h7',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={`icon ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
