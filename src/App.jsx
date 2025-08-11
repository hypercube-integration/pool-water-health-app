// src/App.jsx
import { useEffect, useMemo, useState, createContext, useContext } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
} from "react-router-dom";

// Pages you already have
import Dashboard from "./pages/Dashboard.jsx";
import SettingsPanel from "./components/SettingsPanel.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx"; // assumed existing
// New page we added earlier
import AdminUsers from "./pages/AdminUsers.jsx";

// ---------- Auth context (SWA .auth/me) ----------
const AuthCtx = createContext(null);
export function useAuth() {
  return useContext(AuthCtx);
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // null = unknown (loading), {} = anonymous
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      setLoading(true);
      const res = await fetch("/.auth/me", { credentials: "include" });
      if (!res.ok) throw new Error(`.auth/me ${res.status}`);
      const json = await res.json();

      // SWA returns an array of identities; pick the first
      const cp = json?.clientPrincipal || json?.[0]?.clientPrincipal || json?.[0] || null;

      if (!cp) {
        setUser({ isAuthenticated: false, roles: [] });
      } else {
        const roles = (cp.userRoles || []).filter(Boolean);
        setUser({
          isAuthenticated: !roles.includes("anonymous"),
          userId: cp.userId,
          identityProvider: cp.identityProvider,
          userDetails: cp.userDetails,
          roles,
        });
      }
    } catch {
      setUser({ isAuthenticated: false, roles: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();

    // Refresh on tab visibility (useful after login/logout redirect back)
    const onVis = () => {
      if (document.visibilityState === "visible") loadMe();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Lightweight cache of admin flag for convenience
  const isAdmin = useMemo(() => (user?.roles || []).map(r => r.toLowerCase()).includes("admin"), [user]);

  const value = useMemo(() => ({ user, loading, isAdmin, refresh: loadMe }), [user, loading, isAdmin]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// ---------- Route guard ----------
function AdminRoute({ children }) {
  const { loading, isAdmin } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <Navigate to="/" state={{ from: loc }} replace />;
  return children;
}

// ---------- App shell ----------
function Shell({ children }) {
  const { user, isAdmin } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-semibold">Pool Water Health</Link>
            <nav className="hidden sm:flex items-center gap-3 text-sm">
              <Link to="/" className="hover:underline">Dashboard</Link>
              <Link to="/settings" className="hover:underline">Settings</Link>
              {isAdmin && <Link to="/admin" className="hover:underline">Admin</Link>}
              {isAdmin && <Link to="/admin/users" className="hover:underline">Users</Link>}
            </nav>
          </div>

          <div className="text-sm flex items-center gap-3">
            {user?.isAuthenticated ? (
              <>
                <span className="hidden sm:inline text-gray-600">
                  {user?.userDetails} {isAdmin && <span className="ml-1 px-2 py-0.5 rounded bg-gray-100">admin</span>}
                </span>
                <a className="border rounded px-3 py-1 hover:bg-gray-50" href="/.auth/logout">Sign out</a>
              </>
            ) : (
              <a className="border rounded px-3 py-1 hover:bg-gray-50" href="/.auth/login/github">Sign in</a>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}

// ---------- Routes ----------
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPanel />} />

            {/* Existing admin hub (protected) */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            {/* New: user & role management (protected) */}
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
        </Shell>
      </AuthProvider>
    </BrowserRouter>
  );
}
