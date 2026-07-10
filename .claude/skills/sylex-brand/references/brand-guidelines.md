# SYLEX s.r.o. — brand & logo manuál (pre dashboard)

Referenčný brand kit pre appku Sylex FOS Dashboard. Vychádza z oficiálneho loga
SYLEX (červený trojuholníkový emblém + wordmark „sylex®", varianta „FIBER OPTICS").

> ⚠️ Hodnoty farieb a wordmark v SVG sú **referenčná rekonštrukcia**. Ak máš
> oficiálny brand manuál / vektor, nahraď hodnoty a súbory v `assets/` a uprav
> tento dokument — emblém (geometria) je verný, wordmark je aproximácia fontom.

## 1. Farby

| Token | HEX | Použitie |
|-------|-----|----------|
| `--sylex-red` | `#E2001A` | **primárna** brand farba — logo, akcenty, primárne CTA, aktívne stavy |
| `--sylex-red-dark` | `#B3000F` | hover/pressed, hĺbka, gradient dole |
| `--sylex-red-soft` | `#FCE3E6` | jemné pozadia, badge, zvýraznenie na svetlom |
| `--sylex-ink` | `#12122A` | tmavý podklad (hlavička, tmavé sekcie), text na svetlom |
| `--sylex-graphite` | `#2B2F3A` | sekundárny text, ikonografia |
| `--sylex-mist` | `#F1F4F9` | svetlé pozadie stránok |
| `--sylex-white` | `#FFFFFF` | plochy kariet, text na červenej/tmavej |

**Kontrast (WCAG):** červená `#E2001A` na bielej ≈ 4.9:1 (AA pre text ≥ normálny).
Na tmavej `#12122A` je červená sýta a čitateľná pre veľké prvky/logo; pre malý
text na tmavej použi biely alebo `--sylex-red-soft`. Text na červenej ploche →
vždy **biely** (`#FFFFFF`).

## 2. Logo — varianty (v `assets/`)

- `sylex-emblem.svg` — samotný trojuholníkový emblém. Pre favicony, malé plochy,
  odznaky, loadery.
- `sylex-logo.svg` — **primárne** logo (stacked): emblém + „sylex®". Hlavičky,
  splash, login.
- `sylex-logo-horizontal.svg` — emblém + „sylex® | FIBER OPTICS". Široké hlavičky,
  päty, dokumenty, e-mailové podpisy.

Farbu loga meň cez `fill`/`stroke` (`currentColor` sa dá napojiť na text farbu).
Povolené farebné verzie: **červená na svetlom**, **červená na tmavej**, **biela
(monochróm) na červenom/tmavom**. Emblém funguje aj ako čisto biely negatív.

## 3. Ochranná zóna a minimálna veľkosť

- **Clear space:** okolo loga nechaj voľný priestor ≥ výška emblému / 2.
- **Min. veľkosť:** emblém ≥ 24 px; stacked logo ≥ 40 px na výšku; horizontálne
  logo ≥ 24 px výška emblému (inak „FIBER OPTICS" nie je čitateľné).

## 4. Typografia

- **Nadpisy / brand:** geometrický bold sans (wordmark je rounded bold). V appke
  použi existujúci `--font-title`; pre nové brandové prvky uprednostni tučný,
  mierne zaoblený bezpätkový rez, `letter-spacing` mierne záporný na veľkých
  nadpisoch, `+0.1–0.3em` na verzálkových „eyebrow" popiskoch.
- **Text / UI:** systémový sans (Segoe UI / system-ui), ako inde v appke.
- „FIBER OPTICS"-štýl popisky: verzálky, `letter-spacing ~0.16em`, tenší rez.

## 5. Do / Don't

**Áno:** zachovaj proporcie a červenú; logo na dostatočnom kontraste; emblém ako
akcent; ostrý vrchol a otvorená základňa trojuholníka.

**Nie:** nemeň pomer strán; nerotuj a nedeformuj; nedávaj červené logo na sýté
farebné/rušné pozadie bez podkladu; nepoužívaj inú než schválenú farbu; nevkladaj
tiene/glow do samotného loga; „sylex" je **malými** písmenami.

## 6. CSS tokeny (na vloženie do `:root` v `style.css`)

```css
:root {
  --sylex-red:       #E2001A;
  --sylex-red-dark:  #B3000F;
  --sylex-red-soft:  #FCE3E6;
  --sylex-ink:       #12122A;
  --sylex-graphite:  #2B2F3A;
  --sylex-mist:      #F1F4F9;
}
```

Aplikácia v medziach existujúceho dizajnu appky — pridávaj tokeny a body, kde
treba brand akcent; neprepisuj plošne existujúcu paletu (`--accent` a spol.),
pokiaľ o to používateľ výslovne nepožiada.
