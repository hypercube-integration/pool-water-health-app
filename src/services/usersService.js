// FILE: src/services/usersService.js
// Front-end service to call users/profiles API.
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const text = await res.text();
  const isJson = (res.headers.get("content-type") || "").includes("application/json");
  const body = isJson ? (text ? JSON.parse(text) : null) : text;
  if (!res.ok) {
    const msg = typeof body === "string" ? body : (body?.error || body?.message || res.statusText);
    throw new Error(`${options.method || "GET"} ${url} failed (${res.status}): ${msg}`);
  }
  return body;
}

export async function getUsers({ page=1, pageSize=10, search="", sortBy="createdAt", sortDir="desc" } = {}) {
  const qs = new URLSearchParams({ page:String(page), pageSize:String(pageSize), search, sortBy, sortDir });
  return await fetchJSON(`/api/users?${qs.toString()}`);
}

export async function inviteUser({ provider, userDetails, roles, hours = 24, domain }) {
  return await fetchJSON(`/api/users/invite`, {
    method: "POST",
    body: JSON.stringify({ provider, userDetails, roles, hours, domain })
  });
}

export async function setRoles({ provider, userId, roles }) {
  return await fetchJSON(`/api/users/update`, {
    method: "POST",
    body: JSON.stringify({ provider, userId, roles })
  });
}

export async function clearRoles({ provider, userId }) {
  return await setRoles({ provider, userId, roles: [] });
}

export async function deleteUser({ provider, userId }) {
  return await fetchJSON(`/api/users/delete`, {
    method: "POST",
    body: JSON.stringify({ provider, userId })
  });
}

export async function setNameEmail({ provider, userId, name, email }) {
  return await fetchJSON(`/api/profiles/upsert`, {
    method: "POST",
    body: JSON.stringify({ provider, userId, name, email })
  });
}
