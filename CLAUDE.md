# Sylex FOS Dashboard — pokyny pre Clauda

## Deploy (DÔLEŽITÉ — robiť vždy automaticky)
Po dokončení každej úlohy/funkcie **vždy automaticky nasadím do produkcie bez pýtania**:
1. Zdvihnúť verziu v `package.json` (minor bump, napr. 1.32.0 → 1.33.0; pri väčšej zmene podľa uváženia). Verzia sa zobrazuje v hlavičke appky cez `/api/version`.
2. **Zapísať zmenu do changelogu (VŽDY):** pridať nový záznam navrch do poľa `CHANGELOG` v `public/js/app.js` (zobrazuje sa na stránke Changelog) **aj** do `CHANGELOG.md`.
3. Commit na vývojovú vetvu (`claude/...`) a push.
4. Zlúčiť vývojovú vetvu do `master` (`git merge --no-ff`) a `git push origin master`.
5. **Railway** automaticky nasadí z `master` (build 1–2 min).
Vrátiť sa späť na vývojovú vetvu a zosynchronizovať ju.

> Používateľ udelil trvalý súhlas na auto-deploy do produkcie ("vždy to tak rob", 2026-06).

## Architektúra
- **Stack:** Node.js + Express + MongoDB (mongoose). SPA frontend (`public/index.html` + `public/js/app.js` + `public/css/style.css`), žiadny build krok pre frontend.
- **Hosting:** Railway, deploy z `master`. Štart: `node server.js`. Verzia z `package.json`.
- **Auth:** JWT; všetko pod `/api/*` (okrem `/api/version`, `/api/auth/*`) vyžaduje prihlásenie (gate v `server.js`).
- **Routy** sa registrujú v `server.js` (`app.use('/api/...', require('./routes/...'))`).
- **Moduly** = model (`models/`) + route (`routes/`) + sekcia v `index.html` + funkcie v `app.js` + CSS. Stránky sa prepínajú cez `showPage()` / `handleHash()` / `_activatePage()`.
- **Seed skripty** v `scripts/seed*.js`, spúšťané cez admin endpointy `/api/admin/seed-*` (idempotentné, `note: 'seed'`).

## Dátové modely (`models/`, mongoose)

Cez 30 modelov, zoskupené podľa oblasti (model → hlavné polia / vzťahy):

**Výroba / MES**
- `ProductionOrder` — výrobné zákazky (VZ-2026-001…), `stage`: plan→material→production→qc→done→shipped, qty plán/skutok, workstation, priorita
- `WorkCenter` — pracoviská/linky, `status`: running/setup/idle/maintenance/down, kapacita, aktuálna zákazka
- `ShiftReport` — zmenové výkazy (R/P/N), vstupy pre OEE (downtime, goodQty, scrapQty, idealRate)
- `Routing` — technologické postupy/normy (`operations[]`: kód, t/ks, linka, `machine` flag), `coeff` prirážka na ručné operácie
- `ProductWorkflow` — kroky výroby konkrétneho produktu (montáž, zváranie…), `status` per krok

**Produkty / R&D**
- `Product` (ref `Category`), `Datasheet` (specs/features/ordering), `Prototype`, `SensorType` (citlivosť, gauge factor)
- `ProductOwner` (ref `User` po/bo) + `ProductOwnerRecord` (história zmien vlastníctva)
- `Procedure` — pracovné postupy (PP FOS…), revízie, súvisiace normy
- `TestProtocol` — testovacie protokoly (`measurements[]` s pass/fail)

**CRM / Predaj**
- `Contact` (lead/active/inactive) + `CrmEmail` (ref `Contact`)
- `Sale` — tržby (customer, product, qty, unitPrice/unitCost)
- `Project` — sales/dev track, fázy (`salesStage`/`devStage`)

**Zariadenia / kalibrácie**
- `Equipment` (komory/pece) + `Booking` (rezervácie na `Equipment`, timeline)
- `Instrument` — meradlá (dátumy kalibrácie, interval)
- `Interrogator` — sériové výrobky (S-line), stav sklad/predaný/zákazník/oprava, história opráv
- `RemotePc` — vzdialený prístup (RustDesk ID)

