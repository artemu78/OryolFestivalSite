# Фестиваль ментального здоровья в Орле — Design System

This document describes the existing site, based on the effective rules in `src/styles.css` and the components rendered by `src/main.jsx`. Later CSS declarations and applicable media queries take precedence over earlier declarations. It is a guide for consistent future changes, not a redesign.

Format reference: [What is DESIGN.md?](https://designmd.ai/what-is-design-md).

## Design principles

Create a quiet, welcoming editorial page for a small festival. Use warm milk-colored backgrounds, deep green text, generous space, large expressive headings, real portraits, and restrained botanical decoration. Russian copy should feel human, respectful, and clear.

Prefer open sections and thin separators to boxed cards. Rounded pills mark actions and short labels; tall arches frame expert portraits. Serif italics provide expressive emphasis inside otherwise sans-serif headings.

## Colors

### Core tokens

| Role | Value | Existing token / use |
| --- | --- | --- |
| Primary green | `#203e33` | `--green`; primary text, filled buttons, selected filters |
| Cream | `#f7f5ed` | `--cream`; page background, text on primary buttons, mobile navigation |
| Muted text | `#70786d` | `--muted`; descriptions and supporting copy |
| Separator | `#dedfd3` | `--line`; header/footer rules and value-pill borders |

### Supporting palette

| Role | Value | Use |
| --- | --- | --- |
| Program surface | `#efefe5` | Full-width program section |
| Event strip | `#e9ecde` | Compact festival information band |
| Strip border | `#dfe3d1` | Band boundaries |
| Program divider | `#d4d9ca` | Session separators |
| Video illustration | `#ced8b8` | Decorative “Живые голоса” panel |
| Video copy surface | `#eaece1` | Adjacent text panel |
| Portrait fallback | `#e0e5d5` | Expert image containers |
| Avatar fallback | `#dfe5d7` | Session speaker portraits |
| Sold-out badge | `#e9edde` / `#71835e` | Background / text |
| Primary hover | `#3e5f43` | Filled-button hover |
| Link hover | `#7b8757` | Navigation, text and profile links |
| Hero italic | `#77875b` | `h1 em` |
| Section italic | `#7c895b` | `h2 em` |
| Section label | `#828b76` | Small numbered labels |
| Focus | `#9a694b` | Keyboard focus outline |
| Selection | `#d4dfa8` | Selected text |

Supporting text uses several additional muted olive shades. Preserve component-specific values when editing existing components; use the core tokens for new general surfaces and text. These colors are not a separate success/error/warning system.

## Typography

Fonts are imported from Google Fonts: **Golos Text** (400, 500, 600, 700) and **Manrope** (400, 500, 600, 700, 800). Base text uses Golos Text with a sans-serif fallback. `h1` and `h2` use Manrope, then Golos Text, then sans-serif. Heading emphasis uses Georgia, then Times New Roman, then serif.

| Style | Desktop | At width ≤700px |
| --- | --- | --- |
| Hero heading | `clamp(75px, 8.2vw, 111px)`, weight 500, line-height 1.02, tracking `-.055em` | 84px |
| Section heading | 45px, weight 500, line-height 1.2, tracking `-.055em` | 36px; About uses 31px |
| Closing heading | 65px | 44px |
| Video-copy heading | 30px; 28px at ≤1000px | 29px |
| Serif heading emphasis | Weight 400, tracking `-.05em` | Same |
| Hero subtitle | 19px / 1.5 | 17px |
| Hero description | 13px / 1.8 | 12px |
| About paragraph | 13px / 1.9 | 12px / 1.85 |
| Session title | 23px, weight 500, tracking `-.6px` | 21px / 1.35 |
| Session description | 12px / 1.8 | 11px |
| Session time | Manrope, 19px, weight 500, tracking `-.5px`, no wrapping | 20px |
| Expert name | 15px / 1.5, weight 500 | 13px / 1.45 |
| Expert description | 11px / 1.8 | 10px |
| Section label | 10px / 1.6, weight 500, tracking 1.6px | 9px |
| Session tag | 8px, tracking 1.6px | Same |
| Footer | 9px; secondary text 8px | Same |

Small metadata generally ranges from 9–12px. Preserve the hierarchy; avoid turning every label into a heading. Headings and paragraphs have zero default margin and receive spacing from their components.

## Spacing and layout

The current CSS uses component-specific measurements, not a strict base-unit scale. Common spacing values are 8, 12, 15, 18, 20, 22, 24, 27, 28, 30, 32, 36, 40 and 48px. Reuse the closest existing component rhythm rather than imposing a new scale.

- Content wrapper: maximum width 1240px, centered, with 48px horizontal padding. Padding becomes 30px at ≤1000px and 22px at ≤700px.
- Standard sections: 94px top and bottom padding; 58px on mobile.
- Section labels: 30px bottom margin; 22px on mobile. Section-heading rows use a 20px gap and 32px bottom margin; mobile stacks them with 25px bottom margin.
- About: label/content columns in a `1fr 3fr` ratio with a 40px gap. At ≤1000px the label moves above the content. Paragraph columns use a 36px gap and stack at ≤700px.
- Expert grid: **three columns**, 23px column gaps and 40px row gaps. At ≤1000px column gaps become 16px; at ≤700px use two columns with 15px column gaps and 30px row gaps.
- Video section: two equal panels; stacked at ≤700px.
- Location: 65px top padding, 50px at ≤700px, and zero bottom padding. Address and map use flex proportions `1 : 1.5`, a 36px gap and 28px top margin. At ≤800px stack them at full width with a 24px gap; map height becomes 350px. Desktop map height comes from its 480px HTML attribute.
- Closing: 100px top / 90px bottom padding; 70px / 58px on mobile.

## Components

### Header and navigation

The header overlays the hero: absolute positioning at the top, horizontally centered, full width within `.wrap`, with `z-index: 5`. Desktop vertical padding is 27px; mobile uses 20px. The brand combines a 43px flower and small stacked text; the flower becomes 35px on mobile.

Desktop navigation is a horizontal row with 30px gaps, reduced to 17px at ≤1000px. The VK link is an outlined pill (`#bfc7b7`, 1px border, 30px radius, 12px 17px padding).

At ≤700px the menu button appears and navigation is hidden until `.nav.open`. The open menu sits directly below the header, uses cream fill, 24px padding, vertical links with 22px gaps, and a bottom divider.

### Hero and background media

The active hero is full-width, one-column, and at least one viewport tall (`100vh` fallback, then `100svh`). Desktop padding is `145px max(48px, calc((100% - 1144px) / 2)) 80px`; horizontal padding becomes 30px at ≤1000px and 22px at ≤700px. Mobile top padding is 125px. Copy has a maximum width of 560px.

Poster and video fill the hero with `object-fit: cover`, centered both on desktop and mobile (`50% center`). Mobile screens (≤700px) use a dedicated vertical 9:16 video (`gemini_generated_video_mobile.mp4`) and poster (`1001-mobile.png`) reframed for portrait screens so the eucalyptus leaves cleanly frame the right edge and leave the text readable. The cream overlay fades horizontally from opacity .84 at the left to .55 at 38% and zero at 70%. Mobile uses .92 at the left, .74 at 58%, and .35 at the right.

Keep the poster visible until the muted, looping background video actually starts. Fade video opacity over .45s; restore the poster on playback error. The playback pill sits at the bottom right, with 9px 14px padding, 24px radius, `#bec6b1` border and `#f7f5edda` background.

### Buttons, links and pills

- Primary action: deep green fill, cream text, 30px radius, 17px 23px padding, 12px text and 45px internal gap. Mobile uses 14px 21px padding and 11px text. Arrow size is 20px.
- Hover: fill becomes `#3e5f43`; move upward 2px over .2s.
- Text links: inline flex, 35px gap, 11px text, 15px vertical padding and 1px `#aab49d` bottom border.
- Program filters: wrapping row with 8px gaps, 28px bottom margin; buttons use 24px radius, 1px `#d5dacb` border, transparent fill, `#65725c` text and 10px 19px padding. Active filters use green fill/border and cream text. Mobile padding is 9px 16px with 10px text.
- Value pills: outlined, 25px radius, 10px 13px padding, 10px text; mobile uses 9px 11px and 9px text.
- Sold-out status: cream-green pill, 30px radius, 11px 17px padding, 10px text and 24px top margin. It is informational, not an action.

### Event information strip

Use a tinted full-width band with thin top and bottom borders. Inside, desktop columns are `1.4fr 1fr 1fr 50px`, with 30px gaps and 26px vertical padding. Mobile uses two columns, 23px 15px gaps and 23px vertical padding. Main text is 16px desktop / 14px mobile, supported by smaller muted copy.

### Program sessions

Use divided rows rather than detached cards. Desktop row columns are `160px 1fr 50px` with 30px gaps and 32px vertical padding. At ≤1000px use `125px 1fr 25px` and 20px gaps. At ≤700px time occupies the full first row; content and the event number occupy the second row in `1fr 24px` columns, with 15px gaps and 24px vertical padding.

Descriptions have a maximum width of 590px. Speaker links wrap with 12px 20px gaps and combine a circular 48px portrait with a name; portraits become 40px on mobile. Use `object-fit: cover` and `object-position: 50% 30%`. Metadata wraps horizontally on desktop and stacks with 7px gaps on mobile. Access conditions use `#65764f`.

### Expert portraits

Cards have no outer border or shadow. Portrait containers use a tall arch (`100px 100px 4px 4px` radius), `aspect-ratio: 1 / 1.1` and automatic height. Mobile uses `80px 80px 3px 3px` and `1 / 1.2`. Images fill the container with `object-fit: cover` and `object-position: 50% 30%`.

Names sit 20px below portraits, reduced to 15px on mobile. Professional roles and descriptions are muted. Profile links use 10px text, a `#b5bfab` underline border, 5px bottom padding and 14px top margin; mobile text is 9px.

### “Живые голоса” panels

The decorative panel uses botanical SVG shapes, a thin tilted ellipse, and large text with serif italic emphasis. Its minimum height is 365px with 40px padding; mobile uses 270px and 30px. The adjacent copy panel has 42px 38px padding, reduced to 32px 28px at ≤1000px and 28px on mobile.

Use 8px outer corner radii: left/right on desktop, top/bottom when stacked. This section currently announces future expert videos and links to the community; it is not an implemented video gallery.

### Footer

Use a thin top border, muted small text, a horizontal flex layout and 26px gaps. Mobile wraps with 21px gaps; festival details take the full first row. Preserve the exact studio credit: “Сайт — Студия Артёма Рева”.

## Elevation and decoration

Keep most surfaces flat. Mobile open navigation uses `0 10px 15px #203e330a`. Header and mobile navigation use layer 5; hero copy uses 1, playback control 2, background media −1 within an isolated hero; the focused skip link uses 10.

Flowers, stars and tilted orbit lines are quiet accents. The stylesheet also contains older hero illustration and placeholder portrait styles (`.hero-art`, `.art-arch`, `.plant`, `.art-sticker`, `.expert-initials`, `.expert-symbol`, and color variants). They are not rendered by the current page and should not be treated as required active components.

## Motion and accessibility

Use smooth anchor scrolling with 30px scroll padding. Preserve the skip link, which becomes visible on focus, and keyboard outlines: 3px solid `#9a694b` with 5px offset. Portrait links use an inward −5px focus offset. Interactive elements need clear names and visible focus; menu state uses `aria-expanded`, and filter state uses `aria-pressed`.

`prefers-reduced-motion: reduce` disables CSS transitions and smooth scrolling. It does **not** currently stop video autoplay; do not describe it as doing so. Keep the background-video pause control. Color contrast and small-text readability have not been formally audited by this document.

## Responsive rules

| Breakpoint | Effective behavior |
| --- | --- |
| ≥1500px | Legacy `.hero` minimum-height rule exists, but the later `.hero-with-media` viewport-height rule takes precedence |
| ≤1000px | Narrower wrapper/hero padding, tighter navigation and session columns, stacked About label |
| ≤800px | Address and map stack |
| ≤700px | Menu navigation, mobile type/spacing, stacked session layout, two-column expert grid, stacked video panels, wrapping footer |

Preserve these distinct boundaries; the map stacks earlier than the rest of the mobile layout.

## Content and maintenance guidelines

- Keep Russian copy, the calm visual tone, milk backgrounds, deep green and expressive headings.
- Preserve section order: header, hero, event strip, About, Program, Experts, Live Voices, Location, closing, footer.
- Reuse the existing components and core color tokens. Account for later overrides before changing a selector.
- Use the shared expert registry for names, portraits and descriptions; do not invent credentials or restore excluded speakers.
- All 35 festival places are occupied. Do not add ticket sales, festival registration or booking controls without a request. Session access conditions are program information.
- Do not invent a studio contact link. Retain the exact credit until a contact is supplied.
- Build static asset URLs with `import.meta.env.BASE_URL` so they work under the GitHub Pages repository path.
- After visual changes, check desktop and mobile views, run the build and `git diff --check`. Keep this document aligned with the effective CSS and rendered components.
