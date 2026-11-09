import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ThemeToggle } from '@/features/theme-toggle';
import { useDataset } from '@/shared/api';
import type { PageConfig } from '@/shared/lib/dataset';
import { lastQueryFor } from '@/shared/lib/storage';
import { Icon, type IconName } from '@/shared/ui';

export interface NavItem {
  path: string;
  icon: IconName;
  config: PageConfig;
}

function NavCount({ config }: { config: PageConfig }) {
  const { state } = useDataset(config);
  if (state.status === 'ready') {
    const issues = state.ds.meta.issueRows;
    return (
      <span className="nav-count" title={issues ? `${issues} ta qatorda ma'lumot muammosi` : undefined}>
        {state.ds.rows.length}
        {issues > 0 && <span className="nav-dot" aria-hidden />}
      </span>
    );
  }
  if (state.status === 'error') return <Icon name="warning" size={14} className="nav-err" />;
  return <span className="nav-count is-loading">…</span>;
}

export function AppLayout({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  useLocation(); // sahifa almashganda saqlangan filtr havolalarini yangilash uchun
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">
            <Icon name="truck" size={18} />
          </span>
          <span className="brand-text">
            <b>Logistika CRM</b>
            <small>Ma'lumotlar jadvallari</small>
          </span>
        </div>
        <nav className="nav" aria-label="Bo'limlar">
          {nav.map((n) => (
            <NavLink key={n.path} to={`${n.path}${lastQueryFor(n.config.id)}`} className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}>
              <Icon name={n.icon} />
              <span className="nav-label">{n.config.title}</span>
              <NavCount config={n.config} />
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <ThemeToggle />
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
