/* Analitika vožnji: zone pulsa i brzine, prepoznavanje iste rute, stanje dijelova bicikla (servisi). Bez ovisnosti o sučelju. */
(function (root) {
  'use strict';
  const ZN = ['Z1 Oporavak', 'Z2 Izdržljivost', 'Z3 Tempo', 'Z4 Prag', 'Z5 Maksimum'];
  const HR_PCT = [0.6, 0.7, 0.8, 0.9];          // granice zona pulsa (% maksimalnog pulsa)
  const SPD_KMH = [15, 20, 25, 30];             // granice zona brzine (km/h)
  const SPD_LABELS = ['< 15 km/h', '15–20', '20–25', '25–30', '> 30 km/h'];

  const bin = (v, bounds) => { let i = 0; while (i < bounds.length && v >= bounds[i]) i++; return i; };

  /* Vrijeme (s) provedeno u zonama pulsa i brzine. track = zapis iz files.js (t, spd, hr). Stajanje (< 2 km/h) se ne računa. */
  function zonesFor(tr, hrMax) {
    if (!tr || !tr.t || tr.t.length < 3) return null;
    const hr = hrMax > 0 && tr.hr ? [0, 0, 0, 0, 0] : null, sp = tr.spd ? [0, 0, 0, 0, 0] : null;
    if (!hr && !sp) return null;
    const hb = hrMax > 0 ? HR_PCT.map(p => p * hrMax) : null;
    let hrT = 0, spT = 0;
    for (let i = 1; i < tr.t.length; i++) {
      const dt = tr.t[i] - tr.t[i - 1];
      if (!(dt > 0) || dt > 120) continue;
      if (tr.spd && tr.spd[i] !== null && tr.spd[i] < 2) continue;
      if (hr && tr.hr[i] !== null && tr.hr[i] !== undefined) { hr[bin(tr.hr[i], hb)] += dt; hrT += dt; }
      if (sp && tr.spd[i] !== null && tr.spd[i] !== undefined) { sp[bin(tr.spd[i], SPD_KMH)] += dt; spT += dt; }
    }
    return { hr: hrT > 0 ? hr : null, hrTime: hrT, spd: spT > 0 ? sp : null, spdTime: spT };
  }

  /* Opis intenzivnosti iz raspodjele po zonama pulsa. */
  function verdict(z) {
    if (!z || !z.hr || z.hrTime < 300) return null;
    const s = z.hr.map(v => v / z.hrTime), hard = s[3] + s[4], mid = s[2], easy = s[0] + s[1];
    if (hard >= 0.25) return 'Žestoka vožnja: ' + Math.round(hard * 100) + ' % vremena u Z4–Z5.';
    if (hard + mid >= 0.5) return 'Umjereno žestoka (tempo): ' + Math.round((hard + mid) * 100) + ' % vremena u Z3 ili više.';
    if (easy >= 0.7) return 'Lagana vožnja (izdržljivost): ' + Math.round(easy * 100) + ' % vremena u Z1–Z2.';
    return 'Mješovit intenzitet.';
  }

  /* Procjena maksimalnog pulsa iz podataka (najviši vjerodostojan maksimum). */
  function guessHrMax(acts) {
    const v = acts.filter(a => a.type === 'Ride' || a.type === 'Virtual Ride').map(a => a.maxHr).filter(x => x >= 120 && x <= 215).sort((x, y) => x - y);
    return v.length ? Math.round(v[Math.max(0, Math.floor(v.length * 0.98) - 1)]) : 0;
  }

  /* ---------- iste rute ---------- */
  function resample(P, m) {
    const c = [0];
    for (let i = 1; i < P.length; i++) c.push(c[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const L = c[c.length - 1], out = [];
    if (!(L > 0)) return { pts: [P[0]], len: 0 };
    let j = 0;
    for (let k = 0; k < m; k++) {
      const s = L * k / (m - 1);
      while (j < P.length - 2 && c[j + 1] < s) j++;
      const seg = c[j + 1] - c[j], f = seg > 0 ? (s - c[j]) / seg : 0;
      out.push([P[j][0] + (P[j + 1][0] - P[j][0]) * f, P[j][1] + (P[j + 1][1] - P[j][1]) * f]);
    }
    return { pts: out, len: L };
  }
  function toMeters(ll, lat0, lon0) { const kx = Math.cos(lat0 * Math.PI / 180) * 111320; return ll.map(([la, lo]) => [(lo - lon0) * kx, (la - lat0) * 110540]); }

  function prepare(ll, lat0, lon0) {
    if (!ll || ll.length < 5) return null;
    const P = toMeters(ll, lat0, lon0), r = resample(P, 40), dense = resample(P, 160).pts;
    if (r.len < 1500) return null; // prekratko za usporedbu rute
    let x0 = 1e18, x1 = -1e18, y0 = 1e18, y1 = -1e18;
    for (const [x, y] of dense) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { s: r.pts, dense, len: r.len, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0, h: y1 - y0 };
  }
  function chamfer(A, Bdense) {
    const d = [];
    for (const [x, y] of A) { let m = 1e18; for (const [u, v] of Bdense) { const q = (x - u) * (x - u) + (y - v) * (y - v); if (q < m) m = q; } d.push(Math.sqrt(m)); }
    d.sort((a, b) => a - b);
    return { mean: d.reduce((a, b) => a + b, 0) / d.length, p90: d[Math.floor(d.length * 0.9)] };
  }
  function similar(a, b) {
    if (Math.abs(a.len - b.len) / Math.max(a.len, b.len) > 0.12) return false;
    if (Math.hypot(a.cx - b.cx, a.cy - b.cy) > 1500) return false;
    const x = chamfer(a.s, b.dense); if (x.mean > 45 || x.p90 > 130) return false;
    const y = chamfer(b.s, a.dense); return y.mean <= 45 && y.p90 <= 130;
  }

  /* items: [{ id, ll: [[lat, lon], ...] }] → klasteri [{ ids: [...] }] samo s ≥ 2 vožnje, najveći prvi. */
  function clusterRoutes(items) {
    const ok = items.filter(i => i.ll && i.ll.length >= 5);
    if (!ok.length) return [];
    const lat0 = ok[0].ll[0][0], lon0 = ok[0].ll[0][1];
    const clusters = [];
    for (const it of ok) {
      const p = prepare(it.ll, lat0, lon0); if (!p) continue;
      let hit = null;
      for (const c of clusters) if (similar(c.rep, p)) { hit = c; break; }
      if (hit) hit.ids.push(it.id); else clusters.push({ rep: p, ids: [it.id], ll: it.ll });
    }
    return clusters.filter(c => c.ids.length >= 2).map(c => ({ ids: c.ids, ll: c.ll })).sort((a, b) => b.ids.length - a.ids.length);
  }

  /* ---------- dijelovi bicikla i servisi ---------- */
  const PRESETS = [{ name: 'Lanac', every: 3000 }, { name: 'Mali servis', every: 2000 }, { name: 'Veliki servis', every: 6000 }];
  const isRide = a => a.type === 'Ride' || a.type === 'Virtual Ride';
  function bikeKm(acts, bike, sinceISO) {
    const t = sinceISO ? new Date(sinceISO).getTime() : 0;
    return acts.filter(a => isRide(a) && (a.gear || '') === bike && new Date(a.date).getTime() >= t).reduce((s, a) => s + (a.dist || 0), 0);
  }
  /* part: { name, every, since (ISO), start (km prije since) } */
  function partStatus(acts, bike, part) {
    const used = (part.start || 0) + bikeKm(acts, bike, part.since), left = part.every - used;
    return { used, left, pct: part.every > 0 ? used / part.every : 0, level: used > part.every ? 'over' : used >= part.every * 0.85 ? 'soon' : 'ok' };
  }

  const api = { ZN, HR_PCT, SPD_KMH, SPD_LABELS, zonesFor, verdict, guessHrMax, clusterRoutes, PRESETS, bikeKm, partStatus, isRide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Analytics = api;
})(typeof self !== 'undefined' ? self : this);
