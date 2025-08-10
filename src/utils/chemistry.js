// src/utils/chemistry.js

// ---------- Targets (tune to your pool) ----------
export const TARGETS = {
  ph: [7.2, 7.6],
  chlorine: [1.0, 3.0], // ppm
  salt: [3000, 4500],   // ppm
};

// ---------- Helpers ----------
const toNum = (v) => (v === '' || v == null ? NaN : Number(v));
const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);
const round = (n, dp = 2) => Number(n.toFixed(dp));

// ---------- Classification ----------
export function classify(value, [lo, hi]) {
  const v = toNum(value);
  if (!isFiniteNum(v)) return { state: 'unknown' };
  if (v < lo) return { state: 'low', delta: lo - v };
  if (v > hi) return { state: 'high', delta: v - hi };
  return { state: 'ok', delta: 0 };
}

// ---------- Dosing math ----------
/**
 * Salt: Δppm * Volume(L) / 1e6 = kg salt
 */
export function kgSaltToRaise(deltaPpm, volumeL) {
  if (!isFiniteNum(deltaPpm) || !isFiniteNum(volumeL) || deltaPpm <= 0 || volumeL <= 0) return 0;
  return (deltaPpm * volumeL) / 1_000_000; // kg
}

/**
 * Chlorine (liquid NaOCl):
 * grams of available chlorine required = Δppm * Volume(L) / 1000
 * available chlorine per liter ≈ strengthPct * 10 (e.g., 12.5% → ~125 g/L)
 * liters product = gramsNeeded / gramsPerLiter
 */
export function litersLiquidChlorineToRaise(deltaPpm, volumeL, strengthPct = 12.5) {
  if (!isFiniteNum(deltaPpm) || !isFiniteNum(volumeL) || deltaPpm <= 0 || volumeL <= 0) return 0;
  const gramsNeeded = (deltaPpm * volumeL) / 1000; // g of available chlorine
  const gramsPerLiter = strengthPct * 10;          // ≈ g/L
  return gramsNeeded / gramsPerLiter;              // liters of product
}

// ---------- Advisories ----------
/**
 * Build advisories from a single reading.
 * Returns { items: [{id,title,detail,severity}], overall: 'ok'|'info'|'warn'|'crit' }
 * If settings provided (poolVolumeL, chlorineStrengthPct), adds dosage lines.
 */
export function buildAdvisories(reading, targets = TARGETS, settings = {}) {
  if (!reading) return { items: [], overall: 'ok' };

  const poolVolumeL = toNum(settings.poolVolumeL);
  const chlorineStrengthPct = toNum(settings.chlorineStrengthPct) || 12.5;

  const items = [];
  let overall = 'ok';
  const bump = (sev) => {
    const order = { ok: 0, info: 1, warn: 2, crit: 3 };
    if (order[sev] > order[overall]) overall = sev;
  };

  // pH
  const phC = classify(reading.ph, targets.ph);
  if (phC.state === 'low') {
    items.push({
      id: 'ph-low',
      title: 'pH is low',
      detail: 'Raise pH slightly. Reduce acid dosing and/or aerate water. Target 7.2–7.6.',
      severity: 'warn',
    }); bump('warn');
  } else if (phC.state === 'high') {
    items.push({
      id: 'ph-high',
      title: 'pH is high',
      detail: 'Lower pH with a small acid adjustment. Re-test after 30–60 minutes. Target 7.2–7.6.',
      severity: 'warn',
    }); bump('warn');
  }

  // Chlorine
  const clC = classify(reading.chlorine, targets.chlorine);
  if (clC.state === 'low') {
    let detail = 'Increase chlorinator output or run-time today. Target 1–3 ppm.';
    if (isFiniteNum(poolVolumeL) && poolVolumeL > 0) {
      const L = litersLiquidChlorineToRaise(clC.delta, poolVolumeL, chlorineStrengthPct);
      if (L > 0) detail += ` (≈ add ${round(L, 2)} L of ${chlorineStrengthPct}% liquid chlorine)`;
    }
    items.push({ id: 'cl-low', title: 'Chlorine is low', detail, severity: 'crit' }); bump('crit');
  } else if (clC.state === 'high') {
    items.push({
      id: 'cl-high',
      title: 'Chlorine is high',
      detail: 'Dial chlorinator output down or shorten run-time. Allow levels to drift to 1–3 ppm.',
      severity: 'info',
    }); bump('info');
  }

  // Salt
  const saltC = classify(reading.salt, targets.salt);
  if (saltC.state === 'low') {
    let detail = 'Add pool salt gradually and re-test. Manufacturer typically targets ~3500–4000 ppm.';
    if (isFiniteNum(poolVolumeL) && poolVolumeL > 0) {
      const kg = kgSaltToRaise(saltC.delta, poolVolumeL);
      if (kg > 0) detail += ` (≈ add ${round(kg, 1)} kg of pool salt)`;
    }
    items.push({ id: 'salt-low', title: 'Salt is low', detail, severity: 'warn' }); bump('warn');
  } else if (saltC.state === 'high') {
    items.push({
      id: 'salt-high',
      title: 'Salt is high',
      detail: 'Partially dilute with fresh water and re-test. Keep within the recommended range for your cell.',
      severity: 'info',
    }); bump('info');
  }

  return { items, overall };
}

// ---------- Moving averages ----------
/**
 * Compute simple moving average (window N) for an array of points.
 * Adds keys: phAvg7, chlorineAvg7, saltAvg7 (for n=7).
 */
export function withMovingAverages(data, n = 7) {
  if (!Array.isArray(data) || data.length === 0) return [];
  const out = [];
  const win = [];
  let sums = { ph: 0, chlorine: 0, salt: 0 };

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    // push current values (coerce to number or NaN -> treated as 0 in avg numerator/denominator handling below)
    const ph = toNum(r.ph);
    const cl = toNum(r.chlorine);
    const sa = toNum(r.salt);

    win.push({ ph, cl, sa });
    sums.ph += isFiniteNum(ph) ? ph : 0;
    sums.chlorine += isFiniteNum(cl) ? cl : 0;
    sums.salt += isFiniteNum(sa) ? sa : 0;

    if (win.length > n) {
      const drop = win.shift();
      sums.ph -= isFiniteNum(drop.ph) ? drop.ph : 0;
      sums.chlorine -= isFiniteNum(drop.cl) ? drop.cl : 0;
      sums.salt -= isFiniteNum(drop.sa) ? drop.sa : 0;
    }

    const denom = win.length; // use current window length (<= n)
    out.push({
      ...r,
      phAvg7: denom ? sums.ph / denom : NaN,
      chlorineAvg7: denom ? sums.chlorine / denom : NaN,
      saltAvg7: denom ? sums.salt / denom : NaN,
    });
  }

  return out;
}
