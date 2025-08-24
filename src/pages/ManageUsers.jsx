import React, { useEffect, useMemo, useState } from "react";

/** Utilities */
const toArray = (roles) =>
  (Array.isArray(roles) ? roles : String(roles || ""))
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

const toCSV = (rolesArr) =>
  (rolesArr || [])
    .map((r) => String(r || "").trim())
    .filter(Boolean)
    .join(",");

const uniq = (arr) => Array.from(new Set(arr || []));
const hasAdmin = (roles) => toArray(roles).some((r) => r.toLowerCase() === "admin");

/** Default role catalog you use in SWA */
const DEFAULT_ROLE_OPTIONS = [
  "admin",
  "contributor",
  "writer",
  "editor",
  "deleter",
  "exporter",
  "authenticated",
  "anonymous",
];

/** Modal (no external libs) */
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div style={m.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={m.panel} onClick={(e) => e.stopPropagation()}>
        <div style={m.header}>
          <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
          <button onClick={onClose} style={m.iconBtn} aria-label="Close">✕</button>
        </div>
        <div style={m.body}>{children}</div>
      </div>
    </div>
  );
}

/** Main component */
export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // entire user object
  const [selectedRoles, setSelectedRoles] = useState([]); // array of strings

  useEffect(() => {
    (async () => {
      await loadAuth();
      await fetchUsers();
    })();
  }, []);

  const clientPrincipal = useMemo(() => auth?.clientPrincipal || null, [auth]);
  const userRoles = useMemo(() => uniq(clientPrincipal?.userRoles || []), [clientPrincipal]);
  const isAdmin = useMemo(() => hasAdmin(userRoles), [userRoles]);

  // Build role catalog from defaults + anything we see attached to users
  const dynamicRoles = useMemo(() => {
    const found = new Set(DEFAULT_ROLE_OPTIONS.map((r) => r.toLowerCase()));
    for (const u of users) {
      const csv = u?.properties?.roles || "";
      for (const r of toArray(csv)) found.add(r.toLowerCase());
    }
    // Keep "admin" at top, then alphabetical
    const arr = Array.from(found);
    arr.sort((a, b) => {
      if (a === "admin") return -1;
      if (b === "admin") return 1;
      return a.localeCompare(b);
    });
    return arr;
  }, [users]);

  async function loadAuth() {
    try {
      setAuthLoading(true);
      const res = await fetch("/.auth/me", { credentials: "include" });
      if (res.status === 204) {
        setAuth(null);
        return;
      }
      if (!res.ok) throw new Error(`/.auth/me failed: ${res.status}`);
      const data = await res.json();
      setAuth(data || null);
    } catch (e) {
      console.error("auth load error", e);
      setAuth(null);
    } finally {
      setAuthLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/manageUsers", { credentials: "include" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Fetch users failed: ${res.status} ${txt}`);
      }
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  /** Open modal for a user */
  function openEditor(u) {
    if (!isAdmin) {
      setError("You don't have permission to edit roles.");
      return;
    }
    setEditingUser(u);
    setSelectedRoles(toArray(u?.properties?.roles || ""));
    setEditorOpen(true);
  }

  /** Toggle checkbox */
  function toggleRole(role) {
    const rl = role.trim();
    setSelectedRoles((prev) =>
      prev.includes(rl) ? prev.filter((r) => r !== rl) : [...prev, rl]
    );
  }

  /** Save roles (PATCH) */
  async function saveRoles() {
    if (!isAdmin || !editingUser) return;

    const up = editingUser.properties || {};
    const provider = up.provider;
    const userId = up.userId;

    if (!provider || !userId) {
      setError("Internal error: missing provider or userId.");
      return;
    }

    const rolesCsv = toCSV(selectedRoles);

    try {
      setStatusMessage("Updating…");
      setError("");
      const res = await fetch("/api/manageUsers/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, userId, roles: rolesCsv }),
      });
      const txt = await res.text();
      if (!res.ok) {
        throw new Error(`Update failed: ${res.status} ${txt}`);
      }
      setStatusMessage("Roles updated.");
      setEditorOpen(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (e) {
      console.error(e);
      setError(e.message || "Update failed.");
    } finally {
      setTimeout(() => setStatusMessage(""), 2000);
    }
  }

  /** Delete user */
  async function deleteUser(u) {
    if (!isAdmin) {
      setError("You don't have permission to delete users.");
      return;
    }
    const up = u?.properties || {};
    const provider = up.provider;
    const userId = up.userId;
    if (!provider || !userId) {
      setError("Internal error: missing provider or userId.");
      return;
    }

    if (!confirm(`Remove "${up.displayName || userId}" from this Static Web App?`)) return;

    try {
      setStatusMessage("Deleting…");
      setError("");
      const res = await fetch("/api/manageUsers/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider, userId }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`Delete failed: ${res.status} ${txt}`);
      setStatusMessage("User deleted.");
      await fetchUsers();
    } catch (e) {
      console.error(e);
      setError(e.message || "Delete failed.");
    } finally {
      setTimeout(() => setStatusMessage(""), 2000);
    }
  }

  const s = styles;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <h1 style={s.h1}>User & Role Management</h1>
        <button onClick={fetchUsers} disabled={loading} style={s.primaryBtn}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      <section style={s.topMeta}>
        {authLoading ? (
          <div style={s.muted}>Checking your permissions…</div>
        ) : clientPrincipal ? (
          <div style={s.metaRow}>
            <span>
              Signed in as <strong>{clientPrincipal.userDetails}</strong>
            </span>
            <span style={isAdmin ? s.badgeAdmin : s.badgeViewOnly}>
              {isAdmin ? "Admin" : "View-only"}
            </span>
          </div>
        ) : (
          <div style={s.errorText}>You are not signed in.</div>
        )}
      </section>

      {!isAdmin && clientPrincipal && (
        <div style={s.banner}>
          You have view-only access. Ask an admin to grant the <code>admin</code> role to edit or delete users.
        </div>
      )}

      {statusMessage && <div style={s.statusOk}>{statusMessage}</div>}
      {error && <div style={s.statusErr}>{error}</div>}

      <div style={s.card}>
        {loading ? (
          <p style={s.muted}>Loading users…</p>
        ) : users.length === 0 ? (
          <p style={s.muted}>No users to display.</p>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Display Name</th>
                <th style={s.th}>Provider</th>
                <th style={s.th}>User ID</th>
                <th style={s.th}>Roles</th>
                {isAdmin && <th style={s.th} />}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const up = u.properties || {};
                return (
                  <tr key={u.id}>
                    <td style={s.td}>{up.displayName || "—"}</td>
                    <td style={s.td}>{up.provider || "—"}</td>
                    <td style={{ ...s.td, fontFamily: "monospace" }}>{up.userId || "—"}</td>
                    <td style={s.td}>{toCSV(toArray(up.roles)) || "—"}</td>
                    {isAdmin && (
                      <td style={s.tdRight}>
                        <button style={s.smallGhost} onClick={() => openEditor(u)}>
                          Edit
                        </button>
                        <button style={s.smallDanger} onClick={() => deleteUser(u)}>
                          Delete
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Roles editor modal */}
      <Modal
        open={editorOpen}
        title={
          editingUser
            ? `Edit roles: ${editingUser?.properties?.displayName || editingUser?.properties?.userId || ""}`
            : "Edit roles"
        }
        onClose={() => setEditorOpen(false)}
      >
        {editingUser ? (
          <>
            <div style={{ marginBottom: 8, color: "#64748b" }}>
              <div>
                <strong>Provider:</strong> {editingUser?.properties?.provider}
              </div>
              <div style={{ wordBreak: "break-all" }}>
                <strong>User ID:</strong> <span style={{ fontFamily: "monospace" }}>{editingUser?.properties?.userId}</span>
              </div>
            </div>

            <div style={s.rolesGrid}>
              {dynamicRoles.map((r) => {
                const id = `role_${r}`;
                return (
                  <label key={r} htmlFor={id} style={s.roleItem}>
                    <input
                      id={id}
                      type="checkbox"
                      checked={selectedRoles.includes(r)}
                      onChange={() => toggleRole(r)}
                    />
                    <span style={{ marginLeft: 8, textTransform: "none" }}>{r}</span>
                  </label>
                );
              })}
            </div>

            <div style={s.roleActions}>
              <button
                style={s.smallGhost}
                onClick={() => setSelectedRoles(dynamicRoles.filter((r) => r !== "anonymous"))}
              >
                Select common
              </button>
              <button style={s.smallGhost} onClick={() => setSelectedRoles([])}>
                Clear all
              </button>
              <div style={{ flex: 1 }} />
              <button style={s.smallPrimary} onClick={saveRoles}>
                Save
              </button>
              <button
                style={s.smallGhost}
                onClick={() => {
                  setEditorOpen(false);
                  setEditingUser(null);
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : null}
      </Modal>
    </div>
  );
}

/** Light theme styles */
const styles = {
  page: {
    padding: "24px",
    maxWidth: 1200,
    margin: "0 auto",
    fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif",
    color: "#1f2937",
    background: "#f8fafc",
    minHeight: "100vh",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 8,
  },
  h1: { margin: 0, fontSize: 24, fontWeight: 700, color: "#0f172a" },
  topMeta: { marginBottom: 16 },
  metaRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#475569" },
  muted: { color: "#64748b" },
  badgeAdmin: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#dcfce7",
    color: "#065f46",
    border: "1px solid #bbf7d0",
  },
  badgeViewOnly: {
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#334155",
    border: "1px solid #e2e8f0",
  },
  banner: {
    background: "#fff8e1",
    border: "1px solid #ffe0a3",
    color: "#8a6d3b",
    padding: "10px 12px",
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  statusOk: { color: "#16a34a", marginBottom: 12, fontWeight: 500 },
  statusErr: {
    color: "#b91c1c",
    marginBottom: 12,
    whiteSpace: "pre-wrap",
    background: "#fef2f2",
    border: "1px solid #fee2e2",
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 14,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
    color: "#334155",
    fontWeight: 600,
    fontSize: 13,
  },
  td: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
    verticalAlign: "top",
  },
  tdRight: {
    padding: "10px 12px",
    borderBottom: "1px solid #f1f5f9",
    textAlign: "right",
    width: 160,
    whiteSpace: "nowrap",
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  primaryBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "1px solid #1d4ed8",
    borderRadius: 8,
    padding: "8px 14px",
    cursor: "pointer",
    fontSize: 14,
  },
  smallPrimary: {
    background: "#2563eb",
    color: "#fff",
    border: "1px solid "#1d4ed8"",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  smallGhost: {
    background: "#fff",
    color: "#334155",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  smallDanger: {
    background: "#ef4444",
    color: "#fff",
    border: "1px solid #dc2626",
    borderRadius: 8,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 13,
  },
  rolesGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
    gap: 10,
    padding: "8px 0 12px",
  },
  roleItem: {
    display: "flex",
    alignItems: "center",
    fontSize: 14,
    color: "#334155",
    padding: "6px 8px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    background: "#ffffff",
  },
  roleActions: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
};

/** Modal styles */
const m = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.35)", // slate-900 @ 35%
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  panel: {
    width: "min(720px, 100%)",
    background: "#fff",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid #f1f5f9",
  },
  body: { padding: 16 },
  iconBtn: {
    border: "1px solid #e2e8f0",
    background: "#fff",
    borderRadius: 8,
    padding: "4px 8px",
    cursor: "pointer",
  },
};
