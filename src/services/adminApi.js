export async function listUsers() {
  const res = await fetch("/api/manage/users", { credentials: "include" });
  if (!res.ok) throw new Error(`List users failed: ${res.status}`);
  return res.json();
}

export async function updateUser({ authProvider, userId, roles, displayName }) {
  const res = await fetch("/api/manage/users/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ authProvider, userId, roles, displayName })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Update failed: ${res.status}`);
  }
  return res.json();
}