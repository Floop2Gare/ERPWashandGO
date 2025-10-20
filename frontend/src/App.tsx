import { useEffect, useMemo } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Layout } from './layout/Layout';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import LeadPage from './pages/LeadPage';
import ServicePage from './pages/ServicePage';
import PurchasesPage from './pages/PurchasesPage';
import PlanningPage from './pages/PlanningPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';
import DocumentsPage from './pages/DocumentsPage';
import LoginPage from './pages/LoginPage';
import UsersAdminPage from './pages/UsersAdminPage';
import { useAppData } from './store/useAppData';
import { SIDEBAR_NAVIGATION_LINKS } from './layout/navigationLinks';
import type { AppPageKey } from './lib/rbac';

const PrivateLayout = () => {
  const isAuthenticated = useAppData((state) => state.currentUserId !== null);
  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

const RequirePage = ({ page, children }: { page: AppPageKey; children: JSX.Element }) => {
  const isAuthenticated = useAppData((state) => state.currentUserId !== null);
  const hasPageAccess = useAppData((state) => state.hasPageAccess);

  const fallbackPath = useMemo(() => {
    if (!isAuthenticated) {
      return '/connexion';
    }
    const fallback = SIDEBAR_NAVIGATION_LINKS.find((link) => hasPageAccess(link.page));
    return fallback ? fallback.to : '/connexion';
  }, [hasPageAccess, isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  if (!hasPageAccess(page)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
};

const App = () => {
  const isAuthenticated = useAppData((state) => state.currentUserId !== null);
  const theme = useAppData((state) => state.theme);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }
    const body = document.body;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    body.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route element={<PrivateLayout />}>
        <Route
          path="/"
          element={
            <RequirePage page="dashboard">
              <DashboardPage />
            </RequirePage>
          }
        />
        <Route
          path="/clients"
          element={
            <RequirePage page="clients">
              <ClientsPage />
            </RequirePage>
          }
        />
        <Route
          path="/lead"
          element={
            <RequirePage page="leads">
              <LeadPage />
            </RequirePage>
          }
        />
        <Route
          path="/service"
          element={
            <RequirePage page="service">
              <ServicePage />
            </RequirePage>
          }
        />
        <Route
          path="/achats"
          element={
            <RequirePage page="achats">
              <PurchasesPage />
            </RequirePage>
          }
        />
        <Route
          path="/documents"
          element={
            <RequirePage page="documents">
              <DocumentsPage />
            </RequirePage>
          }
        />
        <Route
          path="/planning"
          element={
            <RequirePage page="planning">
              <PlanningPage />
            </RequirePage>
          }
        />
        <Route
          path="/stats"
          element={
            <RequirePage page="stats">
              <StatsPage />
            </RequirePage>
          }
        />
        <Route
          path="/parametres"
          element={
            <RequirePage page="parametres">
              <SettingsPage />
            </RequirePage>
          }
        />
        <Route
          path="/parametres/utilisateurs"
          element={
            <RequirePage page="parametres.utilisateurs">
              <UsersAdminPage />
            </RequirePage>
          }
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/' : '/connexion'} replace />}
      />
    </Routes>
  );
};

export default App;
