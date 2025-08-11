// src/components/ReportModal.jsx
import { useEffect, useMemo, useRef, useState } from 'react';

export default function ReportModal({ open, onClose, readings = [], targets, range, chartEl }) {
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const wrapRef = useRef(null);

  const latest = useMemo(() => {
    if (!readings?.length) return null;
    const s = [...readings].sort((a,b)=>a.date>b.date?-1:1);
    return s[0];
  }, [readings]);

  // When modal opens, make a lightweight snapshot of the chart for preview
  useEffect(() => {
    let cancelled = false;
    async function makePreview() {
      if (!open) return;
      setPreviewUrl(null);
      if (!chartEl) return;

      try {
        const { default: html2canvas } = await import('html2canvas');
        // Capture just the chart area (scale=1 for quick preview)
        const canvas = await html2canvas(chartEl, { backgroundColor: '#ffffff', scale: 1 });
        if (!cancelled) setPreviewUrl(canvas.toDataURL('image/png'));
      } catch {
        // Ignore preview errors; user can still generate full PDF
      }
    }
    makePreview();
    return () => { cancelled = true; };
  }, [open, chartEl]);

  useEffect(() => {
    if (!open) { setBusy(false); }
  }, [open]);

  if (!open) return null;

  const generate = async () => {
    setBusy(true);
    try {
      const [{ default: html2canvas }, jsPDFmod] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const jsPDF = jsPDFmod.default;

      // Build raster of the report container
      const node = wrapRef.current;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Fit width with margins
      const ratio = canvas.height / canvas.width;
      const imgW = pageW - 48; // 24pt margins
      const imgH = imgW * ratio;
      const x = 24, y = 24;

      if (imgH <= pageH - 48) {
        pdf.addImage(imgData, 'PNG', x, y, imgW, imgH, undefined, 'FAST');
      } else {
        // Multi-page slice
        let curY = 0;
        while (curY < canvas.height) {
          const pageCanvas = document.createElement('canvas');
          const pageCtx = pageCanvas.getContext('2d');
          const sliceH = Math.min(canvas.height - curY, Math.floor((pageH - 48) * (canvas.width / imgW)));
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceH;
          pageCtx.drawImage(canvas, 0, curY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const pageImg = pageCanvas.toDataURL('image/png');
          if (curY > 0) pdf.addPage();
          const pageImgH = (sliceH / canvas.width) * imgW;
          pdf.addImage(pageImg, 'PNG', x, y, imgW, pageImgH, undefined, 'FAST');
          curY += sliceH;
        }
      }

      const fname = `Pool-Report_${range?.startDate || 'start'}_to_${range?.endDate || 'end'}.pdf`;
      pdf.save(fname);
    } catch (e) {
      console.error(e);
      alert('PDF export failed. See console for details.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()}>
        <div className="modal-head">
          <h3 style={{ margin: 0 }}>Report preview</h3>
          <button className="secondary" onClick={onClose}>Close</button>
        </div>

        {/* Report content (this is what gets rasterized to PDF) */}
        <div ref={wrapRef} className="report">
          <div className="report-header">
            <div>
              <div className="title">Pool Water Health</div>
              <div className="sub">Summary report</div>
            </div>
            <div className="meta">
              <div><strong>From:</strong> {range?.startDate}</div>
              <div><strong>To:</strong> {range?.endDate}</div>
              <div><strong>Generated:</strong> {new Date().toLocaleString()}</div>
            </div>
          </div>

          <div className="report-grid">
            <div className="report-card">
              <div className="card-title">Latest reading</div>
              {latest ? (
                <ul className="kv">
                  <li><span>Date</span><strong>{latest.date}</strong></li>
                  <li><span>pH</span><strong>{fmt(latest.ph)}</strong></li>
                  <li><span>Chlorine (ppm)</span><strong>{fmt(latest.chlorine)}</strong></li>
                  <li><span>Salt (ppm)</span><strong>{fmt(latest.salt)}</strong></li>
                </ul>
              ) : <div>No readings in range.</div>}
            </div>

            <div className="report-card">
              <div className="card-title">Target ranges</div>
              {targets ? (
                <ul className="kv">
                  <li><span>pH</span><strong>{rng(targets.ph)}</strong></li>
                  <li><span>Chlorine</span><strong>{rng(targets.chlorine)} ppm</strong></li>
                  <li><span>Salt</span><strong>{rng(targets.salt)} ppm</strong></li>
                </ul>
              ) : <div>—</div>}
            </div>
          </div>

          <div className="report-card">
            <div className="card-title">Trend chart</div>
            <div className="chart-shot">
              {previewUrl
                ? <img src={previewUrl} alt="Chart preview" style={{ width:'100%', height:'auto', display:'block' }} />
                : <div style={{color:'#64748b'}}>Generating chart preview…</div>}
            </div>
          </div>

          <div className="report-card">
            <div className="card-title">Notes</div>
            <p style={{margin:0, color:'#475569'}}>This report reflects the selected date range and your current target settings.</p>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate PDF'}</button>
        </div>
      </div>
    </div>
  );
}

// Helpers
function fmt(n){ return (n===null||n===undefined||Number.isNaN(n)) ? '—' : String(n); }
function rng(r){ return r?.min!=null && r?.max!=null ? `${r.min} – ${r.max}` : '—'; }
