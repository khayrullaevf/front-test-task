import { Component, type ErrorInfo, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { counterpartiesConfig } from '@/entities/counterparty';
import { licensesConfig } from '@/entities/license';
import { tripsConfig } from '@/entities/trip';
import CounterpartiesPage from '@/pages/counterparties';
import LicensesPage from '@/pages/licenses';
import NotFoundPage from '@/pages/not-found';
import TripsPage from '@/pages/trips';
import { AppLayout, type NavItem } from '@/widgets/app-layout';

const NAV: NavItem[] = [
  { path: '/trips', icon: 'truck', config: tripsConfig },
  { path: '/counterparties', icon: 'users', config: counterpartiesConfig },
  { path: '/licenses', icon: 'license', config: licensesConfig },
];

/** Kutilmagan render xatosi butun ilovani "oq ekran"ga aylantirmasin. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CRM] render xatosi', error, info.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="page">
        <div className="state-box state-error" role="alert">
          <h2>Kutilmagan xato yuz berdi</h2>
          <pre className="state-detail">{this.state.error.message}</pre>
          <button className="btn btn-primary" onClick={() => this.setState({ error: null })}>
            Qayta urinish
          </button>
        </div>
      </section>
    );
  }
}

/*
 * HashRouter: build natijasi istalgan statik hostingda (yoki GitHub Pages'da) server sozlamasisiz ishlaydi.
 */
export function App() {
  return (
    <HashRouter>
      <AppLayout nav={NAV}>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Navigate to="/trips" replace />} />
            <Route path="/trips" element={<TripsPage />} />
            <Route path="/counterparties" element={<CounterpartiesPage />} />
            <Route path="/licenses" element={<LicensesPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </AppLayout>
    </HashRouter>
  );
}
