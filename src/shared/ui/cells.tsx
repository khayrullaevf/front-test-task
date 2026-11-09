import type { ReactNode } from 'react';
import { formatNumber, type Cell, type ColumnDef, type NormRow, type Tone } from '@/shared/lib/dataset';

export function Badge({
  tone = 'gray',
  outline,
  title,
  children,
}: {
  tone?: Tone;
  outline?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <span className={`badge tone-${tone}${outline ? ' badge-outline' : ''}`} title={title}>
      {children}
    </span>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <span className="muted">{children}</span>;
}

export function IssueMark({ msg }: { msg: string }) {
  return (
    <span className="issue-mark" title={msg} aria-label={`Ma'lumot muammosi: ${msg}`} role="img">
      <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
        <path d="M8 1.5 15 14H1z" fill="currentColor" />
        <path d="M8 6v4M8 11.6v.4" stroke="var(--issue-fg)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function defaultRender(col: ColumnDef, cell: Cell): ReactNode {
  // Parse bo'lmagan qiymat — asl matnni ko'rsatamiz, yo'qotmaymiz
  if (cell.value === null) return cell.text;
  switch (col.type) {
    case 'enum': {
      const key = String(cell.value);
      const opt = col.options?.[key];
      if (!opt && col.strict) return <Badge outline>{key}</Badge>;
      return <Badge tone={opt?.tone ?? 'gray'}>{cell.text}</Badge>;
    }
    case 'array':
      return (
        <span className="chips">
          {(cell.value as string[]).map((k) => (
            <Badge key={k} tone={col.options?.[k]?.tone ?? 'gray'}>
              {col.options?.[k]?.label ?? k}
            </Badge>
          ))}
        </span>
      );
    case 'boolean':
      return cell.value ? <Badge tone="green">Ha</Badge> : <Muted>Yo'q</Muted>;
    case 'number':
      return (
        <>
          {cell.text}
          {col.unit && <span className="unit"> {col.unit}</span>}
        </>
      );
    case 'date': {
      if (!cell.hasTime) return cell.text;
      const [d, t] = cell.text.split(' ');
      return (
        <>
          {d} <span className="unit">{t}</span>
        </>
      );
    }
    default:
      return cell.text;
  }
}

/** Bitta katak. Maxsus renderer xato bersa ham, qiymat oddiy matn sifatida ko'rinadi. */
export function renderCell(col: ColumnDef, cell: Cell | undefined, row: NormRow): ReactNode {
  if (!cell) return <Muted>—</Muted>;
  let content: ReactNode;
  if (cell.empty) {
    content = <Muted>{col.emptyText ?? '—'}</Muted>;
  } else {
    try {
      content = col.render && cell.value !== null ? col.render(cell, row) : defaultRender(col, cell);
    } catch {
      content = cell.text;
    }
  }
  if (!cell.issue) return content;
  return (
    <span className="cell-issue">
      <span className="cell-issue-content">{content}</span>
      <IssueMark msg={cell.issue} />
    </span>
  );
}

export function Money({ amount, currency }: { amount: number; currency?: unknown }) {
  return (
    <span className="money">
      {formatNumber(amount, 2)}
      {typeof currency === 'string' && currency && <span className="unit"> {currency}</span>}
    </span>
  );
}

/** Valyuta bo'yicha alohida yig'indi — UZS va USD'ni qo'shib bo'lmaydi. */
export function sumByCurrency(rows: NormRow[], amountCol: string, currencyPath: string): ReactNode {
  const sums = new Map<string, number>();
  for (const r of rows) {
    const v = r.cells[amountCol]?.value;
    if (typeof v !== 'number') continue;
    const cur = (r.flat[currencyPath] as string) || '?';
    sums.set(cur, (sums.get(cur) ?? 0) + v);
  }
  if (!sums.size) return null;
  return (
    <span className="footer-multi">
      {[...sums.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([cur, sum]) => (
          <span key={cur}>
            {formatNumber(sum, 2)} <span className="unit">{cur}</span>
          </span>
        ))}
    </span>
  );
}
