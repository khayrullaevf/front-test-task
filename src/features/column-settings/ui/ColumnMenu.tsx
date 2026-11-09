import { useRef, useState } from 'react';
import { normalizeSearch } from '@/shared/lib/dataset';
import { Icon, Popover } from '@/shared/ui';
import type { ColumnPrefsApi } from '../model/useColumnPrefs';

/** "Ustunlar" menyusi: ko'rsatish/yashirish, tartibni o'zgartirish, standartga qaytarish. */
export function ColumnMenu({ prefs }: { prefs: ColumnPrefsApi }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  const total = prefs.ordered.length;
  const shown = prefs.visible.length;
  const list = q ? prefs.ordered.filter((c) => normalizeSearch(c.title).includes(normalizeSearch(q))) : prefs.ordered;

  return (
    <>
      <button
        ref={btn}
        className={`btn${open ? ' is-active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title="Ustunlarni ko'rsatish, yashirish va tartiblash"
      >
        <Icon name="columns" />
        <span className="btn-label">Ustunlar</span>
        {shown < total && <span className="btn-counter">{shown}/{total}</span>}
      </button>
      {open && btn.current && (
        <Popover anchor={btn.current} onClose={() => setOpen(false)} label="Ustunlar sozlamasi" width={300} align="end">
          <div className="cm-head">
            <div className="search search-sm">
              <Icon name="search" className="search-icon" size={14} />
              <input autoFocus type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ustunni topish" aria-label="Ustunni topish" />
            </div>
            <div className="cm-actions">
              <button className="link-btn" onClick={() => prefs.setAllVisible(true)}>
                Hammasini ko'rsatish
              </button>
              <button className="link-btn" onClick={prefs.reset} disabled={!prefs.customized} title="Tartib, kenglik va ko'rinishni boshlang'ich holatga qaytarish">
                <Icon name="reset" size={12} /> Standart
              </button>
            </div>
          </div>
          <ul className="cm-list">
            {list.map((c) => {
              const idx = prefs.ordered.indexOf(c);
              const visible = prefs.isVisible(c);
              const lastVisible = visible && shown === 1;
              return (
                <li
                  key={c.id}
                  className={`cm-item${dragId === c.id ? ' is-dragging' : ''}`}
                  draggable={!q}
                  onDragStart={(e) => {
                    setDragId(c.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    if (dragId && dragId !== c.id) {
                      e.preventDefault();
                      prefs.move(dragId, c.id);
                    }
                  }}
                  onDragEnd={() => setDragId(null)}
                >
                  {!q && <Icon name="grip" className="cm-grip" />}
                  <label className="cm-label">
                    <input type="checkbox" checked={visible} disabled={lastVisible} onChange={(e) => prefs.setVisible(c.id, e.target.checked)} />
                    <span className="truncate" title={c.title}>
                      {c.title}
                    </span>
                    {c.auto && <span className="tag-new" title={c.description}>yangi</span>}
                    {c.missing && (
                      <span className="tag-missing" title="Bu maydon ma'lumotda topilmadi">
                        <Icon name="warning" size={12} />
                      </span>
                    )}
                  </label>
                  <span className="cm-move">
                    <button disabled={idx === 0} onClick={() => prefs.move(c.id, prefs.ordered[idx - 1].id)} aria-label={`"${c.title}"ni chapga surish`}>
                      <Icon name="chevronUp" size={12} />
                    </button>
                    <button disabled={idx === total - 1} onClick={() => prefs.move(c.id, prefs.ordered[idx + 1].id)} aria-label={`"${c.title}"ni o'ngga surish`}>
                      <Icon name="chevronDown" size={12} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="cm-foot">Sudrab tartiblash mumkin. Sarlavhani ham jadvalda sudrab ko'chirsa bo'ladi.</div>
        </Popover>
      )}
    </>
  );
}
