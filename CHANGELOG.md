# Changelog — Sylex FOS Dashboard

Prehľad noviniek a zmien. Verzia sa zdvíha v `package.json` a zobrazuje v appke
(stránka **Changelog**, ktorá číta pole `CHANGELOG` v `public/js/app.js`).
Tento súbor je čitateľná (human-readable) história — pri každom nasadení sem
pridaj nový záznam navrch.

Formát vychádza z [Keep a Changelog](https://keepachangelog.com/),
verzie podľa [SemVer](https://semver.org/lang/sk/).

## [2.65.0] — 2026-07-20
### Pridané
- **Stretnutia — e-mailová pozvánka do Outlooku (.ics).** Po vytvorení
  udalosti sa dá účastníkom poslať kalendárová pozvánka. V modáli udalosti
  pribudlo pole „Pozvať e-mailom" a voľba „poslať pozvánku". Príjemca
  dostane e-mail s prílohou `.ics` (METHOD:REQUEST) so všetkými detailmi
  (dátum, čas, miesto, účastníci) a v Outlooku ju jedným klikom **Prijme** —
  udalosť sa mu pridá do kalendára. Bez OAuth/Azure — cez existujúci e-mail
  (Brevo/SMTP). Časy sa správne prevádzajú z Europe/Bratislava na UTC
  (vrátane letného času).
- **Naplánovať stretnutie → pozvánka na jeden klik.** Ku každému napojenému
  kalendáru (osobe) sa dá v „Kalendáre" nastaviť e-mail (`IcsFeed.email`);
  pri vytváraní stretnutia sa pole pozvánky predvyplní e-mailmi vybraných
  účastníkov a pozvánka sa po uložení automaticky rozpošle.
- Nový endpoint `POST /api/calendar/invite`, util `utils/ical.js`
  (zostavenie VCALENDAR REQUEST), rozšírený `utils/mailer.js` o odosielanie
  príloh/kalendára (Brevo attachment + nodemailer `icalEvent`).

## [2.64.1] — 2026-07-18
### Opravené
- **Naplánovať stretnutie — správne zohľadňuje napojené (ICS) kalendáre.**
  Hľadač predtým bral do úvahy len udalosti aktuálne zobrazeného rozsahu,
  takže mohol ponúknuť termín cez udalosť z Outlook/ICS kalendára. Teraz si
  obsadenosť načíta pre celé hľadané okno (dnes → +8 dní) nezávisle od
  zobrazeného pohľadu a zoznam účastníkov berie priamo z napojených
  kalendárov (`/api/calendar/feeds`) — voľné termíny sa počítajú správne aj
  cez ICS udalosti.

## [2.64.0] — 2026-07-18
### Pridané
- **Administrácia — vypnutie funkcií Pomoc a AI Asistent.** V Administrácii
  → *Moduly* pribudla sekcia **Funkcie** s prepínačmi na vypnutie/zapnutie
  **Pomoc (Sprievodca)** a **FOS AI Asistent** pre všetkých používateľov.
  Po vypnutí sa príslušné plávajúce tlačidlo skryje a funkcia sa nedá
  spustiť. Nastavenie sa ukladá na server (`ui.helpEnabled`,
  `ui.aiEnabled`) a platí naprieč zariadeniami.

## [2.63.0] — 2026-07-18
### Vylepšené
- **Naplánovať stretnutie — viac návrhov termínov.** Namiesto jedného
  termínu ponúkne viacero voľných časov: min. 4 na dnešný deň a ďalšie na
  nasledujúce pracovné dni v rámci týždňa. Termíny sú zoskupené do kariet
  po dňoch (odznak „dnes", počet voľných), každý čas je klikacia dlaždica.
  Doladené UI/UX modalu a pridaný hover efekt na celú kartu dňa.

## [2.62.0] — 2026-07-18
### Vylepšené (UI/UX)
- **Kalendár — prepracované tlačidlá v hlavičke.** Akčné tlačidlá
  (Kalendáre, Zdieľať, Excel, Tlač, Naplánovať stretnutie, Pridať udalosť)
  majú jednotné líniové SVG ikony namiesto nesúrodých emoji (🔗, 🖨️),
  rovnakú veľkosť/výšku a zaoblenie, vizuálny oddeľovač medzi pomocnými
  (zobraziť/zdieľať/export) a tvorivými akciami, a jemný priehľadný vzhľad
  ladiaci s tmavou hlavičkou namiesto výrazne bielych tlačidiel. Doplnené
  fokus-stavy (`:focus-visible`) pre ovládanie klávesnicou.
- **Kalendár — tmavý motív ako predvolený (potvrdené).** Kalendár sa
  predvolene otvára v tmavom režime; voľba motívu (Tmavý/Svetlý/Modrý)
  zostáva dostupná a pamätá sa medzi návštevami.

## [2.61.0] — 2026-07-18
### Pridané
- **Kalendár — „Naplánovať stretnutie" (hľadač voľného termínu).** Nové
  tlačidlo v hlavičke kalendára otvorí modal, kde cez checkboxy vyberieš
  ľudí (napojené kalendáre + interné), zvolíš dĺžku stretnutia, pracovný
  čas a rozsah dní. Appka nájde **najbližší termín, kedy majú všetci
  vybraní voľno** (kontroluje obsadenosť naprieč vybranými kalendármi,
  preskakuje víkendy a štátne sviatky), ponúkne niekoľko najbližších
  slotov a jedným klikom z termínu vytvoríš udalosť s predvyplneným časom,
  typom „Porada / Meeting" a zoznamom účastníkov v názve.

## [2.60.1] — 2026-07-18
### Opravené
- **Kalendár — meno vlastníka lepšie čitateľné pri každej farbe.** Meno
  kalendára v udalostiach je červené na malom tmavom čipe, takže je dobre
  čitateľné na akomkoľvek farebnom pozadí udalosti (ružová, fialová,
  zelená, žltá…), nie len na tmavých.

## [2.60.0] — 2026-07-18
### Opravené / Vylepšené
- **Kalendár — meno kalendára v udalostiach výraznou červenou.** V tmavom
  režime má vlastník/meno kalendára v každej udalosti (týždenný/denný
  pohľad aj celodenné pruhy) výraznú červenú farbu s tmavým obrysom, aby
  bolo čitateľné aj na svetlých farebných pozadiach.
- **Moje úlohy — väčšie a čitateľnejšie písmo.** Zväčšené písmo v zozname
  aj v tabuľke (Grid) a zosvetlené predtým vyblednuté (slabo čitateľné)
  texty — názvy úloh, meta údaje, popisy, poznámky, hlavičky stĺpcov,
  skupiny (zákazník/projekt) a prehľad „dnes/zajtra".

## [2.59.0] — 2026-07-18
### Opravené / Vylepšené
- **Moje úlohy — krajšie ikony v paneli nástrojov.** Tlačidlá „Zoskupiť",
  „Zbaliť/Rozbaliť všetky" a prepínač pohľadov (Zoznam/Kanban/Grid) majú
  namiesto nejednotných znakov (⊟, ⊞, ☰, ▦, ▤) čisté líniové SVG ikony
  zarovnané s textom.
- **Kalendár — čitateľný text udalostí v tmavom režime.** Farba textu
  v udalostiach sa automaticky prispôsobí podľa jasu farby udalosti (tmavý
  text na svetlých farbách, svetlý na tmavých) — názov aj čas sú vždy dobre
  viditeľné (týždenný/denný pohľad, celodenné pruhy aj mesačný pohľad).
- **Kalendár — prehľadnejšie prekrývajúce sa udalosti.** Pri viacerých
  udalostiach v jeden deň sa dlhý názov skráti na tri bodky (…), čas
  začiatku/konca sa nezalamuje a po prejdení myšou sa udalosť rozšíri
  a zobrazí celý čas aj názov.

## [2.58.0] — 2026-07-17
### Vrátené
- **Moje úlohy — vrátené pôvodné ikony.** Líniové (Lucide) SVG ikony
  z verzie 2.57.0 sú vrátené späť na pôvodné emoji ikony (revert). Funkcia
  zbaľovania/rozbaľovania úloh vrátane tlačidiel „Zbaliť/Rozbaliť všetky"
  zostáva zachovaná.

## [2.56.0] — 2026-07-17
### Pridané
- **Moje úlohy — „Zbaliť/Rozbaliť všetky" aj v Grid pohľade.**
  - Tlačidlá **„⊟ Zbaliť všetky"** / **„⊞ Rozbaliť všetky"** v tabuľkovom
    (Grid) pohľade zbalia/rozbalia všetky skupiny (Zákazník → Projekt) naraz;
    pri zbalení ostanú viditeľné len hlavičky zákazníkov.
  - Tlačidlá sú viditeľné v zoznamovom aj grid pohľade (skryté len v Kanbane).

## [2.55.0] — 2026-07-17
### Pridané
- **Moje úlohy — zbalenie/rozbalenie úloh v zoznamovom pohľade.**
  - Každá úloha s detailmi (progres, poznámka, popis, podúlohy) má šípku
    (▾/▸) na zbalenie/rozbalenie — zbalená úloha zobrazí len názov, chipy
    a základné meta, detaily sa skryjú.
  - Tlačidlá **„⊟ Zbaliť všetky"** a **„⊞ Rozbaliť všetky"** v paneli
    nástrojov (viditeľné v zoznamovom pohľade) zbalia/rozbalia všetky úlohy
    naraz.

## [2.54.0] — 2026-07-16
### Pridané
- **PWA — inštalovateľná appka „Úlohy" pre Android aj iPhone.**
  - Manifest (`manifest.webmanifest`): `start_url` → `/#tasks` (appka sa
    otvorí rovno na Úlohách), názov **FOS Úlohy**, `display: standalone`,
    `shortcuts` (Úlohy, Nová úloha → `/#tasks/new`, Kalendár, Výroba).
  - Nový hash `#tasks/new` v `handleHash` otvorí rovno formulár novej úlohy
    (pre skratku ikony na ploche).
  - **Install banner** (`initPwaInstall` v `app.js`): Android/Chrome používa
    `beforeinstallprompt` + tlačidlo Inštalovať; iPhone/Safari ukáže návod
    „Zdieľať → Pridať na plochu". Zavretie sa pamätá (`fos_pwa_dismissed`),
    po inštalácii (`appinstalled`) sa banner skryje.
### Opravené
- **iPhone s notchom (PWA/standalone):** fixná hlavička sa už neschováva pod
  stavovým riadkom — `.header` a `.page` rešpektujú
  `env(safe-area-inset-top)` (na zariadeniach bez výrezu je to 0, bez zmeny).

## [2.53.0] — 2026-07-16
### Opravené
- **Mobil — „appka sa neprispôsobuje obrazovke" pri layoute Bočný sidebar.**
  Pri zapnutom sidebar layoute sa na telefóne obsah odtláčal o `264px`
  (`--appsb-w`) doprava a nezmestil sa na obrazovku — a to na **každej**
  stránke (dalo sa preto ťažko scrollovať aj ovládať).
  - Príčina: desktopové pravidlo `body.layout-sidebar .page { padding-left:
    var(--appsb-w) }` malo rovnakú špecificitu ako mobilný reset
    (`padding-left: 0` v `@media (max-width:900px)`), ale bolo v CSS **neskôr**,
    takže pri zhode vyhralo aj na mobile.
  - Riešenie: desktopové rozloženie sidebaru (pozícia `.app-sidebar`, padding
    `.page`, posun tlačidla Pomoc) je uzavreté do `@media (min-width: 901px)`,
    takže na mobile (≤900px) sa už neuplatní a preberá to mobilný drawer.
- **Výroba — pohľad Zoznam:** široká tabuľka (~870px) sa na mobile orezávala
  mimo obrazovku (`.prod-list` mala `overflow: hidden`); teraz sa scrolluje
  horizontálne vo vlastnom kontajneri (`overflow-x: auto`).
### Pridané
- Diagnostický skript `scripts/analyzeMobileControls.js` a audit responzivity
  naprieč stránkami v mobilnej emulácii (odhaľovanie pretekajúcich prvkov).

## [2.52.0] — 2026-07-16
### Pridané
- **Mobil — veľký balík responzivity (Android + iPhone).**
  - **Spodný tab bar** (≤900px): Domov, Úlohy, Výroba, Kalendár + „Menu"
    (otvorí drawer s celou navigáciou). Aktívna stránka sa zvýrazňuje,
    rešpektuje skryté moduly z nastavení aj safe-area iPhonu.
  - **Filter v draweri:** input navrchu výsuvnej navigácie filtruje položky
    aj skupinové nadpisy (`filterAppSidebar`), pri zatvorení sa vyčistí.
### Vylepšené
- **Modaly na mobile ako bottom-sheet:** `.modal-box` sa pri ≤640px prilepí
  odspodu na celú šírku, tlačidlá v pätičke sa roztiahnu a dostanú
  `safe-area-inset-bottom` padding.
- **iOS anti-zoom:** všetky textové inputy/selecty/textarey majú na mobile
  `font-size: 16px !important` — Safari už nezoomuje pri fokuse do poľa.
- Dotykové ciele: `.btn-primary/.btn-secondary` min. 44px,
  `.btn-sm/.btn-edit/.btn-delete` min. 38px, `.modal-close` 42px (≤900px).
- Kanban (Úlohy, Výroba, projekty): na mobile stĺpce `min(82vw, 320px)`
  so `scroll-snap` — posúvanie „docvakuje" po stĺpcoch.
- `100dvh` jednotky pre `.page` a modaly (fallback `100vh`) — obsah už nie je
  odrezaný pod adresným riadkom mobilných prehliadačov; obsah stránok má na
  mobile spodný padding, aby nekončil pod tab barom; FAB tlačidlá vyzdvihnuté.
- Hlavičkové quicklink dlaždice sa na mobile skrývajú (sú v draweri).

## [2.51.0] — 2026-07-16
### Opravené
- **Changelog nezobrazoval HTML značky.** Položky zoznamu zmien sa pri
  vykresľovaní escapovali (`escHtml`), takže napr. `<strong>text</strong>`
  sa vypisovalo doslovne aj so značkami namiesto tučného písma. Keďže pole
  `CHANGELOG` je statický dôveryhodný obsah písaný priamo v kóde (nie
  užívateľský vstup), escapovanie odstránené — značky sa teraz vykresľujú
  správne.
### Vylepšené
- Vytunené štýly changelogu: `<code>` značky pre technické výrazy (napr.
  `@media`) majú vlastné oddelené pozadie a farbu, tučný text (`<strong>`)
  je kontrastnejší na tmavom pozadí.

## [2.50.1] — 2026-07-16
### Opravené
- **Kritická regresia z 2.50.0: hlavná navigácia úplne zmizla na desktope.**
  Pri úprave mobilného `@media (max-width: 900px)` bloku (skrytie ikon
  Senzory/meno/Odhlásiť sa) som blok predčasne zatvoril `}` — pravidlá pre
  `.app-sidebar` a súvisiaci drawer (pôvodne určené len pre mobil) tak unikli
  mimo media query a platili aj na desktope (`.app-sidebar { display:flex
  !important; transform: translateX(-100%); ... }` bez obmedzenia na mobil).
  Pri layout režime „Bočný panel" to bočný panel natrvalo posunulo mimo
  obrazovku a odstránilo miesto preň vyhradené (`padding-left:0`) —
  navigácia tak úplne zmizla. Opravené správnym vnorením CSS blokov;
  overené Playwright testom na desktope (header aj sidebar layout) aj
  mobile, že menu je viditeľné a funkčné v oboch režimoch.

## [2.50.0] — 2026-07-16
### Opravené
- **Mobil — hlavičkové ikony mimo obrazovky.** Pri užších oknách/telefónoch
  (najmä ~375-630px) sa ikony vpravo v hlavičke (hľadanie, rýchle pridať,
  notifikácie, senzory, meno, odhlásenie) nezmestili vedľa loga a časť z nich
  bola vytlačená mimo viditeľnú plochu — nedali sa vidieť ani použiť
  (`body { overflow-x:hidden }` ich navyše aj neumožňoval doscrollovať).
  Opravené skrytím duplicitných ikon na mobile (≤900px): Senzory (dostupné
  cez plávajúci teplomer), meno používateľa a Odhlásiť sa (obe dostupné v
  pätičke drawer menu) — zvyšné ikony (hľadanie/pridať/notifikácie) sa teraz
  vždy zmestia. Logo „FOS Dashboard" sa na úzkych obrazovkách skracuje
  (ellipsis) a pod 360px sa text loga skryje úplne.

### Pridané
- **Moje úlohy — Stav a Priorita ako klikacie tlačidlá** (chipy) v modale
  úlohy — namiesto rozbaľovacieho zoznamu sa hodnota nastaví jedným klikom
  na farebné tlačidlo (farby zladené s badge v Grid pohľade).
- **Duplikovanie úlohy** — tlačidlo „⧉ Duplikovať" v modale úlohy otvorí
  formulár novej úlohy s predvyplneným zákazníkom a projektom z pôvodnej
  úlohy; ostatné polia ostávajú prázdne/predvolené.

## [2.49.0] — 2026-07-16
### Opravené
- **Administrácia → Používatelia — kontrast textu.** Sekcie „Diagnostika
  e-mailu" a „Denný súhrn úloh" (`.admin-section`, tmavá karta) používali
  „light zone" farebné tokeny (`var(--text)`, `var(--text-dim)`,
  `var(--card-bg)`) určené pre svetlé plochy (WIKI, modaly) — na tmavom
  pozadí boli hodnoty (SMTP_HOST, čas odoslania, naposledy odoslané…) takmer
  neviditeľné. Prepnuté na „dark zone" tokeny (`var(--dz-text2)`,
  `rgba(var(--dz-fg-rgb),α)`). Pravidlo (nemiešať light/dark zone tokeny)
  zapísané aj do `CLAUDE.md`.
- **Mobilná navigácia — spoľahlivejšie zamknutie scrollu.** Otvorenie drawer
  menu už neblokuje scroll cez `overflow:hidden` (na iOS Safari nespoľahlivé
  — pozadie sa mohlo „gumovo" odscrollovať a spôsobiť, že sa na položky menu
  nedalo trafiť), ale cez `position:fixed` s uloženým scrollY — štandardný
  cross-browser spôsob zamknutia scrollu.

### Zmenené
- **GitHub** a **Vzdialené PC (RustDesk)**: celé karty sú teraz klikateľné
  na úpravu (predtým len malá ikona ceruzky) — s hover efektom (nadvihnutie
  + zvýraznený okraj) a klávesovým ovládaním (Tab + Enter/Medzerník).
  Odkazy/tlačidlá v karte (repozitár, RustDesk pripojiť, kopírovať ID/heslo)
  zastavujú probublávanie kliknutia, takže fungujú naďalej samostatne.

## [2.48.0] — 2026-07-16
### Pridané
- **Moje úlohy — zmrazená (sticky) hlavička.** Nadpis, tlačidlo „Nová úloha" a
  filtre ostávajú viditeľné navrchu stránky aj pri scrollovaní nadol. Tlačidlo
  „Nová úloha" má navyše plávajúcu (floating) verziu vpravo dole, vždy na
  dosah bez ohľadu na scroll.
- **Sekcia Zmeškané** v rýchlom prehľade nad zoznamom úloh — úlohy s termínom
  v minulosti, každá s tlačidlom „→ +1 deň" na rýchly posun termínu (nový
  endpoint `PUT /api/tasks/:id/postpone`).
