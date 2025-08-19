import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* --------------------------- API helpers (NEW ROUTES) --------------------------- */
async function listUsers() {
  const res = await fetch("/api/manage/users", { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`List users failed: ${res.status} ${text}`);
  }
  // Expected: { users: [{ provider, userId, displayName, roles }] }
  return res.json();
}

async function updateUser({ authProvider, userId, roles, displayName }) {
  const res = await fetch("/api/manage/users/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ authProvider, userId, roles, displayName }),
  });
  if (!res.ok) {
    let err = "";
    try { err = (await res.json())?.error || ""; } catch {}
    throw new Error(err || `Update failed: ${res.status}`);
  }
  return res.json();
}

/* --------------------------- UI --------------------------- */
export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const data = await listUsers();
        if (!ignore) setUsers(data.users || []);
      } catch (e) {
        if (!ignore) setError(e.message || String(e));
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return users;
    return users.filter((u) =>
      [
        u.displayName || "",
        u.userId || "",
        u.provider || "",
        u.roles || "",
      ].join(" ").toLowerCase().includes(f)
    );
  }, [users, filter]);

  return (
    <div style={{ padding: 0 }}>
      <style>{`
        .au-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap; }
        .au-inp { border:1px solid #374151; background:#0f172a; color:#e5e7eb; border-radius:8px; padding:8px 12px; font:inherit; }
        .au-btn { border:1px solid #374151; border-radius:8px; padding:8px 12px; background:#111827; color:#fff; cursor:pointer; text-decoration:none; }
        .au-btn:hover { background:#1f2937; }
        .au-table { min-width: 920px; border:1px solid #1f2937; border-radius:12px; border-collapse:separate; border-spacing:0; overflow:hidden; }
        .au-th { text-align:left; font-size:13px; color:#cbd5e1; padding:10px 12px; background:#0b1222; border-bottom:1px solid #1f2937; }
        .au-td { font-size:14px; color:#e5e7eb; padding:10px 12px; vertical-align:top; border-top:1px solid #0b1222; background:#0f172a; }
        .au-chip { font-size:12px; background:#0b1222; border:1px solid #1f2937; border-radius:6px; padding:2px 6px; display:inline-block; color:#93c5fd; }
        .au-err { background:#3f1212; color:#fecaca; border:1px solid #7f1d1d; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
        .au-help { color:#9ca3af; font-size:12px; margin-top:8px; }
        .au-actions { display:flex; gap:8px; flex-wrap:wrap; }
        .page-title { font-size:22px; font-weight:700; margin-bottom:12px; }
      `}</style>

      <h1 className="page-title">User &amp; Role Management</h1>

      {error ? <div className="au-err">Error: {error}</div> : null}

      <div className="au-toolbar">
        <input
          className="au-inp"
          placeholder="Search by name, provider, id, roles…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 420, maxWidth: "100%" }}
        />
        <Link to="/admin" className="au-btn">← Back to Admin</Link>
      </div>

      {loading ? (
        <div style={{ padding: 16 }}>Loading users…</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="au-table">
            <thead>
              <tr>
                <th className="au-th">Display Name</th>
                <th className="au-th">Provider</th>
                <th className="au-th">User ID</th>
                <th className="au-th">Roles (comma-separated)</th>
                <th className="au-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <UserRow
                  key={`${u.provider || "prov"}:${u.userId || "id"}`}
                  user={u}
                  onSave={async (newRoles, newName) => {
                    const prev = [...users];
                    try {
                      // optimistic update
                      setUsers((list) =>
                        list.map((x) =>
                          x.userId === u.userId && x.provider === u.provider
                            ? { ...x, roles: newRoles, displayName: newName }
                            : x
                        )
                      );
                      await updateUser({
                        authProvider: u.provider,
                        userId: u.userId,
                        roles: newRoles.split(",").map((s) => s.trim()).filter(Boolean),
                        displayName: newName,
                      });
                    } catch (e) {
                      setError(e.message || String(e));
                      setUsers(prev); // rollback
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="au-help">
        Note: SWA platform routes still enforce access via <code>staticwebapp.config.json</code>. This page provides app-level management.
      </p>
    </div>
  );
}

function UserRow({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState(user.roles || "");
  const [name, setName] = useState(user.displayName || "");

  return (
    <tr>
      <td className="au-td">
        {!editing ? (
          user.displayName || "—"
        ) : (
          <input className="au-inp" value={name} onChange={(e) => setName(e.target.value)} />
        )}
      </td>
      <td className="au-td">
        <span className="au-chip">{user.provider || "—"}</span>
      </td>
      <td className="au-td">
        <code style={{ fontSize: 12 }}>{user.userId || "—"}</code>
      </td>
      <td className="au-td">
        {!editing ? (
          roles || "—"
        ) : (
          <input
            className="au-inp"
            style={{ width: 320 }}
            value={roles}
            onChange={(e) => setRoles(e.target.value)}
            placeholder="e.g. admin,exporter"
          />
        )}
      </td>
      <td className="au-td">
        {!editing ? (
          <div className="au-actions">
            <button className="au-btn" onClick={() => setEditing(true)}>Edit</button>
          </div>
        ) : (
          <div className="au-actions">
            <button
              className="au-btn"
              onClick={async () => { await onSave(roles, name); setEditing(false); }}
            >
              Save
            </button>
            <button
              className="au-btn"
              onClick={() => { setRoles(user.roles || ""); setName(user.displayName || ""); setEditing(false); }}
            >
              Cancel
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
