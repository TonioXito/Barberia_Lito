import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "./firebase/auth";
import { useSettings } from "./hooks/useSettings";
import { Layout } from "./components/Layout";
import { PageLoader } from "./components/ui/Spinner";
import { ConfigNotice } from "./components/ConfigNotice";
import { LoginPage } from "./pages/Login";
import { ActivationPage } from "./pages/Activation";
import { DashboardPage } from "./pages/Dashboard";
import { PosPage } from "./pages/Pos";
import { InventoryPage } from "./pages/Inventory";
import { ReportsPage } from "./pages/Reports";
import { ClientsPage } from "./pages/Clients";
import { CreditsPage } from "./pages/Credits";
import { SettingsPage } from "./pages/Settings";
import { NotFoundPage } from "./pages/NotFound";

function SubscriptionGate({ children }) {
  const { settings, error } = useSettings();
  const [sub, setSub] = useState(null);

  useEffect(() => {
    if (!settings) return;
    if (error) {
      setSub({ error: true });
      return;
    }
    const s = settings.subscription || {};
    let ok = !!s.active;
    if (ok && s.expiresAt) {
      const exp = s.expiresAt?.toDate ? s.expiresAt.toDate() : new Date(s.expiresAt);
      if (exp < new Date()) ok = false;
    }
    setSub({ ok });
  }, [settings, error]);

  if (!sub) return <PageLoader />;
  if (sub.error) return <ConfigNotice error={error} />;
  if (!sub.ok) return <Navigate to="/activacion" replace />;
  return children;
}

function Protected({ children }) {
  const { isAuthed, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return (
    <SubscriptionGate>
      <Layout>{children}</Layout>
    </SubscriptionGate>
  );
}

// Página de activación: requiere sesión iniciada (no requiere suscripción)
function AuthOnly({ children }) {
  const { isAuthed, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (!isAuthed) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/activacion"
        element={
          <AuthOnly>
            <ActivationPage />
          </AuthOnly>
        }
      />
      <Route
        path="/"
        element={
          <Protected>
            <DashboardPage />
          </Protected>
        }
      />
      <Route
        path="/pos"
        element={
          <Protected>
            <PosPage />
          </Protected>
        }
      />
      <Route
        path="/inventario"
        element={
          <Protected>
            <InventoryPage />
          </Protected>
        }
      />
      <Route
        path="/reportes"
        element={
          <Protected>
            <ReportsPage />
          </Protected>
        }
      />
      <Route
        path="/clientes"
        element={
          <Protected>
            <ClientsPage />
          </Protected>
        }
      />
      <Route
        path="/creditos"
        element={
          <Protected>
            <CreditsPage />
          </Protected>
        }
      />
      <Route
        path="/configuracion"
        element={
          <Protected>
            <SettingsPage />
          </Protected>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}