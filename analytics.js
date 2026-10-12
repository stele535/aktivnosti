/* Analitika vožnji: zone pulsa i brzine. Bez ovisnosti o sučelju. */
(function (root) {
  'use strict';
  const ZN = ['Z1 Oporavak', 'Z2 Izdržljivost', 'Z3 Tempo', 'Z4 Prag', 'Z5 Maksimum'];

  const bin = (v, bounds) => { let i = 0; while (i < bounds.length && v >= bounds[i]) i++; return i; };

  /* Granice zona (donje granice zona 2–5). Zadano kao na iGPSPORT-u; mijenja se u Postavkama. */
  const DEFAULTS = { hr: [114, 133, 152, 171], spd: [18, 25, 30, 35], walk: [3, 4.5, 5.5, 6.5] };
  const okB = b => Array.isArray(b) && b.length === 4 && b.every((v, i) => isFinite(v) && v > 0 && (i === 0 || v > b[i - 1]));
  function cfgFrom(settings) {
    const s = settings || {};
    return { hr: okB(s.hr) ? s.hr.map(Number) : DEFAULTS.hr.slice(), spd: okB(s.spd) ? s.spd.map(Number) : DEFAULTS.spd.slice(), walk: okB(s.walk) ? s.walk.map(Number) : DEFAULTS.walk.slice() };
  }
  /* Skupina sporta za zone brzine: 'ride' (bicikl), 'walk' (hodanje, planinarenje) ili null (samo zone pulsa). */
  const group = t => /ride|cycl|bike/i.test(t || '') ? 'ride' : /^(walk|hike)$/i.test(t || '') ? 'walk' : null;
  /* Postavke zona za jedan trening: puls je zajednički, brzina ovisi o sportu (za ostale sportove nema zona brzine). */
  function forType(cfg, type) { const g = group(type); return { hr: cfg.hr, spd: g === 'walk' ? cfg.walk : g === 'ride' ? cfg.spd : null }; }
  const labelsOf = (b, unit) => [0, 1, 2, 3, 4].map(i => 'Z' + (i + 1) + ' ' + (i === 0 ? '< ' + b[0] : i === 4 ? '> ' + b[3] : b[i - 1] + '–' + b[i]) + (unit ? ' ' + unit : ''));
  const hrLabels = cfg => labelsOf(cfg.hr, 'bpm'), spdLabels = cfg => cfg.spd ? labelsOf(cfg.spd, 'km/h') : [];

  /* Zona (0–4) svake točke zapisa, ili -1 ako nema podatka (ili se stoji). key: 'hr' | 'spd' */
  function zoneIdx(tr, cfg, key) {
    if (!tr || !tr[key] || !tr.t || !cfg[key]) return null;
    const b = cfg[key];
    return tr[key].map((v, i) => (v === null || v === undefined || (tr.spd && tr.spd[i] !== null && tr.spd[i] < 2)) ? -1 : bin(v, b));
  }

  /* Vrijeme (s) provedeno u zonama pulsa i brzine. Stajanje (< 2 km/h) se ne računa. */
  function zonesFor(tr, cfg) {
    if (!tr || !tr.t || tr.t.length < 3) return null;
    const hr = tr.hr ? [0, 0, 0, 0, 0] : null, sp = tr.spd && cfg.spd ? [0, 0, 0, 0, 0] : null;
    if (!hr && !sp) return null;
    let hrT = 0, spT = 0;
    for (let i = 1; i < tr.t.length; i++) {
      const dt = tr.t[i] - tr.t[i - 1];
      if (!(dt > 0) || dt > 120) continue;
      if (tr.spd && tr.spd[i] !== null && tr.spd[i] < 2) continue;
      if (hr && tr.hr[i] !== null && tr.hr[i] !== undefined) { hr[bin(tr.hr[i], cfg.hr)] += dt; hrT += dt; }
      if (sp && tr.spd[i] !== null && tr.spd[i] !== undefined) { sp[bin(tr.spd[i], cfg.spd)] += dt; spT += dt; }
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

  const isRide = a => a.type === 'Ride' || a.type === 'Virtual Ride';


  const api = { ZN, DEFAULTS, cfgFrom, group, forType, hrLabels, spdLabels, zoneIdx, zonesFor, verdict, guessHrMax, isRide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Analytics = api;
})(typeof self !== 'undefined' ? self : this);