- **Denný e-mailový súhrn úloh** — každý deň (predvolene o 7:00, Europe/
  Bratislava) dostane každý používateľ s vyplneným e-mailom prehľad
  zmeškaných úloh a úloh na dnes/zajtra; bez úloh sa e-mail neposiela.
  Nastavenie/ručné odoslanie/stav v **Administrácia → Používatelia → Denný
  súhrn úloh**. Nové súbory `utils/taskDigest.js`, šablóna e-mailu v
  `utils/mailer.js` (`taskDigestEmail`), plánovač v `server.js` (bez
  ďalšej závislosti — kontrola raz za minútu + `AppConfig` na
  zapamätanie posledného odoslania, prežije reštart appky).

### Opravené
- **Grid tabuľka úloh: hlavička (NÁZOV/STAV/PRIORITA…) sa pri scrollovaní
  prekrývala s riadkami úloh** namiesto toho, aby zostala nad nimi zamrazená
  (`.tasks-grid-wrap` s `overflow-x:auto` rozbíjal `position:sticky` voči
  stránke). Opravené — hlavička tabuľky teraz zostáva viditeľná počas celého
  scrollovania, vrátane úplného spodku zoznamu.
- Rozbitá ikona „⏭" pri „Zajtra" (a emoji pri „Dnes") nahradené SVG ikonami
  v štýle zvyšku appky.

## [2.47.0] — 2026-07-16
### Pridané
- **Mobilná optimalizácia celej appky.** Hlavná navigácia (22 položiek) sa
  na mobile/tablete (šírka ≤900px) už neposúva vodorovne v hlavičke, ale
  otvára sa ako výsuvný bočný panel (drawer) cez nové hamburger tlačidlo —
  so zoskupenými sekciami (Znalosti / Výroba / …), rovnako ako v alternatívnom
  desktop sidebar layoute. Drawer sa zatvára cez podložku (backdrop), tlačidlo
  ✕, kláves Esc alebo automaticky pri prechode na inú stránku.
- Zväčšené dotykové plochy hlavičkových ikon (hľadanie, rýchle pridať,
  notifikácie) na mobile na min. 40×40px a odkazov v drawer navigácii na
  min. 44px výšky (súlad s odporúčaním WCAG/Material pre dotykové ciele).

## [2.46.0] — 2026-07-15
### Opravené
- **Vývoj výrobkov → Projekty (zoznam): filtre predaj/vývoj strácali kontext.**
  Rozbaľovacie filtre nad stĺpcom „Procesy & výstupy" po výbere hodnoty
  (napr. „Testovanie") už neukazovali, či ide o filter predaja alebo vývoja.
  Pridané trvalé ikony 💼 / 🛠 / 📦 pri každom z troch filtrov (zostávajú
  viditeľné aj po výbere) a filtre sú vizuálne zoskupené do jedného rámčeka.

### Zmenené
- Tlačidlo „✕ zrušiť filtre" má teraz aj `aria-label` (predtým len title).
- Mierne zväčšené popisky PREDAJ/VÝVOJ/VÝSTUPY pri riadkoch projektov
  (0.6rem → 0.64rem) pre lepšiu čitateľnosť.

## [2.45.0] — 2026-07-15
### Pridané
- **WIKI FOS — prílohy (súbory) s drag & drop:** k záznamu je teraz možné
  pridať ľubovoľné súbory (manuály, exporty, dokumenty…) — pretiahnutím
  do zóny v editačnom formulári alebo kliknutím. Prílohy sa zobrazujú
  v detaile záznamu ako zoznam na stiahnutie (názov + veľkosť).

### Zmenené
- **WIKI FOS — tmavý dizajn:** celý modul (bočný panel, prehľad, kategórie,
  detail záznamu, editačné modaly) prerobený z pôvodnej svetlej „knowledge
  base" témy na tmavú, zladenú so zvyškom appky (rovnaké farby/kontrast
  ako Postupy, Úlohy, Výroba a pod.).

## [2.44.0] — 2026-07-15
### Odstránené
- **Modul „Termostatický kúpeľ — SIKA TP"** (teplotné kalibrátory TP37 / TP3M,
  ethernet REST-API) bol z appky odstránený — vrátane stránky, položiek v
  navigácii, backend routy a modelu.

