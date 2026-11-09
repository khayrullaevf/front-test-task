import { useEffect, useRef, useState } from 'react';
import type { ColumnDef, NormRow } from '@/shared/lib/dataset';
import { Icon, renderCell } from '@/shared/ui';

interface Props {
  title: string;
  row: NormRow;
  position: number;
  total: number;
  columns: ColumnDef[];
  isVisible: (c: ColumnDef) => boolean;
  onPrev?: () => void;
  onNext?: () => void;
  onClose: () => void;
}

const isTyping = (el: Element | null) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');

/**
 * Yozuvning to'liq kartasi: jadvalda yashirilgan, yangi (avtomatik) maydonlar va asl JSON ham shu yerda.
 * Ya'ni ma'lumot hech qachon "ko'rinmay" qolmaydi.
 */
export function RowDrawer({ title, row, position, total, columns, isVisible, onPrev, onNext, onClose }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(document.activeElement) || document.querySelector('.popover')) return;
      const inGrid = !!(document.activeElement as HTMLElement | null)?.closest?.('.grid');
      if (e.key === 'Escape') onClose();
      else if (!inGrid && (e.key === 'ArrowUp' || e.key === 'k') && onPrev) (e.preventDefault(), onPrev());
      else if (!inGrid && (e.key === 'ArrowDown' || e.key === 'j') && onNext) (e.preventDefault(), onNext());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext, onClose]);

  useEffect(() => {
    ref.current?.querySelector('.drawer-body')?.scrollTo({ top: 0 });
    // Jadvalda ham shu qatorni ko'rinadigan joyga keltiramiz
    document.querySelector(`tr[data-row-key="${CSS.escape(row.key)}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [row.key]);

  const copy = async (what: 'link' | 'json') => {
    try {
      await navigator.clipboard.writeText(what === 'link' ? window.location.href : JSON.stringify(row.raw, null, 2));
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard ruxsat berilmagan */
    }
  };

  const shown = columns.filter(isVisible);
  const hidden = columns.filter((c) => !isVisible(c));
  const titleOf = (id: string) => columns.find((c) => c.id === id)?.title ?? id;

  const fields = (cols: ColumnDef[]) => (
    <dl className="fields">
      {cols.map((c) => (
        <div key={c.id} className={`field${row.cells[c.id]?.issue ? ' has-issue' : ''}`}>
          <dt>
            {c.title}
            {c.auto && <span className="tag-new">yangi</span>}
          </dt>
          <dd>{renderCell(c, row.cells[c.id], row)}</dd>
        </div>
      ))}
    </dl>
  );

  return (
    <aside ref={ref} className="drawer" aria-label={title}>
      <header className="drawer-head">
        <div className="drawer-title">
          <span className="drawer-pos">
            {position} / {total}
          </span>
          <h2 title={title}>{title}</h2>
        </div>
        <div className="drawer-actions">
          <button className="icon-btn" onClick={() => copy('link')} title="Shu yozuvga havola nusxasi">
            <Icon name={copied === 'link' ? 'check' : 'link'} />
          </button>
          <button className="icon-btn" onClick={onPrev} disabled={!onPrev} title="Oldingi yozuv (↑)">
            <Icon name="chevronUp" />
          </button>
          <button className="icon-btn" onClick={onNext} disabled={!onNext} title="Keyingi yozuv (↓)">
            <Icon name="chevronDown" />
          </button>
          <button className="icon-btn" onClick={onClose} title="Yopish (Esc)" aria-label="Yopish">
            <Icon name="x" />
          </button>
        </div>
      </header>
      <div className="drawer-body">
        {row.issues.length > 0 && (
          <div className="notice notice-warn drawer-issues">
            <Icon name="warning" />
            <div>
              <b>Ma'lumotda e'tibor talab qiladigan joylar</b>
              <ul>
                {row.issues.map((i, k) => (
                  <li key={k}>
                    <b>{titleOf(i.col)}:</b> {i.msg}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {fields(shown)}
        {hidden.length > 0 && (
          <>
            <h3 className="drawer-sub">Jadvalda yashirilgan maydonlar</h3>
            {fields(hidden)}
          </>
        )}
        <details className="raw">
          <summary>
            Asl ma'lumot (JSON)
            <button
              className="link-btn"
              onClick={(e) => {
                e.preventDefault();
                copy('json');
              }}
            >
              <Icon name={copied === 'json' ? 'check' : 'copy'} size={12} /> {copied === 'json' ? 'Nusxa olindi' : 'Nusxa olish'}
            </button>
          </summary>
          <pre>{JSON.stringify(row.raw, null, 2)}</pre>
        </details>
      </div>
    </aside>
  );
}
