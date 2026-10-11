# Trening – osobna evidencija (PWA)

Web aplikacija za evidenciju treninga uvezenih iz Strave. Podaci su tvoji: lokalna kopija u pregledniku + datoteke na tvom Google Driveu.

## Datoteke
- `index.html` – aplikacija (sučelje, lokalna baza, Drive sinkronizacija)
- `core.js` – logika (CSV uvoz, spajanje, statistika)
- `files.js` – čitanje ZIP, FIT, GPX, TCX (i .gz) datoteka
- `trackview.js` – karta rute i grafovi visine, brzine, pulsa, snage
- `share.js` – slika za dijeljenje (karta rute + ključni podaci)
- `config.js` – **tvoj Google Client ID** (vidi dolje). Ovu datoteku ne prepisuj novim verzijama.
- `sw.js`, `manifest.webmanifest`, `icon.svg` – instalacija na početni zaslon i rad offline

## Postavljanje (jednokratno)
1. Stavi sve datoteke u korijen GitHub repozitorija s uključenim Pages (Settings → Pages → Deploy from branch → main, root).
2. Google Drive sinkronizacija: u Google Cloud Consoleu uključi Drive API, napravi OAuth Client ID tipa *Web application* i u *Authorized JavaScript origins* upiši `https://TVOJE-IME.github.io`.
3. Otvori `config.js` i između navodnika upiši cijeli Client ID (`...apps.googleusercontent.com`). Ako config.js nemaš, kopiraj `config.example.js` u `config.js`.
   (Client ID možeš upisati i u Postavke u aplikaciji, ali tada ga moraš upisati na svakom uređaju.)
4. Na mobitelu: iPhone Safari → Podijeli → *Dodaj na početni zaslon*; Android Chrome → *Instaliraj aplikaciju*.

## Uvoz podataka
- **Strava ZIP** (preporučeno): Postavke → *Uvezi Strava ZIP ili CSV* → odaberi cijeli ZIP kakav si dobio od Strave (ne treba ga raspakirati). Aplikacija pročita treninge, opise, oznake (Commute…) i sve `.gpx` / `.fit.gz` rute. Postojeći treninzi se ne dupliciraju, tvoje bilješke i vlastite oznake se ne diraju; dopunjuju se samo opisi i oznake koje je stara verzija propustila.
- **Samo CSV**: isto, bez ruta.
- **Pojedinačne GPS datoteke**: Postavke → *Dodaj GPS datoteke* (.gpx, .fit, .tcx, i .gz). Datoteka se veže na trening po imenu ili po vremenu početka; ako nema odgovarajućeg treninga, napravi se novi (provjeri sport i naziv).
- **Rutu jednom treningu** dodaš iz njegovih detalja gumbom *Dodaj rutu iz datoteke*.
- Strava export mora biti na engleskom jeziku (nazivi stupaca).

## Što vidiš
- Pregled po tjednu/mjesecu/godini, filteri po sportu i po oznaci (Commute, S rutom, S opisom).
- U popisu: oznake (Commute, Oporavak…), opis aktivnosti i 📍 za treninge s rutom.
- U detalju: karta rute (OpenStreetMap), grafovi visine/brzine/pulsa/snage (povuci prstom po grafu pa se na karti pomiče točka), opis, oznake, bilješke.
- **Podijeli sliku**: u detalju treninga s rutom gumb *Podijeli sliku* napravi sliku 4:5 (karta s rutom, naziv, km, vrijeme, km/h, uspon). *Podijeli* otvara sustavni izbornik (WhatsApp, Instagram, poruke…), *Spremi* sprema PNG. Po zadanom se skriva prvih i zadnjih 200 m rute (da se ne vidi gdje živiš); kvačicu možeš maknuti.
- Rekordi, ručni unos, izvoz backupa (JSON) i CSV.

## Kako radi sinkronizacija
- Na Driveu nastaju dvije datoteke: `trening-evidencija.json` (treninzi) i `trening-tragovi.json` (rute i grafovi, oko 2 MB za ~200 ruta). Aplikacija vidi samo datoteke koje je sama napravila.
- Treninzi se spajaju po aktivnosti (novija izmjena pobjeđuje), rute po ID-u treninga. Izmjene bez interneta čekaju prvu sinkronizaciju.
- Na novom mobitelu otvoriš stranicu, dodirneš sinkronizaciju i sve se vrati s Drivea (uključujući rute).
- Obrisani trening se ne vraća novim uvozom Strave.

## Ograničenja
- Pločice karte dolaze s interneta; bez veze se vidi ruta bez podloge (i na slici za dijeljenje), a grafovi rade normalno.
- Raspakiravanje koristi ugrađenu podršku preglednika (iOS 16.4+, Chrome, Firefox).
- ZIP veći od 4 GB (ZIP64) nije podržan; tada ga raspakiraj i uvezi `activities.csv` i datoteke iz mape `activities` zasebno.
- Uspon računat iz GPS datoteke je procjena (filtrira šum) i može malo odstupati od Stravinog. Treninzi iz CSV-a zadržavaju Stravine vrijednosti.
- Fotografije iz Stravinog exporta (mapa `media`) se ne uvoze.
- Redovito napravi Postavke → *Izvezi backup (JSON)*.
