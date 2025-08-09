// src/utils/export.js

/** RFC4180-safe CSV from rows of plain objects. */
export function makeCsv(rows, headers) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return (headers || ['date', 'ph', 'chlorine', 'salt']).join(',') + '\n';
  }
  const cols =
    headers ||
    Array.from(
      rows.reduce((set, r) => {
        Object.keys(r).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );

  const esc = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    // Quote if contains comma, quote, CR or LF
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const header = cols.map(esc).join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  return header + '\n' + body + '\n';
}

export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Lazy-load SheetJS (xlsx) only when needed.
 * - First tries window.XLSX (already loaded).
 * - Otherwise injects CDN script and resolves when ready.
 */
async function loadXlsxFromCdn() {
  if (typeof window !== 'undefined' && window.XLSX) return window.XLSX;

  const CDN_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CDN_URL;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Failed to load SheetJS from CDN'));
    document.head.appendChild(s);
  });

  if (!window.XLSX) {
    throw new Error('SheetJS failed to initialize.');
  }
  return window.XLSX;
}

/** Export to .xlsx using SheetJS loaded from CDN at runtime (no bundler dep). */
export async function exportXlsx(filename, rows, sheetName = 'Readings') {
  const XLSX = await loadXlsxFromCdn();

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([wbout], {
    type:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : filename + '.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
