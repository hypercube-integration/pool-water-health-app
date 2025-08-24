// BEGIN FILE: src/hooks/useUsers.js
// VERSION: 2025-08-24
// NOTES: Hook managing users list + pagination/sort/search and loading/error state.

import { useEffect, useMemo, useState } from "react";
import { getUsers } from "../services/usersService"; // <-- this path requires src/services/usersService.js

export function useUsers(initial = {}) {
  const [page, setPage] = useState(initial.page ?? 1);
  const [pageSize, setPageSize] = useState(initial.pageSize ?? 10);
  const [search, setSearch] = useState(initial.search ?? "");
  const [sortBy, setSortBy] = useState(initial.sortBy ?? "createdAt");
  const [sortDir, setSortDir] = useState(initial.sortDir ?? "desc");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const params = useMemo(
    () => ({ page, pageSize, search, sortBy, sortDir }),
    [page, pageSize, search, sortBy, sortDir]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { rows, total } = await getUsers(params);
        if (!cancelled) {
          setRows(rows);
          setTotal(total);
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.page, params.pageSize, params.search, params.sortBy, params.sortDir]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function toggleSort(columnKey) {
    if (sortBy === columnKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(columnKey);
      setSortDir("asc");
    }
  }

  return {
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
    setSortBy,
    setSortDir,
    toggleSort,
  };
}
