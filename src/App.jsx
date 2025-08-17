import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useMemo, useState, createContext, useContext } from "react";

// Existing pages/components in your app:
import Dashboard from "./pages/Dashboard.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";

// Admin pages we’ve been working on:
import Admin from "./pages/Admin.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";

/* ---------------------- Auth context via /.auth/me ---------------------- */
const AuthCtx = createContext(null);
export function useAuth() {
  return useContext(AuthCtx);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = loading
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      setLoading(true);
      const res = await fetch("/.auth/me", { credentials: "include" });
      const json = await res.json();
      const cp = json?.clientPrincipal || json?.[0]?.clientPrincipal || json?.[0] || null;
      const roles = (cp?.userRoles || []).filter(Boolean) || [];
      setUser({
        isAuthenticated: !roles.includes("anonymous"),
        roles,
        userDetails: cp?.userDetails,
        identityProvider: cp?.identityProvider
      });
    } catch {
      setUser({ isAuthenticated: false, roles: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();

    // Refresh when tab regains focus (useful after login redirect)
    const onVis = () => {
      if (document.visibilityState === "visible") loadMe();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const isAdmin = useMemo(
    () => (user?.roles || []).map(r => r.toLowerCase()).includes("admin"),
    [user]
  );

  return (
    <AuthCtx.Provider value={{ user, loading, isAdmin, refresh: loadMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

/* --------------------------- Admin route guard -------------------------- */
function AdminRoute({ children }) {
  const { loading, isAdmin } = useAuth();
  if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

/* --------------------------------- App ---------------------------------- */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<SettingsPanel />} />

        {/* Admin pages (protected) */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