## [2.43.0] — 2026-07-15
### Pridané
- **Moje úlohy — rýchly prehľad na dnes a zajtra:** nad zoznamom úloh
  pribudli dve kartičky (📅 Dnes / ⏭ Zajtra), ktoré zobrazujú len
  nedokončené úlohy s termínom v tento alebo nasledujúci deň, aby bolo
  hneď vidno, na čo sa treba nachystať. Klik na položku otvorí detail úlohy.

## [2.42.0] — 2026-07-15
### Pridané
- **Nový typ zariadenia „Termostatický kúpeľ — SIKA TP"** (teplotné
  kalibrátory TP37 / TP3M) s komunikáciou cez **ethernet / REST-API**
  (port 8081, endpointy `/ajax/...`). Nové súbory: `models/ThermalBath.js`,
  `routes/thermalBath.js` (`/api/thermal-baths`), sekcia `page-thermalbath`
  v `index.html`, funkcie v `app.js`, štýly v `style.css` a ilustrácia
  `public/assets/equipment/thermalbath.svg` (SVG s animovaným ventilátorom).
- **Podpora viacerých zariadení** — výber zariadenia v hornej lište a CRUD
  správa (názov, kód, IP, port, model, umiestnenie) cez „⚙ Zariadenia".
- **Server-side proxy** číta živé dáta zo zariadenia (aby prehliadač
  neriešil mixed-content/CORS voči HTTP zariadeniu):
  - `GET /api/thermal-baths/:id/status` — agreguje referenčnú teplotu
    (`getRegister?register=TRset_TR`), set point (`TRset_SP`), senzory a
    chybové masky (`getTR`) a stav kalibrácie (`getCalibrationStatus`),
  - `GET /api/thermal-baths/:id/info` — `getInfoReport`,
  - `GET /api/thermal-baths/:id/shells` — `getShells`,
  - `POST /api/thermal-baths/:id/setpoint` — nastavenie cieľovej teploty
    (`setSP`).
