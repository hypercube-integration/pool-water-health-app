// src/utils/chemistry.js

// ---------- Defaults (tune to your region if desired) ----------
export const TARGETS = {
  ph: [7.2, 7.6],
  chlorine: [1.0, 3.0], // ppm
  salt: [3000, 4500],   // ppm
};

// Convert settings -> targets, falling back to defaults where missing/invalid
export function targetsFromSettings(settings) {
  const s = settings || {};
  const pick = (lo, hi, defPair) => {
    const a = Number(lo), b = Number(hi);
    if (Number.isFinite(a) && Number.isFinite(b) && a < b) return [a, b];
    return defPair;
  };
  return {
    ph:       pick(s.phMin, s.phMax, TARGETS.ph),
    chlorine: pick(s.chlorineMin, s.chlorineMax, TARGETS.chlorine),
    salt:     pick(s.saltMin, s.saltMax, TARGETS.salt),
  };
}

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

// ---------- Dosing math (salt & liquid) ----------
/** Salt: Δppm * Volume(L) / 1e6 = kg salt */
export function kgSaltToRaise(deltaPpm, volumeL) {
  if (!isFiniteNum(deltaPpm) || !isFiniteNum(volumeL) || deltaPpm <= 0 || volumeL <= 0) return 0;
  return (deltaPpm * volumeL) / 1_000_000; // kg
}

/** Liquid chlorine fallback (for shock/top-ups) */
export function litersLiquidChlorineToRaise(deltaPpm, volumeL, strengthPct = 12.5) {
  if (!isFiniteNum(deltaPpm) || !isFiniteNum(volumeL) || deltaPpm <= 0 || volumeL <= 0) return 0;
  const gramsNeeded = (deltaPpm * volumeL) / 1000; // g available chlorine
  const gramsPerLiter = strengthPct * 10;          // ≈ g/L
  return gramsNeeded / gramsPerLiter;              // liters product
}

/** Chlorinator production helpers */
export function gramsPerDayAtPercent(rating_g_per_hr, pumpHours, percent) {
  if (![rating_g_per_hr, pumpHours, percent].every(isFiniteNum)) return 0;
  return (rating_g_per_hr * pumpHours * Math.max(0, Math.min(100, percent))) / 100;
}
export function ppmFromGrams(volumeL, grams) {
  if (!isFiniteNum(volumeL) || volumeL <= 0 || !isFiniteNum(grams) || grams <= 0) return 0;
  return (grams * 1000) / volumeL; // grams -> ppm
}

/** Recommend chlorinator % / extra hours for Δppm today */
export function recommendChlorinatorAdjustment({
  deltaPpm,
  volumeL,
  rating_g_per_hr,
  pumpHours,
  currentPercent,
}) {
  const out = {
    neededGrams: 0,
    neededPpm: Math.max(0, deltaPpm || 0),
    currentGramsPerDay: 0,
    currentPpmPerDay: 0,
    suggestedPercent: NaN,
    extraHours: 0,
    feasible: false,
  };

  if (![deltaPpm, volumeL, rating_g_per_hr, pumpHours].every(isFiniteNum)) return out;
  if (deltaPpm <= 0 || volumeL <= 0 || rating_g_per_hr <= 0 || pumpHours <= 0) return out;

  const neededGrams = (deltaPpm * volumeL) / 1000;
  out.neededGrams = neededGrams;

  const gramsPerDay100 = rating_g_per_hr * pumpHours;

  if (isFiniteNum(currentPercent)) {
    out.currentGramsPerDay = gramsPerDayAtPercent(rating_g_per_hr, pumpHours, currentPercent);
    out.currentPpmPerDay = ppmFromGrams(volumeL, out.currentGramsPerDay);
  }

  const pct = (neededGrams / gramsPerDay100) * 100;
  out.suggestedPercent = pct;
  out.feasible = pct <= 100;

  if (!out.feasible) {
    const shortfall = neededGrams - gramsPerDay100;
    out.extraHours = shortfall > 0 ? shortfall / rating_g_per_hr : 0;
  }
  return out;
}

