/* Snaga: bilježenje treninga (po uzoru na Hevy). Povijest vježbi se čita iz opisa
   "Logged with hevyapp.com" na Weight Training aktivnostima, pa nema posebne baze vježbi.
   Aktivni trening živi u localStorage ('wk'), a po završetku postaje obična aktivnost. */
const Gym = (() => {
  const LS = 'wk', LR = 'wkRest';
  let W = null, RT = null, view = 'start', q = '', tick = null, wl = null, actx = null, H = null, restDef = 90, fin = { rt: true };
  const num = s => { const v = parseFloat(String(s == null ? '' : s).replace(',', '.')); return isFinite(v) ? v : null; };
  const low = s => String(s).trim().toLowerCase();
  const clock = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };
  const fmtN = n => n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ',');
  const save = () => { try { W ? localStorage.setItem(LS, JSON.stringify(W)) : localStorage.removeItem(LS); } catch (_) {} };
  try { W = JSON.parse(localStorage.getItem(LS) || 'null'); restDef = +localStorage.getItem(LR) || 90; } catch (_) { W = null; }

  /* ---------- parsiranje i povijest ---------- */
  function parseDesc(d) {
    const out = []; let cur = null;
    for (const raw of String(d || '').split(/\r?\n/)) {
      const l = raw.trim(); if (!l || /^logged with/i.test(l)) continue;
      const m = l.match(/^Set\s+\S+:\s*(.*)$/i);
      if (m) {
        if (!cur) continue;
        const k = m[1].match(/^([\d.,]+)\s*kg\s*[x×]\s*(\d+)/i), r = m[1].match(/^(\d+)\s*reps?/i);
        if (k) cur.sets.push({ kg: num(k[1]), r: +k[2] }); else if (r) cur.sets.push({ kg: null, r: +r[1] });
        continue;
      }
      cur = { n: l, sets: [] }; out.push(cur);
    }
    return out.filter(e => e.sets.length);
  }
  function history() {
    const acts = Object.values(DB.activities).filter(a => a.type === 'Weight Training' && a.desc).sort((a, b) => a.date < b.date ? 1 : -1);
    const m = new Map();
    for (const a of acts) for (const e of parseDesc(a.desc)) {
      let h = m.get(low(e.n)); if (!h) { h = { n: e.n, count: 0, last: null }; m.set(low(e.n), h); }
      h.count++; if (!h.last) h.last = { date: a.date, sets: e.sets };
    }
    for (const r of routines()) for (const e of r.ex) if (!m.has(low(e.n))) m.set(low(e.n), { n: e.n, count: 0, last: null });
    return m;
  }
  const gym = () => (DB.settings && DB.settings.gym) || {};
  const routines = () => Array.isArray(gym().routines) ? gym().routines : [];
  async function setRoutines(list) {
    DB.settings = Object.assign({}, DB.settings, { updated: Date.now(), gym: Object.assign({}, gym(), { routines: list }) });
    await persist();
  }
  const REST = [30, 45, 60, 75, 90, 120, 150, 180, 240];
  const restOpts = (cur, defLabel) => '<option value="0"' + (!cur ? ' selected' : '') + '>' + defLabel + '</option>' + REST.map(v => '<option value="' + v + '"' + (v === cur ? ' selected' : '') + '>' + v + ' s</option>').join('');
  const fmtSet = s => s ? (s.kg ? fmtN(s.kg) + ' kg × ' + s.r : s.r + ' pon.') : '';

  /* ---------- model aktivnog treninga ---------- */
  function mkEx(n, count, rest) {
    const h = H.get(low(n)), p = h && h.last ? h.last.sets : null;
    let sets;
    if (p) { sets = p.map(s => ({ kg: s.kg, r: s.r, done: false })); const c = count || p.length; while (sets.length > c) sets.pop(); while (sets.length < c) sets.push(Object.assign({}, sets[sets.length - 1] || { kg: null, r: null }, { done: false })); }
    else sets = Array.from({ length: count || 3 }, () => ({ kg: null, r: null, done: false }));
    const o = { n: h ? h.n : n.trim(), sets }; if (rest) o.rest = rest; return o;
  }
  function start(name, rt) {
    H = history();
    W = { start: Date.now(), name: name || 'Trening', rid: rt ? rt.id : null, rest: null, ex: rt ? rt.ex.map(e => mkEx(e.n, e.sets, e.rest)) : [] };
    save(); view = 'main'; wake(); run(); paint();
  }
  const prevSet = (n, i) => { const h = H.get(low(n)); const p = h && h.last && h.last.sets; return p && p.length ? p[Math.min(i, p.length - 1)] : null; };
  const totals = () => {
    let sets = 0, reps = 0, kg = 0;
    for (const e of W.ex) for (const s of e.sets) if (s.done) { sets++; reps += s.r || 0; kg += (s.kg || 0) * (s.r || 0); }
    return { sets, reps, kg: Math.round(kg) };
  };

  /* ---------- zvuk, wake lock, timeri ---------- */
  function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (_) {} }
  function beep() {
    try { unlockAudio(); const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination); o.frequency.value = 880; g.gain.value = .2; o.start(); o.stop(actx.currentTime + .3); } catch (_) {}
    try { navigator.vibrate && navigator.vibrate([250, 120, 250]); } catch (_) {}
  }
  async function wake() { try { if (W && navigator.wakeLock && !wl && document.visibilityState === 'visible') { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); } } catch (_) { wl = null; } }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { wake(); if (W) paintTimers(); } });
  function run() { if (!tick) tick = setInterval(paintTimers, 500); paintTimers(); }
  function stop() { clearInterval(tick); tick = null; try { wl && wl.release(); } catch (_) {} wl = null; }

  const dlg = () => document.getElementById('wk');
  function paintTimers() {
    const btn = document.getElementById('wkBtn'), bar = document.getElementById('wkBar');
    if (btn) btn.classList.toggle('hide', !W);
    if (!W) { if (btn) { btn.classList.remove('act'); btn.querySelector('span').textContent = ''; } if (bar) bar.hidden = true; return; }
    const now = Date.now(), t = clock((now - W.start) / 1000);
    if (W.rest && W.rest.end <= now) { W.rest = null; save(); beep(); paintRest(); }
    const rest = W.rest ? clock(Math.ceil((W.rest.end - now) / 1000)) : '';
    if (btn) { btn.classList.add('act'); btn.querySelector('span').textContent = t; }
    const open = dlg() && dlg().open;
    if (bar) { bar.hidden = !!open; bar.querySelector('.t').textContent = t; bar.querySelector('.r').textContent = rest ? 'odmor ' + rest : ''; }
    const a = document.getElementById('wkT'); if (a) a.textContent = t;
    const r = document.getElementById('wkRT'); if (r) r.textContent = rest;
  }
  function paintRest() {
    const el = document.getElementById('wkRest'); if (!el || !W) return;
    if (W.rest) el.innerHTML = '<span class="k">Odmor</span><b id="wkRT" class="rt"></b><button class="btn" data-g="rest-" title="−15 s">−15</button><button class="btn" data-g="rest+" title="+15 s">+15</button><button class="btn" data-g="rest0">Preskoči</button>';
    else el.innerHTML = '<span class="k">Odmor</span>' + [30, 45, 60, 90, 120, 180].map(s => '<button class="chip' + (s === restDef ? ' on' : '') + '" data-g="rdef" data-v="' + s + '">' + s + ' s</button>').join('');
    paintTimers();
  }

  /* ---------- prikaz ---------- */
  const E = s => esc(s);
  function paint() {
    const d = dlg(); if (!d) return;
    const sc = d.querySelector('.wk-body'), top = sc ? sc.scrollTop : 0;
    if (view === 'rted' && RT) d.innerHTML = vRted();
    else if (view === 'rtpick' || (view === 'pick' && W)) d.innerHTML = vPick();
    else if (view === 'start' || !W) d.innerHTML = vStart();
    else if (view === 'finish') d.innerHTML = vFinish();
    else d.innerHTML = vMain();
    if (view === 'main') paintRest();
    paintTimers();
    const nb = d.querySelector('.wk-body'); if (nb && view === 'main') nb.scrollTop = top;
  }
  function vStart() {
    const rs = routines();
    return '<div class="wk-top"><b>Snaga</b><span style="flex:1"></span><button class="btn" data-g="close">Zatvori</button></div><div class="wk-body">' +
      '<button class="btn pri wk-big" data-g="new">Počni prazan trening</button>' +
      '<h3 class="wk-h">Rutine</h3><button class="btn wk-big" data-g="rtnew">+ Nova rutina</button>' +
      (rs.length ? rs.map(r => '<div class="wk-rt"><div><b>' + E(r.name) + '</b><div class="m">' + E(r.ex.map(e => e.n).join(' · ')) + '</div></div><div class="wk-rb"><button class="btn pri" data-g="startrt" data-id="' + E(r.id) + '">Počni</button><button class="btn" data-g="delrt" data-id="' + E(r.id) + '" title="Obriši rutinu">✕</button></div></div>').join('') : '<p class="m">Nema rutina. Napravi novu ili je spremi iz aktivnog treninga.</p>') +
      '</div>';
  }
  function vMain() {
    const T = totals();
    const ex = W.ex.map((e, i) => '<div class="wk-ex"><div class="wk-eh"><b>' + E(e.n) + '</b><span style="flex:1"></span><button class="btn" data-g="exdel" data-i="' + i + '" title="Ukloni vježbu">✕</button></div>' +
      '<div class="wk-sr wk-sh"><span>#</span><span>Prethodno</span><span>kg</span><span>pon.</span><span></span></div>' +
      e.sets.map((s, j) => {
        const p = prevSet(e.n, j);
        return '<div class="wk-sr' + (s.done ? ' dn' : '') + '"><span class="n">' + (j + 1) + '</span>' +
          '<button class="wk-pv" data-g="fill" data-i="' + i + '" data-j="' + j + '" ' + (p ? '' : 'disabled') + '>' + (p ? E(fmtSet(p)) : '–') + '</button>' +
          '<input inputmode="decimal" data-k="kg" data-i="' + i + '" data-j="' + j + '" value="' + E(fmtN(s.kg)) + '" placeholder="' + (p && p.kg ? fmtN(p.kg) : '') + '">' +
          '<input inputmode="numeric" data-k="r" data-i="' + i + '" data-j="' + j + '" value="' + (s.r == null ? '' : s.r) + '" placeholder="' + (p ? p.r : '') + '">' +
          '<button class="wk-ok" data-g="done" data-i="' + i + '" data-j="' + j + '" aria-label="Gotovo">' + (s.done ? '✓' : '') + '</button></div>';
      }).join('') +
      '<button class="btn wk-add" data-g="setadd" data-i="' + i + '">+ Set</button></div>').join('');
    return '<div class="wk-top"><input id="wkName" value="' + E(W.name) + '" aria-label="Naziv treninga"><b id="wkT" class="rt"></b><button class="btn" data-g="min">Minimiziraj</button></div>' +
      '<div class="wk-rest" id="wkRest"></div>' +
      '<div class="wk-body">' + (ex || '<p class="m">Još nema vježbi.</p>') +
      '<button class="btn wk-big" data-g="pick">+ Dodaj vježbu</button>' +
      '<div class="wk-row"><button class="btn" data-g="saverts">Spremi kao rutinu</button><button class="btn" data-g="discard">Odbaci trening</button></div></div>' +
      '<div class="wk-foot"><span class="m">' + T.sets + ' setova · ' + T.reps + ' pon. · ' + T.kg + ' kg</span><button class="btn pri" data-g="finish">Završi</button></div>';
  }
  function vPick() {
    const s = low(q), all = [...H.values()].sort((a, b) => a.n.localeCompare(b.n, "hr", { sensitivity: "base" }));
    const list = all.filter(h => !s || low(h.n).includes(s));
    const exact = all.some(h => low(h.n) === s);
    return '<div class="wk-top"><input id="wkQ" placeholder="Traži ili upiši novu vježbu" value="' + E(q) + '" autocomplete="off"><button class="btn" data-g="back">Nazad</button></div><div class="wk-body">' +
      (s && !exact ? '<button class="btn pri wk-big" data-g="' + (view === 'rtpick' ? 'rtaddnew' : 'addnew') + '">+ Nova vježba „' + E(q.trim()) + '“</button>' : '') +
      list.map(h => '<button class="wk-pick" data-g="' + (view === 'rtpick' ? 'rtadd' : 'add') + '" data-n="' + E(h.n) + '"><b>' + E(h.n) + '</b><span class="m">' + (h.last ? E(fmtSet(h.last.sets[0])) + ' · ' + h.count + '×' : 'nova') + '</span></button>').join('') +
      (!list.length && !s ? '<p class="m">Nema vježbi u povijesti.</p>' : '') + '</div>';
  }
  function vRted() {
    const ex = RT.ex.map((e, i) => '<div class="wk-ex"><div class="wk-eh"><b>' + E(e.n) + '</b><span style="flex:1"></span><button class="btn" data-g="rtup" data-i="' + i + '" title="Gore"' + (i ? '' : ' disabled') + '>↑</button><button class="btn" data-g="rtdn" data-i="' + i + '" title="Dolje"' + (i < RT.ex.length - 1 ? '' : ' disabled') + '>↓</button><button class="btn" data-g="rtdel" data-i="' + i + '" title="Ukloni">✕</button></div>' +
      '<div class="wk-cf"><span class="k">Setova</span><button class="btn" data-g="rts-" data-i="' + i + '">−</button><b class="rt">' + e.sets + '</b><button class="btn" data-g="rts+" data-i="' + i + '">+</button><span class="k" style="margin-left:auto">Odmor</span><select class="wk-rs" data-sel="rtrest" data-i="' + i + '">' + restOpts(e.rest, 'zadano (' + restDef + ' s)') + '</select></div></div>').join('');
    return '<div class="wk-top"><input id="wkRtName" value="' + E(RT.name) + '" placeholder="Naziv rutine" aria-label="Naziv rutine"><button class="btn" data-g="rtcancel">Odustani</button></div><div class="wk-body">' + (ex || '<p class="m">Dodaj vježbe u rutinu.</p>') +
      '<button class="btn wk-big" data-g="rtpick">+ Dodaj vježbu</button></div><div class="wk-foot"><span class="m">' + RT.ex.length + ' vježbi</span><button class="btn pri" data-g="rtsave">Spremi rutinu</button></div>';
  }
  function vFinish() {
    const T = totals();
    return '<div class="wk-top"><b>Završi trening</b></div><div class="wk-body">' +
      '<div class="wk-sum"><div><b>' + clock((Date.now() - W.start) / 1000) + '</b><span>trajanje</span></div><div><b>' + T.sets + '</b><span>setova</span></div><div><b>' + T.reps + '</b><span>ponavljanja</span></div><div><b>' + T.kg + '</b><span>kg ukupno</span></div></div>' +
      '<p class="m">Spremaju se samo označeni setovi (✓).</p>' +
      '<label class="wk-ck"><input type="checkbox" id="wkRt"' + (fin.rt ? ' checked' : '') + '> ' + (W.rid ? 'Ažuriraj rutinu' : 'Spremi kao rutinu') + ' „' + E(W.name) + '“</label>' +
      '<div class="wk-row"><button class="btn pri" data-g="save">Spremi trening</button><button class="btn" data-g="back">Nazad</button></div></div>';
  }

  /* ---------- spremanje ---------- */
  function cleaned() {
    return W.ex.map(e => ({ n: e.n, sets: e.sets.filter(s => s.done && (s.r || s.kg)).map(s => ({ kg: s.kg || null, r: s.r || 0 })) })).filter(e => e.sets.length);
  }
  const descOf = ex => 'Logged with Trening\n\n' + ex.map(e => e.n + '\n' + e.sets.map((s, i) => 'Set ' + (i + 1) + ': ' + (s.kg ? fmtN(s.kg).replace(',', '.') + ' kg x ' + s.r : s.r + ' reps') + ' \n').join('')).join('\n');
  async function rtFromW(id) {
    const ex = W.ex.filter(e => e.sets.length).map(e => ({ n: e.n, sets: e.sets.length, rest: e.rest || undefined }));
    if (!ex.length) return false;
    const list = routines().slice(), i = list.findIndex(r => r.id === id);
    const r = { id: id || 'r' + Date.now(), name: W.name.trim() || 'Rutina', ex };
    if (i >= 0) list[i] = r; else list.push(r);
    await setRoutines(list); return true;
  }
  async function finishSave() {
    const ex = cleaned();
    if (!ex.length) { toast('Nema označenih setova.'); view = 'main'; paint(); return; }
    const T = { sets: 0, reps: 0, kg: 0 };
    for (const e of ex) for (const s of e.sets) { T.sets++; T.reps += s.r; T.kg += (s.kg || 0) * s.r; }
    const sec = Math.max(60, Math.round((Date.now() - W.start) / 1000)), id = 'g' + Date.now();
    DB.activities[id] = { id, date: new Date(W.start).toISOString(), name: W.name.trim() || 'Trening', type: 'Weight Training', desc: descOf(ex), dist: 0, elapsed: sec, moving: sec, avgSpeed: null, elev: null, avgHr: null, maxHr: null, watts: null, cal: null, gear: null, effort: null, lifted: Math.round(T.kg), sets: T.sets, reps: T.reps, file: '', notes: '', tags: [], src: 'manual', commute: false, flags: [], updated: Date.now() };
    const wantRt = dlg().querySelector('#wkRt') ? dlg().querySelector('#wkRt').checked : false; fin.rt = wantRt;
    if (wantRt) { W.ex = ex.map(e => ({ n: e.n, sets: e.sets })); await rtFromW(W.rid); }
    W = null; save(); stop(); dlg().close(); await persist(); render(); toast('Trening spremljen.');
    paintTimers();
  }

  /* ---------- događaji ---------- */
  function wire() {
    const d = dlg();
    d.addEventListener('input', e => {
      const t = e.target;
      if (t.id === 'wkRtName') { RT.name = t.value; return; }
      if (t.id === 'wkName') { W.name = t.value; save(); return; }
      if (t.id === 'wkQ') { q = t.value; const pos = t.selectionStart; paint(); const n = d.querySelector('#wkQ'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } return; }
      if (t.dataset.k && W) { const s = W.ex[+t.dataset.i].sets[+t.dataset.j]; s[t.dataset.k] = num(t.value); if (t.dataset.k === 'r' && s.r != null) s.r = Math.round(s.r); save(); }
    });
    d.addEventListener('click', async e => {
      const b = e.target.closest('[data-g]'); if (!b) return;
      const g = b.dataset.g, i = +b.dataset.i, j = +b.dataset.j;
      if (g === 'close' || g === 'min') { d.close(); return; }
      if (g === 'rtnew') { H = history(); RT = { id: null, name: '', ex: [] }; view = 'rted'; paint(); const n = d.querySelector('#wkRtName'); if (n) n.focus(); return; }
      if (g === 'rtedit') { const r = routines().find(x => x.id === b.dataset.id); if (r) { H = history(); RT = { id: r.id, name: r.name, ex: r.ex.map(e => Object.assign({}, e)) }; view = 'rted'; paint(); } return; }
      if (RT && g.startsWith('rt')) {
        if (g === 'rtcancel') { RT = null; view = 'start'; paint(); return; }
        if (g === 'rtpick') { q = ''; view = 'rtpick'; paint(); const n = d.querySelector('#wkQ'); if (n) n.focus(); return; }
        if (g === 'rtadd' || g === 'rtaddnew') { const n = g === 'rtadd' ? b.dataset.n : q.trim(); if (n) { const h = H.get(low(n)); RT.ex.push({ n: h ? h.n : n, sets: h && h.last ? h.last.sets.length : 3 }); } view = 'rted'; paint(); return; }
        if (g === 'rtdel') RT.ex.splice(i, 1);
        else if (g === 'rtup' && i > 0) [RT.ex[i - 1], RT.ex[i]] = [RT.ex[i], RT.ex[i - 1]];
        else if (g === 'rtdn' && i < RT.ex.length - 1) [RT.ex[i + 1], RT.ex[i]] = [RT.ex[i], RT.ex[i + 1]];
        else if (g === 'rts+') RT.ex[i].sets = Math.min(20, RT.ex[i].sets + 1);
        else if (g === 'rts-') RT.ex[i].sets = Math.max(1, RT.ex[i].sets - 1);
        else if (g === 'rtsave') {
          if (!RT.ex.length) { toast('Dodaj barem jednu vježbu.'); return; }
          const list = routines().slice(), r = { id: RT.id || 'r' + Date.now(), name: RT.name.trim() || 'Rutina', ex: RT.ex.map(e => Object.assign({}, e, e.rest ? {} : { rest: undefined })) }, k = list.findIndex(x => x.id === r.id);
          if (k >= 0) list[k] = r; else list.push(r);
          await setRoutines(list); RT = null; view = 'start'; paint(); toast('Rutina spremljena.'); return;
        }
        paint(); return;
      }
      if (g === 'new') { start('Trening'); return; }
      if (g === 'startrt') { const r = routines().find(x => x.id === b.dataset.id); if (r) start(r.name, r); return; }
      if (g === 'delrt') { if (confirm('Obrisati rutinu?')) { await setRoutines(routines().filter(x => x.id !== b.dataset.id)); paint(); } return; }
      if (g === 'back' && view === 'rtpick') { view = 'rted'; paint(); return; }
      if (!W) return;
      if (g === 'pick') { q = ''; view = 'pick'; paint(); const n = d.querySelector('#wkQ'); if (n) n.focus(); return; }
      if (g === 'back') { view = 'main'; paint(); return; }
      if (g === 'add' || g === 'addnew') { const n = g === 'add' ? b.dataset.n : q.trim(); if (n) { W.ex.push(mkEx(n)); save(); } view = 'main'; paint(); return; }
      if (g === 'exdel') { W.ex.splice(i, 1); save(); paint(); return; }
      if (g === 'setadd') { const ss = W.ex[i].sets, l = ss[ss.length - 1]; ss.push(l ? { kg: l.kg, r: l.r, done: false } : { kg: null, r: null, done: false }); save(); paint(); return; }
      if (g === 'fill') { const s = W.ex[i].sets[j], p = prevSet(W.ex[i].n, j); if (p) { s.kg = p.kg; s.r = p.r; save(); paint(); } return; }
      if (g === 'done') {
        unlockAudio();
        const s = W.ex[i].sets[j], p = prevSet(W.ex[i].n, j);
        if (!s.done) {
          if (s.r == null && p) { s.r = p.r; if (s.kg == null) s.kg = p.kg; }
          if (!s.r && !s.kg) { toast('Upiši ponavljanja.'); return; }
          s.done = true; const dur = W.ex[i].rest || restDef; W.rest = { end: Date.now() + dur * 1000, dur };
        } else s.done = false;
        save(); paint(); return;
      }
      if (g === 'rest+' || g === 'rest-') { if (W.rest) { W.rest.end += (g === 'rest+' ? 15 : -15) * 1000; save(); paintTimers(); } return; }
      if (g === 'rest0') { W.rest = null; save(); paintRest(); return; }
      if (g === 'rdef') { restDef = +b.dataset.v; try { localStorage.setItem(LR, restDef); } catch (_) {} paintRest(); return; }
      if (g === 'saverts') { if (await rtFromW(W.rid)) toast('Rutina spremljena.'); else toast('Dodaj barem jednu vježbu.'); return; }
      if (g === 'discard') { if (confirm('Odbaciti ovaj trening bez spremanja?')) { W = null; save(); stop(); d.close(); paintTimers(); } return; }
      if (g === 'finish') { view = 'finish'; paint(); return; }
      if (g === 'save') { await finishSave(); return; }
    });
    d.addEventListener('change', e => {
      const t = e.target, v = +t.value || 0, i = +t.dataset.i;
      if (t.dataset.sel === 'exrest' && W) { if (v) W.ex[i].rest = v; else delete W.ex[i].rest; save(); }
      if (t.dataset.sel === 'rtrest' && RT) { if (v) RT.ex[i].rest = v; else delete RT.ex[i].rest; }
    });
    d.addEventListener('close', paintTimers);
    document.getElementById('wkBtn').onclick = open;
    document.getElementById('wkBar').onclick = open;
  }
  function open() {
    H = history();
    if (RT && (view === 'rted' || view === 'rtpick')) { /* ostaje u uređivanju rutine */ } else view = W ? (view === 'pick' || view === 'finish' ? view : 'main') : 'start';
    paint(); if (!dlg().open) dlg().showModal();
    if (W) { wake(); run(); }
  }
  function init() { if (!document.getElementById('wk')) return; wire(); if (W) { H = history(); run(); } else paintTimers(); }

  function sessions() {
    return Object.values(DB.activities).filter(a => a.type === 'Weight Training' && a.desc).map(a => ({ id: a.id, date: a.date, name: a.name || 'Trening', sec: a.moving || a.elapsed || 0, ex: parseDesc(a.desc) })).filter(s => s.ex.length).sort((a, b) => a.date < b.date ? 1 : -1);
  }
  const show = () => { if (!dlg().open) dlg().showModal(); };
  const startEmpty = () => { H = history(); start('Trening'); show(); };
  const startRt = id => { H = history(); const r = routines().find(x => x.id === id); if (r) { start(r.name, r); show(); } };
  const newRt = () => { H = history(); RT = { id: null, name: '', ex: [] }; view = 'rted'; show(); paint(); };
  const editRt = id => { const r = routines().find(x => x.id === id); if (!r) return; H = history(); RT = { id: r.id, name: r.name, ex: r.ex.map(e => Object.assign({}, e)) }; view = 'rted'; show(); paint(); };
  return { init, open, parseDesc, history, sessions, routines, startEmpty, startRt, newRt, editRt, active: () => !!W, elapsed: () => W ? Math.floor((Date.now() - W.start) / 1000) : 0, _state: () => W };
})();
