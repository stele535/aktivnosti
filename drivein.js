/* Uvoz s Google Drivea: jedna mapa u koju ubacuješ Stravin ZIP i/ili FIT/GPX/TCX vožnje.
   Za čitanje tuđih datoteka treba dozvola drive.readonly (zasebna prijava); čita se samo ta jedna mapa. */
const DriveIn = (() => {
  let busy = false;
  const cfg = () => (DB.settings && DB.settings.driveImp) || null;

  async function gf(path, asBlob) {
    const r = await fetch('https://www.googleapis.com/' + path, { headers: { Authorization: 'Bearer ' + token } });
    if (r.status === 401) { throw new Error('Prijava je istekla, pokušaj ponovno.'); }
    if (!r.ok) throw new Error('Drive ' + r.status + ': ' + (await r.text()).slice(0, 160));
    return asBlob ? r.blob() : r.json();
  }
  const FOLDER = 'Trening aktivnosti', SUB1 = 'Strava export', SUB2 = 'Aktivnosti', SUB2_OLD = 'Vožnje';
  async function makeFolder() {
    const find = q => gf('drive/v3/files?q=' + encodeURIComponent(q + " and mimeType='application/vnd.google-apps.folder' and trashed=false") + '&fields=files(id,name)&pageSize=5');
    const mine = await find("appProperties has { key='trening' and value='1' }");
    if (mine.files.length) return mine.files[0];
    // postoji li već tuđa (tvoja) mapa istog naziva? U nju aplikacija ne smije pisati, pa pravimo vlastitu
    const same = await find("name='" + FOLDER + "'");
    const c = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: same.files.length ? FOLDER + ' (aplikacija)' : FOLDER, mimeType: 'application/vnd.google-apps.folder', appProperties: { trening: '1' } }) });
    if (!c.ok) throw new Error('Drive ' + c.status + ': ' + (await c.text()).slice(0, 160));
    return c.json();
  }
  async function ensureSub(parent, name, alt) {
    const q = encodeURIComponent("'" + parent + "' in parents and (name='" + name + "'" + (alt ? " or name='" + alt + "'" : '') + ") and mimeType='application/vnd.google-apps.folder' and trashed=false");
    const r = await gf('drive/v3/files?q=' + q + '&fields=files(id)&pageSize=1');
    if (r.files.length) return r.files[0].id;
    const c = await fetch('https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent], appProperties: { trening: '1' } }) });
    if (!c.ok) throw new Error('Drive ' + c.status + ': ' + (await c.text()).slice(0, 160));
    return (await c.json()).id;
  }
  async function subfolders(id) {
    const q = encodeURIComponent("'" + id + "' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false");
    return (await gf('drive/v3/files?q=' + q + '&fields=files(id,name)&pageSize=100')).files;
  }
  async function listAll(id) { // mapa + njezine izravne podmape (jedna razina)
    let out = await list(id);
    for (const f of await subfolders(id)) out = out.concat(await list(f.id));
    return out.filter((f, i, a) => a.findIndex(x => x.id === f.id) === i);
  }
  async function list(id) {
    let out = [], pt = '';
    do {
      const q = encodeURIComponent("'" + id + "' in parents and trashed=false and mimeType!='application/vnd.google-apps.folder'");
      const r = await gf('drive/v3/files?q=' + q + '&fields=nextPageToken,files(id,name,modifiedTime)&pageSize=200&orderBy=modifiedTime' + (pt ? '&pageToken=' + pt : ''));
      out = out.concat(r.files); pt = r.nextPageToken || '';
    } while (pt);
    return out;
  }
  const dl = async f => new File([await gf('drive/v3/files/' + f.id + '?alt=media', true)], f.name, { lastModified: Date.parse(f.modifiedTime) || Date.now() });

  async function run(interactive, force) {
    const c = cfg(); if (!c || busy || !clientId()) return null;
    busy = true;
    try {
      await getToken(interactive);
      try { await ensureSub(c.id, SUB1); await ensureSub(c.id, SUB2, SUB2_OLD); } catch (_) {}
      const seen = META.driveSeen = META.driveSeen || {};
      if (force) for (const k of Object.keys(seen)) delete seen[k];
      const fresh = (await listAll(c.id)).filter(f => seen[f.id] !== f.modifiedTime);
      const zips = fresh.filter(f => /\.(zip|csv)$/i.test(f.name)), gps = fresh.filter(f => /\.(fit|gpx|tcx)(\.gz)?$/i.test(f.name));
      for (const z of zips) {
        prog.open('Preuzimam ' + z.name + '…'); const f = await dl(z); prog.close();
        const d = $('#dlg'); if (d.open) d.close();
        await importExport(f); seen[z.id] = z.modifiedTime; await persist(false);
      }
      if (gps.length) {
        const files = [];
        for (let i = 0; i < gps.length; i++) { prog.open('Preuzimam vožnje…'); prog.set('Preuzimam vožnje: ' + (i + 1) + ' od ' + gps.length, i, gps.length); files.push(await dl(gps[i])); }
        prog.close();
        const d = $('#dlg'); if (d.open) d.close();
        await importGpsFiles(files);
        for (const g of gps) seen[g.id] = g.modifiedTime;
      }
      META.driveLast = Date.now(); await persist(false);
      return { n: zips.length + gps.length };
    } finally { busy = false; prog.close(); }
  }
  // tihi pokušaj (pri otvaranju / nakon sinkronizacije); greške se ne prikazuju
  function auto(interactive) { if (!cfg() || !clientId()) return; if (!interactive && !(token && Date.now() < tokenExp - 60000 && tokSc === SCOPE_DIR)) return; run(!!interactive).then(r => { if (r && r.n) toast('Drive mapa: uvezeno datoteka ' + r.n + '.', 3500); renderCardSoon(); }).catch(() => {}); }
  const renderCardSoon = () => { if (UI.view === 'settings') render(); };

  function card() {
    if (!clientId()) return '';
    const c = cfg(), last = META.driveLast ? new Date(META.driveLast).toLocaleString('hr') : null;
    return '<div class="card"><h3>Uvoz s Drivea (mapa)</h3><p style="margin:0 0 10px">U mapu na Driveu ubaci Stravin ZIP i/ili FIT/GPX/TCX datoteke aktivnosti (bicikl, nogomet, hodanje…). Aplikacija čita samo tu mapu (i njezine podmape) i uveze ono što još nije uvezeno. Aplikacija sama napravi mapu „Trening aktivnosti“ i u nju sprema svoje dvije datoteke (evidencija i rute); ti ubacuješ Stravin ZIP u podmapu „Strava export“, a FIT/GPX/TCX datoteke aktivnosti (bicikl, nogomet, hodanje…) u „Aktivnosti“ (čitaju se i datoteke izravno u glavnoj mapi, ali ne i dublje podmape). Pišeš samo u datoteke koje je aplikacija napravila, a ostalo na Driveu može samo čitati.</p>' +
      (c ? '<p style="margin:0 0 10px"><b>Mapa:</b> ' + esc(c.name) + (last ? '<br><span class="sub">zadnji pregled: ' + esc(last) + '</span>' : '') + (META.homeErr ? '<br><span class="sub" style="color:#c8452f">Premještanje datoteka aplikacije u mapu nije uspjelo: ' + esc(META.homeErr) + '</span>' : (Object.keys(META.homed || {}).length ? '<br><span class="sub">Datoteke aplikacije su u ovoj mapi (' + Object.keys(META.homed).length + ').</span>' : '')) + '</p><div class="row" style="flex-wrap:wrap"><button class="btn pri" data-di="run">Uvezi sada</button><button class="btn" data-di="again">Ponovi uvoz svega</button><button class="btn" data-di="set">Ponovno postavi mapu</button><button class="btn" data-di="off">Ukloni mapu</button></div>'
        : '<div class="row"><button class="btn pri" data-di="set">Napravi mapu „' + FOLDER + '“</button></div>') + '</div>';
  }
  function bind(root) {
    root.querySelectorAll('[data-di]').forEach(b => b.onclick = async () => {
      const a = b.dataset.di;
      try {
        if (a === 'set') {
          META.dirMode = true; META.homed = {}; META.homeErr = ''; await persist(false); await getToken(true);
          const f = await makeFolder();
          await ensureSub(f.id, SUB1); await ensureSub(f.id, SUB2, SUB2_OLD); DB.settings = Object.assign({}, DB.settings, { updated: Date.now(), driveImp: f }); await persist(); render();
          await sync(true); const r = await run(true); render(); toast(r && r.n ? 'Uvezeno datoteka: ' + r.n : 'Mapa spremljena, nema novih datoteka.', 3500);
        } else if (a === 'run' || a === 'again') {
          if (a === 'again' && !confirm('Ponovno proći sve datoteke u mapi? Već uvezene se preskaču.')) return;
          const r = await run(true, a === 'again'); render(); if (r && !r.n) toast('Nema novih datoteka u mapi.');
        } else if (a === 'off') {
          const s = Object.assign({}, DB.settings, { updated: Date.now() }); delete s.driveImp; DB.settings = s; META.driveSeen = {}; META.dirMode = false; await persist(); render();
        }
      } catch (e) { prog.close(); toast('Drive mapa: ' + (e.message || e), 6000); }
    });
  }
  return { card, bind, auto, run };
})();
