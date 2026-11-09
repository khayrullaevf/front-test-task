import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/shared/ui';

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const isTyping = (el: Element | null) =>
  !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el as HTMLElement).isContentEditable);

/** Global qidiruv: yozish bilan (debounce) qo'llanadi, "/" — fokus, Esc — tozalash. */
export function SearchInput({ value, onChange, placeholder }: Props) {
  const [local, setLocal] = useState(value);
  const sent = useRef(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tashqaridan o'zgarsa ("Hammasini tozalash", URL) — maydonni yangilash
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setLocal(value);
    }
  }, [value]);

  useEffect(() => {
    if (local === sent.current) return;
    const t = setTimeout(() => {
      sent.current = local;
      onChange(local);
    }, 180);
    return () => clearTimeout(t);
  }, [local, onChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !isTyping(document.activeElement)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="search">
      <Icon name="search" className="search-icon" />
      <input
        ref={inputRef}
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && local) {
            e.preventDefault();
            setLocal('');
          }
        }}
        placeholder={placeholder ?? 'Qidirish…'}
        aria-label="Barcha ustunlar bo'yicha qidirish"
        spellCheck={false}
      />
      {local ? (
        <button className="search-clear" onClick={() => setLocal('')} aria-label="Qidiruvni tozalash" title="Tozalash (Esc)">
          <Icon name="x" size={14} />
        </button>
      ) : (
        <kbd className="search-kbd" title="Qidiruvga o'tish">/</kbd>
      )}
    </div>
  );
}
