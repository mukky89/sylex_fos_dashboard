# Sylex FOS Dashboard — pokyny pre Clauda

## Deploy (DÔLEŽITÉ — robiť vždy automaticky)
Po dokončení každej úlohy/funkcie **vždy automaticky nasadím do produkcie bez pýtania**:
1. Zdvihnúť verziu v `package.json` (minor bump, napr. 1.32.0 → 1.33.0; pri väčšej zmene podľa uváženia). Verzia sa zobrazuje v hlavičke appky cez `/api/version`.
2. Commit na vývojovú vetvu (`claude/...`) a push.
3. Zlúčiť vývojovú vetvu do `master` (`git merge --no-ff`) a `git push origin master`.
4. **Railway** automaticky nasadí z `master` (build 1–2 min).
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
- Tmavé stránky (`background: var(--hdr-bg)`): texty musia mať explicitné svetlé farby (pozor na dark-on-dark).
- Po zmenách overiť: `node --check` na zmenené JS, načítanie modulov, a boot test servera (beží aj bez DB — `app.listen` je nezávislý od mongo pripojenia).
- `node_modules` a `package-lock.json` (po `npm install`) necommitovať, ak nepribudli závislosti.

## Kľúčové moduly výroby
- **Plánovanie výroby** (`prod`): Kanban/Gantt výrobných zákaziek (`ProductionOrder`).
- **Riadenie výroby** (`mfg`, MES): pracoviská (`WorkCenter`), zmenové výkazy + OEE (`ShiftReport`), normované operácie/technologické postupy (`Routing`), operačný Gantt (rozvrh operácií × pracoviská).
- **Manažment** (`mgmt`): analytiky + predaj/tržby/ziskovosť (`Sale`).
- t/výrobok = t/ks × ks × prirážka (1,1 ručné, 1,0 strojový čas).
