// FILE: src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";

// Pages
import Dashboard from "./pages/Dashboard.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import Admin from "./pages/Manage.jsx";
import AdminUsers from "./pages/ManageUsers.jsx";

// Header with login menu
import Header from "./components/Header.jsx";

/* ---------------------- Auth context via /.auth/me ---------------------- */
const AuthCtx = createContext(null);
export function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = loading
  const [loading, setLoading] = useState(true);

  // ensure we only bootstrap the profile once per session
  const bootstrappedRef = useRef(false);

  async function loadMe() {
    try {
      setLoading(true);
      const res = await fetch("/.auth/me", { credentials: "include" });
      const json = await res.json();
      const cp = json?.clientPrincipal || json?.[0]?.clientPrincipal || json?.[0] || null;
      const roles = (cp?.userRoles || []).filter(Boolean) || [];
      const nextUser = {
        isAuthenticated: !roles.includes("anonymous"),
        roles,
        userDetails: cp?.userDetails,
        identityProvider: cp?.identityProvider
      };
      setUser(nextUser);

      // Auto-bootstrap profile to Cosmos (name/email) once the user is authenticated
      if (nextUser.isAuthenticated && !bootstrappedRef.current) {
        bootstrappedRef.current = true;
        try {
          await fetch("/api/profiles/bootstrap", { method: "POST", credentials: "include" });
        } catch {
          // non-fatal; ignore
        }
      }
    } catch {
      setUser({ isAuthenticated: false, roles: [] });
    } finally { setLoading(false); }
  }

  useEffect(() => { loadMe(); }, []);
  const isAdmin = useMemo(
    () => (user?.roles || []).map(r => String(r).toLowerCase()).includes("admin"),
    [user]
  );

  return (
    <AuthCtx.Provider value={{ user, loading, isAdmin, refresh: loadMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

/* --------------------------- (Optional) guard --------------------------- */
// Re-enable later if you want: wrap admin routes with this
// function AdminRoute({ children }) {
//   const { loading, isAdmin } = useAuth();
//   if (loading) return <div style={{ padding: 16 }}>Loading…</div>;
//   if (!isAdmin) return <Navigate to="/" replace />;
//   return children;
// }

export default function App() {
  return (
    <AuthProvider>
      {/* New header shown on every page */}
      <Header />

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<SettingsPanel />} />

        {/* Admin pages */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        {/* Alias path for links that use /manage-users */}
        <Route path="/manage-users" element={<AdminUsers />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
