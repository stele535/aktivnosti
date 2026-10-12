/* Slika za dijeljenje (canvas): više stilova i formata. Bez vanjskih biblioteka. */
(function (root) {
  'use strict';
  const T = 256;
  const FORMATS = { '4:5': [1080, 1350], '9:16': [1080, 1920], '1:1': [1080, 1080] };
  const STYLES = ['split', 'full', 'route', 'overlay', 'photo'];
  const THEMES = {
    light: { bg: '#f6f5f1', ink: '#1c1e22', mute: '#6b7078', line: '#e4e2db', map: '#e8e4d8', routeBg: '#ebe9e2', casing: 'rgba(255,255,255,.95)' },
    dark: { bg: '#14161a', ink: '#eceae4', mute: '#9a9ea6', line: '#2b2f37', map: '#2a2e35', routeBg: '#1b1e24', casing: 'rgba(0,0,0,.65)' }
  };
  const ACCENT = '#d8561f', START = '#2a8f55';
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", "Roboto Mono", Menlo, Consolas, monospace';
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
    const total = d[d.length - 1], keep = [];
    for (let i = 0; i < pts.length; i++) if (d[i] >= m && d[i] <= total - m) keep.push(i);
    if (keep.length < 5) return { pts, trimmed: false };
    return { pts: keep.map(i => pts[i]), trimmed: true };
  }

  function fitText(g, text, maxW) {
    if (g.measureText(text).width <= maxW) return text;
    while (text.length > 1 && g.measureText(text + '…').width > maxW) text = text.slice(0, -1);
    return text.trim() + '…';
  }
  const dur = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + ':' + String(m).padStart(2, '0') + ' h' : m + ' min'; };

  /* o: { title, sub, stats: [[vrijednost, oznaka], ...] (do 4), pts: [[lat, lon], ...], d, style, gray, format, theme, hideEnds, tiles, photo: slika | null, photoSide: 'left' | 'right', rside: 'left' | 'center' | 'right' (ruta u prozirnom stilu), msg: posveta }
     Vraća Promise<{ blob, trimmed, points, tilesLoaded }> */
  async function draw(o) {
    let style = STYLES.includes(o.style) ? o.style : 'split'; if (style === 'photo' && !o.photo) style = 'split';
    const th = THEMES[o.theme === 'dark' ? 'dark' : 'light'];
    const [W, H] = FORMATS[o.format] || FORMATS['4:5'];
    const tr = o.hideEnds ? trimEnds(o.pts, o.d, 200) : { pts: o.pts, trimmed: false };
    const pts = tr.pts;
    const overlay = style === 'overlay', full = style === 'full', wantTiles = (style === 'split' || full || style === 'photo') && o.tiles !== false;
    /* posveta: velik tekst pri dnu; u prozirnom i punom stilu iznad naslova, u karta + foto ispod fotke */
    const mg = document.createElement('canvas').getContext('2d'), msgW = W - 120;
    const split = !overlay && !full && style !== 'photo';
    const msgF = overlay || full ? 50 : split ? 54 : 40, msgMax = style === 'photo' ? 2 : 3, msgLH = Math.round(msgF * 1.22);
    const msgLines = (() => {
      const txt = String(o.msg || '').replace(/\s+/g, ' ').trim(); if (!txt) return [];
      mg.font = 'italic 500 ' + msgF + 'px ' + FONT;
      const out = []; let cur = '';
      for (const w of txt.split(' ')) { const t = cur ? cur + ' ' + w : w; if (mg.measureText(t).width <= msgW || !cur) cur = t; else { out.push(cur); cur = w; } }
      if (cur) out.push(cur);
      if (out.length > msgMax) { out.length = msgMax; out[msgMax - 1] = out[msgMax - 1].replace(/.{0,2}$/, '…'); }
      return out;
    })();
    /* popis podataka: Oznaka ........ vrijednost (Stravin stil); rows: [[oznaka, vrijednost, jedinica]] */
    const rows = o.layout !== 'grid' && Array.isArray(o.rows) ? o.rows.slice(0, 5) : [], list = rows.length > 0, PITCH = 52;
    const rowsEnd = list ? (H === 1080 ? 236 : 290) + (rows.length - 1) * PITCH + 14 : 0;   // kraj popisa u panelu (od vrha panela)
    const baseH0 = full ? 0 : overlay ? 0 : style === 'photo' ? (H === 1080 ? 520 : H === 1350 ? 640 : 760) : (H === 1080 ? 430 : H === 1350 ? 550 : 620);
    const baseH = split && list ? Math.max(baseH0, rowsEnd + 70) : baseH0;
    const msgH = msgLines.length ? msgLines.length * msgLH + 24 : 0, ovMsg = overlay || full ? msgH : 0;
    /* karta + podaci: posveta koristi slobodan prostor ispod brojki; panel raste samo ako ga nema dovoljno */
    const freeSplit = split ? baseH - (list ? rowsEnd + 26 : (H === 1080 ? 320 : 380)) - 70 : 0;
    const panelH = baseH + (split ? Math.max(0, msgH - freeSplit) : style === 'photo' ? msgH : 0);
    const mapH = overlay || full ? H : H - panelH;
    const ovBy = list ? H - 240 - (rows.length - 1) * PITCH : H - 340;   // naslov u prozirnom i punom stilu
    const fitH = full ? ovBy - 130 - ovMsg : overlay ? ovBy - 40 - ovMsg : mapH;         // dio platna u koji se uklapa ruta
    const rside = overlay ? (o.rside === 'left' || o.rside === 'center' ? o.rside : 'right') : 'center';
    const boxW = rside === 'center' ? W : Math.round(W * 0.6), boxCx = rside === 'left' ? boxW / 2 : rside === 'right' ? W - boxW / 2 : W / 2;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d');
    if (!overlay) { g.fillStyle = th.bg; g.fillRect(0, 0, W, H); }
    const bgPh = overlay && o.photo ? o.photo : null;
    if (bgPh) {
      const iw = bgPh.width || bgPh.naturalWidth, ih = bgPh.height || bgPh.naturalHeight, k = Math.max(W / iw, H / ih), sw = W / k, sh = H / k;
      g.drawImage(bgPh, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, W, H);
      const gr = g.createLinearGradient(0, H - 700, 0, H); gr.addColorStop(0, 'rgba(10,12,16,0)'); gr.addColorStop(1, 'rgba(10,12,16,.62)'); g.fillStyle = gr; g.fillRect(0, H - 700, W, 700);
    }

    /* ---- karta ---- */
    g.save(); g.beginPath(); g.rect(0, 0, W, mapH); g.clip();
    if (!overlay) { g.fillStyle = wantTiles ? THEMES.light.map : th.routeBg; g.fillRect(0, 0, W, mapH); }
    const P = pts.map(([la, lo]) => merc01(la, lo));
    let minx = 1, maxx = 0, miny = 1, maxy = 0;
    for (const [x, y] of P) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
    const pad = overlay ? (rside === 'center' ? 150 : 70) : 120, sx = Math.max(maxx - minx, 1e-9), sy = Math.max(maxy - miny, 1e-9);
    const zf = clamp(Math.log2(Math.min((boxW - 2 * pad) / (T * sx), (fitH - 2 * pad) / (T * sy))), 2, 17.5);
    const scale = T * Math.pow(2, zf), x0 = (minx + maxx) / 2 * scale - boxCx, y0 = (miny + maxy) / 2 * scale - fitH / 2;
    let tilesLoaded = 0;
    if (wantTiles) {
      const zt = clamp(Math.floor(zf), 0, 18), ts = T * Math.pow(2, zf - zt), n = Math.pow(2, zt);
      const tx0 = Math.floor(x0 / ts), tx1 = Math.floor((x0 + W) / ts), ty0 = Math.max(0, Math.floor(y0 / ts)), ty1 = Math.min(n - 1, Math.floor((y0 + mapH) / ts));
      const jobs = [];
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) jobs.push(loadTile(zt, ((tx % n) + n) % n, ty).then(img => ({ img, tx, ty })));
      for (const { img, tx, ty } of await Promise.all(jobs)) if (img) { g.drawImage(img, tx * ts - x0, ty * ts - y0, ts + 0.6, ts + 0.6); tilesLoaded++; }
      if (o.gray && tilesLoaded) { // siva podloga: pretvori u sivo i malo smanji kontrast, da ruta bolje izlazi
        const id = g.getImageData(0, 0, W, mapH), p = id.data;
        for (let i = 0; i < p.length; i += 4) { const l = Math.min(255, (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2] - 128) * 0.92 + 128 + 10); p[i] = p[i + 1] = p[i + 2] = l; }
        g.putImageData(id, 0, 0);
      }
    }
    const S = P.map(([x, y]) => [x * scale - x0, y * scale - y0]);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const casing = overlay ? 'rgba(0,0,0,.35)' : wantTiles ? THEMES.light.casing : th.casing;
    g.beginPath(); S.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.strokeStyle = casing; g.lineWidth = 17; g.stroke();
    g.beginPath(); S.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.strokeStyle = overlay ? '#ffffff' : ACCENT; g.lineWidth = 10; g.stroke();
    const dot = ([x, y], col) => { g.beginPath(); g.arc(x, y, 17, 0, 7); g.fillStyle = col; g.fill(); g.lineWidth = 6; g.strokeStyle = '#fff'; g.stroke(); };
    dot(S[0], START); dot(S[S.length - 1], '#1c1e22');
    g.textBaseline = 'middle';
    if (wantTiles) {
      g.font = '600 22px ' + FONT; const att = '© OpenStreetMap', aw = g.measureText(att).width + 18;
      const ay = full ? 10 : mapH - 36;
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(W - aw - 8, ay, aw, 28);
      g.fillStyle = '#333'; g.fillText(att, W - aw, ay + 14);
    }
    g.restore();

    /* ---- podaci ---- */
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    const st = (o.stats || []).slice(0, 4);
    const statsRow = (x, y, w, ink, mute, shadow) => {
      const cw = w / Math.max(st.length, 1);
      st.forEach(([v, l], i) => {
        const xx = x + i * cw; if (shadow) { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12; }
        g.fillStyle = ink; g.font = '700 ' + (String(v).length > 4 ? 46 : 58) + 'px ' + MONO; g.fillText(String(v), xx, y);
        g.fillStyle = mute; g.font = '500 28px ' + FONT; g.fillText(l, xx, y + 46); g.shadowBlur = 0;
      });
    };
    const listRows = (x, y, w, ink, mute, shadow, k) => {
      k = k || {}; const lf = k.lf || 32, vf = k.vf || 36, uf = k.uf || 28, pitch = k.pitch || PITCH;
      rows.forEach(([label, val, unit], i) => {
        const yy = y + i * pitch; g.textAlign = 'left';
        if (shadow) { g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 12; }
        g.fillStyle = mute; g.font = '500 ' + lf + 'px ' + FONT; g.fillText(label, x, yy); const lw = g.measureText(label).width;
        g.textAlign = 'right'; let rx = x + w;
        if (unit) { g.font = '500 ' + uf + 'px ' + FONT; g.fillText(unit, rx, yy); rx -= g.measureText(unit).width + 8; }
        g.fillStyle = ink; g.font = '700 ' + vf + 'px ' + MONO; g.fillText(String(val), rx, yy); const vw = g.measureText(String(val)).width;
        g.shadowBlur = 0; g.textAlign = 'left';
        const x1 = x + lw + 16, x2 = rx - vw - 16;
        if (x2 - x1 > 24) { g.save(); g.setLineDash([1, 9]); g.lineCap = 'round'; g.lineWidth = 3; g.strokeStyle = mute; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(x1, yy - 7); g.lineTo(x2, yy - 7); g.stroke(); g.restore(); }
      });
    };
    if (overlay || full) {
      if (full) { const gr = g.createLinearGradient(0, ovBy - 220 - msgH, 0, H); gr.addColorStop(0, 'rgba(10,12,16,0)'); gr.addColorStop(0.55, 'rgba(10,12,16,.72)'); gr.addColorStop(1, 'rgba(10,12,16,.88)'); g.fillStyle = gr; g.fillRect(0, ovBy - 220 - msgH, W, H - ovBy + 220 + msgH); }
      const by = ovBy, sh = overlay;
      if (sh) { g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 14; }
      if (msgLines.length) { g.fillStyle = '#fff'; g.font = 'italic 500 ' + msgF + 'px ' + FONT; msgLines.forEach((t, i) => g.fillText(t, 60, by - 84 - (msgLines.length - 1 - i) * msgLH)); }
      g.fillStyle = '#fff'; g.font = '700 62px ' + FONT; g.fillText(fitText(g, o.title || 'Trening', W - 120), 60, by);
      g.fillStyle = 'rgba(255,255,255,.82)'; g.font = '500 34px ' + FONT; g.fillText(fitText(g, o.sub || '', W - 120), 60, by + 54); g.shadowBlur = 0;
      if (list) listRows(60, by + 150, W - 120, '#fff', 'rgba(255,255,255,.85)', sh); else statsRow(60, by + 150, W - 120, '#fff', 'rgba(255,255,255,.8)', sh);
      g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '500 24px ' + FONT;
      if (tr.trimmed) g.fillText('Početak i kraj rute su skriveni', 60, H - 44);
    } else if (style === 'photo') {
      const top = mapH, ph = o.photo, left = o.photoSide !== 'right';
      g.fillStyle = th.ink; g.font = '700 58px ' + FONT; g.fillText(fitText(g, o.title || 'Trening', W - 120), 60, top + 84);
      g.fillStyle = th.mute; g.font = '500 32px ' + FONT; g.fillText(fitText(g, o.sub || '', W - 120), 60, top + 126);
      g.fillStyle = th.line; g.fillRect(60, top + 152, W - 120, 2);
      const cy = top + 182, ch = H - 70 - msgH - cy, gap = 30, pw = Math.round((W - 120 - gap) / 2);
      const px = left ? 60 : 60 + pw + gap, tx = left ? 60 + pw + gap : 60;
      const iw = ph.width || ph.naturalWidth, ih = ph.height || ph.naturalHeight, k = Math.max(pw / iw, ch / ih), sw = pw / k, sh2 = ch / k;
      g.save(); g.beginPath();
      const r = 0; g.moveTo(px + r, cy); g.arcTo(px + pw, cy, px + pw, cy + ch, r); g.arcTo(px + pw, cy + ch, px, cy + ch, r); g.arcTo(px, cy + ch, px, cy, r); g.arcTo(px, cy, px + pw, cy, r); g.closePath(); g.clip();
      g.drawImage(ph, (iw - sw) / 2, (ih - sh2) / 2, sw, sh2, px, cy, pw, ch); g.restore();
      const rh = ch / 2, cw = pw / 2;
      if (list) listRows(tx, cy + Math.min(56, ch / (rows.length + 1)), pw, th.ink, th.mute, false, { lf: 26, vf: 30, uf: 24, pitch: Math.min(60, (ch - 20) / rows.length) });
      else st.forEach(([v, l], i) => {
        const xx = tx + (i % 2) * cw, yy = cy + Math.floor(i / 2) * rh + rh * 0.52;
        g.fillStyle = th.ink; g.font = '700 ' + (String(v).length > 4 ? 38 : 48) + 'px ' + MONO; g.fillText(String(v), xx, yy);
        g.fillStyle = th.mute; g.font = '500 26px ' + FONT; g.fillText(l, xx, yy + 38);
      });
      if (msgLines.length) { g.fillStyle = th.ink; g.font = 'italic 500 ' + msgF + 'px ' + FONT; msgLines.forEach((t, i) => g.fillText(t, 60, cy + ch + 40 + i * msgLH)); }
      g.fillStyle = th.mute; g.font = '500 24px ' + FONT;
      if (tr.trimmed) g.fillText('Početak i kraj rute su skriveni', 60, H - 30);
    } else {
      const top = mapH, compact = H === 1080;
      g.fillStyle = th.ink; g.font = '700 62px ' + FONT; g.fillText(fitText(g, o.title || 'Trening', W - 120), 60, top + (compact ? 84 : 100));
      g.fillStyle = th.mute; g.font = '500 34px ' + FONT; g.fillText(fitText(g, o.sub || '', W - 120), 60, top + (compact ? 130 : 154));
      g.fillStyle = th.line; g.fillRect(60, top + (compact ? 160 : 192), W - 120, 2);
      if (list) listRows(60, top + (compact ? 236 : 290), W - 120, th.ink, th.mute, false); else statsRow(60, top + (compact ? 236 : 290), W - 120, th.ink, th.mute, false);
      if (msgLines.length) { g.fillStyle = th.ink; g.font = 'italic 500 ' + msgF + 'px ' + FONT; const my = H - 78 - (msgLines.length - 1) * msgLH; msgLines.forEach((t, k) => g.fillText(t, 60, my + k * msgLH)); }
      g.fillStyle = th.mute; g.font = '500 24px ' + FONT;
      if (tr.trimmed) g.fillText('Početak i kraj rute su skriveni', 60, H - 40);
    }
    const blob = await new Promise((res, rej) => { try { c.toBlob(b => b ? res(b) : rej(new Error('Slika nije napravljena.')), 'image/png'); } catch (e) { rej(e); } });
    return { blob, trimmed: tr.trimmed, points: pts.length, tilesLoaded, w: W, h: H };
  }

  // Pokušaj s podlogom karte; ako preglednik zabrani (CORS) ili nešto pukne, napravi sliku bez podloge.
  async function render(o) {
    try { return await draw(o); }
    catch (e) { return draw(Object.assign({}, o, { tiles: false })); }
  }

  root.Share = { render, trimEnds, FORMATS, STYLES };
})(typeof self !== 'undefined' ? self : this);
