/* Čista logika aplikacije (bez DOM-a) – radi u pregledniku i u Nodeu za testove. */
(function (root) {
  'use strict';

  const TYPE_LABELS = {
    'Ride': 'Bicikl', 'Run': 'Trčanje', 'Walk': 'Hodanje', 'Hike': 'Planinarenje',
    'Swim': 'Plivanje', 'Weight Training': 'Snaga', 'Workout': 'Trening',
    'Football (Soccer)': 'Nogomet', 'Yoga': 'Yoga', 'Virtual Ride': 'Virtualni bicikl',
    'Elliptical': 'Eliptični', 'Rowing': 'Veslanje'
  };
  const typeLabel = t => TYPE_LABELS[t] || t || 'Ostalo';

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(f); f = ''; rows.push(row); row = [];
      } else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(r => r.length > 1 || (r[0] || '') !== '');
  }

  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  // Strava izvozi vrijeme u UTC: "Oct 10, 2026, 5:36:31 PM"
  function parseStravaDate(s) {
    s = (s || '').trim();
    let m = s.match(/^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
    if (m) {
      const mon = MONTHS[m[1].toLowerCase()];
      if (mon === undefined) return null;
      let h = parseInt(m[4], 10) % 12;
      if (m[7].toUpperCase() === 'PM') h += 12;
      return new Date(Date.UTC(+m[3], mon, +m[2], h, +m[5], +m[6])).toISOString();
    }
    const t = Date.parse(s);
    return isNaN(t) ? null : new Date(t).toISOString();
  }

  const num = v => {
    if (v === undefined || v === null || String(v).trim() === '') return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return isFinite(n) ? n : null;
  };

  /* Stupci se traže po imenu (n-ta pojava), jer Strava ima duple nazive (Distance, Elapsed Time...). */
  function importStravaCSV(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('CSV je prazan.');
    const h = rows[0].map(x => x.trim());
    const col = (name, nth = 0) => { let seen = 0; for (let i = 0; i < h.length; i++) if (h[i] === name) { if (seen === nth) return i; seen++; } return -1; };
    const need = ['Activity ID', 'Activity Date', 'Activity Type'];
    for (const n of need) if (col(n) < 0) throw new Error('Nedostaje stupac "' + n + '". Export mora biti na engleskom jeziku (Strava → Postavke → Jezik).');
    const C = {
      id: col('Activity ID'), date: col('Activity Date'), name: col('Activity Name'), type: col('Activity Type'),
      desc: col('Activity Description'), elapsed1: col('Elapsed Time', 1), elapsed0: col('Elapsed Time', 0),
      moving: col('Moving Time'), dist1: col('Distance', 1), dist0: col('Distance', 0),
      avgSpeed: col('Average Speed'), elev: col('Elevation Gain'), avgHr: col('Average Heart Rate'),
      maxHr: col('Max Heart Rate', 1) >= 0 ? col('Max Heart Rate', 1) : col('Max Heart Rate', 0),
      watts: col('Average Watts'), cal: col('Calories'), gear: col('Activity Gear'),
      effort: col('Relative Effort', 0), lifted: col('Total Weight Lifted'),
      sets: col('Total Sets'), reps: col('Total Reps'), file: col('Filename')
    };
    const get = (r, k) => (C[k] >= 0 ? r[C[k]] : undefined);
    const out = [], bad = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const id = String(get(r, 'id') || '').trim();
      const date = parseStravaDate(get(r, 'date'));
      if (!id || !date) { bad.push(i + 1); continue; }
      const elapsed = num(get(r, 'elapsed1')) ?? num(get(r, 'elapsed0')) ?? 0;
      const moving = num(get(r, 'moving')) ?? elapsed;
      const distM = num(get(r, 'dist1'));
      const dist = distM !== null ? distM / 1000 : (num(get(r, 'dist0')) ?? 0);
      const sp = num(get(r, 'avgSpeed'));
      out.push({
        id, date, name: (get(r, 'name') || '').trim(), type: (get(r, 'type') || '').trim(),
        desc: (get(r, 'desc') || '').trim(), dist: round(dist, 3), elapsed, moving,
        avgSpeed: sp !== null ? round(sp * 3.6, 2) : null, elev: num(get(r, 'elev')),
        avgHr: num(get(r, 'avgHr')), maxHr: num(get(r, 'maxHr')), watts: num(get(r, 'watts')),
        cal: num(get(r, 'cal')), gear: (get(r, 'gear') || '').trim(), effort: num(get(r, 'effort')),
        lifted: num(get(r, 'lifted')), sets: num(get(r, 'sets')), reps: num(get(r, 'reps')),
        file: (get(r, 'file') || '').trim(), notes: '', tags: [], src: 'strava', updated: 0
      });
    }
    return { activities: out, bad };
  }
  const round = (n, d) => { const p = Math.pow(10, d); return Math.round(n * p) / p; };

  /* ---------- Stanje i spajanje ---------- */
  const emptyDB = () => ({ v: 1, activities: {}, deleted: {} });

  // Dodaje uvezene aktivnosti; postojeće (isti ID) se ne diraju, da ne pregazimo tvoje bilješke.
  function addImported(db, list) {
    let added = 0, dup = 0; const now = Date.now();
    for (const a of list) {
      if (db.activities[a.id]) { dup++; continue; }
      if (db.deleted[a.id]) { dup++; continue; } // namjerno obrisano – ne vraćaj
      db.activities[a.id] = Object.assign({}, a, { updated: now });
      added++;
    }
    return { added, dup };
  }

  // Spajanje dviju baza: po aktivnosti pobjeđuje novija izmjena; brisanje (tombstone) pobjeđuje ako je novije.
  function mergeDB(a, b) {
    const out = emptyDB();
    const deleted = Object.assign({}, a.deleted || {});
    for (const [id, t] of Object.entries(b.deleted || {})) deleted[id] = Math.max(deleted[id] || 0, t);
    const ids = new Set([...Object.keys(a.activities || {}), ...Object.keys(b.activities || {})]);
    for (const id of ids) {
      const x = (a.activities || {})[id], y = (b.activities || {})[id];
      const best = !x ? y : !y ? x : ((y.updated || 0) > (x.updated || 0) ? y : x);
      if (deleted[id] && deleted[id] >= (best.updated || 0)) continue;
      out.activities[id] = best;
    }
    out.deleted = deleted;
    return out;
  }
  const sameDB = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  /* ---------- Datumi (lokalno vrijeme) ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

  /* ---------- Agregacije ---------- */
  const sum = (arr, f) => arr.reduce((s, a) => s + (f(a) || 0), 0);
  function totals(list) {
    return { n: list.length, sec: sum(list, a => a.moving || a.elapsed), km: sum(list, a => a.dist), elev: sum(list, a => a.elev), cal: sum(list, a => a.cal) };
  }

  // period: 'week' | 'month' | 'year' | 'all'; cursor: Date unutar perioda
  function periodRange(period, cursor) {
    if (period === 'week') { const s = mondayOf(cursor); return [s, addDays(s, 7)]; }
    if (period === 'month') return [new Date(cursor.getFullYear(), cursor.getMonth(), 1), new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)];
    if (period === 'year') return [new Date(cursor.getFullYear(), 0, 1), new Date(cursor.getFullYear() + 1, 0, 1)];
    return [new Date(1970, 0, 1), new Date(9999, 0, 1)];
  }
  const inRange = (a, [s, e]) => { const d = new Date(a.date); return d >= s && d < e; };

  // Stupci grafa: [{label, from, to}]
  function buckets(period, cursor, list) {
    const out = []; const [s, e] = periodRange(period, cursor);
    if (period === 'week') {
      const L = ['P', 'U', 'S', 'Č', 'P', 'S', 'N'];
      for (let i = 0; i < 7; i++) out.push({ label: L[i], from: addDays(s, i), to: addDays(s, i + 1) });
    } else if (period === 'month') {
      const n = Math.round((e - s) / 864e5);
      for (let i = 0; i < n; i++) out.push({ label: String(i + 1), from: addDays(s, i), to: addDays(s, i + 1) });
    } else {
      let start, end;
      if (period === 'year') { start = new Date(s); end = new Date(e); }
      else {
        if (!list.length) return [];
        const ds = list.map(a => new Date(a.date));
        const mn = new Date(Math.min(...ds)), mx = new Date(Math.max(...ds));
        start = new Date(mn.getFullYear(), mn.getMonth(), 1); end = new Date(mx.getFullYear(), mx.getMonth() + 1, 1);
      }
      const M = ['sij', 'velj', 'ožu', 'tra', 'svi', 'lip', 'srp', 'kol', 'ruj', 'lis', 'stu', 'pro'];
      for (let d = new Date(start); d < end; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
        out.push({ label: M[d.getMonth()], from: new Date(d), to: new Date(d.getFullYear(), d.getMonth() + 1, 1), year: d.getFullYear(), month: d.getMonth() });
      }
    }
    return out;
  }
  function bucketValues(bks, list, metric) {
    const f = metric === 'km' ? a => a.dist : metric === 'h' ? a => (a.moving || a.elapsed) / 3600 : () => 1;
    return bks.map(b => sum(list.filter(a => inRange(a, [b.from, b.to])), f));
  }

  /* ---------- Rekordi ---------- */
  function records(list) {
    const rec = [];
    const best = (title, key, fmt, filter) => {
      const c = list.filter(a => a[key] !== null && a[key] !== undefined && a[key] > 0 && (!filter || filter(a)));
      if (!c.length) return;
      const a = c.reduce((m, x) => (x[key] > m[key] ? x : m));
      rec.push({ title, value: fmt(a[key]), a });
    };
    const dur = s => { const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60); return h ? h + ' h ' + pad(m) + ' min' : m + ' min'; };
    best('Najduža udaljenost', 'dist', v => v.toFixed(1) + ' km');
    best('Najdulje trajanje', 'moving', dur);
    best('Najveća visinska razlika', 'elev', v => Math.round(v) + ' m');
    best('Najbrži prosjek (≥ 10 km)', 'avgSpeed', v => v.toFixed(1) + ' km/h', a => a.dist >= 10);
    best('Najveća prosječna snaga (≥ 10 km)', 'watts', v => Math.round(v) + ' W', a => a.dist >= 10);
    best('Najviše kalorija', 'cal', v => Math.round(v) + ' kcal');
    best('Najviše podignuto', 'lifted', v => Math.round(v) + ' kg');
    best('Najviši puls', 'maxHr', v => Math.round(v) + ' bpm');
    // najbolji tjedan / mjesec
    const grp = (keyFn, label) => {
      const m = new Map();
      for (const a of list) { const k = keyFn(new Date(a.date)); (m.get(k) || m.set(k, []).get(k)).push(a); }
      let bestK = null, bestV = 0;
      for (const [k, arr] of m) { const v = sum(arr, x => x.dist); if (v > bestV) { bestV = v; bestK = k; } }
      if (bestK) rec.push({ title: label, value: bestV.toFixed(1) + ' km', note: bestK });
      let cK = null, cV = 0;
      for (const [k, arr] of m) if (arr.length > cV) { cV = arr.length; cK = k; }
      if (cK) rec.push({ title: label.replace('km', 'treninga'), value: cV + ' treninga', note: cK });
    };
    grp(d => 'tjedan od ' + ymd(mondayOf(d)), 'Najbolji tjedan (km)');
    grp(d => d.getFullYear() + '-' + pad(d.getMonth() + 1), 'Najbolji mjesec (km)');
    return rec;
  }

  // Trajanje h:mm
  function fmtDur(sec) { sec = Math.round(sec || 0); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? h + ':' + pad(m) + ' h' : m + ' min'; }

  const api = { TYPE_LABELS, typeLabel, parseCSV, parseStravaDate, importStravaCSV, emptyDB, addImported, mergeDB, sameDB, ymd, mondayOf, addDays, totals, periodRange, inRange, buckets, bucketValues, records, fmtDur };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Core = api;
})(typeof self !== 'undefined' ? self : this);
