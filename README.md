# Trening – osobna evidencija treninga

Web aplikacija (PWA) za pregled vlastitih treninga, neovisna o Stravi. Treninge uvoziš iz Stravinog exporta, a podaci se čuvaju na tvom Google Driveu. Radi na iPhoneu i Androidu, instalira se na početni zaslon i otvara se i bez interneta.

Aplikacija je zamišljena kao **pregled**: uređivanje ostaje na Stravi, a ovdje se samo uvozi i gleda.

## Mogućnosti

- **Kalendar** (prvi tab): mjesečni i tjedni prikaz u stilu intervals.icu. Svaki trening je blok u boji sporta (bicikl s km i vremenom, ostalo s trajanjem). Ispod su legenda boja i zbroj mjeseca ili tjedna, ukupno i po sportu.
- **Zone pulsa i brzine:** granice zona 2–5 upisuješ u Postavkama. Puls je zajednički za sve sportove (zadano kao na iGPSPORT-u: 114/133/152/171 bpm). Brzina ima zasebne zone za bicikl (18/25/30/35 km/h) i za hodanje i planinarenje (3/4,5/5,5/6,5 km/h). Ostali sportovi imaju samo zone pulsa. U detalju treninga s GPS-om vidiš vrijeme i postotak po zonama, uz kratku ocjenu intenziteta. Stajanje se ne računa.
- **Ruta obojena po zonama:** ispod karte u detalju prekidač *Jednobojno / Puls / Brzina* boji putanju bojom zone na svakoj dionici, uz legendu.
- **Karta** (tab): sve rute na jednoj karti kao heat map. Linije su prozirne, pa se češće vožene dionice vide jače. Vožnje i commute imaju različite boje i svaki se uključuje i isključuje posebno. Prikazuje se samo bicikl. Filter po godini, jačina linija (tanko, srednje, jako) i siva podloga za bolji kontrast.
- **Pregled**: tjedan, mjesec, godina i sve. Brojke su u jednom okviru, a ispod su redovi s trakama (tjedan: po danima, mjesec: po tjednima, godina: po mjesecima, sve: po godinama) s vrijednošću i brojem treninga. Na vrhu je tražilica: pretražuje sve treninge po nazivu, opisu, bilješci i oznaci, a popis treninga u razdoblju može se proširiti na sve.

