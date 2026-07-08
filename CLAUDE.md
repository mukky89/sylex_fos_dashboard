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

## Konvencie
- UI a komentáre po slovensky.
- **Hlášky a potvrdenia:** používať `toast(msg, 'success'|'error'|'info'|'warn')` a `await uiConfirm(msg)` namiesto `alert`/`confirm` (natívny `alert` je už presmerovaný na toast). Pri formulárových modaloch volať `modalSnapshot('xModal')` po otvorení a `modalGuardClose('xModal')` pri zatváraní (stráženie neuložených zmien).
- **VŽDY skontrolovať kontrast textu (častá chyba!).** Tmavé stránky (`background: var(--hdr-bg)`): texty musia mať explicitné svetlé farby (dark-on-dark). A naopak: generické modaly (`.modal-box`) majú **svetlé** pozadie (`var(--card-bg)`), takže komponenty stavané pre tmavé pozadie (napr. `.prod-table`, badge so svetlým textom) v nich **zmiznú** — vtedy modal explicitne stmaviť (vzor `#linkModal .modal-box { background:#131c35 }`) alebo textu dať tmavé farby. Po každej UI zmene si predstav, ako to vyzerá na svetlom aj tmavom podklade.
- Po zmenách overiť: `node --check` na zmenené JS, načítanie modulov, a boot test servera (beží aj bez DB — `app.listen` je nezávislý od mongo pripojenia).
- `node_modules` a `package-lock.json` (po `npm install`) necommitovať, ak nepribudli závislosti.

## Kľúčové moduly výroby
- **Plánovanie výroby** (`prod`): Kanban/Gantt výrobných zákaziek (`ProductionOrder`).
- **Riadenie výroby** (`mfg`, MES): pracoviská (`WorkCenter`), zmenové výkazy + OEE (`ShiftReport`), normované operácie/technologické postupy (`Routing`), operačný Gantt (rozvrh operácií × pracoviská).
- **Manažment** (`mgmt`): analytiky + predaj/tržby/ziskovosť (`Sale`).
- t/výrobok = t/ks × ks × prirážka (1,1 ručné, 1,0 strojový čas).
