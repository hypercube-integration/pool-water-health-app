// src/utils/chemistry.js

// ---------- Targets (tune to your pool) ----------
export const TARGETS = {
  ph: [7.2, 7.6],
  chlorine: [1.0, 3.0], // ppm
  salt: [3000, 4500],   // ppm (adjust to your cell spec)
};

// ---------- Small helpers ----------
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

// ---------- Dosing math (liquid fallback) ----------
/**
 * Salt: Δppm * Volume(L) / 1e6 = kg salt
 */
export function kgSaltToRaise(deltaPpm, volumeL) {
  if (!isFiniteNum(deltaPpm) || !isFiniteNum(volumeL) || deltaPpm <= 0 || volumeL <= 0) return 0;
  return (deltaPpm * volumeL) / 1_000_000; // kg
}

/**
 * Liquid chlorine (NaOCl):
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

// ---------- Salt-chlorinator adjustment math ----------
/**
 * Recommend chlorinator output % and/or extra pump hours to deliver Δppm in a day.
 * Inputs:
 *   deltaPpm: how much FC to add (ppm)
 *   volumeL: pool volume (L)
 *   rating_g_per_hr: chlorinator rating in grams of chlorine per hour at 100% (often listed in specs)
 *   pumpHours: current scheduled runtime in hours per day
 *   currentPercent: your current output %
 *
 * Returns:
 *   {
 *     neededGrams, // grams of Cl required to reach target
 *     suggestedPercent, // % needed over the existing pumpHours to meet Δppm
 *     extraHours, // if suggestedPercent hits 100%, extra hours at 100% needed
 *     feasible // boolean: true if suggestedPercent <= 100
 *   }
 */
export function recommendChlorinatorAdjustment({
  deltaPpm,
  volumeL,
  rating_g_per_hr,
  pumpHours,
  currentPercent,
}) {
  const out = { neededGrams: 0, suggestedPercent: NaN, extraHours: 0, feasible: false };
  if (![deltaPpm, volumeL, rating_g_per_hr, pumpHours].every(isFiniteNum)) return out;
  if (deltaPpm <= 0 || volumeL <= 0 || rating_g_per_hr <= 0 || pumpHours <= 0) return out;

  const neededGrams = (deltaPpm * volumeL) / 1000; // g
  out.neededGrams = neededGrams;

  // grams delivered per day at 100% for current pump schedule:
  const gramsPerDayAt100 = rating_g_per_hr * pumpHours;

  // Percent required across existing hours:
  const pct = (neededGrams / gramsPerDayAt100) * 100;
  out.suggestedPercent = pct;
  out.feasible = pct <= 100;

  if (!out.feasible) {
    // If 100% over current hours still isn't enough, compute extra hours at 100%
    const shortfall = neededGrams - gramsPerDayAt100;
    out.extraHours = shortfall > 0 ? shortfall / rating_g_per_hr : 0;
  }

  return out;
}

// ---------- Advisories ----------
/**
 * Build advisories from a single reading.
 * Returns { items: [{id,title,detail,severity}], overall: 'ok'|'info'|'warn'|'crit' }
 * Settings may include:
 *   poolVolumeL, chlorineStrengthPct,
 *   saltPoolMode, chlorinatorRated_g_per_hr, dailyPumpHours, currentOutputPercent
 */
export function buildAdvisories(reading, targets = TARGETS, settings = {}) {
  if (!reading) return { items: [], overall: 'ok' };

  const poolVolumeL = toNum(settings.poolVolumeL);
  const chlorineStrengthPct = toNum(settings.chlorineStrengthPct) || 12.5;

  const saltPoolMode = !!settings.saltPoolMode;
  const cellRate = toNum(settings.chlorinatorRated_g_per_hr);   // g/hr @ 100%
  const pumpHours = toNum(settings.dailyPumpHours);             // hrs/day
  const outPct = toNum(settings.currentOutputPercent);          // %

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
    // Preferred path for salt pools
    if (saltPoolMode && [poolVolumeL, cellRate, pumpHours].every(isFiniteNum) && poolVolumeL > 0) {
      const rec = recommendChlorinatorAdjustment({
        deltaPpm: clC.delta,
        volumeL: poolVolumeL,
        rating_g_per_hr: cellRate,
        pumpHours,
        currentPercent: outPct,
      });

      let detail;
      if (rec.feasible) {
        // If current output percent is known, we can suggest an increase value
        if (isFiniteNum(outPct)) {
          const inc = Math.max(0, rec.suggestedPercent - outPct);
          detail = `Increase chlorinator to ~${round(rec.suggestedPercent, 0)}% (≈ +${round(inc, 0)}%) for the next ${round(pumpHours, 1)}h run.`;
        } else {
          detail = `Set chlorinator to ~${round(rec.suggestedPercent, 0)}% for the next ${round(pumpHours, 1)}h run.`;
        }
      } else {
        // Needs boost beyond 100% over scheduled hours
        const extra = Math.max(0.5, round(rec.extraHours, 1));
        detail = `Run chlorinator at 100% for your usual ${round(pumpHours, 1)}h, then add ~${extra}h extra runtime (BOOST) today.`;
      }

      items.push({
        id: 'cl-low',
        title: 'Chlorine is low',
        detail: `${detail} Target 1–3 ppm.`,
        severity: 'crit',
      });
      bump('crit');
    } else {
      // Fallback: liquid chlorine estimate (for shock/top-up)
      let detail = 'Increase chlorinator output or run-time today. Target 1–3 ppm.';
      if (isFiniteNum(poolVolumeL) && poolVolumeL > 0) {
        const L = litersLiquidChlorineToRaise(clC.delta, poolVolumeL, chlorineStrengthPct);
        if (L > 0) detail += ` (OR add ≈ ${round(L, 2)} L of ${chlorineStrengthPct}% liquid chlorine)`;
      }
      items.push({ id: 'cl-low', title: 'Chlorine is low', detail, severity: 'crit' });
      bump('crit');
    }
  } else if (clC.state === 'high') {
    let detail = 'Dial chlorinator output down or shorten run-time. Allow levels to drift to 1–3 ppm.';
    if (saltPoolMode && isFiniteNum(outPct)) {
      const newPct = Math.max(0, outPct - 10);
      detail = `Reduce chlorinator from ${round(outPct,0)}% to ~${newPct}% and/or reduce run-time.`;
    }
    items.push({ id: 'cl-high', title: 'Chlorine is high', detail, severity: 'info' });
    bump('info');
  }

  // Salt
  const saltC = classify(reading.salt, targets.salt);
  if (saltC.state === 'low') {
    let detail = 'Add pool salt gradually and re-test. Manufacturer typically targets ~3500–4000 ppm.';
    if (isFiniteNum(poolVolumeL) && poolVolumeL > 0) {
      const kg = kgSaltToRaise(saltC.delta, poolVolumeL);
      if (kg > 0) detail += ` (≈ add ${round(kg, 1)} kg of pool salt)`;
    }
    items.push({ id: 'salt-low', title: 'Salt is low', detail, severity: 'warn' });
    bump('warn');
  } else if (saltC.state === 'high') {
    items.push({
      id: 'salt-high',
      title: 'Salt is high',
      detail: 'Partially dilute with fresh water and re-test. Keep within the recommended range for your cell.',
      severity: 'info',
    });
    bump('info');
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

    const denom = win.length;
    out.push({
      ...r,
      phAvg7: denom ? sums.ph / denom : NaN,
      chlorineAvg7: denom ? sums.chlorine / denom : NaN,
      saltAvg7: denom ? sums.salt / denom : NaN,
    });
  }

  return out;
}
