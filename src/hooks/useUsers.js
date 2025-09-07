// FILE: src/hooks/useUsers.js
import { useEffect, useMemo, useState } from "react";
import { getUsers } from "../services/usersService";

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

  const params = { page, pageSize, search, sortBy, sortDir };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
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
    return () => { cancelled = true; };
  }, [params.page, params.pageSize, params.search, params.sortBy, params.sortDir]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);
  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  return {
    rows, total, totalPages, loading, error,
    page, pageSize, search, sortBy, sortDir,
    setPage, setPageSize, setSearch, toggleSort,
    reload: () => { setPage((p) => p); } // quick way to re-trigger
  };
}
