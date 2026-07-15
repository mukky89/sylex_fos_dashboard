# Changelog — Sylex FOS Dashboard

Prehľad noviniek a zmien. Verzia sa zdvíha v `package.json` a zobrazuje v appke
(stránka **Changelog**, ktorá číta pole `CHANGELOG` v `public/js/app.js`).
Tento súbor je čitateľná (human-readable) história — pri každom nasadení sem
pridaj nový záznam navrch.

Formát vychádza z [Keep a Changelog](https://keepachangelog.com/),
verzie podľa [SemVer](https://semver.org/lang/sk/).

## [2.40.0] — 2026-07-15
### Pridané
- Grid pohľad úloh: predvolené triedenie **podľa priority** (kritická →
  nízka, `TK_PRIO[...].rank`), riadky majú **farebné pozadie podľa
  priority** (`.task-grid-prio-critical/high/normal/low`).
- Stĺpec **Názov** v Grid pohľade rozšírený na min. 380px (2× oproti
  pôvodnému auto-layoutu).
- Stĺpec **Posledná aktualizácia**: hover tooltip (`data-tooltip` +
  CSS `::after`) zobrazí celý text záznamu namiesto orezaného.

## [2.39.1] — 2026-07-15
### Opravené
- Grid pohľad úloh: riadky úloh v zoskupení Zákazník → Projekt teraz majú
  vlastné odsadenie (`taskGridRowHtml(t, groupIndent)`, 30px navyše nad
  odsadením hlavičky skupiny Projekt), takže sú vizuálne jasne vnorené
  pod svoj projekt — predtým začínali na rovnakej ľavej hrane ako
  hlavička skupiny Zákazník.

## [2.39.0] — 2026-07-15
### Pridané
- **Potvrdzovanie notifikácií** — nový model `NotifDismiss` a route
  `routes/notifications.js` (`GET /api/notifications/dismissed`,
  `POST /api/notifications/dismiss`). Každá notifikácia má kľúč
  `typ:id:relevantná-hodnota` (napr. `task:<id>:<due>`), takže potvrdenie
  zmizne natrvalo, ale znova sa objaví, ak sa dôvod (termín, stav) zmení.
  V paneli je ✕ pri každej položke aj „Označiť všetky ako prečítané".
- **Denník aktualizácií úlohy** (`models/Task.js` pole `updates`,
  `POST /api/tasks/:id/updates`) — nahrádza voľné polia Popis/Poznámka
  v modáli formou pridávania záznamov s autorom a časom (kto a kedy
  zmenil stav). Staré hodnoty `description`/`note` zostávajú zachované
  a zobrazujú sa ako historické záznamy. Posledná aktualizácia je vidno
  v novom stĺpci **Posledná aktualizácia** v Grid pohľade úloh.

### Opravené
- Modal **Upraviť úlohu**: chýbajúce `width: 100%; min-width: 0` na
  `<select>`/`<input>` v `.form-group` spôsobovalo, že dlhý text v
  rozbaľovacom poli Závislosti roztiahol celý modal vodorovne mimo
  obrazovky (nutnosť skrolovať doprava, časť polí neviditeľná). Modal
  rozšírený na 780 px.

## [2.38.1] — 2026-07-15
### Opravené
- Odsadenie podradených úloh v pohľade Zoznam teraz posúva doprava **celý
  riadok** (`margin-left` + `width: calc(...)` na `.task-row`), nielen text
  názvu v ňom — hierarchia je tak vizuálne zreteľnejšia.

## [2.38.0] — 2026-07-15
### Zmenené
- Modal **Upraviť úlohu** rozšírený na 660 px (`.modal-md`) a preusporiadaný:
  Závislosti a Podúlohy sú vedľa seba v skrolovateľných zoznamoch
  (`.tk-scroll-list`, max. výška 128 px), Popis a Poznámka tiež vedľa seba —
  menej skrolovania, viac viditeľné naraz.
- Podradené úlohy (s nastavenou nadradenou úlohou) sú v pohľadoch Zoznam
  a Grid odsadené zľava podľa hĺbky hierarchie (`taskDepth()`), so
  symbolom `↳` — vizuálne pôsobia ako stromová štruktúra.

## [2.37.0] — 2026-07-15
### Zmenené
- Polia **Projekt** a **Zákazník** v úlohe sú teraz rozbaľovacie polia
  (`<select>`) s existujúcimi hodnotami z číselníka namiesto voľného textu
  s našepkávačom — výber existujúcej hodnoty predchádza duplicitám
  (case-insensitive porovnanie v `models/TaskCatalog.js`), voľba
  „+ Pridať nový…" pridá novú hodnotu do číselníka.

## [2.36.0] — 2026-07-15
### Pridané
- **Grid** je predvolený pohľad úloh (namiesto Zoznamu).
- **Filtre stĺpcov v Grid pohľade** — riadok pod hlavičkou tabuľky s
  textovými/select filtrami pre každý stĺpec (Názov, Stav, Priorita,
  Projekt, Zákazník, Termín, Tagy).
- **Vnorené zoskupenie v Grid pohľade** — úlohy sa zoskupujú podľa
  Zákazníka a následne podľa Projektu, so skladateľnými (collapsible)
  hlavičkami skupín a počtami úloh.
- **Číselník projektov a zákazníkov** (`models/TaskCatalog.js`,
  `GET /api/tasks/catalog`) — hodnoty použité v poliach Projekt/Zákazník
  sa automaticky ukladajú a ponúkajú pri vytváraní ďalších úloh, aj keď
  pôvodné úlohy medzitým zaniknú.

## [2.35.0] — 2026-07-15
### Pridané
- **Grid pohľad úloh** — nový tretí view (Zoznam / Kanban / **Grid**) na
  stránke Úlohy: tabuľka so stĺpcami názov, stav, priorita, projekt,
  zákazník, termín, tagy a progres, s triedením kliknutím na hlavičku stĺpca.

## [2.34.0] — 2026-07-15
### Pridané
- **Úlohy** rozšírené o task-management prvky:
  - hierarchia — voliteľná **nadradená úloha** (parent), s ochranou proti cyklom
  - **závislosti** medzi úlohami (`dependsOn`) — úlohu nemožno označiť ako hotovú,
    kým jej závislosti, podúlohy alebo podradené úlohy nie sú dokončené
  - **tagy** (voľné, oddelené čiarkou) s filtrom v toolbare
  - rozšírené stavy: `todo`, `inprogress`, **`blocked`**, **`review`**, `done`,
    **`cancelled`** (6-stĺpcový Kanban)
  - rozšírená priorita o **`critical`**
  - **progres celého zoznamu** (X / Y dokončených, %) nad zoznamom úloh
- Backend (`routes/tasks.js`): validácia pri dokončovaní úlohy (nesplnené
  závislosti/podúlohy/podradené úlohy), detekcia cyklických závislostí a
  cyklickej hierarchie.

## [2.33.0] — 2026-07-15
### Pridané
- **Oficiálne logo SYLEX** (červený emblém so slovom „sylex", `#E2001A`)
  nasadené naprieč celou aplikáciou:
  - webové assety `public/img/sylex-logo.svg` (vektor, self-contained) a
    `public/img/sylex-logo.png`,
  - **hlavička** (`.logo` v `index.html`) — logo pred názvom *FOS Dashboard*,
  - **prihlasovacia obrazovka** (`.login-logo-img`),
  - **alternatívny bočný panel** (`.asb-logo`, biela plôška s logom),
  - stránka **overenia e-mailu** (`routes/auth.js`),
  - **overovací e-mail** (`utils/mailer.js`) — logo cez hostované PNG
    (absolútna URL z `APP_URL`/requestu) s textovým fallbackom „SYLEX",
  - export **pracovných postupov** do Wordu/PDF
    (`routes/procedures.js`, `public/assets/guides/sylex-logo.png`,
    zachovaný pomer strán 59×45).
### Zmenené
- Logo v hlavičke nahradilo pôvodný textový emblém; funguje na svetlom aj
  tmavom podklade (červená je čitateľná na oboch).

## [2.32.0] — 2026-07-15
### Pridané
- **Nový dizajn overovacieho e-mailu** (`utils/mailer.js`) — table-based
  responzívna HTML šablóna s brandovanou tmavou hlavičkou (FOS Dashboard ·
  SYLEX), akcentovou linkou, „bulletproof" CTA tlačidlom (vrátane VML
  fallbacku pre Outlook), skrytým preheaderom a pätičkou. Vyzerá konzistentne
  v Gmaile aj Outlooku.
### Zmenené
- Meno príjemcu v overovacom e-maile sa teraz HTML-escapuje (`esc()`).

## [2.31.2] — 2026-07-14
### Opravené
- **Hotfix štartu aplikácie** — `engines.node` zvýšené z `>=18` na `>=20`.
  Predchádzajúce `>=18` spôsobilo, že Railway (Nixpacks) nainštaloval Node 18,
  na ktorom balík `node-ical` padal so `SyntaxError: Invalid regular expression
  flags` (používa regex flag `v` dostupný až od Node 20) a server sa nespustil.
  `node-ical` má vlastné `engines.node: >=20`.

## [2.31.1] — 2026-07-14
### Opravené
- **Odosielanie e-mailov cez Brevo** — volanie API prerobené na vstavaný modul
  `https` namiesto globálneho `fetch`, takže funguje na každej verzii Node
  (predtým hrozilo „fetch is not defined" na staršom Node). Pridané
  `engines.node >=18` do `package.json`.
### Pridané
- **Diagnostika e-mailu** (Admin → Používatelia): panel so stavom konfigurácie
  (`BREVO_API_KEY`, `EMAIL_SENDER`, `SMTP_*`, `APP_URL`) a tlačidlo na odoslanie
  testovacieho e-mailu, ktoré vráti presnú chybu z Brevo (neoverený odosielateľ,
  neplatný kľúč a pod.). Endpointy `GET /api/admin/mail-status`,
  `POST /api/admin/mail-test`. Skutočná chyba odoslania sa teraz zobrazuje aj
  pri vytváraní používateľa a pri opätovnom odoslaní overenia.

## [2.31.0] — 2026-07-14
### Pridané
- **Nové role používateľov**: `obchod` (Obchod), `kvalita` (Kvalita),
  `technologia` (Technológia) — popri `user` a `admin`. Rozšírený enum v modeli
  `User`, validácia v `routes/users.js`, výber v modáli a farebne odlíšené
  odznaky rolí v zozname používateľov.
- **Odosielanie e-mailov cez Brevo** (rovnaká logika ako repozitár DBFOOD):
  `utils/mailer.js` preferuje **Brevo HTTP API** (`https://api.brevo.com/v3/smtp/email`
  cez natívny `fetch`, hlavička `api-key`) keď je nastavený `BREVO_API_KEY` —
  funguje aj tam, kde je SMTP blokovaný (Railway). Fallback na SMTP
  (`smtp-relay.brevo.com`, nodemailer) keď API kľúč chýba. Odosielateľ z
  `EMAIL_SENDER`. Vďaka tomu sa overovacie e-maily reálne doručia.
### Konfigurácia
- Env premenné (podľa DBFOOD): `BREVO_API_KEY`, `EMAIL_SENDER`, `SMTP_HOST`
  (default `smtp-relay.brevo.com`), `SMTP_PORT` (587), `SMTP_USER`,
  `EMAIL_PASSWORD`, `APP_URL`.

## [2.30.0] — 2026-07-14
### Pridané
- **Generátor silného hesla** v modáli používateľa — jedným klikom vytvorí
  kryptograficky náhodné heslo (nastaviteľná dĺžka 8–64, voliteľné špeciálne
  znaky, bez zameniteľných znakov 0/O/1/l/I), s indikátorom sily hesla,
  prepínačom zobraziť/skryť a kopírovaním do schránky.
- **Prihlásenie cez e-mail** — login akceptuje používateľské meno *alebo* e-mail
  (`$or` v `routes/auth.js`). Do modelu `User` pribudlo pole `email`
  (unikátne pre neprázdne hodnoty) + polia `emailVerified`, `verifyToken`,
  `verifyExpires`.
- **Overenie e-mailu** — pri vytvorení/zmene e-mailu sa vygeneruje overovací
  token (platnosť 24 h) a odošle sa e-mail cez SMTP (nodemailer, `utils/mailer.js`).
  Verejný endpoint `GET /api/auth/verify-email?token=…` zobrazí brandovanú
  potvrdzovaciu stránku. V zozname používateľov je stav *overený/neoverený* a
  tlačidlo na opätovné odoslanie (`POST /api/users/:id/send-verification`).
  Ak SMTP nie je nakonfigurované, appka funguje ďalej a odkaz sa vráti do UI na
  skopírovanie.
### Zmenené
- **Prepracovaný modal Nový/Upraviť používateľ** — väčšie okno (560 px)
  rozdelené na sekcie (Identita · Heslo · Nastavenia), pridané pole e-mail a
  prepínač „Poslať overovací e-mail", opravené štýlovanie `input[type=email/password]`,
  hlášky `alert()` nahradené `toast()`.
### Konfigurácia
- Pre reálne odosielanie e-mailov nastav env premenné: `SMTP_HOST`, `SMTP_USER`,
  `SMTP_PASS` (voliteľne `SMTP_PORT` [587], `SMTP_SECURE`, `SMTP_FROM`, `APP_URL`).
- Nová závislosť: `nodemailer`.

## [2.29.1] — 2026-07-14
### Zmenené
- Modul **GPN — Golden PN** prepnutý do **tmavého režimu** pre zjednotenie s
  ostatnými výrobnými stránkami (Výroba, Riadenie, Workflow, Vlastníci) —
  tmavé navy pozadie, priehľadné karty s bielym overlayom, cyan akcenty a
  svetlé odznaky stavov/priorít. Dashboard (KPI), filtre a zoznam ticketov sa
  prispôsobili tmavému podkladu; formulár požiadavky a detail ticketu ostávajú
  na svetlom modáli (rovnako ako ostatné modály v aplikácii).

## [2.29.0] — 2026-07-14
### Pridané
- Nový modul **GPN — Golden PN** (v menu nad *Vlastníci produktov*) — interný
  ticket systém (Request Form + Ticket Workflow) pre požiadavky na vytvorenie a
  úpravu GPN (Golden Part Number) medzi obchodom (Sales) a technologickým
  oddelením. Cieľom je nahradiť chaotickú komunikáciu cez e-mail/Teams jednotným
  procesom, kde obchodník zadá všetky potrebné údaje už pri vytvorení požiadavky.
- **Formulár požiadavky**: typ (nové GPN / úprava existujúceho), priorita, dôvod,
  popis; produkt / variant / zákazník / projekt; dynamický zoznam káblov (typ,
  počet, dĺžka, farba, označenie) a konektorov (A/B, orientácia, pinout);
  materiál (tubing, sleeve, label, heat shrink, iné); termín, poznámky a
  špeciálne požiadavky.
- **Workflow ticketu** s automatickým unikátnym číslom `GPN-RRRR-NNNN` a stavmi:
  Nová → Čaká na kontrolu → Rozpracované → (Čaká na doplnenie) → Na schválenie →
  Schválené → Dokončené → Uzavreté. Ticket sa dá vrátiť obchodníkovi na
  doplnenie informácií.
- **Dashboard** s prehľadmi (nové, rozpracované, čakajúce na doplnenie, na
  schválenie, dokončené) a filtrovaním podľa zákazníka, produktu, technológa,
  obchodníka, dátumu, priority a stavu + fulltextové hľadanie.
- **Detail ticketu**: ID, stav, dátum, autor, priradený technológ, kompletné
  parametre, checklist výrobnej dokumentácie (GPN, výrobný výkres, baliaci výkres,
  BOM, BOO, FOS karta, schválenie výkresov, dokumentácia kompletná), prílohy s
  drag & drop uploadom (výkres/foto/špecifikácia/datasheet/iné), komentáre a plná
  história zmien (kto, kedy, čo).
- **Notifikácie**: GPN požiadavky vyžadujúce pozornosť (nové / na kontrolu /
  čakajúce na doplnenie) sa zobrazujú v paneli notifikácií. Možnosť kopírovať
  existujúcu požiadavku a načítať ukážkové dáta.
- Nový model `models/GpnRequest.js`, route `routes/gpn.js` (CRUD, workflow,
  checklist, komentáre, prílohy, história), seed `scripts/seedGpn.js` a admin
  endpoint `/api/admin/seed-gpn`. Architektúra je modulárna pre budúce rozšírenia
  (automatické generovanie GPN/BOM, ERP/PLM prepojenie, export PDF/Excel, KPI/SLA).

## [2.28.0] — 2026-07-10
### Údržba
- Pridaný skill **sylex-brand** (`.claude/skills/sylex-brand/`) — oficiálny SYLEX
  brand kit: SVG logá (červený trojuholníkový emblém, primárne stacked logo,
  horizontálne „sylex® | FIBER OPTICS"), brand paleta (červená `#E2001A`),
  pravidlá kontrastu, ochrannej zóny, typografie a CSS tokeny.
- Skill je **on-demand** — aplikuje sa iba keď o použitie loga/brandu výslovne
  požiadaš, nikdy nie automaticky pri bežnej UI práci (viď `CLAUDE.md`).

## [2.27.0] — 2026-07-10
### Pridané
- **File server** — nový modul na zdieľanie súborov pre zákazníkov:
  - každé zdieľanie má vlastný odkaz `/s/<token>` chránený **automaticky
    vygenerovaným heslom** (bcrypt hash; plaintext sa zobrazí iba raz pri
    vytvorení / obnove hesla);
  - **zákaznícka stránka** v modernom SYLEX dizajne (navy `#1a1a2e` + limetka
    `#97bf0d`, animované optické vlákna, glass karta) — beží bez prihlásenia,
    po odomknutí heslom zobrazí zoznam súborov so sťahovaním;
  - správa v dashboarde (stránka **File server**): upload viacerých súborov
    naraz (drag & drop, max 500 MB/súbor), kopírovanie odkazu/hesla/hotovej
    správy pre zákazníka, voliteľná expirácia, vypnutie linku, regenerácia
    hesla, štatistiky odomknutí a stiahnutí;
  - backend: model `FileShare`, chránené API `/api/fileshare`, verejné API
    `/api/share/*` (unlock → krátkodobý share-token JWT), súbory uložené mimo
    `public/` a servírované len cez overený download endpoint.

## [2.26.0] — 2026-07-09
### Údržba
- Nainštalované **UI/UX Pro Max skills** ([ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill))
  do `.claude/skills/` — dizajnová inteligencia pre vývoj (50+ UI štýlov,
  161 farebných paliet, 73 párovaní fontov, 99 UX pravidiel, 25 typov grafov).
- `.gitignore` upravený tak, aby sa `.claude/skills/` verzoval (zvyšok `.claude/`
  ostáva ignorovaný); pokyn na používanie skillu pridaný do `CLAUDE.md`.
- Zmena sa netýka behu appky — ide o nástroje pre vývoj.

## [2.25.0] — 2026-07-08
### Údržba
- Changelog sa teraz vedie aj v súbore `CHANGELOG.md` (okrem stránky Changelog
  v appke) a jeho zápis je povinný krok pri každom nasadení (viď `CLAUDE.md`).
- Doplnené chýbajúce záznamy verzií 2.21–2.24.

## [2.24.0] — 2026-07-08
### Pridané
- Rámčekovanie sekcií rozšírené na celú **výrobnú rodinu stránok** — Riadenie
  výroby (MES), Vlastníci produktov a Workflow výroby produktu majú sekcie
  v jednotných ohraničených kartách (`.prod-section`), rovnaký vzhľad ako
  Plánovanie výroby. V module Vlastníci produktov je tabuľka v karte bez
  dvojitého orámovania.

## [2.23.0] — 2026-07-08
### Pridané
- Plánovanie výroby: jednotlivé bloky (Kalibračné listy, Prehľad výroby/KPI,
  Zoznam zákaziek) sú vizuálne oddelené rámčekmi (kartami) pre lepšiu
  prehľadnosť.

## [2.22.0] — 2026-07-08
### Zmenené
- Plánovanie výroby: KPI dlaždice presunuté nižšie — spod hlavičky tesne nad
  zoznam zákaziek.

## [2.21.0] — 2026-07-08
### Pridané
- Plánovanie výroby → Kalibračné listy: **denný filter** — predvolene ukazuje
  aktuálny deň, dá sa posúvať dozadu/dopredu (`‹ Dnes ›`) a prepnúť na
  „Všetky dni".
- Samostatné **štatistiky** ku kalibračným listom (Expedované / Čaká na
  odoslanie / Odoslané), ktoré fungujú ako klikacie filtre podľa stavu.
### Zmenené
- Filtre kalibračných listov presunuté z hlavičky priamo nad zoznam.

---

> Staršie verzie (≤ 2.20.0) sú vedené v poli `CHANGELOG` v `public/js/app.js`.
