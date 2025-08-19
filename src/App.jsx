import { useEffect, useMemo, useState, createContext, useContext } from "react";
import { HashRouter, Routes, Route, Link, Navigate, useLocation } from "react-router-dom";
import Admin from "./pages/Admin.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";

/* ---------------- Auth Context (reads /.auth/me) ---------------- */
const AuthCtx = createContext({ loading: true, roles: [], user: null, error: null });

function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, roles: [], user: null, error: null });
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await fetch("/.auth/me", { credentials: "include" });
        if (!res.ok) throw new Error(`/.auth/me ${res.status}`);
        const data = await res.json();
        const principal = Array.isArray(data) && data.length > 0 ? data[0] : null;
        const roles = (principal?.userRoles || []).map(String);
        if (!ignore) setState({ loading: false, roles, user: principal, error: null });
      } catch (e) {
        if (!ignore) setState({ loading: false, roles: [], user: null, error: e.message });
      }
    })();
    return () => { ignore = true; };
  }, []);
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

function useAuth() {
  return useContext(AuthCtx);
}

/* ---------------- Route Guards ---------------- */
function RequireRole({ role = "admin", children }) {
  const auth = useAuth();
  const location = useLocation();
  const hasRole = useMemo(
    () => (auth.roles || []).map(r => r.toLowerCase()).includes(role.toLowerCase()),
    [auth.roles, role]
  );

  if (auth.loading) return <div style={{ padding: 16 }}>Checking access…</div>;
  if (auth.error) return <div style={{ padding: 16, color: "#b91c1c" }}>Auth error: {auth.error}</div>;
  if (!hasRole) return <Navigate to="/" state={{ from: location }} replace />;

  return children;
}

/* ---------------- Simple Layout / Nav ---------------- */
function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b1020", color: "white" }}>
      <header style={{ borderBottom: "1px solid #1f2937", padding: "12px 16px", display: "flex", gap: 12 }}>
        <Link to="/" style={{ color: "white", textDecoration: "none", fontWeight: 600 }}>Pool Water Health</Link>
        <Link to="/admin" style={{ color: "white", textDecoration: "none", opacity: 0.85 }}>Admin</Link>
      </header>
      <main style={{ padding: 16 }}>{children}</main>
    </div>
  );
}

/* ---------------- Placeholder Dashboard ---------------- */
function Dashboard() {
  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>Dashboard</h1>
      <p>Welcome back. Use the Admin area to manage users &amp; roles.</p>
    </div>
  );
}

/* ---------------- App ---------------- */
export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/admin"
              element={
                <RequireRole role="admin">
                  <Admin />
                </RequireRole>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireRole role="admin">
                  <AdminUsers />
                </RequireRole>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </AuthProvider>
    </HashRouter>
  );
}
