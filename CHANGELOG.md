# Changelog — Sylex FOS Dashboard

Prehľad noviniek a zmien. Verzia sa zdvíha v `package.json` a zobrazuje v appke
(stránka **Changelog**, ktorá číta pole `CHANGELOG` v `public/js/app.js`).
Tento súbor je čitateľná (human-readable) história — pri každom nasadení sem
pridaj nový záznam navrch.

Formát vychádza z [Keep a Changelog](https://keepachangelog.com/),
verzie podľa [SemVer](https://semver.org/lang/sk/).

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