- **Računalo:** na širokom zaslonu (od oko 1000 px) navigacija ide u zaglavlje, a Kalendar, Tablica i Karta koriste cijelu širinu. U mjesečnom kalendaru svaki trening pokazuje naziv, km, vrijeme, brzinu, puls i uspon, a desni stupac je zbroj tjedna (km, vrijeme, broj treninga, uspon). Na mobitelu je prikaz kompaktan kao prije.
- **Tablica** (tab): tablični prikaz treninga kao na intervals.icu. Gore su tabovi koje sam složiš: dodirni *Uredi* pa za svaki tab biraš naziv, sport, koje stupce vidiš (datum, naziv, sport, km, vrijeme, km/h, tempo, uspon, puls, max puls, snaga, kcal, oprema, oznake, commute, ruta) i njihov redoslijed. Zadani su tabovi *Bicikl* i *Sve* (s više stupaca, a mogu se mijenjati u Uredi). Na tabovima kojima je sport bicikl iznad tablice su tipke *Svi / Bez commutea / Samo commute* (pamte se po tabu). Dodirom na naslov stupca sortiraš, redak ispod zaglavlja je zbroj ili prosjek, a dodir na redak otvara trening. Tabovi se spremaju na Drive pa su isti na svim uređajima.
- **Rekordi:** na dnu Pregleda, sitnim fontom u kompaktnom popisu (najduža vožnja, najbolji tjedan i slično). Dodir na rekord otvara trening.
- **Tema:** u Postavkama biraš *Kao uređaj*, *Svijetla* ili *Tamna*. Vrijedi samo na uređaju na kojem je postavljeno.
- **Detalj treninga**: podaci, opis, oznake (Commute, Oporavak, S psom, S djetetom, Utrka, Dugi trening), karta rute (OpenStreetMap) i grafovi visine, brzine, pulsa i snage. Povlačenjem prsta po grafu pomiče se točka na karti.
- **Podijeli sliku:** pet stilova (karta + podaci, preko cijele karte, samo ruta, prozirno za story, karta + foto), tri formata (objava 4:5, story 9:16, kvadrat), svijetla ili tamna tema, podloga karte šarena ili siva (zadano siva). Ruta na slici je uvijek jednobojna. U stilu *Karta + foto* biraš fotku iz galerije i stranu (lijevo ili desno): karta je gore, a dolje su fotka i podaci. Fotka se ne sprema, samo ulazi u sliku. U stilu *Prozirno (story)* biraš položaj rute (lijevo, sredina, desno) i možeš staviti fotku iza rute; bez fotke je pozadina prozirna. Podaci se mogu prikazati kao *Popis* (Udaljenost ........ 35,4 km, Prosječna brzina ........ 25 km/h, Vrijeme, Uspon, Prosječni puls; zadano) ili kao *Brojke* (četiri velike brojke). U svim stilovima možeš upisati *posvetu / poruku* (do 3 retka, veliki font pri dnu slike), koja se ne sprema. Početak i kraj rute (200 m) po zadanom su skriveni radi privatnosti.
- **Boje sportova:** u Postavkama za svaki sport u evidenciji biraš boju (kalendar, popisi, grafovi). *Zadano* vraća prvotnu boju.
- **Prikaz po sportu:** u Postavkama biraš sport (ili *Svi sportovi*, zadano za sve koje nisi posebno namjestio). Za *Pregled* biraš koje kartice se vide kad je taj sport odabran u filtru: broj treninga, ukupno vrijeme, kilometri, uspon, prosječna brzina, prosječni tempo, prosječni puls, kalorije. Biraš i s kojim se grafom Pregled otvara (kilometri, sati ili treninzi). Za *Kad otvorim trening* biraš koje brojke se vide na vrhu (udaljenost, vrijeme, brzina, tempo, uspon, puls, temperatura), koji dijelovi (karta, graf, zone, opis i bilješka), na kojem se grafu detalj otvara i po čemu je ruta obojena.
- **Graf tempa:** u detalju treninga s GPS-om, uz visinu, brzinu, puls i snagu, postoji graf tempa (min/km). Brži dio je gore, a stajanje se ne računa. Povlačenjem po grafu vidiš točku na karti.
- **Filteri** po sportu i oznaci (Commute, Bez commutea) u kalendaru, pregledu i popisu.
- **Sinkronizacija s Google Driveom**: Drive je izvor istine, a lokalna kopija u pregledniku samo predmemorija. Promjena mobitela ne gubi ništa.
- **Zaključano po zadanom**: nema dodavanja, uređivanja ni brisanja. Otključava se u Postavke → *Uređivanje* (postavka vrijedi po uređaju).
- Izvoz backupa (JSON) i CSV-a, vraćanje iz backupa.

## Izgled

Tehnički, ravan izgled: oštri rubovi (bez zaobljenja), tanke crne i sive linije, brojke u monospace fontu. Mijenja se na jednom mjestu, u `index.html`:
- **Boje i font:** `:root` na početku stilova (`--bg`, `--card`, `--ink`, `--mute`, `--line`, `--accent`, `--mono`). Tamna tema je isti popis ispod `prefers-color-scheme: dark`.
- **Zaobljenost:** `--radius` je 0. Ako želiš malo zaobljenje, upiši npr. `2px` i u pravilima `border-radius:0` zamijeni po želji.
- **Izgled komponenti:** blok *Tehnički izgled* pri kraju stilova nadjačava osnovna pravila (tipke, kartice, tablica, navigacija).
- **Slika za dijeljenje:** font i veličine su u `share.js` (`FONT`, `MONO`).

## Datoteke

