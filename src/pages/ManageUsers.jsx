// src/pages/ManageUsers.jsx
import { useEffect, useState } from "react";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editRoles, setEditRoles] = useState({});

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/manageUsers");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(`Failed to load users: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const startEdit = (user) => {
    setEditingUser(user);
    const current = (user.properties.roles || "").split(",").map(r => r.trim());
    setEditRoles({
      admin: current.includes("admin"),
      writer: current.includes("writer"),
      editor: current.includes("editor"),
      deleter: current.includes("deleter"),
      exporter: current.includes("exporter"),
    });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditRoles({});
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    const roles = Object.entries(editRoles)
      .filter(([,v]) => v)
      .map(([k]) => k)
      .join(",");
    try {
      const res = await fetch("/api/updateUserRoles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: editingUser.properties.provider,
          userId: editingUser.properties.userId,
          roles,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      await fetchUsers();
      cancelEdit();
    } catch (err) {
      alert("Update failed: " + err.message);
    }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.properties.displayName}?`)) return;
    try {
      const res = await fetch("/api/deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: user.properties.provider,
          userId: user.properties.userId,
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      await fetchUsers();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  return (
    <div className="page-container">
      <style>{`
        .page-container { padding:16px; }
        .card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th, td { border-bottom:1px solid #f3f4f6; text-align:left; padding:10px; font-size:14px; }
        th { background:#f9fafb; font-weight:600; color:#374151; }
        tr:hover td { background:#f9fafb; }
        .btn { padding:6px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; background:#fff; cursor:pointer; margin-right:6px; }
        .btn:hover { background:#f3f4f6; }
        .muted { color:#6b7280; font-size:13px; }
        .roles { display:flex; flex-wrap:wrap; gap:4px; }
        .chip { padding:2px 8px; border-radius:999px; font-size:12px; border:1px solid #e5e7eb; background:#f3f4f6; }
      `}</style>

      <div className="card">
        <h2 style={{fontSize:"20px", fontWeight:600, color:"#111827", marginBottom:12}}>User & Role Management</h2>

        {loading && <p className="muted">Loading…</p>}
        {error && <p style={{color:"red"}}>{error}</p>}

        {!loading && !error && (
          <table>
            <thead>
              <tr>
                <th>Display Name</th>
                <th>Provider</th>
                <th>User ID</th>
                <th>Roles</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan="5" className="muted">No users to display.</td></tr>
              )}
              {users.map(user => (
                <tr key={user.name}>
                  <td>{user.properties.displayName}</td>
                  <td>{user.properties.provider}</td>
                  <td className="muted">{user.properties.userId}</td>
                  <td>
                    {editingUser?.name === user.name ? (
                      <div>
                        {Object.keys(editRoles).map(r => (
                          <label key={r} style={{display:"block"}}>
                            <input
                              type="checkbox"
                              checked={editRoles[r]}
                              onChange={() => setEditRoles(prev=>({...prev, [r]:!prev[r]}))}
                            />
                            <span style={{marginLeft:6, textTransform:"capitalize"}}>{r}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="roles">
                        {(user.properties.roles || "").split(",").map(r => (
                          <span key={r} className="chip">{r}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {editingUser?.name === user.name ? (
                      <>
                        <button className="btn" onClick={saveEdit}>Save</button>
                        <button className="btn" onClick={cancelEdit}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button className="btn" onClick={() => startEdit(user)}>Edit</button>
                        <button className="btn" onClick={() => deleteUser(user)}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
