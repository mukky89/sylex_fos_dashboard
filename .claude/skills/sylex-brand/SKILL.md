---
name: sylex-brand
description: "SYLEX s.r.o. brand & logo kit pre Sylex FOS Dashboard — červená brand paleta (#E2001A), trojuholníkový emblém, wordmark „sylex®" a varianta „FIBER OPTICS", pravidlá použitia, kontrast, ochranná zóna, hotové SVG assety a CSS tokeny. APLIKOVAŤ IBA NA VÝSLOVNÉ VYŽIADANIE používateľa (napr. „použi SYLEX logo/brand", „pridaj oficiálne logo", „nabranduj to podľa Sylexu"). NEPOUŽÍVAŤ proaktívne ani automaticky pri bežnej UI práci — samotná zmena UI nie je dôvod aktivovať tento skill."
---

# SYLEX brand & logo kit

Oficiálna vizuálna identita SYLEX s.r.o. pre použitie v appke. Obsahuje logo
assety, brand farby a pravidlá.

## ⛔ Kedy (NE)aktivovať — dôležité

Tento skill je **on-demand**. Používateľ si výslovne želal, aby sa brand/logo
aplikovali **len keď o to požiada**.

- **Aktivuj IBA**, keď používateľ výslovne žiada použiť SYLEX logo/brand/identitu
  — napr. „daj tam SYLEX logo", „nabranduj login podľa Sylexu", „použi firemnú
  červenú", „oficiálny brand na túto stránku".
- **NEAKTIVUJ**, keď ide o bežnú UI/UX prácu (nová stránka, komponent, farby
  grafu…). Samotná úprava vzhľadu **nie je** dôvod siahnuť po tomto skille — na
  to slúži `ui-ux-pro-max`. Pri bežnej UI práci sa drž existujúcej palety appky.

Ak nie je jasné, či to používateľ chce brandovať oficiálnou identitou, **opýtaj
sa**, nie aplikuj automaticky.

## Assety (`.claude/skills/sylex-brand/assets/`)

| Súbor | Kedy použiť |
|-------|-------------|
| `sylex-emblem.svg` | favicon, malé plochy, odznak, loader — samotný trojuholník |
| `sylex-logo.svg` | primárne (stacked) logo — hlavička, login, splash |
| `sylex-logo-horizontal.svg` | emblém + „sylex® \| FIBER OPTICS" — široké hlavičky, päty |

Farba loga sa mení cez `fill`/`stroke` (červená `#E2001A`, alebo biely negatív na
tmavom/červenom podklade).

> Wordmark v SVG je aproximácia geometrickým fontom; emblém je verná geometria.
> Pre tlač/pixel-perfect nahraď vendorovým originálom do `assets/`.

## Brand farby (skrátene)

- `--sylex-red #E2001A` (primárna), `--sylex-red-dark #B3000F` (hover/hĺbka),
  `--sylex-red-soft #FCE3E6` (jemné pozadia/badge)
- `--sylex-ink #12122A` (tmavý podklad/text), `--sylex-mist #F1F4F9` (svetlé pozadie)
- Text na červenej ploche = vždy **biely**. Malý text na tmavej = biely/soft, nie sýta červená.

Plné pravidlá (kontrast, ochranná zóna, min. veľkosť, typografia, do/don't,
kompletné CSS tokeny) → **`references/brand-guidelines.md`**. Prečítaj ho pred
zásahom do systému.

## Ako aplikovať do appky (keď používateľ požiada)

1. Prečítaj `references/brand-guidelines.md`.
2. Pridaj brand tokeny do `:root` v `public/css/style.css` (ak ešte nie sú).
3. Vlož príslušný SVG — buď skopíruj obsah inline do `index.html`/stránky, alebo
   ulož do `public/img/` a odkáž `<img src>`. Pre existujúcu hlavičku appky over
   kontrast na tmavom `--hdr-bg`.
4. Aplikuj v **medziach existujúceho dizajnu** — brand akcenty pridávaj cielene,
   neprepisuj plošne existujúcu paletu (`--accent` a spol.), pokiaľ to používateľ
   výslovne nechce.
5. Skontroluj kontrast na svetlom aj tmavom podklade a over vizuálne (screenshot).
6. Dodrž deploy postup z `CLAUDE.md` (verzia, changelog, commit, merge do master).