| Datoteka | Namjena |
|---|---|
| `index.html` | Aplikacija: sučelje, lokalna baza, Drive sinkronizacija |
| `core.js` | Logika: CSV uvoz, spajanje podataka, statistika |
| `files.js` | Čitanje ZIP, FIT, GPX i TCX datoteka (i `.gz`) |
| `trackview.js` | Karta rute i grafovi |
| `share.js` | Slika za dijeljenje |
| `analytics.js` | Zone pulsa i brzine |
| `config.js` | **Tvoj Google Client ID** (vidi dolje) |
| `config.example.js` | Predložak za `config.js`; aplikacija ga ne učitava |
| `sw.js` | Service worker (rad bez interneta, osvježavanje verzija) |
| `manifest.webmanifest`, `icon.svg` | Instalacija na početni zaslon |

Nema build koraka ni vanjskih biblioteka. Datoteke se samo stave na hosting.

## Postavljanje

### 1. GitHub Pages
1. Stavi sve datoteke u korijen repozitorija.
2. Settings → Pages → *Deploy from branch* → `main`, mapa `/ (root)`.
3. Stranica je dostupna na `https://TVOJE-IME.github.io/NAZIV-REPOZITORIJA/` (ili `https://TVOJE-IME.github.io/` ako se repozitorij zove `TVOJE-IME.github.io`).

