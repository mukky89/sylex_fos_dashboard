---
name: sylex-logo
description: "Oficiálne logo SYLEX (červený trojuholníkový emblém so slovom „sylex®", #E2001A) ako prenositeľný, samostatný kit — hotové SVG/PNG assety (červená + biely negatív), pravidlá použitia (veľkosti, ochranná zóna, kontrast), a hotové snippety pre web (HTML/CSS), e-mail, PDF/Word a favicon. Prenositeľný: priečinok skillu stačí skopírovať do `.claude/skills/` v ľubovoľnom projekte. APLIKOVAŤ IBA NA VÝSLOVNÉ VYŽIADANIE (napr. „daj tam SYLEX logo", „nabranduj to logom Sylexu"); NEAKTIVOVAŤ proaktívne pri bežnej UI práci."
---

# SYLEX logo kit

Samostatný, **prenositeľný** balík s oficiálnym logom SYLEX. Slúži na to, aby sa
skutočné firemné logo dalo jednotne a správne vložiť do akéhokoľvek projektu
(web, e-mail, dokumenty).

## ⛔ Kedy (NE)aktivovať
Skill je **on-demand**. Aktivuj ho **iba** keď používateľ výslovne žiada použiť
SYLEX logo/brand (napr. „pridaj oficiálne logo", „nabranduj hlavičku Sylexom").
Pri bežnej UI/UX práci (nová stránka, komponent, farby grafu) skill **nepoužívaj**
— na to slúži `ui-ux-pro-max`. Ak nie je jasné, či to používateľ chce, **opýtaj sa**.

## 📦 Prenositeľnosť do iných projektov
Skill je self-contained — assety sú reálne súbory v `assets/`, nič sa nesťahuje.
Použitie v inom projekte:

1. **Ako skill:** skopíruj celý priečinok `sylex-logo/` do `.claude/skills/`
   cieľového projektu. Claude ho potom nájde a použije na vyžiadanie.
2. **Len assety:** skopíruj obsah `assets/` do statického priečinka projektu
   (napr. `public/img/`, `src/assets/`) a odkazuj naň v kóde.

Assety sú **self-contained SVG** (raster je vložený ako base64 dátová URL vnútri
SVG), takže fungujú aj bez ďalších externých súborov.

## Assety (`assets/`)

| Súbor | Formát | Kedy použiť |
|-------|--------|-------------|
| `sylex-logo.svg` | SVG (vektor obal + embedded PNG) | **Primárne** logo na webe/HTML. Škáluje sa ostro do každej veľkosti. |
| `sylex-logo.png` | PNG 1240×947, transparentné | E-mail (hostované cez absolútnu URL), PDF/Word export, rastrové použitie. |
| `sylex-logo-white.svg` | SVG (biely negatív) | Na **tmavom alebo červenom** podklade, keď červená nemá dosť kontrastu. |

Pomer strán loga je **1240 : 947 ≈ 1,31 : 1**. Vždy zachovaj tento pomer
(`width:auto` / `height:auto` / `object-fit:contain`) — nikdy nedeformuj.

## Brand farba
- **SYLEX červená:** `#E2001A` (RGB 226, 0, 26).
- Negatív: čistá biela `#FFFFFF` (súbor `sylex-logo-white.svg`).
- Logo neprefarbuj na iné farby. Povolené sú len oficiálna červená a biely negatív.

## Kontrast — ktorú variantu zvoliť
- **Svetlé pozadie** (biela, svetlosivá) → `sylex-logo.svg` (červená).
- **Tmavé pozadie** (tmavomodrá/čierna hlavička) → červená je čitateľná, ale pre
  maximálny kontrast použi `sylex-logo-white.svg`.
- **Červené pozadie** → vždy `sylex-logo-white.svg`.

## Ochranná zóna a minimálna veľkosť
- **Ochranná zóna:** okolo loga nechaj voľný priestor aspoň vo výške „trojuholníka"
  (~1/4 výšky loga). Nelep naň text ani iné prvky.
- **Minimálna veľkosť:** na obrazovke min. výška **20 px**, v tlači min. **8 mm**,
  aby zostal čitateľný wordmark „sylex".

## Použitie — web (HTML/CSS)
```html
<img src="/img/sylex-logo.svg" alt="SYLEX" height="26">
```
```css
/* Logo v hlavičke vedľa názvu produktu */
.brand-logo { height: 26px; width: auto; display: block; flex-shrink: 0; }
```
Na farebnom/tmavom podklade, kde treba biele logo, prehoď `src` na
`sylex-logo-white.svg`. (Prípadne mono-negatív cez CSS masku:
`mask: url(/img/sylex-logo.png) center/contain no-repeat; background: currentColor;`.)

## Použitie — e-mail
Obrázky v e-maile potrebujú **absolútnu, hostovanú URL** (base64/SVG mnefungujú
spoľahlivo v Gmaile/Outlooku). Použi hostované PNG a nechaj textový fallback:
```html
<img src="https://APP_URL/img/sylex-logo.png" alt="SYLEX"
     height="30" style="display:block;height:30px;width:auto;border:0;outline:none;">
```
Ak verejná adresa nie je známa, zobraz textové „SYLEX" namiesto obrázka.

## Použitie — PDF / Word export
Použi **PNG** (`sylex-logo.png`) a zachovaj pomer strán. Príklad (knižnica `docx`):
```js
new ImageRun({ data: fs.readFileSync('sylex-logo.png'),
  transformation: { width: 59, height: 45 }, type: 'png' }); // 59:45 ≈ 1,31:1
```

## Použitie — favicon
Pre malé plochy je čitateľnejší samotný emblém, no logo funguje aj celé.
Odkáž na SVG (`<link rel="icon" href="/img/sylex-logo.svg">`) alebo si vygeneruj
PNG ikony z `sylex-logo.png` (nástroj mimo tohto skillu).

## ✅ DO / ⛔ DON'T
- ✅ Zachovaj pomer strán, ochrannú zónu a min. veľkosť.
- ✅ Na tmavom/červenom podklade použi biely negatív.
- ⛔ Nedeformuj (neroztiahni/nestlač), nerotuj, nepridávaj tieň/obrys.
- ⛔ Neprefarbuj na iné farby než oficiálnu červenú `#E2001A` alebo bielu.
- ⛔ Neumiestňuj na rušivé/nekontrastné pozadie (napr. červené logo na červenej).

## Vzťah k skillu `sylex-brand`
`sylex-brand` je širší brand-kit (paleta, viac lockupov, pravidlá) viazaný na
projekt FOS Dashboard a jeho SVG wordmark je len aproximácia. Tento skill
`sylex-logo` obsahuje **skutočné oficiálne logo** a je stavaný ako prenositeľný
do iných projektov. Ak potrebuješ len logo, použi tento skill.
