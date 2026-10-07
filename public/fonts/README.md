# Local web fonts

Golos Text and Manrope are served locally as variable WOFF2 fonts, with separate
Cyrillic and Latin subsets. Original SIL Open Font Licenses are included here.

Source: Google Fonts CSS API, downloaded 2026-10-07 with a modern browser user agent:
https://fonts.googleapis.com/css2?family=Golos+Text:wght@400..700&family=Manrope:wght@400..800&display=swap

The declarations and Unicode ranges in `src/fonts.css` come from that stylesheet.
Golos Text covers weights 400–700; Manrope covers 400–800. Cyrillic subsets are
preloaded in `index.html`; Latin subsets load on demand (including digits and
punctuation). `font-display: swap` keeps fallback text visible during loading.

Filenames include the first 16 hexadecimal characters of each file's SHA-256.
When replacing a font, update its filename, CSS URL and matching HTML preload
together. Keep the preload URL identical to the CSS URL after base-path expansion.
Vite rewrites the CSS public-asset paths for the configured deployment base;
HTML preloads use `%BASE_URL%`.