### 2. Google Client ID (za sinkronizaciju s Driveom)
1. U [Google Cloud Consoleu](https://console.cloud.google.com/) napravi projekt i uključi **Google Drive API**.
2. Postavi *OAuth consent screen* (vanjski/External). Dok je aplikacija u načinu *Testing*, dodaj svoj Google račun u **Test users**, inače prijava ne radi.
3. Credentials → *Create credentials* → *OAuth client ID* → tip **Web application**.
4. U *Authorized JavaScript origins* upiši samo adresu bez putanje: `https://TVOJE-IME.github.io`.
5. Kopiraj cijeli Client ID (završava na `.apps.googleusercontent.com`).
6. Kopiraj `config.example.js` u `config.js` i upiši ID:
   ```js
   window.TRENING_CONFIG = { googleClientId: '123456789012-abc....apps.googleusercontent.com' };
   ```
   ID nije tajna, pa može biti u javnom repozitoriju. Pri ažuriranju aplikacije **nemoj prepisati `config.js`** praznom verzijom.

Aplikacija traži samo pristup datotekama koje je sama napravila (`drive.file`), pa ne vidi ostatak tvog Drivea.

### 3. Instalacija na mobitel
- iPhone: Safari → Podijeli → *Dodaj na početni zaslon*.
- Android: Chrome → *Instaliraj aplikaciju*.

## Uvoz podataka

1. U Stravi: Postavke → *Moj račun* → *Preuzmi ili izbriši svoj račun* → zatraži export. Preuzmi ZIP (jezik Strave mora biti engleski, zbog naziva stupaca).
2. U aplikaciji: Postavke → *Uvezi Strava ZIP ili CSV* → odaberi cijeli ZIP (ne treba ga raspakirati). Aplikacija pročita treninge, opise, oznake i sve `.gpx` / `.fit.gz` rute.
3. Dodirni sinkronizaciju da podaci odu na Drive.

Uvoz je siguran za ponavljanje: možeš svaki put uvesti cijeli novi export.
- Novi treninzi i rute se dodaju, postojeći se prepoznaju po Strava ID-u i ne dupliciraju.
- Ručno uneseno (bilješke, oznake, izmjene) se ne prepisuje; dopunjuje se samo ono što treningu nedostaje.
- Obrisani treninzi se ne vraćaju.
- Izmjene koje si naknadno napravio na Stravi (npr. novi naziv starog treninga) ne preuzimaju se za postojeće treninge.

Dodatno: *Dodaj GPS datoteke* (pojedinačni `.gpx`, `.fit`, `.tcx`, i `.gz`) veže datoteku na trening po imenu ili vremenu početka.

## Kako radi sinkronizacija

- Na Driveu nastaju dvije datoteke: `trening-evidencija.json` (treninzi) i `trening-tragovi.json` (rute i grafovi, oko 2 MB za ~200 ruta).
- Treninzi se spajaju po aktivnosti (novija izmjena pobjeđuje), rute po ID-u treninga.
- Na novom mobitelu otvoriš stranicu, prijaviš se, dodirneš sinkronizaciju i sve se vrati.
- Promjene bez interneta čekaju prvu sinkronizaciju.

## Podaci i privatnost

- Podaci su samo u tvom pregledniku i na tvom Google Driveu. Nema vlastitog poslužitelja.
- Pločice karte učitavaju se s OpenStreetMapa, pa taj poslužitelj vidi koji dio karte gledaš.
- Backup (JSON) izvezi povremeno: Postavke → *Izvezi backup*.

## Ograničenja

- Raspakiravanje koristi ugrađenu podršku preglednika (iOS 16.4+, aktualni Chrome i Firefox). ZIP veći od 4 GB (ZIP64) nije podržan; u tom slučaju raspakiraj ga i uvezi `activities.csv` i datoteke iz mape `activities` zasebno.
- Uspon izračunat iz GPS datoteke je procjena i može odstupati od Stravinog; treninzi iz CSV-a zadržavaju Stravine vrijednosti.
- Fotografije iz Stravinog exporta (mapa `media`) se ne uvoze.
- Bez interneta karta nema podlogu (vidi se samo ruta), grafovi rade normalno.
- Zone ovise o podacima u GPS datotekama (puls, brzina). Pace (min/km) se računa iz trajanja i udaljenosti; vožnje samo iz CSV-a nemaju zone.
- Sportovi osim bicikla, snage, nogometa i hodanja/planinarenja imaju zajedničku boju („ostalo“).

## Rješavanje problema

| Problem | Što napraviti |
|---|---|
| *Client not found* / *Error 401: invalid_client* | Client ID je pogrešno prepisan ili nepotpun. U Postavkama se vidi koji ID app koristi i je li ispravnog oblika. Provjeri `config.js` na GitHubu. |
| Google traži odobrenje, a račun nije dopušten | Dodaj svoj račun u *Test users* na OAuth consent screenu. |
| *redirect_uri_mismatch* / *origin_mismatch* | U *Authorized JavaScript origins* mora biti točno `https://TVOJE-IME.github.io`, bez završne kose crte i putanje. |
| Nakon ažuriranja vidim staru verziju | Zatvori aplikaciju potpuno i otvori je ponovno (service worker osvježava verziju pri sljedećem otvaranju). |
| Client ID nestao nakon ažuriranja | Prepisao se `config.js`. Upiši ID ponovno i ubuduće ne prepisuj tu datoteku. |
| Crvena kućica s greškom *window.ethereum…* ili *Script error.* | Dolazi iz kripto-novčanika ili ekstenzije u pregledniku, ne iz aplikacije. Aplikacija takve greške više ne prikazuje. |
| Ruta se ne vidi na novom mobitelu | Dodirni sinkronizaciju; rute se preuzimaju s Drivea. |

## Format podataka (kratko)

`trening-evidencija.json` je objekt `{ activities: { <id>: {...} }, deleted: { <id>: <vrijeme> } }`. Svaki trening ima polja kao `id`, `date` (ISO, UTC), `name`, `type`, `dist` (km), `moving` i `elapsed` (sekunde), `avgSpeed`, `elev`, `avgHr`, `cal`, `commute`, `flags`, `desc`, `notes`, `tags`, `hasTrack`, `updated` (vrijeme zadnje izmjene, po njemu se spaja). Ruta se čuva u `trening-tragovi.json` pod ID-em treninga, kao kodirana polilinija s nizovima udaljenosti, visine, brzine, pulsa i snage.

## Razvoj

Čisti HTML i JavaScript bez build koraka. Lokalno pokretanje: u mapi projekta `python3 -m http.server 8000` pa `http://localhost:8000` (service worker i prijava preko Googlea traže `https` ili `localhost`; za Google prijavu `http://localhost:8000` treba dodati u *Authorized JavaScript origins*). Kod u `core.js` i `files.js` ne ovisi o sučelju.

## Screenshot

Tipka s okvirom za snimanje u zaglavlju, pored Drive sinkronizacije, napravi PNG slike cijelog otvorenog prikaza (cijela stranica, ne samo vidljivi dio): kalendar, tablica, karta, pregled ili postavke. Kad je otvoren detalj treninga, ima vlastitu tipku *Screenshot* koja snimi cijeli detalj. Na telefonu se otvara izbornik za dijeljenje (npr. *Spremi sliku*), a na računalu se datoteka preuzima. Za to se koristi biblioteka `html2canvas.min.js` (MIT licenca) koja mora biti uz ostale datoteke; učitava se tek kad prvi put pritisneš tipku.

## Izvoz za analizu (JSON)

U Postavkama, *Izvezi za analizu (JSON)*: jedna datoteka namijenjena analizi bez dodatnog računanja (npr. da je daš nekom alatu ili AI-ju). Sadrži:

- `meta`: jedinice, opis svakog polja i granice zona koje trenutno koristiš.
- `totals`: već zbrojeno po sportu, po godini i po mjesecu (broj treninga, km, vrijeme, uspon, kalorije), a godina i mjesec imaju i razradu po sportovima.
- `activities`: svaki trening s lokalnim datumom i satom, danom u tjednu i ISO tjednom, tempom (za hodanje i trčanje), commute oznakom, oznakama, opremom i temperaturom. Za treninge s GPS-om još i sekunde po zonama pulsa i brzine, dionice po 1 km (vrijeme, brzina, tempo, puls, uspon i spust), najvišu brzinu i raspon visina.
- Neobavezno (kvačica): cijeli GPS trag kao obični nizovi (`lat`, `lon`, `t_s`, `dist_m`, `ele_m`, `speed_kmh`, `hr_bpm`, `power_w`). Datoteka je tada puno veća.

Obični backup (*Izvezi backup*) služi za vraćanje podataka u aplikaciju (vidi dolje).

## Backup (vjeran Stravinom izvozu)

*Izvezi backup* sprema jednu JSON datoteku sa svime što aplikacija zna: sve treninge, **cijeli redak iz Stravinog `activities.csv`** za svaki trening (polje `raw`, svi neprazni stupci), vlastite izmjene (opisi, bilješke, oznake), opremu, postavke (zone, boje, tablice…), popis namjerno obrisanih treninga i **sve rute** (GPS tragovi). *Vrati iz backupa* (uvoz JSON-a) vraća treninge i rute koje na uređaju još nema, a postojeće ne prepisuje.

Ograničenja: rute su spremljene sa smanjenim brojem točaka (najviše 600 po treningu), a ne kao izvorni FIT/GPX, a pulsni i snage nizovi su usrednjeni. Izvorne datoteke ostaju samo u Stravinom ZIP izvozu, pa ZIP čuvaj kao i do sada. Polje `raw` postoji za nove uvoze; za treninge koje si već uvezao dopuni se kad ponovno uvezeš isti Strava ZIP (ništa se ne dupla).



## Snaga: bilježenje treninga (zamjena za Hevy)
Gumb s bučicom u zaglavlju (uvijek dostupan, i kad je uređivanje zaključano). Tijekom treninga gumb prikazuje sat, a kad zatvoriš prozor ("Minimiziraj") pri dnu se pojavi traka sa satom i odmorom; dodir je vraća.
- **Vježbe** dolaze iz tvojih starih treninga: čitaju se opisi "Logged with hevyapp.com" na Weight Training aktivnostima. Novu vježbu upišeš u pretragu i dodaš.
- **Setovi**: kg × ponavljanja, ✓ označava gotov set i pokreće **odmor** (60/90/120/180 s, ±15 s, zvuk + vibracija na kraju). Stupac "Prethodno" je zadnji put; dodir ga upisuje.
- **Rutine**: "Spremi kao rutinu" (ili kvačica pri završetku); pokretanje rutine puni vježbe i zadnje vrijednosti. Spremaju se u postavke i sinkroniziraju na Drive.
- **Završi** sprema samo označene setove kao običan Weight Training zapis (trajanje, ukupno kg, setovi, ponavljanja, opis u Hevy formatu), pa ulazi u sve preglede i izvoze.
- Nedovršeni trening preživi osvježavanje stranice (lokalno na uređaju). Ekran ostaje budan dok traje trening (gdje preglednik to podržava).

## Rutine i vrijeme odmora
Na početnom ekranu loggera "+ Nova rutina": upišeš naziv, dodaš vježbe (iz povijesti ili nove), po vježbi biraš broj setova i **odmor** (30, 45, 60 … 240 s; "zadano" koristi opći odmor), vježbe pomičeš ↑ ↓. Rutinu uređuješ tipkom ✎. Opći odmor (30/45/60/90/120/180 s) biraš na traci odmora, a tijekom treninga odmor se može promijeniti i po vježbi.

## Podsjetnik za Stravin izvoz
U Postavkama, na vrhu kartice "Podaci", pojavi se obavijest s poveznicom na Stravin izvoz kad prođe zadani broj dana (3/7/14/30) od zadnjeg uvoza. Niže je kartica za uključivanje i razmak. Ništa se ne prikazuje na glavnim ekranima, a uvoz (i iz Drive mape) odmah resetira brojač.

## Drive mapa „Trening aktivnosti“ (uvoz + spremanje)
Postavke → "Uvoz s Drivea (mapa)" → "Napravi mapu". Aplikacija sama napravi mapu „Trening aktivnosti“ (ili iskoristi postojeću s istim nazivom) i u nju premjesti/sprema svoje dvije datoteke (`trening-evidencija.json`, `trening-tragovi.json`). U tu istu mapu ti ubacuješ zadnji Stravin ZIP (ili activities.csv) i FIT/GPX/TCX vožnje (npr. iz iGPSPORT-a). Pri otvaranju i nakon sinkronizacije aplikacija pogleda mapu (bez podmapa) i uveze što još nije uvezeno; "Uvezi sada" pokreće ručno, "Ponovi uvoz svega" prolazi sve ponovno.
- Dozvole: `drive.file` (piše samo u datoteke koje je sama napravila) + `drive.readonly` (čita tvoje ubačene datoteke). U Google Cloud konzoli: OAuth consent screen → Data Access, dodaj scope `.../auth/drive.readonly`; u "Testing" načinu tvoj račun mora biti testni korisnik. Google pri prijavi upozori da aplikacija nije verificirana, što je za osobnu uporabu normalno. `access_denied` je gotovo uvijek ova postavka.
- "Ukloni mapu" vraća aplikaciju na uži `drive.file`; mapa i datoteke ostaju na Driveu.
- Vožnja koja je prvo stigla kao FIT/GPX, pa poslije dođe u Stravinom izvozu (početak do 10 min razlike), spaja se u jedan zapis (Stravin naziv, opis i oznake + tvoja ruta), bez duplikata.
- Uspješno pregledane datoteke pamte se na uređaju.

## Uređivanje iz detalja
U detalju treninga tipka "Uredi" otvara uređivanje čak i kad je uređivanje zaključano u Postavkama (zaključavanje samo skriva "+ Novi" i uređivanje iz popisa).

Napomena (mapa): aplikacija prepoznaje vlastitu mapu po oznaci; ako već postoji tvoja mapa istog naziva, napravi novu „Trening aktivnosti (aplikacija)“, jer u tuđu mapu ne smije pisati. Ako premještanje ne uspije, razlog piše u kartici "Uvoz s Drivea" (Postavke); "Ponovno postavi mapu" pokušava ispočetka.

Podmape: uz "Napravi mapu" aplikacija pravi i podmape „Strava export“ (za Stravin ZIP) i „Aktivnosti“ (za FIT/GPX/TCX bilo kojeg sporta; ranije napravljena podmapa „Vožnje“ i dalje se čita). Čita se glavna mapa i njezine izravne podmape (jedna razina); dublje se ne ide. Ako vožnju uvezeš iz FIT-a i Stravinog izvoza, prepoznaje se po početku (do 10 min razlike) i ne dupla se, bez obzira na to što je stiglo prvo.
