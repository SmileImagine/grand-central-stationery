# Grand Central Stationery

Classroom display pages that show typed text and typed music at the largest size that fits the screen, with note names colour-coded (ChromaNotes). Single HTML files, no build step, and everything needed to run offline is in this folder.

## Pages

| File | What it is |
|---|---|
| `Grand Central Stationery Cells v1.html` | The main page: heading, text and notation cells; edit and present modes; dark mode; export/import. |
| `Grand Central Stationery Notation v1.html` | Single notation cell (abcjs) with ChromaNotes colours, letters in noteheads, playback cursor. |
| `Grand Central Stationery ChromaNotes Proportional v1.html` | Single text cell, proportional faces with a font picker. |
| `Grand Central Stationery ChromaNotes Shadow Layer v4.html` | Single text cell, monospace grid fitter. |
| `ANALYSIS-2026-09-20.md` | Design notes: findings, verified behaviour, and the reasons behind each choice. |

## Running

Every page opens directly from Finder, playback included. `serve.command` (macOS) starts a local server in this folder and opens the cells page; it is optional, and slightly quicker to load because the served pages fetch the 88 piano samples individually while a page opened from disk loads them all from one embedded file.

Text: type; note names A–G colour themselves; `#` and `b` after a note become ♯ and ♭. Newlines are respected. Notation: type ABC, e.g. `C D E F | G A B c |` with `w: do re mi fa` for lyrics; `L:1/4` is the default length, `C2` doubles, `z` rests, `[CEG]` chords, `K:G` for a key.

Present mode: PageDown / PageUp move between cells, Esc returns. Present 3D lays the cells out in space (impress.js), starting from an overview; the 3D button in a cell's header sets its position, rotation, scale and stage background.

## Offline assets

- `vendor/abcjs-basic-min.js`, `vendor/abcjs-audio.css`: abcjs 6.7.0 (MIT).
- `vendor/impress.js`: impress.js 2.0.0 (MIT), used by Present 3D.
- `vendor/soundfont/`: piano samples from midi-js-soundfonts (MIT), used by abcjs playback; `piano-embedded.js` holds the same samples as base64 for pages opened from disk.
- `fonts/`: local copies of Atkinson Hyperlegible, Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono, Lexend, Andika and Noto Music (all SIL Open Font License), with `fonts/fonts.css`.
- `gcs-accidentals.woff2`: two zero-advance glyphs (♯ ♭) derived from Noto Music so "C♭" is as wide as "C"; also embedded in the pages.
