/* Prikaz trase: mala karta (OpenStreetMap pločice + SVG ruta) i grafovi visine/brzine/pulsa. Bez vanjskih biblioteka. */
(function (root) {
  'use strict';
  const ZCOL = ['#6aa2f0', '#5cc388', '#e8c04a', '#ef8a4c', '#d6453a'];
  const TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', T = 256, NS = 'http://www.w3.org/2000/svg';
  const svgEl = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const merc = (lat, lon, z) => { const s = T * Math.pow(2, z), sin = Math.sin(lat * Math.PI / 180); return [(lon + 180) / 360 * s, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s]; };
  const unmerc = (x, y, z) => { const s = T * Math.pow(2, z), n = Math.PI - 2 * Math.PI * y / s; return [180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), x / s * 360 - 180]; };

  /* ---------- karta ---------- */
  function MiniMap(el, pts) {
    el.classList.add('mm');
    const layer = document.createElement('div'); layer.className = 'mm-tiles';
    const svg = svgEl('svg', { class: 'mm-route' });
    const casing = svgEl('polyline', { class: 'mm-casing' }), line = svgEl('polyline', { class: 'mm-line' });
    const cs = svgEl('circle', { class: 'mm-start', r: 8 }), ce = svgEl('circle', { class: 'mm-end', r: 8 }), cm = svgEl('circle', { class: 'mm-mark', r: 9 });
    cm.style.display = 'none';
    const segG = svgEl('g', { class: 'mm-segs' });
    svg.append(casing, line, segG, cs, ce, cm);
    let zc = null;
    const ctl = document.createElement('div'); ctl.className = 'mm-ctl';
    ctl.innerHTML = '<button type="button" data-z="1" aria-label="Približi">+</button><button type="button" data-z="-1" aria-label="Udalji">−</button>';
    const att = document.createElement('div'); att.className = 'mm-att'; att.textContent = '© OpenStreetMap';
    el.append(layer, svg, ctl, att);
    let w = el.clientWidth || 320, h = el.clientHeight || 240, z = 12, c = pts[0], marker = null, raf = 0, dead = false;
    const tiles = new Map();

    function fit() {
      let a = 90, b = -90, l = 180, r = -180;
      for (const [la, lo] of pts) { a = Math.min(a, la); b = Math.max(b, la); l = Math.min(l, lo); r = Math.max(r, lo); }
      const pad = 28;
      let zz = 17;
      for (; zz > 2; zz--) {
        const p1 = merc(b, l, zz), p2 = merc(a, r, zz);
        if (p2[0] - p1[0] <= w - 2 * pad && p2[1] - p1[1] <= h - 2 * pad) break;
      }
      const m1 = merc(b, l, zz), m2 = merc(a, r, zz);
      z = zz; c = unmerc((m1[0] + m2[0]) / 2, (m1[1] + m2[1]) / 2, zz);
    }
    function render() {
      raf = 0; if (dead) return;
      const [cx, cy] = merc(c[0], c[1], z), x0 = cx - w / 2, y0 = cy - h / 2, n = Math.pow(2, z);
      const tx0 = Math.floor(x0 / T), tx1 = Math.floor((x0 + w) / T), ty0 = Math.max(0, Math.floor(y0 / T)), ty1 = Math.min(n - 1, Math.floor((y0 + h) / T));
      const need = new Set();
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const wx = ((tx % n) + n) % n, key = z + '/' + tx + '/' + ty;
        need.add(key);
        let img = tiles.get(key);
        if (!img) {
          img = new Image(); img.alt = ''; img.draggable = false;
          img.onerror = () => { img.style.visibility = 'hidden'; };
          img.src = TILE.replace('{z}', z).replace('{x}', wx).replace('{y}', ty);
          layer.appendChild(img); tiles.set(key, img);
        }
        img.style.transform = 'translate(' + Math.round(tx * T - x0) + 'px,' + Math.round(ty * T - y0) + 'px)';
      }
      for (const [k, img] of tiles) if (!need.has(k)) { img.remove(); tiles.delete(k); }
      const sp = pts.map(([la, lo]) => { const [x, y] = merc(la, lo, z); return [x - x0, y - y0]; });
      const s = sp.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
      casing.setAttribute('points', s); line.setAttribute('points', s);
      segG.textContent = '';
      line.style.display = zc ? 'none' : '';
      if (zc) { // ruta obojena po zonama: uzastopne točke iste zone čine jednu liniju
        let run = [sp[0]], cur = zc[1] !== undefined ? zc[1] : -1;
        const flush = () => { if (run.length > 1) segG.appendChild(svgEl('polyline', { class: 'mm-seg', stroke: cur >= 0 ? ZCOL[cur] : '#9aa0a8', points: run.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ') })); };
        for (let i = 1; i < sp.length; i++) { if (zc[i] !== cur) { flush(); run = [sp[i - 1]]; cur = zc[i]; } run.push(sp[i]); }
        flush();
      }
      cs.setAttribute('cx', sp[0][0]); cs.setAttribute('cy', sp[0][1]);
      const L = sp[sp.length - 1]; ce.setAttribute('cx', L[0]); ce.setAttribute('cy', L[1]);
      if (marker !== null && sp[marker]) { cm.style.display = ''; cm.setAttribute('cx', sp[marker][0]); cm.setAttribute('cy', sp[marker][1]); } else cm.style.display = 'none';
    }
    const redraw = () => { if (!raf) raf = requestAnimationFrame(render); };
    function zoomAt(px, py, dz) {
      const nz = clamp(z + dz, 2, 18); if (nz === z) return;
      const [cx, cy] = merc(c[0], c[1], z), geo = unmerc(cx - w / 2 + px, cy - h / 2 + py, z), [gx, gy] = merc(geo[0], geo[1], nz);
      c = unmerc(gx - px + w / 2, gy - py + h / 2, nz); z = nz; redraw();
    }
    // pomicanje, štipanje, kotačić, dvostruki dodir
    const ptrs = new Map(); let pinchD = 0, lastWheel = 0;
    const dist = () => { const a = [...ptrs.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    el.addEventListener('pointerdown', e => {
      if (e.target.closest('.mm-ctl')) return;
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 2) pinchD = dist();
    });
    el.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      if (ptrs.size === 1) {
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        const [cx, cy] = merc(c[0], c[1], z); c = unmerc(cx - dx, cy - dy, z); redraw();
      } else if (ptrs.size === 2) {
        p.x = e.clientX; p.y = e.clientY;
        const d = dist(), a = [...ptrs.values()], r = el.getBoundingClientRect();
        if (d > pinchD * 1.5) { zoomAt((a[0].x + a[1].x) / 2 - r.left, (a[0].y + a[1].y) / 2 - r.top, 1); pinchD = d; }
        else if (d < pinchD * 0.67) { zoomAt((a[0].x + a[1].x) / 2 - r.left, (a[0].y + a[1].y) / 2 - r.top, -1); pinchD = d; }
      }
    });
    const up = e => { ptrs.delete(e.pointerId); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { e.preventDefault(); const t = Date.now(); if (t - lastWheel < 140) return; lastWheel = t; const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1 : -1); }, { passive: false });
    el.addEventListener('dblclick', e => { const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 1); });
    ctl.addEventListener('click', e => { const b = e.target.closest('button'); if (b) zoomAt(w / 2, h / 2, +b.dataset.z); });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { const nw = el.clientWidth, nh = el.clientHeight; if (nw && (nw !== w || nh !== h)) { w = nw; h = nh; redraw(); } }) : null;
    if (ro) ro.observe(el);
    fit(); render();
    return {
      setMarker(i) { marker = i; redraw(); },
      setColors(a) { zc = a; redraw(); },
      zoomIn() { zoomAt(w / 2, h / 2, 1); },
      state: () => ({ z, c, tiles: tiles.size }),
      destroy() { dead = true; if (ro) ro.disconnect(); tiles.clear(); }
    };
  }


  /* ---------- karta svih ruta (heat map) ---------- */
  /* layers: [{ name, color, alpha, width, routes: [{ ll: [[lat, lon], ...] }] }]. Prozirne linije se zbrajaju, pa se češće vožene dionice vide jače. */
  function HeatMap(el) {
    el.classList.add('hm');
    const layerEl = document.createElement('div'); layerEl.className = 'mm-tiles';
    const cv = document.createElement('canvas'); cv.className = 'hm-cv';
    const ctl = document.createElement('div'); ctl.className = 'mm-ctl';
    ctl.innerHTML = '<button type="button" data-z="1" aria-label="Približi">+</button><button type="button" data-z="-1" aria-label="Udalji">−</button><button type="button" data-fit="1" aria-label="Prikaži sve" style="font-size:15px">⤢</button>';
    const att = document.createElement('div'); att.className = 'mm-att'; att.textContent = '© OpenStreetMap';
    el.append(layerEl, cv, ctl, att);
    const g = cv.getContext('2d');
    let w = el.clientWidth || 320, h = el.clientHeight || 400, z = 8, c = [0.5, 0.5], layers = [], raf = 0, dead = false, gray = true;
    const tiles = new Map();
    const prep = ll => { const n = ll.length, xs = new Float64Array(n), ys = new Float64Array(n); let a = 1, b = 0, d = 1, e = 0; for (let i = 0; i < n; i++) { const s = Math.sin(ll[i][0] * Math.PI / 180); xs[i] = (ll[i][1] + 180) / 360; ys[i] = 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI); a = Math.min(a, xs[i]); b = Math.max(b, xs[i]); d = Math.min(d, ys[i]); e = Math.max(e, ys[i]); } return { xs, ys, x0: a, x1: b, y0: d, y1: e }; };

    function fit() {
      let a = 1, b = 0, d = 1, e = 0, any = false;
      for (const L of layers) for (const r of L.routes) { any = true; a = Math.min(a, r.x0); b = Math.max(b, r.x1); d = Math.min(d, r.y0); e = Math.max(e, r.y1); }
      if (!any) return;
      const pad = 24, sx = Math.max(b - a, 1e-7), sy = Math.max(e - d, 1e-7);
      z = clamp(Math.floor(Math.log2(Math.min((w - 2 * pad) / (T * sx), (h - 2 * pad) / (T * sy)))), 3, 16);
      c = [(a + b) / 2, (d + e) / 2];
    }
    function render() {
      raf = 0; if (dead) return;
      const scale = T * Math.pow(2, z), x0 = c[0] * scale - w / 2, y0 = c[1] * scale - h / 2, n = Math.pow(2, z);
      const tx0 = Math.floor(x0 / T), tx1 = Math.floor((x0 + w) / T), ty0 = Math.max(0, Math.floor(y0 / T)), ty1 = Math.min(n - 1, Math.floor((y0 + h) / T));
      const need = new Set();
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const wx = ((tx % n) + n) % n, key = z + '/' + tx + '/' + ty; need.add(key);
        let img = tiles.get(key);
        if (!img) { img = new Image(); img.alt = ''; img.draggable = false; img.onerror = () => { img.style.visibility = 'hidden'; }; img.src = TILE.replace('{z}', z).replace('{x}', wx).replace('{y}', ty); layerEl.appendChild(img); tiles.set(key, img); }
        img.style.transform = 'translate(' + Math.round(tx * T - x0) + 'px,' + Math.round(ty * T - y0) + 'px)';
      }
      for (const [k, img] of tiles) if (!need.has(k)) { img.remove(); tiles.delete(k); }
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); g.lineJoin = 'round'; g.lineCap = 'round';
      const vx0 = x0 / scale, vx1 = (x0 + w) / scale, vy0 = y0 / scale, vy1 = (y0 + h) / scale;
      for (const L of layers) {
        g.strokeStyle = L.color; g.globalAlpha = L.alpha; g.lineWidth = L.width; L.drawn = 0;
        for (const r of L.routes) {
          if (r.x1 < vx0 || r.x0 > vx1 || r.y1 < vy0 || r.y0 > vy1) continue;
          L.drawn++; g.beginPath(); let lx = -1e9, ly = -1e9, first = true;
          for (let i = 0; i < r.xs.length; i++) {
            const px = r.xs[i] * scale - x0, py = r.ys[i] * scale - y0;
            if (!first && Math.abs(px - lx) + Math.abs(py - ly) < 2 && i < r.xs.length - 1) continue;
            if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py); lx = px; ly = py;
          }
          g.stroke();
        }
      }
      g.globalAlpha = 1;
    }
    const redraw = () => { if (!raf) raf = requestAnimationFrame(render); };
    function zoomAt(px, py, dz) {
      const nz = clamp(z + dz, 3, 18); if (nz === z) return;
      const s0 = T * Math.pow(2, z), s1 = T * Math.pow(2, nz), gx = c[0] * s0 - w / 2 + px, gy = c[1] * s0 - h / 2 + py;
      c = [(gx / s0 * s1 - px + w / 2) / s1, (gy / s0 * s1 - py + h / 2) / s1]; z = nz; redraw();
    }
    const ptrs = new Map(); let pinchD = 0, lastWheel = 0;
    const dist = () => { const a = [...ptrs.values()]; return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y); };
    el.addEventListener('pointerdown', e => { if (e.target.closest('.mm-ctl')) return; try { el.setPointerCapture(e.pointerId); } catch (_) {} ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 2) pinchD = dist(); });
    el.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      if (ptrs.size === 1) { const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; const s = T * Math.pow(2, z); c = [c[0] - dx / s, c[1] - dy / s]; redraw(); }
      else if (ptrs.size === 2) {
        p.x = e.clientX; p.y = e.clientY; const d = dist(), a = [...ptrs.values()], r = el.getBoundingClientRect(), mx = (a[0].x + a[1].x) / 2 - r.left, my = (a[0].y + a[1].y) / 2 - r.top;
        if (d > pinchD * 1.5) { zoomAt(mx, my, 1); pinchD = d; } else if (d < pinchD * 0.67) { zoomAt(mx, my, -1); pinchD = d; }
      }
    });
    const up = e => { ptrs.delete(e.pointerId); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', e => { e.preventDefault(); const t = Date.now(); if (t - lastWheel < 140) return; lastWheel = t; const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1 : -1); }, { passive: false });
    el.addEventListener('dblclick', e => { if (e.target.closest('.mm-ctl')) return; const r = el.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, 1); });
    ctl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.fit) { fit(); redraw(); } else zoomAt(w / 2, h / 2, +b.dataset.z); });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { const nw = el.clientWidth, nh = el.clientHeight; if (nw && (nw !== w || nh !== h)) { w = nw; h = nh; redraw(); } }) : null;
    if (ro) ro.observe(el);
    return {
      /* spec: [{ name, color, alpha, width, routes: [{ ll }] }]; refit = prilagodi prikaz svim rutama */
      setData(spec, refit) { layers = spec.map(L => ({ name: L.name, color: L.color, alpha: L.alpha, width: L.width, drawn: 0, routes: L.routes.map(r => r._p || (r._p = prep(r.ll))) })); if (refit) fit(); render(); },
      setGray(v) { gray = v; layerEl.style.filter = v ? 'grayscale(1) contrast(.92) brightness(1.04)' : ''; },
      stats: () => ({ z, layers: layers.map(L => ({ name: L.name, routes: L.routes.length, drawn: L.drawn })) }),
      destroy() { dead = true; if (ro) ro.disconnect(); tiles.clear(); }
    };
  }

  /* ---------- graf ---------- */
  const METRICS = [['ele', 'Visina', 'm', 0, 'var(--c-walk)'], ['spd', 'Brzina', 'km/h', 1, 'var(--accent)'], ['pace', 'Tempo', 'min/km', 2, 'var(--c-foot)'], ['hr', 'Puls', 'bpm', 0, 'var(--c-weight)'], ['pw', 'Snaga', 'W', 0, 'var(--c-other)']];
  const fmt = (v, dec) => v === null || v === undefined ? '–' : v.toFixed(dec).replace('.', ',');
  const fmtT = s => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), q = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(q).padStart(2, '0'); };

  const mmss = v => { const s = Math.round(v * 60); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function ChartView(el, tr, onScrub, defKey) {
    const n = tr.n, hasD = tr.d && tr.d[n - 1] > 0;
    const xs = hasD ? tr.d.map(v => v / 1000) : tr.t.map(v => v / 60), xUnit = hasD ? 'km' : 'min';
    const xmin = xs[0], xmax = Math.max(xs[n - 1], xmin + 1e-6);
    /* tempo (min/km) se izvodi iz brzine; stajanje (< 2 km/h) se izostavlja, a krivulja se blago zagladi */
    const paceArr = (() => {
      if (!tr.spd) return null;
      const raw = tr.spd.map(v => v !== null && v !== undefined && v >= 2 ? 60 / v : null);
      return raw.map((v, i) => { if (v === null) return null; let s = 0, c = 0; for (let j = Math.max(0, i - 2); j <= Math.min(raw.length - 1, i + 2); j++) if (raw[j] !== null) { s += raw[j]; c++; } return s / c; });
    })();
    const D = { ele: tr.ele, spd: tr.spd, hr: tr.hr, pw: tr.pw, pace: paceArr };
    const avail = METRICS.filter(m => D[m[0]] && D[m[0]].filter(v => v !== null && v !== undefined).length >= 3);
    if (!avail.length) { el.style.display = 'none'; return { destroy() {} }; }
    let cur = avail.find(m => m[0] === defKey) || avail[0], idx = null, Yf = null;
    const W = 340, H = 150, pl = 34, pr = 6, pt = 8, pb = 18;
    el.innerHTML = '<div class="tv-tabs"></div><svg class="tv-chart" viewBox="0 0 ' + W + ' ' + H + '" width="100%"></svg><div class="tv-read"></div>';
    const tabs = el.querySelector('.tv-tabs'), svg = el.querySelector('.tv-chart'), read = el.querySelector('.tv-read');
    avail.forEach(m => { const b = document.createElement('button'); b.type = 'button'; b.textContent = m[1]; b.dataset.k = m[0]; tabs.appendChild(b); });
    const X = v => pl + (v - xmin) / (xmax - xmin) * (W - pl - pr);

    function draw() {
      const k = cur[0], vals = D[k], valid = vals.filter(v => v !== null && v !== undefined), isP = k === 'pace';
      let lo = Math.min(...valid), hi = Math.max(...valid);
      if (isP) { const sv = valid.slice().sort((a, b) => a - b); lo = sv[Math.floor(sv.length * 0.02)]; hi = sv[Math.min(sv.length - 1, Math.floor(sv.length * 0.98))]; }
      if (k === 'spd' || k === 'pw') lo = 0;
      if (hi - lo < 1) { hi = lo + 1; }
      const padv = (hi - lo) * 0.06; if (k === 'ele' || k === 'hr') lo -= padv; hi += padv;
      const Y = Yf = v => { if (isP) v = Math.min(hi, Math.max(lo, v)); const f = (v - lo) / (hi - lo); return pt + (isP ? f : 1 - f) * (H - pt - pb); };
      const lab = v => isP ? mmss(v) : String(Math.round(v));
      let s = '';
      for (let g = 0; g <= 2; g++) {
        const v = lo + (hi - lo) * g / 2, y = Y(v);
        s += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" class="tv-grid"/><text x="' + (pl - 4) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end">' + lab(v) + '</text>';
      }
      let path = '', started = false, first = null, lastX = null;
      vals.forEach((v, i) => {
        if (v === null || v === undefined) { started = false; return; }
        const x = X(xs[i]).toFixed(1), y = Y(v).toFixed(1);
        path += (started ? 'L' : 'M') + x + ' ' + y; if (!started) first = x; started = true; lastX = x;
      });
      const baseY = H - pb;
      s += '<path d="' + path + ' L' + lastX + ' ' + baseY + ' L' + first + ' ' + baseY + 'Z" class="tv-area" style="fill:' + cur[4] + '"/>';
      s += '<path d="' + path + '" class="tv-line" style="stroke:' + cur[4] + '"/>';
      for (let g = 0; g <= 2; g++) { const v = xmin + (xmax - xmin) * g / 2; s += '<text x="' + X(v).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="' + (g === 0 ? 'start' : g === 2 ? 'end' : 'middle') + '">' + (xUnit === 'km' ? v.toFixed(1).replace('.', ',') : Math.round(v)) + (g === 2 ? ' ' + xUnit : '') + '</text>'; }
      s += '<line class="tv-cur" y1="' + pt + '" y2="' + baseY + '" x1="0" x2="0" style="display:none"/><circle class="tv-dot" r="4" style="display:none;fill:' + cur[4] + '"/>';
      svg.innerHTML = s;
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      show(idx);
    }
    function show(i) {
      idx = i;
      const line = svg.querySelector('.tv-cur'), dot = svg.querySelector('.tv-dot');
      if (i === null) {
        line.style.display = 'none'; dot.style.display = 'none';
        read.textContent = 'Povuci prstom po grafu da vidiš točku na karti.'; return;
      }
      const x = X(xs[i]);
      line.setAttribute('x1', x); line.setAttribute('x2', x); line.style.display = '';
      const v = D[cur[0]][i];
      if (v !== null && v !== undefined && Yf) { dot.setAttribute('cx', x); dot.setAttribute('cy', Yf(v)); dot.style.display = ''; } else dot.style.display = 'none';
      const parts = [xUnit === 'km' ? fmt(xs[i], 2) + ' km' : fmt(xs[i], 1) + ' min', fmtT(tr.t[i])];
      avail.forEach(m => { const q = D[m[0]][i]; if (q !== null && q !== undefined) parts.push(m[1] + ' ' + (m[0] === 'pace' ? mmss(q) : fmt(q, m[3])) + ' ' + m[2]); });
      read.textContent = parts.join(' · ');
    }
    function at(clientX) {
      const r = svg.getBoundingClientRect(), x = (clientX - r.left) / r.width * W, xv = xmin + (x - pl) / (W - pl - pr) * (xmax - xmin);
      let a = 0, b = n - 1;
      while (b - a > 1) { const m = (a + b) >> 1; if (xs[m] < xv) a = m; else b = m; }
      return Math.abs(xs[a] - xv) <= Math.abs(xs[b] - xv) ? a : b;
    }
    let down = false;
    const scrub = e => { const i = at(e.clientX); show(i); if (onScrub) onScrub(i); };
    svg.addEventListener('pointerdown', e => { down = true; try { svg.setPointerCapture(e.pointerId); } catch (_) {} scrub(e); });
    svg.addEventListener('pointermove', e => { if (down || e.pointerType === 'mouse') scrub(e); });
    svg.addEventListener('pointerup', () => { down = false; });
    svg.addEventListener('pointercancel', () => { down = false; });
    tabs.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; cur = avail.find(m => m[0] === b.dataset.k); draw(); });
    draw();
    return { destroy() {}, show };
  }

  /* ---------- sklapanje ---------- */
  /* opts: { cfg, labels: { hr: [...], spd: [...] } } za bojenje rute po zonama */
  function mount(box, tr, opts) {
    box.innerHTML = '';
    let map = null;
    const pts = tr.poly ? (root.Files || {}).decPoly(tr.poly) : [];
    if (pts.length >= 2 && !(opts && opts.noMap)) { const m = document.createElement('div'); m.className = 'tv-map'; box.appendChild(m); map = MiniMap(m, pts); }
    const A = root.Analytics;
    if (map && opts && opts.cfg && A) {
      const modes = [['plain', 'Jednobojno'], ['hr', 'Puls'], ['spd', 'Brzina']].filter(m => m[0] === 'plain' || (opts.cfg[m[0]] && tr[m[0]] && tr[m[0]].filter(v => v !== null && v !== undefined).length >= 3));
      if (modes.length > 1) {
        const bar = document.createElement('div'); bar.className = 'tv-zc';
        bar.innerHTML = '<div class="tv-tabs">' + modes.map(m => '<button type="button" data-m="' + m[0] + '">' + m[1] + '</button>').join('') + '</div><div class="tv-leg"></div>';
        box.appendChild(bar);
        const leg = bar.querySelector('.tv-leg');
        const set = k => {
          bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === k));
          map.setColors(k === 'plain' ? null : A.zoneIdx(tr, opts.cfg, k));
          leg.innerHTML = k === 'plain' ? '' : (opts.labels[k] || []).map((l, i) => '<span><i style="background:' + ZCOL[i] + '"></i>' + l.replace(/ (bpm|km\/h)$/, '') + '</span>').join('');
        };
        bar.addEventListener('click', e => { const b = e.target.closest('button'); if (b) { mount.mode = b.dataset.m; set(b.dataset.m); } });
        set(modes.some(m => m[0] === (opts.mode || 'plain')) ? (opts.mode || 'plain') : 'plain');
      }
    }
    let chart = { destroy() {} };
    if (!(opts && opts.noChart)) { const cd = document.createElement('div'); cd.className = 'tv-chartbox'; box.appendChild(cd); chart = ChartView(cd, tr, i => { if (map) map.setMarker(i); }, opts && opts.chart); }
    return { map, chart, destroy() { if (map) map.destroy(); } };
  }

  root.TrackView = { mount, MiniMap, ChartView, HeatMap };
})(typeof self !== 'undefined' ? self : this);