// ---------- Advisories ----------
export function buildAdvisories(reading, targets, settings = {}) {
  const t = targets || TARGETS;
  if (!reading) return { items: [], overall: 'ok' };

  const poolVolumeL = toNum(settings.poolVolumeL);
  const chlorineStrengthPct = toNum(settings.chlorineStrengthPct) || 12.5;
  const saltPoolMode = !!settings.saltPoolMode;
  const cellRate = toNum(settings.chlorinatorRated_g_per_hr);
  const pumpHours = toNum(settings.dailyPumpHours);
  const outPct = toNum(settings.currentOutputPercent);

  const items = [];
  let overall = 'ok';
  const bump = (sev) => {
    const order = { ok: 0, info: 1, warn: 2, crit: 3 };
    if (order[sev] > order[overall]) overall = sev;
  };

  // pH
  const phC = classify(reading.ph, t.ph);
  if (phC.state === 'low') {
    items.push({ id: 'ph-low', title: 'pH is low', detail: 'Raise pH slightly. Reduce acid dosing and/or aerate water. Target range applies.', severity: 'warn' });
    bump('warn');
  } else if (phC.state === 'high') {
    items.push({ id: 'ph-high', title: 'pH is high', detail: 'Lower pH with a small acid adjustment. Re-test after 30–60 minutes.', severity: 'warn' });
    bump('warn');
  }

  // Chlorine
  const clC = classify(reading.chlorine, t.chlorine);
  if (clC.state === 'low') {
    if (saltPoolMode && [poolVolumeL, cellRate, pumpHours].every(isFiniteNum) && poolVolumeL > 0) {
      const rec = recommendChlorinatorAdjustment({
        deltaPpm: clC.delta,
        volumeL: poolVolumeL,
        rating_g_per_hr: cellRate,
        pumpHours,
        currentPercent: isFiniteNum(outPct) ? outPct : undefined,
      });
      let detail = '';
      if (isFiniteNum(outPct)) {
        detail += `Current production ≈ ${round(rec.currentPpmPerDay || 0, 2)} ppm/day @ ${round(outPct,0)}% for ${round(pumpHours,1)}h. `;
      }
      if (rec.feasible) {
        if (isFiniteNum(outPct)) {
          const inc = Math.max(0, rec.suggestedPercent - outPct);
          detail += `Increase chlorinator to ~${round(rec.suggestedPercent,0)}% (≈ +${round(inc,0)}%) for the next ${round(pumpHours,1)}h run.`;
        } else {
          detail += `Set chlorinator to ~${round(rec.suggestedPercent,0)}% for the next ${round(pumpHours,1)}h run.`;
        }
      } else {
        const extra = Math.max(0.5, round(rec.extraHours, 1));
        detail += `Run 100% for your usual ${round(pumpHours,1)}h, then add ~${extra}h extra today (BOOST).`;
      }
      items.push({ id: 'cl-low', title: 'Chlorine is low', detail: `${detail}`, severity: 'crit' });
      bump('crit');
    } else {
      let detail = 'Increase chlorinator output or run-time today.';
      if (isFiniteNum(poolVolumeL) && poolVolumeL > 0) {
        const L = litersLiquidChlorineToRaise(clC.delta, poolVolumeL, chlorineStrengthPct);
        if (L > 0) detail += ` (OR add ≈ ${round(L,2)} L of ${chlorineStrengthPct}% liquid chlorine)`;
      }
      items.push({ id: 'cl-low', title: 'Chlorine is low', detail, severity: 'crit' });
      bump('crit');
    }
  } else if (clC.state === 'high') {
    let detail = 'Dial chlorinator output down or shorten run-time.';
    if (saltPoolMode && isFiniteNum(outPct)) {
      const newPct = Math.max(0, outPct - 10);
      detail = `Reduce chlorinator from ${round(outPct,0)}% to ~${newPct}% and/or reduce run-time.`;
    }
    items.push({ id: 'cl-high', title: 'Chlorine is high', detail, severity: 'info' });
    bump('info');
  }

  // Salt
  const saltC = classify(reading.salt, t.salt);
  if (saltC.state === 'low') {
    let detail = 'Add pool salt gradually and re-test.';
    if (isFiniteNum(poolVolumeL) && poolVolumeL > 0) {
      const kg = kgSaltToRaise(saltC.delta, poolVolumeL);
      if (kg > 0) detail += ` (≈ add ${round(kg,1)} kg of pool salt)`;
    }
    items.push({ id: 'salt-low', title: 'Salt is low', detail, severity: 'warn' });
    bump('warn');
  } else if (saltC.state === 'high') {
    items.push({ id: 'salt-high', title: 'Salt is high', detail: 'Partially dilute with fresh water and re-test.', severity: 'info' });
    bump('info');
  }

  return { items, overall };
}

// ---------- Moving averages ----------
/** Adds phAvg7, chlorineAvg7, saltAvg7 for window n (default 7). */
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
