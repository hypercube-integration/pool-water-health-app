// FILE: src/utils/csv.js
// Small CSV helper with named exports: toCsv, downloadCsv

/**
 * Create a CSV string from rows and column descriptors.
 * @param {Array<object>} rows - array of row objects
 * @param {Array<{key:string, headerName?:string, selector?:(row:any)=>any}>} columns
 */
export function toCsv(rows, columns) {
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    // Quote if it contains comma, quote, or newline
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = columns.map(c => escape(c.headerName || c.key)).join(",");
  const lines = rows.map(r =>
    columns.map(c => {
      const val = typeof c.selector === "function" ? c.selector(r) : r[c.key];
      return escape(val);
    }).join(",")
  );

  return [header, ...lines].join("\n");
}

/**
 * Trigger a client-side download of a CSV string.
 * @param {string} csvString
 * @param {string} baseName - filename without extension
 */
export function downloadCsv(csvString, baseName = "export") {
  const pad = (n) => String(n).padStart(2, "0");
  const d = new Date();
  const name = `${baseName}-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;

  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
