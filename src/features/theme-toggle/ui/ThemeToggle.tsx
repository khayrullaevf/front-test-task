import { useEffect } from 'react';
import { usePersistentState } from '@/shared/lib/storage';
import { Icon } from '@/shared/ui';

type Theme = 'light' | 'dark';

const systemTheme = (): Theme =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/** Yorug'/qorong'i mavzu. Boshlang'ich qiymat — tizim sozlamasi. */
export function ThemeToggle() {
  const [theme, setTheme] = usePersistentState<Theme>('crm-theme', systemTheme());
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <button className="icon-btn" onClick={() => setTheme(next)} title={next === 'dark' ? "Qorong'i mavzu" : "Yorug' mavzu"} aria-label="Mavzuni almashtirish">
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  );
}
