# Trening – osobna evidencija (PWA)

Mala web aplikacija za evidenciju treninga uvezenih iz Strave. Podaci su tvoji: lokalna kopija u pregledniku + jedna JSON datoteka na tvom Google Driveu.

## Datoteke
- `index.html` – cijela aplikacija (sučelje, lokalna baza, Drive sinkronizacija)
- `core.js` – logika (CSV uvoz, spajanje, statistika)
- `sw.js`, `manifest.webmanifest`, `icon.svg` – za instalaciju na početni zaslon i rad offline

## 1. Isprobaj odmah (samo lokalno)
Ne možeš otvoriti `index.html` dvoklikom na mobitelu, ali na računalu u mapi pokreni:

    python3 -m http.server 8000

pa otvori http://localhost:8000. Uvezi `activities.csv` (Postavke → Uvezi Strava CSV).

## 2. Postavi hosting (da radi na iPhoneu/Androidu)
Najlakše GitHub Pages: napravi repozitorij, uploadaj sve datoteke iz ove mape, uključi Settings → Pages → Deploy from branch (main, root). Dobit ćeš adresu `https://TVOJE-IME.github.io/REPO/`.
(Cloudflare Pages ili Netlify rade jednako.)

## 3. Google Drive sinkronizacija (jednokratno, ~10 min)
1. Otvori https://console.cloud.google.com → novi projekt (npr. "Trening").
2. APIs & Services → Library → uključi **Google Drive API**.
3. APIs & Services → OAuth consent screen → External → upiši naziv aplikacije i svoj email.
   Dodaj sebe kao **Test user**. Scope ne treba posebno dodavati.
4. Credentials → Create credentials → **OAuth client ID** → tip *Web application*.
   U **Authorized JavaScript origins** upiši samo origin svoje stranice, npr. `https://TVOJE-IME.github.io` (bez putanje i bez `/` na kraju). Za lokalno testiranje dodaj i `http://localhost:8000`.
5. Kopiraj Client ID i zalijepi ga u `index.html` u konstantu `GOOGLE_CLIENT_ID` (na vrhu skripte), pa ponovno uploadaj datoteku.
6. Otvori stranicu → dodirni indikator u zaglavlju ("dodirni za Drive") → prijavi se.
   Google će pokazati upozorenje "aplikacija nije verificirana": Napredno → Nastavi (normalno za osobnu aplikaciju u testnom načinu).

Napomena: dok je aplikacija u *Testing* statusu, Google ti ističe prijavu svakih ~7 dana. Ako ti smeta, na consent screenu klikni *Publish app* (za osobnu upotrebu s jednim korisnikom i dalje ne treba verifikacija).

## 4. Instalacija na mobitel
- **iPhone:** Safari → Podijeli → *Dodaj na početni zaslon*.
- **Android:** Chrome → izbornik → *Instaliraj aplikaciju*.
Na novom mobitelu samo otvoriš istu adresu, instaliraš i dodirneš sinkronizaciju. Sve se vrati s Drivea.

## Kako radi sinkronizacija
- Svaka izmjena sprema se lokalno, pa na Drive čim je prijava valjana (inače čeka tvoj dodir na indikator).
- Pri sinkronizaciji se lokalna i Drive verzija **spajaju po treningu** (novija izmjena pobjeđuje), pa offline unos na mobitelu ne gazi izmjene s drugog uređaja.
- Obrisani treninzi pamte se kao "obrisano" i ne vraćaju se novim uvozom Strave.
- Aplikacija na Driveu vidi samo datoteku koju je sama stvorila (`trening-evidencija.json`).

## Novi Strava export
Postavke → Uvezi Strava CSV. Postojeći treninzi (isti ID) se preskaču, dodaju se samo novi, tvoje bilješke ostaju.
Strava export mora biti na engleskom jeziku (nazivi stupaca).

## Ograničenja ove verzije
- Ne čita `.fit`/`.gpx` datoteke (nema karte rute ni grafova pulsa po sekundi); koristi samo sažetak iz `activities.csv`.
- Originalne `.fit.gz` datoteke iz Strava ZIP-a čuvaj sam (npr. mapa na Driveu).
- Redovito povremeno napravi Postavke → *Izvezi backup (JSON)*.
