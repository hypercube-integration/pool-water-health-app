// FILE: src/App.jsx  (DROP-IN)
import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";

// Pages
import Dashboard from "./pages/Dashboard.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import Admin from "./pages/Manage.jsx";
import AdminUsers from "./pages/ManageUsers.jsx";

// Header on all pages
import Header from "./components/Header.jsx";

/* ---------------------- Auth context via /.auth/me ---------------------- */
const AuthCtx = createContext(null);
export function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);   // null = loading
  const [loading, setLoading] = useState(true);
  const bootstrappedRef = useRef(false);

  async function loadMe() {
    try {
      setLoading(true);
      const res = await fetch("/.auth/me", { credentials: "include" });
      const json = await res.json();
      const cp = json?.clientPrincipal || json?.[0]?.clientPrincipal || json?.[0] || null;
      const roles = (cp?.userRoles || []).filter(r => r && r !== "anonymous");
      setUser({
        isAuthenticated: roles.length > 0,
        roles,
        userDetails: cp?.userDetails,
        identityProvider: cp?.identityProvider?.toLowerCase(),
        userId: cp?.userId || ""
      });
    } catch {
      setUser({ isAuthenticated: false, roles: [] });
    } finally { setLoading(false); }
  }

  useEffect(() => { loadMe(); }, []);
  const isAdmin = useMemo(() => (user?.roles || []).map(r=>String(r).toLowerCase()).includes("admin"), [user]);

  // One-time bootstrap to save name/email to Cosmos after sign-in
  useEffect(() => {
    if (!user?.isAuthenticated) return;
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    fetch("/api/profiles/bootstrap", { method:"POST", credentials:"include" }).catch(()=>{});
  }, [user?.isAuthenticated]);

  return <AuthCtx.Provider value={{ user, loading, isAdmin, refresh: loadMe }}>{children}</AuthCtx.Provider>;
}

export default function App() {
  return (
    <AuthProvider>
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<SettingsPanel />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/manage-users" element={<AdminUsers />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
