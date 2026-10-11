/* Slika za dijeljenje: karta s rutom + ključni podaci, crtano na canvasu (1080 x 1350, omjer 4:5). Bez vanjskih biblioteka. */
(function (root) {
  'use strict';
  const W = 1080, H = 1350, MAPH = 800, T = 256;
  const C = { bg: '#f6f5f1', ink: '#1c1e22', mute: '#6b7078', line: '#e4e2db', accent: '#d8561f', land: '#e8e4d8', start: '#2a8f55' };
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const merc01 = (lat, lon) => { const s = Math.sin(lat * Math.PI / 180); return [(lon + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)]; };

  function loadTile(z, x, y) {
    return new Promise(res => {
      const img = new Image(); img.crossOrigin = 'anonymous';
      const t = setTimeout(() => res(null), 7000);
      img.onload = () => { clearTimeout(t); res(img); };
      img.onerror = () => { clearTimeout(t); res(null); };
      img.src = 'https://tile.openstreetmap.org/' + z + '/' + x + '/' + y + '.png';
    });
  }

  // Skida prvih i zadnjih `m` metara rute (privatnost). Vraća { pts, trimmed }.
  function trimEnds(pts, d, m) {
    if (!d || d.length !== pts.length) return { pts, trimmed: false };
    const total = d[d.length - 1], out = [];
    for (let i = 0; i < pts.length; i++) if (d[i] >= m && d[i] <= total - m) out.push(pts[i]);
    return out.length >= 5 ? { pts: out, trimmed: true } : { pts, trimmed: false };
  }

  function fitText(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    while (text.length > 1 && g.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text.trim() + '…';
  }

  /* o: { title, sub, stats: [[vrijednost, oznaka], ...] (do 4), pts: [[lat, lon], ...], d: [m, ...] | null, hideEnds: bool, tiles: bool }
     Vraća Promise<{ blob, trimmed, points, tilesLoaded }> */
  async function draw(o) {
    const { pts, trimmed } = o.hideEnds ? trimEnds(o.pts, o.d, 200) : { pts: o.pts, trimmed: false };
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = C.bg; g.fillRect(0, 0, W, H);

    /* ---- karta ---- */
    g.save(); g.beginPath(); g.rect(0, 0, W, MAPH); g.clip();
    g.fillStyle = C.land; g.fillRect(0, 0, W, MAPH);
    const P = pts.map(([la, lo]) => merc01(la, lo));
    let minx = 1, maxx = 0, miny = 1, maxy = 0;
    for (const [x, y] of P) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const pad = 120, sx = Math.max(maxx - minx, 1e-9), sy = Math.max(maxy - miny, 1e-9);
    const zf = clamp(Math.log2(Math.min((W - 2 * pad) / (T * sx), (MAPH - 2 * pad) / (T * sy))), 2, 17.5);
    const scale = T * Math.pow(2, zf), x0 = (minx + maxx) / 2 * scale - W / 2, y0 = (miny + maxy) / 2 * scale - MAPH / 2;
    let tilesLoaded = 0;
    if (o.tiles !== false) {
      const zt = clamp(Math.floor(zf), 0, 18), ts = T * Math.pow(2, zf - zt), n = Math.pow(2, zt);
      const tx0 = Math.floor(x0 / ts), tx1 = Math.floor((x0 + W) / ts), ty0 = Math.max(0, Math.floor(y0 / ts)), ty1 = Math.min(n - 1, Math.floor((y0 + MAPH) / ts));
      const jobs = [];
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) jobs.push(loadTile(zt, ((tx % n) + n) % n, ty).then(img => ({ img, tx, ty })));
      for (const { img, tx, ty } of await Promise.all(jobs)) if (img) { g.drawImage(img, tx * ts - x0, ty * ts - y0, ts + 0.6, ts + 0.6); tilesLoaded++; }
    }
    const S = P.map(([x, y]) => [x * scale - x0, y * scale - y0]);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); S.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 17; g.stroke();
    g.strokeStyle = C.accent; g.lineWidth = 10; g.stroke();
    const dot = ([x, y], col) => { g.beginPath(); g.arc(x, y, 17, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke(); };
    dot(S[0], C.start); dot(S[S.length - 1], C.ink);
    g.font = '600 22px ' + FONT; const att = '© OpenStreetMap';
    const aw = g.measureText(att).width + 18;
    g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(W - aw - 8, MAPH - 36, aw, 28);
    g.fillStyle = '#333'; g.textBaseline = 'middle'; g.fillText(att, W - aw, MAPH - 22);
    g.restore();

    /* ---- ploča s podacima ---- */
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.fillStyle = C.ink; g.font = '700 62px ' + FONT;
    g.fillText(fitText(g, o.title || 'Trening', W - 120), 60, MAPH + 100);
    g.fillStyle = C.mute; g.font = '500 34px ' + FONT;
    g.fillText(fitText(g, o.sub || '', W - 120), 60, MAPH + 154);
    g.fillStyle = C.line; g.fillRect(60, MAPH + 192, W - 120, 2);
    const st = (o.stats || []).slice(0, 4), cw = (W - 120) / Math.max(st.length, 1);
    st.forEach(([v, l], i) => {
      const x = 60 + i * cw;
      g.fillStyle = C.ink; g.font = '700 ' + (String(v).length > 6 ? 54 : 66) + 'px ' + FONT; g.fillText(String(v), x, MAPH + 290);
      g.fillStyle = C.mute; g.font = '500 28px ' + FONT; g.fillText(l, x, MAPH + 336);
    });
    g.fillStyle = C.mute; g.font = '500 24px ' + FONT; g.textAlign = 'left';
    g.fillText(trimmed ? 'Početak i kraj rute su skriveni' : '', 60, H - 44);
    g.textAlign = 'right'; g.fillText('Trening', W - 60, H - 44);

    const blob = await new Promise((res, rej) => { try { c.toBlob(b => b ? res(b) : rej(new Error('Slika nije napravljena.')), 'image/png'); } catch (e) { rej(e); } });
    return { blob, trimmed, points: pts.length, tilesLoaded };
  }

  // Pokušaj s podlogom karte; ako preglednik zabrani (CORS) ili nešto pukne, napravi sliku bez podloge.
  async function render(o) {
    try { return await draw(o); }
    catch (e) { return draw(Object.assign({}, o, { tiles: false })); }
  }

  root.Share = { render, trimEnds, W, H };
})(typeof self !== 'undefined' ? self : this);
