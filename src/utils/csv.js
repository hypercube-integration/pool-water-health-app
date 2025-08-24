// BEGIN FILE: src/utils/csv.js
// VERSION: 2025-08-24
// NOTES: Lightweight CSV export (no deps). Used by Admin/Users export.

export function toCsv(rows, columns) {
  const escape = (val) => {
    if (val === null || val === undefined) return "";
    const s = String(val);
    // Quote if contains comma, quote, or newline
    if (/[",\n]/.test(s)) return '"' + s.replaceAll('"', '""') + '"';
    return s;
  };

  const header = columns.map((c) => escape(c.headerName || c.key)).join(",");
  const data = rows.map((r) =>
    columns
      .map((c) =>
        escape(
          typeof c.selector === "function" ? c.selector(r) : r[c.key]
        )
      )
      .join(",")
  );
  return [header, ...data].join("\n");
}

export function downloadCsv(csvString, baseName = "users") {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const name = `${baseName}-${d.getFullYear()}${pad(
    d.getMonth() + 1
  )}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
