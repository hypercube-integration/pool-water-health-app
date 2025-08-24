// BEGIN FILE: src/services/usersService.js
// VERSION: 2025-08-24
// NOTES: Front-end service calling Azure Function `/api/users` with pagination/sort/search.

export async function getUsers({ page = 1, pageSize = 10, search = "", sortBy = "createdAt", sortDir = "desc" } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    search,
    sortBy,
    sortDir,
  });

  const res = await fetch(`/api/users?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch users (${res.status}): ${text || res.statusText}`);
  }

  const data = await res.json();
  // Expected shape: { rows: [...], total: number }
  if (!data || !Array.isArray(data.rows) || typeof data.total !== "number") {
    throw new Error("Unexpected response shape from /api/users");
  }
  return data;
}
