# Trening – osobna evidencija treninga

Web aplikacija (PWA) za pregled vlastitih treninga, neovisna o Stravi. Treninge uvoziš iz Stravinog exporta, a podaci se čuvaju na tvom Google Driveu. Radi na iPhoneu i Androidu, instalira se na početni zaslon i otvara se i bez interneta.

Aplikacija je zamišljena kao **pregled**: uređivanje ostaje na Stravi, a ovdje se samo uvozi i gleda.

## Mogućnosti

- **Kalendar** (prvi tab): mjesečni i tjedni prikaz u stilu intervals.icu. Svaki trening je blok u boji sporta (bicikl s km i vremenom, ostalo s trajanjem). Ispod su legenda boja i zbroj mjeseca ili tjedna, ukupno i po sportu.
- **Bicikl** (tab): 
  - **Oprema i servisi:** za svaki bicikl pratiš dijelove i servise (lanac, mali i veliki servis, gume…) s intervalom u km. Aplikacija zbraja kilometre vožnji tog bicikla od datuma postavljanja i pokazuje koliko je ostalo do servisa (traka zelena, žuta pri 85 %, crvena kad kasni). Gumb *Servisirano* vraća brojač na 0 i pamti datum. Zadani razmaci (lanac 3000, mali servis 2000, veliki servis 6000 km) su okvirni i mijenjaju se. Radi i kad je ostatak aplikacije zaključan, a sinkronizira se na Drive.
  - **Kako sam vozio:** zone pulsa (60/70/80/90 % maksimalnog pulsa) i zone brzine, po vožnji u detalju i tjedno za zadnjih 8 tjedana, uz opis intenziteta (lagana, tempo, žestoka). Maksimalni puls se procjenjuje iz podataka ili ga upišeš.
  - **Iste rute:** vožnje s podudarnom putanjom grupiraju se u jednu rutu, a za svaku vidiš graf prosječne brzine kroz vrijeme, najbržu vožnju i trend (prosjek zadnjih vožnji naspram prvih).
- **Pregled**: tjedan, mjesec, godina i sve, s ukupnim brojkama i grafom (kilometri, sati ili broj treninga, s vrijednošću iznad svakog stupca).
- **Treninzi**: popis s pretragom po nazivu, opisu, bilješci i oznaci.
- **Rekordi**: najduža vožnja, najbolji tjedan i slično.
- **Detalj treninga**: podaci, opis, oznake (Commute, Oporavak, S psom, S djetetom, Utrka, Dugi trening), karta rute (OpenStreetMap) i grafovi visine, brzine, pulsa i snage. Povlačenjem prsta po grafu pomiče se točka na karti.
- **Podijeli sliku**: slika 4:5 s kartom rute i ključnim podacima za WhatsApp, Instagram i slično. Početak i kraj rute (200 m) po zadanom su skriveni radi privatnosti.
- **Filteri** po sportu i oznaci (Commute, S rutom, S opisom) u kalendaru, pregledu i popisu.
- **Sinkronizacija s Google Driveom**: Drive je izvor istine, a lokalna kopija u pregledniku samo predmemorija. Promjena mobitela ne gubi ništa.
- **Zaključano po zadanom**: nema dodavanja, uređivanja ni brisanja. Otključava se u Postavke → *Uređivanje* (postavka vrijedi po uređaju).
- Izvoz backupa (JSON) i CSV-a, vraćanje iz backupa.

## Datoteke

| Datoteka | Namjena |
|---|---|
| `index.html` | Aplikacija: sučelje, lokalna baza, Drive sinkronizacija |
| `core.js` | Logika: CSV uvoz, spajanje podataka, statistika |
| `files.js` | Čitanje ZIP, FIT, GPX i TCX datoteka (i `.gz`) |
| `trackview.js` | Karta rute i grafovi |
| `share.js` | Slika za dijeljenje |
| `analytics.js` | Zone pulsa i brzine, prepoznavanje iste rute, stanje servisa |
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
- Zone ovise o podacima u GPS datotekama (puls, brzina); vožnje samo iz CSV-a nemaju zone ni prepoznatu rutu.
- Prepoznavanje rute uspoređuje putanje (duljina do 12 % različita, odstupanje nekoliko desetaka metara); obrnuti smjer se računa kao ista ruta, a rute kraće od 1,5 km se ne grupiraju.
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
