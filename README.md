# Grand Central Stationery

A classroom display page for music lessons: typed text and typed music shown at the largest size that fits the screen, with note names colour-coded (ChromaNotes). One HTML file, no build step, and everything needed to run offline is in this folder.

## Layout

| Path | What it is |
|---|---|
| `Grand Central Stationery.html` | **The page.** Heading, text and notation cells; edit, present and 3D present modes; dark mode; undo; share link; export and import. |
| `serve.command` | macOS launcher: serves this folder locally and opens the page. Optional (see Running). |
| `docs/ANALYSIS-2026-09-20.md` | Design notes: findings, verified behaviour, and the reasons behind each choice. |
| `lab/` | Single-cell test pages the main page grew out of: `Notation v1.html` (abcjs), `Text Proportional v1.html` (canvas fitter, font picker), `Text Mono Grid v4.html` (monospace grid fitter). |
| `old/` | Earlier versions and experiments, kept for reference. |
| `fonts/`, `vendor/`, `gcs-accidentals.woff2` | Offline assets (below). |

## Running

The page opens directly from Finder, playback included. `serve.command` starts a local server and opens the page; it loads slightly faster because the served page fetches the 88 piano samples individually, while a page opened from disk loads them all from one embedded file.

## Using it

**Cells.** `+ Text`, `+ Heading`, `+ Notation` add cells; Cmd+Enter inside a cell adds a text cell below it (Cmd+Shift+Enter a notation cell). Reorder by dragging the grip (⠿) or by typing a position in the number box. ✕ deletes at once; Undo in the toast (or Cmd+Z outside a text field) brings the cell back. Cmd+Z and Shift+Cmd+Z inside a cell undo and redo its text.

**Text.** Type; note names A–G colour themselves, and `#` or `b` after a note becomes ♯ or ♭ at no extra width. Newlines are respected. The font menu offers several legible faces.

**Notation.** Type ABC, e.g. `C D E F | G A B c |` with `w: do re mi fa` for lyrics. `L:1/4` is the default length, `C2` doubles, `z` rests, `[CEG]` chords, `K:G` for a key, `Q:1/4=90` for a tempo. Noteheads carry their letter and colour; accidentals sit small beside the head. Play gives a two-beat count-in, a cursor in the colour of each note, and a lamp that pulses on the beat. Drag the cursor along the staff to seek, before or during playback. Tempo scales the speed; Transpose shifts letters, colours and sound together. Proportional (toolbar) spaces notes by duration so the cursor sweeps evenly.

**Presenting.** Present shows one cell at a time: PageDown / PageUp move, the number box jumps, Esc returns. Present 3D lays the cells out in space (impress.js), starting from an overview; the 3D button in a cell's header sets its position, rotation, scale and stage background, and Reset 3D layout on the overview clears them all (with Undo). Plain Present is the lighter mode: no 3D transforms, so text stays crisp and it works on any machine.

**Menu (⋯).** Text font, proportional spacing, Share link, Export, Import and Clear.

**Sharing.** Share link copies a URL that carries every cell, compressed, in the address itself (no server involved). Export writes the same content as a text file; Import reads one back.

### Document format

Plain text. An optional first line `=== page {json}` holds page settings (text font, proportional spacing). Then, per cell, a separator line `=== heading`, `=== text` or `=== abc`, optionally followed by json (`x y z r rx ry s` for 3D position, `bg` background, `tr` transposition), and the cell's text verbatim until the next separator. A file without separators becomes one text cell.

## Offline assets

- `vendor/abcjs-basic-min.js`, `vendor/abcjs-audio.css`: abcjs 6.7.0 (MIT).
- `vendor/impress.js`: impress.js 2.0.0 (MIT), used by Present 3D.
- `vendor/soundfont/`: piano samples from midi-js-soundfonts (MIT), used by abcjs playback; `piano-embedded.js` holds the same samples as base64 for pages opened from disk.
- `fonts/`: local copies of Atkinson Hyperlegible, Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono, Lexend, Andika and Noto Music (all SIL Open Font License), with `fonts/fonts.css`.
- The wordmark is inline SVG outlines made from Cinzel and Caveat (both SIL Open Font License), so it needs no font request.
- `gcs-accidentals.woff2`: two zero-advance glyphs (♯ ♭) derived from Noto Music so "C♭" is as wide as "C"; also embedded in the pages.