- **Dekódovanie chybových masiek** (fatálne `0x8...` aj prechodné `0x4...`)
  do zrozumiteľných slovenských popisov podľa dokumentácie.
- Živý prehľad s auto-obnovou (5 s): referenčná teplota, set point,
  referenčné senzory, stav kalibrácie, aktívne chyby a informácie o
  zariadení. Položka v hlavičke aj bočnom paneli („Kalibrátor" /
  „Termostatický kúpeľ").

## [2.41.0] — 2026-07-15
### Pridané
- **Zadávateľ úlohy** (`Task.assignedTo`, `GET /api/tasks/options`
  cez existujúci `/api/users/options`) — priradenie úlohy inému
  používateľovi Dashboardu. Priradený vidí úlohu vo svojom zozname
  Úloh (`GET /api/tasks` teraz vracia aj `$or: [{user}, {assignedTo}]`
  s vypočítaným `readOnly` príznakom), ale nemôže ju editovať ani
  ukončiť — PUT/DELETE/POST updates zostávajú prísne obmedzené na
  vlastníka (`user: req.user.id`), takže vynucovanie je na serveri,
  nie len v UI. V zozname/Grid/Kanbane sa zobrazuje badge
  „👁 len na čítanie" a checkbox/drag/mazanie sú pre tieto úlohy skryté.
- **Sticky hlavička Grid pohľadu** — `<thead>` (vrátane riadku
  filtrov) zostáva prilepený pod hlavičkou appky pri scrollovaní.

### Zmenené
- Modal **Upraviť úlohu** kompletne prerobený: tmavá téma (`#131c35`,
  zladená s dark stránkou Úlohy) a polia zoskupené do logických sekcií
  s nadpismi (Základné · Stav a termín · Kontext · Priradenie a väzby ·
  Podúlohy · Aktualizácie) namiesto jedného dlhého svetlého formulára.

## [2.40.5] — 2026-07-15
### Zmenené
- `.tasks-inner.tasks-wide` max-width zväčšený z 1240px na 1640px —
  po rozšírení stĺpca Aktualizácia o 50 % sa Grid tabuľka opäť zmestí
  bez horizontálneho scrollbaru na bežných obrazovkách.

## [2.40.4] — 2026-07-15
### Zmenené
- Grid pohľad úloh: stĺpec Aktualizácia rozšírený o 50 % (min-width
  160→240px, max-width 220→330px, orezanie textu 50→75 znakov).
- Filter „Všetky tagy" presunutý z osobitného miesta v toolbare priamo
  do skupiny `.tasks-filters` (Aktívne/Všetky/Hotové) — zarovnaný vľavo.

## [2.40.3] — 2026-07-15
### Opravené
- Grid pohľad úloh: stĺpec Termín mal zalamovaný text (chýbajúci
  `white-space: nowrap`), stĺpec Posledná aktualizácia sa kvôli
  dlhému nadpisu (`nowrap` v hlavičke) vytláčal mimo viditeľnú šírku.
  Skrátený nadpis na „Aktualizácia", stĺpec Názov zmenšený z 380px na
  320px — tabuľka sa teraz zmestí bez horizontálneho skrolovania na
  bežných obrazovkách.

## [2.40.2] — 2026-07-15
### Opravené
- `.asb-logo` pozadie a farba ikony vo v2.40.1 ostali nastavené pre
  logo SYLEX (biele pozadie), takže po vrátení pôvodnej grafovej SVG
  ikony bola nesprávnej farby. Vrátené aj pôvodné pozadie
  (`linear-gradient(140deg, #00d4ff, #6366f1)`) a farba ikony (`#06121f`).

## [2.40.1] — 2026-07-15
### Zmenené
- Ikona FOS Dashboard v alternatívnom bočnom paneli (`#appSidebar .asb-logo`)
  vrátená späť na pôvodnú inline SVG graf-ikonu (bola nahradená logom
  SYLEX vo v2.33.0). Logo SYLEX zostáva na prihlasovacej obrazovke
  (`.login-logo-img`) a v ľavom hornom rohu hlavičky (`.logo-img`).

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
