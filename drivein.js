/* Uvoz s Google Drivea: jedna mapa u koju ubacuješ Stravin ZIP i/ili FIT/GPX/TCX vožnje.
   Za čitanje tuđih datoteka treba dozvola drive.readonly (zasebna prijava); čita se samo ta jedna mapa. */
const DriveIn = (() => {
  const SC = 'https://www.googleapis.com/auth/drive.readonly';
  let tok = null, exp = 0, cli = null, busy = false;
  try { const t = JSON.parse(sessionStorage.getItem('rtok')); if (t && Date.now() < t.exp - 60000) { tok = t.tok; exp = t.exp; } } catch (_) {}
  const cfg = () => (DB.settings && DB.settings.driveImp) || null;

  function token(interactive) {
    return new Promise((res, rej) => {
      if (tok && Date.now() < exp - 60000) return res(tok);
      if (!window.google || !google.accounts) return rej(new Error('Google skripta nije učitana (nema interneta?).'));
      if (!cli || cli._cid !== clientId()) { cli = google.accounts.oauth2.initTokenClient({ client_id: clientId(), scope: SC, callback: () => {} }); cli._cid = clientId(); }
      cli.callback = r => {
        if (r.error) return rej(new Error(r.error_description || r.error));
        tok = r.access_token; exp = Date.now() + (r.expires_in || 3600) * 1000;
        try { sessionStorage.setItem('rtok', JSON.stringify({ tok, exp })); } catch (_) {}
        res(tok);
      };
      cli.error_callback = e => rej(new Error(e.type === 'popup_closed' ? 'Prijava prekinuta.' : (e.message || e.type || 'Prijava nije uspjela.')));
      cli.requestAccessToken({ prompt: interactive ? '' : 'none' });
    });
  }
  async function gf(path, asBlob) {
    const r = await fetch('https://www.googleapis.com/' + path, { headers: { Authorization: 'Bearer ' + tok } });
    if (r.status === 401) { tok = null; try { sessionStorage.removeItem('rtok'); } catch (_) {} throw new Error('Prijava je istekla, pokušaj ponovno.'); }
    if (!r.ok) throw new Error('Drive ' + r.status + ': ' + (await r.text()).slice(0, 160));
    return asBlob ? r.blob() : r.json();
  }
  async function resolveFolder(input) {
    input = String(input || '').trim(); if (!input) throw new Error('Upiši poveznicu ili naziv mape.');
    let id = (input.match(/folders\/([\w-]+)/) || input.match(/[?&]id=([\w-]+)/) || [])[1] || (/^[\w-]{20,}$/.test(input) ? input : null);
    if (!id) {
      const q = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and name='" + input.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "' and trashed=false");
      const r = await gf('drive/v3/files?q=' + q + '&fields=files(id,name)&pageSize=5');
      if (!r.files.length) throw new Error('Mapa „' + input + '“ nije nađena. Zalijepi njezinu poveznicu.');
      id = r.files[0].id;
    }
    const m = await gf('drive/v3/files/' + id + '?fields=id,name,mimeType');
    if (m.mimeType !== 'application/vnd.google-apps.folder') throw new Error('To nije mapa.');
    return { id: m.id, name: m.name };
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
      await token(interactive);
      const seen = META.driveSeen = META.driveSeen || {};
      if (force) for (const k of Object.keys(seen)) delete seen[k];
      const fresh = (await list(c.id)).filter(f => seen[f.id] !== f.modifiedTime);
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
  function auto(interactive) { if (!cfg() || !clientId()) return; if (!interactive && !(tok && Date.now() < exp - 60000)) return; run(!!interactive).then(r => { if (r && r.n) toast('Drive mapa: uvezeno datoteka ' + r.n + '.', 3500); renderCardSoon(); }).catch(() => {}); }
  const renderCardSoon = () => { if (UI.view === 'settings') render(); };

  function card() {
    if (!clientId()) return '';
    const c = cfg(), last = META.driveLast ? new Date(META.driveLast).toLocaleString('hr') : null;
    return '<div class="card"><h3>Uvoz s Drivea (mapa)</h3><p style="margin:0 0 10px">U jednu mapu na Driveu ubaci Stravin ZIP i/ili FIT/GPX/TCX vožnje (npr. izvezene iz iGPSPORT-a). Aplikacija čita samo tu mapu i uveze ono što još nije uvezeno. Treba dodatnu dozvolu za čitanje Drivea (Google će pri prvoj prijavi upozoriti).</p>' +
      (c ? '<p style="margin:0 0 10px"><b>Mapa:</b> ' + esc(c.name) + (last ? '<br><span class="sub">zadnji pregled: ' + esc(last) + '</span>' : '') + '</p><div class="row" style="flex-wrap:wrap"><button class="btn pri" data-di="run">Uvezi sada</button><button class="btn" data-di="again">Ponovi uvoz svega</button><button class="btn" data-di="off">Ukloni mapu</button></div>'
        : '<label>Poveznica ili naziv mape</label><input id="diIn" placeholder="https://drive.google.com/drive/folders/… ili naziv" autocomplete="off"><div class="row" style="margin-top:8px"><button class="btn pri" data-di="set">Spremi mapu i uvezi</button></div>') + '</div>';
  }
  function bind(root) {
    root.querySelectorAll('[data-di]').forEach(b => b.onclick = async () => {
      const a = b.dataset.di;
      try {
        if (a === 'set') {
          await token(true);
          const f = await resolveFolder(($('#diIn') || {}).value);
          DB.settings = Object.assign({}, DB.settings, { updated: Date.now(), driveImp: f }); await persist(); render();
          const r = await run(true); render(); toast(r && r.n ? 'Uvezeno datoteka: ' + r.n : 'Mapa spremljena, nema novih datoteka.', 3500);
        } else if (a === 'run' || a === 'again') {
          if (a === 'again' && !confirm('Ponovno proći sve datoteke u mapi? Već uvezene se preskaču.')) return;
          const r = await run(true, a === 'again'); render(); if (r && !r.n) toast('Nema novih datoteka u mapi.');
        } else if (a === 'off') {
          const s = Object.assign({}, DB.settings, { updated: Date.now() }); delete s.driveImp; DB.settings = s; META.driveSeen = {}; await persist(); render();
        }
      } catch (e) { prog.close(); toast('Drive mapa: ' + (e.message || e), 6000); }
    });
  }
  return { card, bind, auto, run };
})();
