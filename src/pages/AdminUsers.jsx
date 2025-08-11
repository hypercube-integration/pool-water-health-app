import { useEffect, useMemo, useState } from "react";
import { listUsers, updateUser } from "../services/adminApi";

export default function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await listUsers();
        setUsers(data.users || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return users;
    return users.filter(u =>
      [u.displayName, u.userId, u.provider, u.roles].some(v => (v || "").toLowerCase().includes(f))
    );
  }, [users, filter]);

  async function onSave(u, newRoles, newName) {
    const roles = newRoles.split(",").map(s => s.trim()).filter(Boolean);
    const prevUsers = [...users];
    try {
      setUsers(prev => prev.map(x => x.userId === u.userId && x.provider === u.provider ? { ...x, roles: roles.join(",") } : x));
      await updateUser({ authProvider: u.provider, userId: u.userId, roles, displayName: newName || u.displayName });
    } catch (e) {
      setError(e.message);
      setUsers(prevUsers);
    }
  }

  if (loading) return <div className="p-6">Loading users…</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">User & Role Management</h1>
      <div className="flex gap-2 items-center">
        <input
          placeholder="Search by name, provider, id, roles…"
          className="border rounded px-3 py-2 w-full max-w-xl"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <a href="/admin" className="px-3 py-2 border rounded hover:bg-gray-50">Back to Admin</a>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[900px] border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <Th>Display Name</Th>
              <Th>Provider</Th>
              <Th>User ID</Th>
              <Th>Roles (comma-separated)</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <Row key={`${u.provider}:${u.userId}`} user={u} onSave={onSave} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-gray-500">
        Tip: Roles must be defined in your <code>staticwebapp.config.json</code> to be used in route rules,
        but you can assign any role name here and start enforcing it in code immediately.
      </p>
    </div>
  );
}

function Row({ user, onSave }) {
  const [editing, setEditing] = useState(false);
  const [roles, setRoles] = useState(user.roles || "");
  const [name, setName] = useState(user.displayName || "");

  return (
    <tr className="border-t">
      <Td>{editing ? <input className="border rounded px-2 py-1 w-56" value={name} onChange={e => setName(e.target.value)} /> : (user.displayName || "—")}</Td>
      <Td><span className="px-2 py-1 rounded bg-gray-100">{user.provider}</span></Td>
      <Td><code className="text-xs">{user.userId}</code></Td>
      <Td>
        {editing ? (
          <input
            className="border rounded px-2 py-1 w-80"
            value={roles}
            onChange={e => setRoles(e.target.value)}
            placeholder="e.g. admin,exporter"
          />
        ) : (
          <span>{user.roles || "—"}</span>
        )}
      </Td>
      <Td>
        {!editing ? (
          <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => setEditing(true)}>Edit</button>
        ) : (
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border rounded hover:bg-gray-50"
              onClick={async () => { await onSave(user, roles, name); setEditing(false); }}
            >
              Save
            </button>
            <button className="px-3 py-1 border rounded hover:bg-gray-50" onClick={() => { setRoles(user.roles || ""); setName(user.displayName || ""); setEditing(false); }}>
              Cancel
            </button>
          </div>
        )}
      </Td>
    </tr>
  );
}

function Th({ children }) { return <th className="text-left text-sm font-medium text-gray-700 px-3 py-2 border-b">{children}</th>; }
function Td({ children }) { return <td className="text-sm px-3 py-2 align-top">{children}</td>; }
