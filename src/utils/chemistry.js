// src/utils/chemistry.js

// Target bands (tune to your pool)
export const TARGETS = {
  ph: [7.2, 7.6],
  chlorine: [1.0, 3.0], // ppm
  salt: [3000, 4500],   // ppm
};

export function classify(value, [lo, hi]) {
  if (value == null || Number.isNaN(value)) return { state: 'unknown' };
  if (value < lo) return { state: 'low', delta: lo - value };
  if (value > hi) return { state: 'high', delta: value - hi };
  return { state: 'ok', delta: 0 };
}

/**
 * Build simple advisories from a single reading.
 * Returns { items: [{id, title, detail, severity}], overall: 'ok'|'warn'|'crit' }
 */
export function buildAdvisories(reading, targets = TARGETS) {
  if (!reading) return { items: [], overall: 'ok' };

  const items = [];
  let worst = 'ok';
  const bump = (sev) => {
    const order = { ok: 0, info: 1, warn: 2, crit: 3 };
    if (order[sev] > order[worst]) worst = sev;
  };

  // pH
  const phC = classify(Number(reading.ph), targets.ph);
  if (phC.state === 'low') {
    items.push({
      id: 'ph-low',
      title: 'pH is low',
      detail: 'Raise pH slightly. Reduce acid dosing and/or aerate water. Aim for 7.2–7.6.',
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
  const clC = classify(Number(reading.chlorine), targets.chlorine);
  if (clC.state === 'low') {
    items.push({
      id: 'cl-low',
      title: 'Chlorine is low',
      detail: 'Increase chlorinator output or run-time today. Consider a brief boost mode. Target 1–3 ppm.',
      severity: 'crit',
    }); bump('crit');
  } else if (clC.state === 'high') {
    items.push({
      id: 'cl-high',
      title: 'Chlorine is high',
      detail: 'Dial chlorinator output down or shorten run-time. Allow levels to drift to 1–3 ppm.',
      severity: 'info',
    }); bump('info');
  }

  // Salt
  const saltC = classify(Number(reading.salt), targets.salt);
  if (saltC.state === 'low') {
    items.push({
      id: 'salt-low',
      title: 'Salt is low',
      detail: 'Add pool salt gradually and re-test. Manufacturer typically targets ~3500–4000 ppm.',
      severity: 'warn',
    }); bump('warn');
  } else if (saltC.state === 'high') {
    items.push({
      id: 'salt-high',
      title: 'Salt is high',
      detail: 'Partially dilute with fresh water and re-test. Keep within the recommended range for your cell.',
      severity: 'info',
    }); bump('info');
  }

  return { items, overall: worst };
}

/**
 * Compute simple moving average (window N) for an array of points.
 * Returns a new array with additional keys like {phAvg7, chlorineAvg7, saltAvg7}.
 */
export function withMovingAverages(data, n = 7) {
  const acc = [];
  const sum = { ph: 0, chlorine: 0, salt: 0 };

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const ph = num(r.ph), cl = num(r.chlorine), sa = num(r.salt);

    sum.ph += isFiniteNum(ph) ? ph : 0;
    sum.chlorine += isFiniteNum(cl) ? cl : 0;
    sum.salt += isFiniteNum(sa) ? sa : 0;

    if (i >= n) {
      const prev = data[i - n];
      sum.ph -= isFiniteNum(num(prev.ph)) ? num(prev.ph) : 0;
      sum.chlorine -= isFiniteNum(num(prev.chlorine)) ? num(prev.chlorine) : 0;
      sum.salt -= isFiniteNum(num(prev.salt)) ? num(prev.salt) : 0;
    }

    const denom = Math.min(i + 1, n);
    acc.push({
      ...r,
      phAvg7: sum.ph / denom,
      chlorineAvg7: sum.chlorine / denom,
      saltAvg7: sum.salt / denom,
    });
  }

  return acc;
}

const num = (v) => (v === '' || v == null ? NaN : Number(v));
const isFiniteNum = (v) => typeof v === 'number' && Number.isFinite(v);
