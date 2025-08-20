// src/pages/AdminUsers.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* --------------------------- API helpers --------------------------- */
async function listUsers() {
  const res = await fetch("/api/manageUsers", { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`List users failed: ${res.status} ${text}`);
  }
  // Expected shape: { users: [{ provider, userId, displayName, roles }] }
  return res.json();
}

async function updateUser({ authProvider, userId, roles, displayName }) {
  const res = await fetch("/api/manageUsersUpdate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ authProvider, userId, roles, displayName }),
  });
  if (!res.ok) {
    let err = "";
    try {
      const j = await res.json();
      err = j?.error || "";
    } catch { /* ignore */ }
    throw new Error(err || `Update failed: ${res.status}`);
  }
  return res.json();
}

/* --------------------------- UI Components --------------------------- */
export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]); // [{provider,userId,displayName,roles}]
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
      ]
        .join(" ")
        .toLowerCase()
        .includes(f)
    );
  }, [users, filter]);

  if (loading) return <div style={{ padding: 16 }}>Loading users…</div>;

  return (
    <div style={{ padding: 16 }}>
      <style>{`
        .au-toolbar { display:flex; gap:8px; align-items:center; margin-bottom:12px; flex-wrap:wrap; }
        .au-inp { border:1px solid #e5e7eb; border-radius:8px; padding:8px 12px; font:inherit; }
        .au-btn { border:1px solid #e5e7eb; border-radius:8px; padding:8px 12px; background:#fff; cursor:pointer; }
        .au-btn:hover { background:#f9fafb; }
        .au-table { min-width: 920px; border:1px solid #e5e7eb; border-radius:8px; border-collapse:separate; border-spacing:0; }
        .au-th { text-align:left; font-size:13px; color:#374151; padding:10px 12px; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
        .au-td { font-size:14px; padding:10px 12px; vertical-align:top; border-top:1px solid #f1f5f9; }
        .au-chip { font-size:12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; padding:2px 6px; display:inline-block; }
        .au-err { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
        .au-help { color:#6b7280; font-size:12px; margin-top:8px; }
        .au-actions { display:flex; gap:8px; flex-wrap:wrap; }
      `}</style>

      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>
        User &amp; Role Management
      </h1>

      {error ? <div className="au-err">Error: {error}</div> : null}

      <div className="au-toolbar">
        <input
          className="au-inp"
          placeholder="Search by name, provider, id, roles…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ width: 420, maxWidth: "100%" }}
        />
        <Link to="/admin" className="au-btn" style={{ textDecoration: "none", color: "#111827" }}>
          ← Back to Admin
        </Link>
      </div>

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

      <p className="au-help">
        Tip: Platform route protection is configured in <code>staticwebapp.config.json</code>.
        App-level checks can enforce roles immediately in your UI/API.
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
            <button className="au-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
          </div>
        ) : (
          <div className="au-actions">
            <button
              className="au-btn"
              onClick={async () => {
                await onSave(roles, name);
                setEditing(false);
              }}
            >
              Save
            </button>
            <button
              className="au-btn"
              onClick={() => {
                setRoles(user.roles || "");
                setName(user.displayName || "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