**Obsah / dokumentácia**
- `Guide` (revízie), `Photo` (ref `PhotoCategory`), `FileShare` (token+heslo, sledovanie stiahnutí)
- `Announcement`, `HeaderLink` (ERP/SharePoint odkazy), `GithubRepo` (evidencia repozitárov)

**Plánovanie / organizácia**
- `Task` (kanban, subtasks, ref `User`), `CalendarEvent` / `IcsFeed` (import z Outlooku), `Question` (FAQ), `Backbone` (sieťová/kabelážna topológia)

**Systém**
- `User` (role user/admin), `AppConfig` (key/value nastavenia appky), `SensorReading` (surové dáta teplota/vlhkosť)

Pri pridávaní nového modelu: drž sa vzoru existujúcich (mongoose Schema, slovenské komentáre pri poliach s netriviálnym významom, `trim: true` pri stringoch, `enum` pri stavoch), a zaraď ho vyššie do príslušnej kategórie.

## Konvencie
- UI a komentáre po slovensky.
- **UI/UX Pro Max skill (POUŽÍVAŤ pri UI práci):** v `.claude/skills/` sú nainštalované skills z [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (ui-ux-pro-max, ui-styling, design, design-system, brand, banner-design, slides). Pri návrhu/úprave UI komponentov, stránok, farieb, typografie či grafov najprv konzultovať skill `ui-ux-pro-max` (`SKILL.md` + vyhľadávanie: `python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<dopyt>" --design-system`). Odporúčania aplikovať v medziach existujúceho dizajnu appky (tmavá hlavička, CSS premenné v `style.css`), nie plošne prepisovať vzhľad.
- **SYLEX brand skill (IBA NA VYŽIADANIE):** skill `sylex-brand` v `.claude/skills/sylex-brand/` obsahuje oficiálne logo SYLEX (červený emblém, wordmark „sylex®", „FIBER OPTICS"), brand paletu (červená `#E2001A`) a pravidlá. Aplikovať **len keď o to používateľ výslovne požiada** („použi SYLEX logo/brand"), nikdy nie automaticky pri bežnej UI práci.
- **Hlášky a potvrdenia:** používať `toast(msg, 'success'|'error'|'info'|'warn')` a `await uiConfirm(msg)` namiesto `alert`/`confirm` (natívny `alert` je už presmerovaný na toast). Pri formulárových modaloch volať `modalSnapshot('xModal')` po otvorení a `modalGuardClose('xModal')` pri zatváraní (stráženie neuložených zmien).
- **VŽDY skontrolovať kontrast textu (častá chyba!).** Tmavé stránky (`background: var(--hdr-bg)`): texty musia mať explicitné svetlé farby (dark-on-dark). A naopak: generické modaly (`.modal-box`) majú **svetlé** pozadie (`var(--card-bg)`), takže komponenty stavané pre tmavé pozadie (napr. `.prod-table`, badge so svetlým textom) v nich **zmiznú** — vtedy modal explicitne stmaviť (vzor `#linkModal .modal-box { background:#131c35 }`) alebo textu dať tmavé farby. Po každej UI zmene si predstav, ako to vyzerá na svetlom aj tmavom podklade.
- Po zmenách overiť: `node --check` na zmenené JS, načítanie modulov, a boot test servera (beží aj bez DB — `app.listen` je nezávislý od mongo pripojenia).
- `node_modules` a `package-lock.json` (po `npm install`) necommitovať, ak nepribudli závislosti.

## Kľúčové moduly výroby
- **Plánovanie výroby** (`prod`): Kanban/Gantt výrobných zákaziek (`ProductionOrder`).
- **Riadenie výroby** (`mfg`, MES): pracoviská (`WorkCenter`), zmenové výkazy + OEE (`ShiftReport`), normované operácie/technologické postupy (`Routing`), operačný Gantt (rozvrh operácií × pracoviská).
- **Manažment** (`mgmt`): analytiky + predaj/tržby/ziskovosť (`Sale`).
- t/výrobok = t/ks × ks × prirážka (1,1 ručné, 1,0 strojový čas).
