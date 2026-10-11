/* Čitanje datoteka: ZIP, gzip, FIT, GPX, TCX + izrada kompaktne trase. Bez ovisnosti o bibliotekama. */
(function (root) {
  'use strict';

  /* ---------- dekompresija (ugrađena u preglednik: Chrome, Safari 16.4+, Firefox) ---------- */
  const isGz = u => u.length > 2 && u[0] === 0x1f && u[1] === 0x8b;
  async function inflate(bytes, fmt) {
    if (typeof DecompressionStream === 'undefined') throw new Error('Ovaj preglednik ne može raspakirati datoteke (treba noviji iOS/Chrome).');
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream(fmt));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const decodeText = u => new TextDecoder('utf-8').decode(u).replace(/^\uFEFF/, '');
  const baseName = p => String(p || '').split('/').pop();
  const stripGz = p => String(p || '').replace(/\.gz$/i, '');

  /* ---------- ZIP (čita samo kazalo i tražene datoteke; cijeli ZIP se ne učitava u memoriju) ---------- */
  async function readZip(file) {
    const size = file.size, tailLen = Math.min(size, 65557);
    const tail = new Uint8Array(await file.slice(size - tailLen, size).arrayBuffer());
    const tv = new DataView(tail.buffer);
    let e = -1;
    for (let i = tail.length - 22; i >= 0; i--) if (tv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error('Ovo nije valjan ZIP.');
    const count = tv.getUint16(e + 10, true), cdSize = tv.getUint32(e + 12, true), cdOff = tv.getUint32(e + 16, true);
    if (count === 0xFFFF || cdSize === 0xFFFFFFFF || cdOff === 0xFFFFFFFF) throw new Error('ZIP je prevelik (ZIP64). Raspakiraj ga na računalu pa uvezi activities.csv i GPS datoteke zasebno.');
    const cd = new Uint8Array(await file.slice(cdOff, cdOff + cdSize).arrayBuffer());
    const cv = new DataView(cd.buffer), td = new TextDecoder();
    const entries = new Map();
    let p = 0;
    while (p + 46 <= cd.length && cv.getUint32(p, true) === 0x02014b50) {
      const nl = cv.getUint16(p + 28, true), el = cv.getUint16(p + 30, true), cl = cv.getUint16(p + 32, true);
      const name = td.decode(cd.subarray(p + 46, p + 46 + nl));
      entries.set(name, { name, method: cv.getUint16(p + 10, true), crc: cv.getUint32(p + 16, true), csize: cv.getUint32(p + 20, true), usize: cv.getUint32(p + 24, true), off: cv.getUint32(p + 42, true) });
      p += 46 + nl + el + cl;
    }
    async function read(en) {
      const lh = new DataView(await file.slice(en.off, en.off + 30).arrayBuffer());
      if (lh.getUint32(0, true) !== 0x04034b50) throw new Error('Oštećen zapis u ZIP-u.');
      const start = en.off + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
      const raw = new Uint8Array(await file.slice(start, start + en.csize).arrayBuffer());
      if (en.method === 0) return raw;
      if (en.method === 8) { // deflate zapis omotamo u gzip (CRC i veličina su u ZIP-ovom kazalu) jer 'gzip' podržavaju svi preglednici, a 'deflate-raw' ne
        const gz = new Uint8Array(10 + raw.length + 8);
        gz.set([0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 3], 0); gz.set(raw, 10);
        const gv = new DataView(gz.buffer); gv.setUint32(10 + raw.length, en.crc, true); gv.setUint32(14 + raw.length, en.usize >>> 0, true);
        return inflate(gz, 'gzip');
      }
      throw new Error('Nepodržana kompresija u ZIP-u.');
    }
    return { entries, read };
  }

  /* ---------- FIT ---------- */
  const FIT_EPOCH = 631065600; // sekunde od 1. 1. 1970. do 31. 12. 1989.
  const ELEM = { 0: 1, 1: 1, 2: 1, 3: 2, 4: 2, 5: 4, 6: 4, 7: 1, 8: 4, 9: 8, 10: 1, 11: 2, 12: 4, 13: 1, 14: 8, 15: 8, 16: 8 };
  function readVal(dv, off, bt, le) {
    switch (bt & 0x1f) {
      case 0: case 2: case 13: { const v = dv.getUint8(off); return v === 0xFF ? null : v; }
      case 1: { const v = dv.getInt8(off); return v === 0x7F ? null : v; }
      case 3: { const v = dv.getInt16(off, le); return v === 0x7FFF ? null : v; }
      case 4: { const v = dv.getUint16(off, le); return v === 0xFFFF ? null : v; }
      case 5: { const v = dv.getInt32(off, le); return v === 0x7FFFFFFF ? null : v; }
      case 6: { const v = dv.getUint32(off, le); return v === 0xFFFFFFFF ? null : v; }
      case 8: { const v = dv.getFloat32(off, le); return isFinite(v) ? v : null; }
      case 10: { const v = dv.getUint8(off); return v === 0 ? null : v; }
      case 11: { const v = dv.getUint16(off, le); return v === 0 ? null : v; }
      case 12: { const v = dv.getUint32(off, le); return v === 0 ? null : v; }
      default: return null;
    }
  }
  const FIT_SPORT = { 1: 'Run', 2: 'Ride', 4: 'Workout', 5: 'Swim', 7: 'Football (Soccer)', 10: 'Workout', 11: 'Walk', 15: 'Rowing', 17: 'Hike' };

  function parseFIT(u8) {
    const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const out = { kind: 'fit', points: [], sport: null, session: null, name: null };
    let pos = 0, files = 0;
    while (pos + 12 <= u8.length) {
      const hs = u8[pos];
      if (hs < 12 || String.fromCharCode(u8[pos + 8], u8[pos + 9], u8[pos + 10], u8[pos + 11]) !== '.FIT') break;
      files++;
      const end = Math.min(pos + hs + dv.getUint32(pos + 4, true), u8.length);
      const defs = new Array(16).fill(null);
      let p = pos + hs, lastTs = 0;
      while (p < end) {
        const h = u8[p++];
        let local, cOff = null;
        if (h & 0x80) { local = (h >> 5) & 3; cOff = h & 0x1f; }
        else if (h & 0x40) {
          local = h & 0x0f;
          const dev = !!(h & 0x20);
          p++; // rezervirano
          const le = u8[p++] === 0;
          const global = dv.getUint16(p, le); p += 2;
          const nf = u8[p++], fields = [];
          let total = 0;
          for (let i = 0; i < nf; i++) { fields.push({ num: u8[p], size: u8[p + 1], bt: u8[p + 2], off: total }); total += u8[p + 1]; p += 3; }
          if (dev) { const nd = u8[p++]; for (let i = 0; i < nd; i++) { total += u8[p + 1]; p += 3; } }
          defs[local] = { le, global, fields, total };
          continue;
        } else local = h & 0x0f;
        const d = defs[local];
        if (!d) throw new Error('FIT datoteka je oštećena (poruka bez definicije).');
        const base = p; p += d.total;
        if (p > end) break;
        const g = n => {
          for (const f of d.fields) if (f.num === n) return f.size >= (ELEM[f.bt & 0x1f] || 99) ? readVal(dv, base + f.off, f.bt, d.le) : null;
          return null;
        };
        let ts = null;
        const t253 = g(253);
        if (t253 !== null) { ts = t253; lastTs = t253; }
        else if (cOff !== null) { ts = (lastTs & ~0x1f) + cOff; if (cOff < (lastTs & 0x1f)) ts += 0x20; lastTs = ts; }
        if (d.global === 20) {
          const lat = g(0), lon = g(1);
          const ea = g(78), al = g(2), es = g(73), sp = g(6), di = g(5);
          const ok = lat !== null && lon !== null && Math.abs(lat) <= 0x40000000 && Math.abs(lon) <= 0x80000000;
          out.points.push({
            t: ts !== null ? (ts + FIT_EPOCH) * 1000 : null,
            lat: ok ? lat * (180 / 2147483648) : null, lon: ok ? lon * (180 / 2147483648) : null,
            ele: ea !== null ? ea / 5 - 500 : al !== null ? al / 5 - 500 : null,
            spd: es !== null ? es / 1000 : sp !== null ? sp / 1000 : null,
            dist: di !== null ? di / 100 : null, hr: g(3), cad: g(4), pw: g(7)
          });
        } else if (d.global === 18 && !out.session) {
          const sport = g(5), st = g(2);
          out.session = {
            sport, start: st !== null ? (st + FIT_EPOCH) * 1000 : null,
            elapsed: g(7) !== null ? g(7) / 1000 : null, timer: g(8) !== null ? g(8) / 1000 : null,
            dist: g(9) !== null ? g(9) / 100 : null, ascent: g(22), avgHr: g(16), maxHr: g(17), avgPower: g(20), calories: g(11)
          };
          out.sport = FIT_SPORT[sport] || null;
        }
      }
      pos = end + 2; // CRC
    }
    if (!files) throw new Error('Ovo nije valjana FIT datoteka.');
    if (!out.points.length && !out.session) throw new Error('FIT datoteka nema zapisa treninga.');
    return out;
  }

  /* ---------- GPX / TCX (tekstualno, radi i u pregledniku i u Nodeu) ---------- */
  const reNum = s => { if (s === undefined || s === null || s === '') return null; const n = parseFloat(s); return isFinite(n) ? n : null; };
  const tag = (s, n) => { const m = s.match(new RegExp('<(?:[\\w-]+:)?' + n + '\\b[^>]*>\\s*([^<]*?)\\s*</(?:[\\w-]+:)?' + n + '>', 'i')); return m ? m[1] : null; };
  const attr = (s, n) => { const m = s.match(new RegExp('\\b' + n + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i')); return m ? (m[1] !== undefined ? m[1] : m[2]) : null; };
  const unesc = s => s == null ? s : s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const tms = s => { if (!s) return null; const t = Date.parse(s); return isNaN(t) ? null : t; };
  const GPX_TYPE = { cycling: 'Ride', biking: 'Ride', ride: 'Ride', 1: 'Ride', running: 'Run', run: 'Run', 9: 'Run', walking: 'Walk', walk: 'Walk', hiking: 'Hike', hike: 'Hike', swimming: 'Swim', swim: 'Swim' };

  function parseGPX(text) {
    const out = { kind: 'gpx', points: [], sport: null, name: null };
    const tm = text.match(/<trk\b[\s\S]*?<name>([^<]*)<\/name>/i); if (tm) out.name = unesc(tm[1].trim()) || null;
    const ty = text.match(/<trk\b[\s\S]*?<type>([^<]*)<\/type>/i); if (ty) out.sport = GPX_TYPE[ty[1].trim().toLowerCase()] || null;
    const re = /<trkpt\b([^>]*?)(?:\/>|>([\s\S]*?)<\/trkpt>)/gi;
    let m;
    while ((m = re.exec(text))) {
      const lat = reNum(attr(m[1], 'lat')), lon = reNum(attr(m[1], 'lon')), inner = m[2] || '';
      if (lat === null || lon === null) continue;
      out.points.push({ t: tms(tag(inner, 'time')), lat, lon, ele: reNum(tag(inner, 'ele')), spd: reNum(tag(inner, 'speed')), dist: null, hr: reNum(tag(inner, 'hr')), cad: reNum(tag(inner, 'cad')), pw: reNum(tag(inner, 'power')) });
    }
    if (!out.points.length) throw new Error('GPX datoteka nema točaka rute.');
    return out;
  }

  function parseTCX(text) {
    const out = { kind: 'tcx', points: [], sport: null, name: null };
    const sp = text.match(/<Activity\b[^>]*\bSport\s*=\s*"([^"]*)"/i);
    if (sp) out.sport = { biking: 'Ride', running: 'Run', walking: 'Walk', hiking: 'Hike', swimming: 'Swim' }[sp[1].toLowerCase()] || null;
    const re = /<Trackpoint\b[^>]*>([\s\S]*?)<\/Trackpoint>/gi;
    let m;
    while ((m = re.exec(text))) {
      const s = m[1];
      const hrm = s.match(/<HeartRateBpm\b[^>]*>\s*<Value>\s*([^<]*?)\s*<\/Value>/i);
      out.points.push({
        t: tms(tag(s, 'Time')), lat: reNum(tag(s, 'LatitudeDegrees')), lon: reNum(tag(s, 'LongitudeDegrees')),
        ele: reNum(tag(s, 'AltitudeMeters')), dist: reNum(tag(s, 'DistanceMeters')), spd: reNum(tag(s, 'Speed')),
        hr: hrm ? reNum(hrm[1]) : null, cad: reNum(tag(s, 'Cadence')), pw: reNum(tag(s, 'Watts'))
      });
    }
    if (!out.points.length) throw new Error('TCX datoteka nema točaka.');
    return out;
  }

  async function parseActivityFile(name, u8) {
    if (isGz(u8)) { u8 = await inflate(u8, 'gzip'); name = stripGz(name); }
    const low = name.toLowerCase();
    let kind = low.endsWith('.fit') ? 'fit' : low.endsWith('.gpx') ? 'gpx' : low.endsWith('.tcx') ? 'tcx' : null;
    if (!kind) {
      if (u8.length > 12 && String.fromCharCode(u8[8], u8[9], u8[10], u8[11]) === '.FIT') kind = 'fit';
      else { const head = decodeText(u8.subarray(0, 800)); kind = /<gpx\b/i.test(head) ? 'gpx' : /TrainingCenterDatabase/i.test(head) ? 'tcx' : null; }
    }
    if (!kind) throw new Error('Nepoznat format datoteke.');
    if (kind === 'fit') return parseFIT(u8);
    return kind === 'gpx' ? parseGPX(decodeText(u8)) : parseTCX(decodeText(u8));
  }

  /* ---------- Polyline (Google format, preciznost 1e-5 ≈ 1 m) ---------- */
  function encNum(v) { v = v < 0 ? ~(v << 1) : (v << 1); let s = ''; while (v >= 0x20) { s += String.fromCharCode((0x20 | (v & 0x1f)) + 63); v >>= 5; } return s + String.fromCharCode(v + 63); }
  function encPoly(pts) {
    let s = '', pa = 0, po = 0;
    for (const [la, lo] of pts) { const a = Math.round(la * 1e5), b = Math.round(lo * 1e5); s += encNum(a - pa) + encNum(b - po); pa = a; po = b; }
    return s;
  }
  function decPoly(str) {
    const pts = []; let i = 0, la = 0, lo = 0;
    const next = () => { let r = 0, sh = 0, b; do { b = str.charCodeAt(i++) - 63; r |= (b & 0x1f) << sh; sh += 5; } while (b >= 0x20 && i <= str.length); return (r & 1) ? ~(r >> 1) : (r >> 1); };
    while (i < str.length) { la += next(); lo += next(); pts.push([la / 1e5, lo / 1e5]); }
    return pts;
  }

  /* ---------- Izrada trase i statistike ---------- */
  const R = 6371000, rad = Math.PI / 180;
  function hav(a, b, c, d) {
    const x = Math.sin((c - a) * rad / 2) ** 2 + Math.cos(a * rad) * Math.cos(c * rad) * Math.sin((d - b) * rad / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
  }
  const mean = a => { let s = 0, n = 0; for (const x of a) if (x !== null && x !== undefined) { s += x; n++; } return n ? s / n : null; };
  const count = a => { let n = 0; for (const x of a) if (x !== null && x !== undefined) n++; return n; };

  function elevGain(ele) {
    const v = ele.filter(x => x !== null && x !== undefined);
    if (v.length < 3) return null;
    const s = v.map((_, i) => { let a = 0, c = 0; for (let j = Math.max(0, i - 2); j <= Math.min(v.length - 1, i + 2); j++) { a += v[j]; c++; } return a / c; });
    let gain = 0, ref = s[0];
    for (const x of s) { if (x - ref >= 3) { gain += x - ref; ref = x; } else if (ref - x >= 3) ref = x; }
    return gain;
  }

  const MAXPTS = 600;
  function buildTrack(parsed) {
    let pts = parsed.points.filter(p => p);
    if (pts.length < 2 && !(parsed.session && pts.length)) throw new Error('Premalo točaka u datoteci.');
    const n = pts.length;
    // vrijeme (s od početka)
    const t0 = pts.find(p => p.t !== null);
    const start = t0 ? t0.t : (parsed.session && parsed.session.start) || null;
    const t = new Array(n); let lastT = 0;
    for (let i = 0; i < n; i++) { t[i] = pts[i].t !== null && start !== null ? Math.max(lastT, (pts[i].t - start) / 1000) : (i ? lastT + 1 : 0); lastT = t[i]; }
    // udaljenost (m): iz datoteke ako postoji, inače iz koordinata
    const d = new Array(n); let hasGps = false, prev = null;
    for (let i = 0; i < n; i++) {
      const p = pts[i], ok = p.lat !== null && p.lon !== null;
      if (ok) hasGps = true;
      if (p.dist !== null && p.dist !== undefined) d[i] = Math.max(i ? d[i - 1] : 0, p.dist);
      else {
        let step = 0;
        if (ok && prev) step = hav(prev.lat, prev.lon, p.lat, p.lon);
        d[i] = (i ? d[i - 1] : 0) + (step < 500 ? step : 0); // skokovi > 500 m između točaka = greška GPS-a
      }
      if (ok) prev = p;
    }
    // brzina (m/s): iz datoteke ili iz pomaka u ~5 s
    const sp = new Array(n); let j = 0;
    for (let i = 0; i < n; i++) {
      if (pts[i].spd !== null && pts[i].spd !== undefined) { sp[i] = pts[i].spd; continue; }
      while (j < i - 1 && t[i] - t[j + 1] >= 5) j++;
      const dt = t[i] - t[j];
      sp[i] = dt >= 1 ? (d[i] - d[j]) / dt : null;
    }
    // statistika
    const dist = d[n - 1];
    let moving = 0, hasDist = dist > 50;
    for (let i = 1; i < n; i++) {
      const dt = t[i] - t[i - 1];
      if (dt <= 0) continue;
      if (!hasDist) { if (dt <= 30) moving += dt; continue; }
      if (dt <= 30 && (d[i] - d[i - 1]) / dt >= 0.5) moving += dt;
    }
    const elapsed = t[n - 1];
    if (!moving) moving = elapsed;
    const hrs = pts.map(p => p.hr), pws = pts.map(p => p.pw);
    const ss = parsed.session || {};
    const stats = {
      start: start !== null ? new Date(start).toISOString() : null,
      dist: (hasDist ? dist : (ss.dist || 0)) / 1000, elapsed: Math.round(ss.elapsed || elapsed), moving: Math.round(ss.timer || moving),
      elev: ss.ascent != null ? ss.ascent : elevGain(pts.map(p => p.ele)),
      avgHr: ss.avgHr != null ? ss.avgHr : mean(hrs), maxHr: ss.maxHr != null ? ss.maxHr : (count(hrs) ? Math.max(...hrs.filter(x => x != null)) : null),
      watts: ss.avgPower != null ? ss.avgPower : mean(pws), cal: ss.calories != null ? ss.calories : null, gps: hasGps
    };
    stats.avgSpeed = stats.dist > 0 && stats.moving > 0 ? stats.dist / (stats.moving / 3600) : null;
    // decimacija: prosjek po pretincu (glađe krivulje), zemljopisne koordinate iz prve točke pretinca
    const step = Math.max(1, Math.ceil(n / MAXPTS)), m = Math.ceil(n / step);
    const o = { t: [], d: [], ele: [], spd: [], hr: [], pw: [], ll: [] };
    let lastLL = null;
    for (let b = 0; b < m; b++) {
      const i0 = b * step, i1 = Math.min(n, i0 + step), last = b === m - 1;
      const iA = last ? n - 1 : i0;
      o.t.push(Math.round(t[iA])); o.d.push(Math.round(d[iA]));
      const sl = (arr, f) => { const v = mean(arr.slice(i0, i1)); return v === null ? null : f(v); };
      o.ele.push(sl(pts.map(p => p.ele), v => Math.round(v * 10) / 10));
      o.spd.push(sl(sp, v => Math.round(Math.max(0, v) * 36) / 10));
      o.hr.push(sl(hrs, v => Math.round(v)));
      o.pw.push(sl(pws, v => Math.round(v)));
      const q = pts[iA];
      if (q.lat !== null && q.lon !== null) lastLL = [q.lat, q.lon];
      o.ll.push(lastLL);
    }
    // vodeće točke bez GPS-a popuni prvom valjanom
    const firstOk = o.ll.find(x => x);
    const llOk = firstOk ? o.ll.map(x => x || firstOk) : null;
    const track = { v: 1, n: m, start: stats.start, t: o.t, d: o.d, poly: llOk ? encPoly(llOk) : '' };
    for (const k of ['ele', 'spd', 'hr', 'pw']) if (count(o[k]) >= 3 && count(o[k]) >= m * 0.3) track[k] = o[k];
    if (track.spd && !hasDist && !pts.some(p => p.spd != null)) delete track.spd;
    return { track, stats, sport: parsed.sport || null, name: parsed.name || null };
  }

  // Ako tip nije u datoteci, pogodi iz prosječne brzine
  function guessType(stats) {
    if (!stats.gps) return 'Workout';
    const v = stats.avgSpeed || 0;
    return v < 7 ? 'Walk' : v < 14 ? 'Run' : 'Ride';
  }

  const api = { isGz, inflate, decodeText, baseName, stripGz, readZip, parseFIT, parseGPX, parseTCX, parseActivityFile, encPoly, decPoly, buildTrack, guessType, hav };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Files = api;
})(typeof self !== 'undefined' ? self : this);
