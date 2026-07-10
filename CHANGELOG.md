# Changelog — Sylex FOS Dashboard

Prehľad noviniek a zmien. Verzia sa zdvíha v `package.json` a zobrazuje v appke
(stránka **Changelog**, ktorá číta pole `CHANGELOG` v `public/js/app.js`).
Tento súbor je čitateľná (human-readable) história — pri každom nasadení sem
pridaj nový záznam navrch.

Formát vychádza z [Keep a Changelog](https://keepachangelog.com/),
verzie podľa [SemVer](https://semver.org/lang/sk/).

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
