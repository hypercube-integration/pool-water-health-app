// BEGIN FILE: src/pages/Admin/Users.jsx
// VERSION: 2025-08-24
// NOTES: Users page wired to Azure Function with pagination/sort/search + CSV export and role guard.

import React from "react";
import { toCsv, downloadCsv } from "../../utils/csv";
import { hasAnyRole } from "../../auth/roles";
import { useUsers } from "../../hooks/useUsers";

export default function UsersPage() {
  // TODO: wire currentUser from your auth provider/context
  const currentUser = { roles: ["admin"] };

  const {
    rows,
    total,
    totalPages,
    loading,
    error,
    page,
    pageSize,
    search,
    sortBy,
    sortDir,
    setPage,
    setPageSize,
    setSearch,
    toggleSort,
  } = useUsers({ page: 1, pageSize: 10, sortBy: "createdAt", sortDir: "desc" });

  const columns = [
    { key: "name", headerName: "Name" },
    { key: "email", headerName: "Email" },
    { key: "role", headerName: "Role" },
    { key: "createdAt", headerName: "Created" },
  ];

  const canExport = hasAnyRole(currentUser, ["admin", "manager"]);

  const handleExport = () => {
    const csv = toCsv(rows, columns);
    downloadCsv(csv, "users");
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Manage Users &amp; Roles</h1>

        {canExport && (
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded bg-gray-800 text-white hover:opacity-90"
            aria-label="Export users to CSV"
          >
            Export CSV
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => {
              // Reset to page 1 on new search
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search users…"
            className="border border-gray-300 rounded px-3 py-2 min-w-[240px]"
            aria-label="Search users"
          />
          <select
            value={pageSize}
            onChange={(e) => {
              const next = Number(e.target.value) || 10;
              // Reset to page 1 on page size change
              setPageSize(next);
              setPage(1);
            }}
            className="border border-gray-300 rounded px-2 py-2"
            aria-label="Rows per page"
          >
            {[10, 20, 50].map((s) => (
              <option key={s} value={s}>
                {s}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              {columns.map((c) => {
                const active = sortBy === c.key;
                return (
                  <th key={c.key} className="text-left font-medium px-3 py-2 border-b border-gray-200">
                    <button
                      className={`inline-flex items-center gap-1 ${active ? "text-gray-900" : "text-gray-700"} hover:underline`}
                      onClick={() => {
                        toggleSort(c.key);
                        // stay on same page; server will reorder
                      }}
                    >
                      <span>{c.headerName}</span>
                      {active && <span aria-hidden="true">{sortDir === "asc" ? "▲" : "▼"}</span>}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="bg-white text-gray-900">
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-red-600">
                  {error}
                </td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            )}
            {!loading &&
              !error &&
              rows.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-2 border-b border-gray-100">
                      {u[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {total.toLocaleString()} total • Page {page} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded border border-gray-300 disabled:opacity-50"
            onClick={() => page > 1 && setPage(page - 1)}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span className="text-sm text-gray-700">Page {page}</span>
          <button
            className="px-3 py-2 rounded border border-gray-300 disabled:opacity-50"
            onClick={() => page < totalPages && setPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
