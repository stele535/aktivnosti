/* Trening: početna stranica loggera, Napredak po vježbi i Usporedba (treninga i razdoblja).
   Podaci dolaze iz opisa treninga snage (Gym.sessions()). */
const Train = (() => {
  const S = { ex: null, metric: 'w', range: 'all', a: null, b: null, mode: 's', per: 'month' };
  const E = s => esc(s);
  const low = s => String(s).trim().toLowerCase();
  const n1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
  const dShort = iso => { const d = new Date(iso); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + String(d.getFullYear()).slice(2); };
  const e1rm = s => s.kg ? s.kg * (1 + s.r / 30) : null;
  const vol = s => s.kg ? s.kg * s.r : 0;
  const empty = t => '<div class="empty"><p>' + t + '</p></div>';
  const dur = sec => sec ? Core.fmtDur(sec) : '–';

  /* ---------- stranica Trening ---------- */
  function viewGym() {
    const rs = Gym.routines(), ss = Gym.sessions().slice(0, 12);
    let h = '';
    if (Gym.active()) h += '<div class="card tr-act"><div><b>Trening u tijeku</b><div class="m"><span class="rt">' + Core.fmtDur(Gym.elapsed()) + '</span></div></div><button class="btn pri" data-tr="open">Nastavi</button></div>';
    else h += '<button class="btn pri tr-big" data-tr="empty">Počni prazan trening</button>';
    h += '<h3 class="tr-h">Rutine</h3>';
    h += rs.length ? rs.map(r => '<div class="tr-rt"><div class="tr-i"><b>' + E(r.name) + '</b><div class="m">' + E(r.ex.map(e => e.n).join(' · ')) + '</div></div><div class="tr-b"><button class="btn pri" data-tr="startrt" data-id="' + E(r.id) + '"' + (Gym.active() ? ' disabled' : '') + '>Počni</button><button class="btn" data-tr="editrt" data-id="' + E(r.id) + '" title="Uredi rutinu">✎</button></div></div>').join('') : '<p class="m">Još nema rutina.</p>';
    h += '<button class="btn tr-big" data-tr="newrt">+ Nova rutina</button>';
    h += '<h3 class="tr-h">Zadnji treninzi snage</h3>';
    h += ss.length ? '<div class="tr-list">' + ss.map(s => {
      let sets = 0, kg = 0; for (const e of s.ex) for (const x of e.sets) { sets++; kg += vol(x); }
      return '<button class="tr-s" data-tr="sess" data-id="' + E(s.id) + '"><span>' + dShort(s.date) + '</span><b>' + E(s.name) + '</b><span class="m">' + sets + ' setova · ' + Math.round(kg) + ' kg</span></button>';
    }).join('') + '</div>' : '<p class="m">Nema treninga snage.</p>';
    return h;
  }

  /* ---------- Napredak ---------- */
  function perExercise(name) {
    const out = [];
    for (const s of Gym.sessions()) {
      const e = s.ex.find(x => low(x.n) === low(name)); if (!e) continue;
      let w = 0, er = 0, v = 0, r = 0, tr = 0, top = null;
      for (const x of e.sets) { if ((x.kg || 0) > w) { w = x.kg; } const q = e1rm(x) || 0; if (q > er) er = q; v += x.kg ? x.kg * x.r : x.r; r = Math.max(r, x.r); tr += x.r; if (!top || (x.kg || 0) > (top.kg || 0) || ((x.kg || 0) === (top.kg || 0) && x.r > top.r)) top = x; }
      out.push({ id: s.id, date: s.date, sets: e.sets, w, er, v, r, tr, top });
    }
    return out.reverse(); // od najstarijeg
  }
  function line(pts, unit) {
    if (!pts.length) return '<p class="m">Nema podataka u odabranom razdoblju.</p>';
    const W = 340, H = 170, pl = 40, pr = 12, pt = 12, pb = 24;
    const vs = pts.map(p => p.v), mx = Math.max(...vs), mn = Math.min(...vs), span = mx - mn;
    const lo = span === 0 ? 0 : Math.max(0, mn - span * .25), hi = span === 0 ? (mx || 1) * 1.15 : mx + span * .12;
    const t0 = new Date(pts[0].t).getTime(), t1 = new Date(pts[pts.length - 1].t).getTime();
    const X = t => pts.length === 1 || t1 === t0 ? (pl + W - pr) / 2 : pl + (new Date(t).getTime() - t0) / (t1 - t0) * (W - pl - pr);
    const Y = v => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
    const ticks = [lo, (lo + hi) / 2, hi].map(v => '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="var(--line)"/><text x="' + (pl - 5) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="10" fill="var(--mute)">' + n1(v) + '</text>').join('');
    const path = pts.map((p, i) => (i ? 'L' : 'M') + X(p.t).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
    const dots = pts.map(p => '<circle cx="' + X(p.t).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="3" fill="var(--accent)"><title>' + dShort(p.t) + ': ' + n1(p.v) + ' ' + unit + '</title></circle>').join('');
    const last = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="tr-ch" role="img" aria-label="Graf napretka">' + ticks + '<path d="' + path + '" fill="none" stroke="var(--accent)" stroke-width="2"/>' + dots +
      '<text x="' + pl + '" y="' + (H - 6) + '" font-size="10" fill="var(--mute)">' + dShort(pts[0].t) + '</text><text x="' + (W - pr) + '" y="' + (H - 6) + '" text-anchor="end" font-size="10" fill="var(--mute)">' + dShort(last.t) + '</text></svg>';
  }
  function viewProg() {
    const all = Gym.history ? [...Gym.history().values()].filter(h => h.count > 0).sort((a, b) => a.n.localeCompare(b.n, "hr", { sensitivity: "base" })) : [];
    if (!all.length) return empty('Još nema treninga snage za praćenje napretka.');
    if (!S.ex || !all.some(h => low(h.n) === low(S.ex))) S.ex = all[0].n;
    const rows = perExercise(S.ex), bw = rows.length && rows.every(r => !r.w);
    const M = bw ? [['r', 'Najbolji set (pon.)'], ['v', 'Ukupno pon.']] : [['w', 'Težina'], ['e', 'Procj. 1RM'], ['v', 'Volumen']];
    if (!M.some(m => m[0] === S.metric)) S.metric = M[0][0];
    const R = { '3': 92, '6': 183, '12': 365, all: 1e9 }[S.range] || 1e9, cut = Date.now() - R * 864e5;
    const use = rows.filter(r => new Date(r.date).getTime() >= cut);
    const key = { w: 'w', e: 'er', v: 'v', r: 'r' }[S.metric], unit = S.metric === 'r' || (bw && S.metric === 'v') ? 'pon.' : 'kg';
    const pts = use.map(r => ({ t: r.date, v: r[key] })).filter(p => p.v > 0);
    let h = '<select data-trs="ex" class="tr-sel">' + all.map(x => '<option value="' + E(x.n) + '"' + (low(x.n) === low(S.ex) ? ' selected' : '') + '>' + E(x.n) + ' (' + x.count + '×)</option>').join('') + '</select>';
    h += '<div class="chips tr-chips">' + M.map(([k, l]) => '<button class="chip ' + (S.metric === k ? 'on' : '') + '" data-trs="metric" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
    h += '<div class="chips tr-chips">' + [['3', '3 mj.'], ['6', '6 mj.'], ['12', 'Godina'], ['all', 'Sve']].map(([k, l]) => '<button class="chip ' + (S.range === k ? 'on' : '') + '" data-trs="range" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
    h += '<div class="card">' + line(pts, unit) + '</div>';
    // rekordi (kroz cijelu povijest vježbe)
    const best = (f) => rows.reduce((b, r) => (!b || f(r) > f(b)) ? r : b, null);
    const pw = best(r => r.w), pe = best(r => r.er), pv = best(r => r.v), last = rows[rows.length - 1];
    const card = (l, v, sub) => '<div class="stat"><div class="v">' + v + '</div><div class="l">' + l + (sub ? ' · ' + sub : '') + '</div></div>';
    h += '<h3 class="tr-h">Rekordi</h3><div class="grid">' +
      (pw && pw.w ? card('najveća težina', n1(pw.w) + '<small>kg</small>', dShort(pw.date)) : '') +
      (pe && pe.er ? card('procijenjeni 1RM', n1(pe.er) + '<small>kg</small>', dShort(pe.date)) : '') +
      (pv ? card('najveći volumen', Math.round(pv.v) + '<small>' + (bw ? 'pon.' : 'kg') + '</small>', dShort(pv.date)) : '') +
      card('treninga', rows.length + '', last ? 'zadnji ' + dShort(last.date) : '') + '</div>';
    h += '<p class="note">Procijenjeni 1RM je Epley: težina × (1 + ponavljanja / 30).</p>';
    h += '<h3 class="tr-h">Zadnji treninzi</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="l">Datum</th><th class="l">Setovi</th></tr></thead><tbody>' +
      rows.slice(-8).reverse().map(r => '<tr data-id="' + E(r.id) + '"><td class="l">' + dShort(r.date) + '</td><td class="l" style="white-space:normal">' + r.sets.map(x => x.kg ? n1(x.kg) + '×' + x.r : x.r + ' pon.').join(', ') + '</td></tr>').join('') + '</tbody></table></div>';
    return h;
  }

  /* ---------- Usporedba ---------- */
  function agg(list) {
    const A = { n: list.length, sec: 0, sets: 0, reps: 0, vol: 0, ex: new Map() };
    for (const s of list) {
      A.sec += s.sec || 0;
      for (const e of s.ex) {
        let m = A.ex.get(low(e.n)); if (!m) { m = { n: e.n, sets: 0, reps: 0, vol: 0, w: 0, wr: 0 }; A.ex.set(low(e.n), m); }
        for (const x of e.sets) { A.sets++; A.reps += x.r; A.vol += vol(x); m.sets++; m.reps += x.r; m.vol += vol(x); if ((x.kg || 0) > m.w || (x.kg === m.w && x.r > m.wr)) { m.w = x.kg || 0; m.wr = x.r; } }
      }
    }
    return A;
  }
  const dl = (a, b, f) => { const d = a - b; if (!isFinite(d) || (!a && !b)) return '–'; const p = b ? ' (' + (d >= 0 ? '+' : '') + Math.round(d / b * 100) + '%)' : ''; return (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '= ') + (f ? f(Math.abs(d)) : n1(Math.abs(d))) + p; };
  function cmpTable(A, B, la, lb) {
    const row = (l, a, b, f) => '<tr><td class="l">' + l + '</td><td>' + (f ? f(a) : n1(a)) + '</td><td>' + (f ? f(b) : n1(b)) + '</td><td>' + dl(a, b, f) + '</td></tr>';
    let h = '<div class="tbl-wrap"><table class="tbl tr-cmp"><thead><tr><th class="l"></th><th>' + la + '</th><th>' + lb + '</th><th>Razlika</th></tr></thead><tbody>' +
      (A.n > 1 || B.n > 1 ? row('Treninga', A.n, B.n) : '') + row('Trajanje', A.sec, B.sec, dur) + row('Setova', A.sets, B.sets) + row('Ponavljanja', A.reps, B.reps) + row('Volumen kg', Math.round(A.vol), Math.round(B.vol), v => String(Math.round(v))) + '</tbody></table></div>';
    const names = [...new Map([...A.ex, ...B.ex].map(([k, v]) => [k, v.n]))];
    h += '<h3 class="tr-h">Po vježbi (volumen kg)</h3><div class="tbl-wrap"><table class="tbl tr-cmp"><thead><tr><th class="l">Vježba</th><th>' + la + '</th><th>' + lb + '</th><th>Razlika</th></tr></thead><tbody>' +
      names.map(([k, n]) => { const a = A.ex.get(k), b = B.ex.get(k), av = a ? a.vol || a.reps : 0, bv = b ? b.vol || b.reps : 0, bw = (a && !a.vol) || (b && !b.vol);
        return '<tr><td class="l">' + E(n) + (bw ? ' <span class="m">(pon.)</span>' : '') + '</td><td>' + (a ? Math.round(av) : '–') + '</td><td>' + (b ? Math.round(bv) : '–') + '</td><td>' + (a && b ? dl(av, bv, v => String(Math.round(v))) : '–') + '</td></tr>'; }).join('') + '</tbody></table></div>';
    return h;
  }
  function periods(kind) {
    const now = new Date(), y = now.getFullYear(), m = now.getMonth();
    if (kind === 'month') return [['Ovaj mjesec', new Date(y, m, 1), new Date(y, m + 1, 1)], ['Prošli mjesec', new Date(y, m - 1, 1), new Date(y, m, 1)]];
    if (kind === 'year') return [['Ova godina', new Date(y, 0, 1), new Date(y + 1, 0, 1)], ['Prošla godina', new Date(y - 1, 0, 1), new Date(y, 0, 1)]];
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1); // zadnjih 30 dana
    return [['Zadnjih 30 d', new Date(d.getTime() - 30 * 864e5), d], ['Prethodnih 30 d', new Date(d.getTime() - 60 * 864e5), new Date(d.getTime() - 30 * 864e5)]];
  }
  function viewCmp() {
    const ss = Gym.sessions();
    if (ss.length < 2) return empty('Za usporedbu trebaju barem dva treninga snage.');
    let h = '<div class="seg">' + [['s', 'Treninzi'], ['p', 'Razdoblja']].map(([k, l]) => '<button data-trs="mode" data-v="' + k + '" class="' + (S.mode === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
    if (S.mode === 's') {
      if (!ss.some(x => x.id === S.a)) S.a = ss[0].id;
      if (!ss.some(x => x.id === S.b) || S.b === S.a) S.b = (ss.find(x => x.id !== S.a) || ss[1]).id;
      const opt = id => ss.map(x => '<option value="' + E(x.id) + '"' + (x.id === id ? ' selected' : '') + '>' + dShort(x.date) + ' · ' + E(x.name) + '</option>').join('');
      h += '<label class="tr-l">Trening A</label><select data-trs="a" class="tr-sel">' + opt(S.a) + '</select><label class="tr-l">Trening B</label><select data-trs="b" class="tr-sel">' + opt(S.b) + '</select>';
      const A = ss.find(x => x.id === S.a), B = ss.find(x => x.id === S.b);
      h += cmpTable(agg([A]), agg([B]), dShort(A.date), dShort(B.date));
    } else {
      h += '<div class="chips tr-chips">' + [['month', 'Mjesec'], ['30', '30 dana'], ['year', 'Godina']].map(([k, l]) => '<button class="chip ' + (S.per === k ? 'on' : '') + '" data-trs="per" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
      const [pa, pb] = periods(S.per), inr = p => ss.filter(s => { const t = new Date(s.date); return t >= p[1] && t < p[2]; });
      h += cmpTable(agg(inr(pa)), agg(inr(pb)), pa[0], pb[0]);
    }
    return h + '<p class="note">Razlika je A u odnosu na B (▲ više, ▼ manje).</p>';
  }

  /* ---------- događaji ---------- */
  function bind(v) {
    v.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => {
      const a = b.dataset.tr, id = b.dataset.id;
      if (a === 'open') Gym.open(); else if (a === 'empty') Gym.startEmpty(); else if (a === 'startrt') Gym.startRt(id);
      else if (a === 'newrt') Gym.newRt(); else if (a === 'editrt') Gym.editRt(id);
      else if (a === 'sess' && DB.activities[id]) openView(DB.activities[id]);
    });
    v.querySelectorAll('.tbl tr[data-id]').forEach(r => r.onclick = () => { const a = DB.activities[r.dataset.id]; if (a) openView(a); });
    v.querySelectorAll('[data-trs]').forEach(el => {
      const set = () => { const k = el.dataset.trs, val = el.dataset.v !== undefined ? el.dataset.v : el.value; S[k] = val; render(); };
      if (el.tagName === 'SELECT') el.onchange = set; else el.onclick = set;
    });
  }
  return { viewGym, viewProg, viewCmp, bind };
})();
