import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAppStore } from './store/appStore';
import { api } from './services/api';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import OverviewPage from './pages/OverviewPage';
import AnalyticsPage from './pages/AnalyticsPage';
import PlannerPage from './pages/PlannerPage';
import CalendarPage from './pages/CalendarPage';
import ConnectionsPage from './pages/ConnectionsPage';
import BrandsPage from './pages/BrandsPage';
import AiPage from './pages/AiPage';
import SettingsPage from './pages/SettingsPage';
import InboxPage from './pages/InboxPage';
import ContentLibraryPage from './pages/ContentLibraryPage';
import SmartLinksPage from './pages/SmartLinksPage';
import HashtagsPage from './pages/HashtagsPage';
import ReportingPage from './pages/ReportingPage';
import HistoryPage from './pages/HistoryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { authenticated, setupRequired, loading } = useAppStore();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (setupRequired) return <Navigate to="/setup" replace />;
  if (!authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { setAuth, setLoading, setBrands, setCurrentBrandId, setAccounts } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const status = await api.authStatus();
        setAuth(status.authenticated, status.setupRequired);
        if (status.authenticated) {
          const brands = await api.getBrands();
          setBrands(brands);
          if (brands.length > 0) {
            setCurrentBrandId(brands[0].id);
          }
          const accounts = await api.getAccounts();
          setAccounts(accounts);
        }
      } catch {
        setAuth(false, true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/setup" element={<SetupPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="analytics/:platform" element={<AnalyticsPage />} />
        <Route path="reporting" element={<ReportingPage />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="planner/calendar" element={<CalendarPage />} />
        <Route path="planner/scheduled" element={<HistoryPage status="scheduled" />} />
        <Route path="planner/history" element={<HistoryPage />} />
        <Route path="content-library" element={<ContentLibraryPage />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="smart-links" element={<SmartLinksPage />} />
        <Route path="hashtags" element={<HashtagsPage />} />
        <Route path="ai" element={<AiPage />} />
        <Route path="brands" element={<BrandsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/connections" element={<ConnectionsPage />} />
        <Route path="settings/*" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
