import React, { useState, useEffect } from "react";

export default function UsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/manageUsers");
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const updateRoles = async (userId, roles) => {
    try {
      setStatusMessage("Updating...");
      setError(null);
      const res = await fetch("/api/manageUsers/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roles }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Update failed: ${res.status} ${body}`);
      }
      setStatusMessage("Roles updated successfully.");
      await fetchUsers();
    } catch (err) {
      console.error("Update error:", err);
      setError(err.message || "Update failed.");
    } finally {
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  const deleteUser = async (userId) => {
    try {
      setStatusMessage("Deleting...");
      setError(null);
      const res = await fetch("/api/manageUsers/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Delete failed: ${res.status} ${body}`);
      }
      setStatusMessage("User deleted successfully.");
      await fetchUsers();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Delete failed.");
    } finally {
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>User & Role Management</h1>

      {statusMessage && (
        <div style={{ color: "green", marginBottom: "1rem" }}>
          {statusMessage}
        </div>
      )}
      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <button onClick={fetchUsers} style={{ marginBottom: "1rem" }}>
        Refresh
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : users.length === 0 ? (
        <p>No users to display.</p>
      ) : (
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
            {users.map((u) => (
              <tr key={u.name}>
                <td>{u.properties.displayName}</td>
                <td>{u.properties.provider}</td>
                <td>{u.properties.userId}</td>
                <td>
                  <input
                    type="text"
                    defaultValue={u.properties.roles}
                    onBlur={(e) =>
                      updateRoles(u.properties.userId, e.target.value)
                    }
                  />
                </td>
                <td>
                  <button onClick={() => deleteUser(u.properties.userId)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
