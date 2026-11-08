# Grand Central Stationery

A classroom display page for music lessons: typed text and typed music shown at the largest size that fits the screen, with note names colour-coded (ChromaNotes). One HTML file, no build step, and everything needed to run offline is in this folder.

**Live:** https://smileimagine.github.io/grand-central-stationery/

Nothing is uploaded: lessons are saved in the browser you use, and a Share link carries a lesson inside the address itself.

## Layout

| Path | What it is |
|---|---|
| `index.html` | **The page.** Heading, text and notation cells; edit, present and 3D present modes; dark mode; undo; share link; export and import. |
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

**Notation.** Type ABC, e.g. `C D E F | G A B c |` with `w: do re mi fa` for lyrics. `L:1/4` is the default length, `C2` doubles, `z` rests, `[CEG]` chords, `K:G` for a key, `Q:1/4=90` for a tempo. Noteheads carry their letter and colour; accidentals sit small beside the head. Play gives a two-beat count-in, a cursor in the colour of each note, and a lamp that pulses on the beat. Drag the cursor along the staff to seek, before or during playback. Tempo sets the playback speed in beats per minute; Transpose shifts letters, colours and sound together. Instrument also chooses the playback sound (piano, electric piano, nylon guitar, recorder) and shows a piano, a Wicki-Hayden keyboard (ISO QWERTY rows with J as middle C; Transpose moves the pitches on the keys so J stays the root and the fingering does not change), a ukulele fretboard with a scrolling tab lane, or a large recorder (the sounding fingering solid; holes that must change for the next note fade in with its colour and flicker) under the staff that plays along: the sounding note's key is lit, the next note's key is marked on deck, and a runner leaves the sounding key as it plays and arrives on the next as it sounds, so its speed shows how far the hand must move in the time it has. The ukulele picks the place nearest the hand's last fret; fixed-range instruments shift the tune by octaves to fit. Proportional (toolbar) spaces notes by duration so the cursor sweeps evenly. Under the transport, warnings (red) point out what abcjs leaves silent: a bar that is longer or shorter than the metre (or than 4/4 when there is no M: line), a tie between different notes (abcjs swallows the next note of that pitch; a slur wants parentheses), a lyric line whose syllables do not match its notes, a transposition that lands in a key with five or more sharps or flats (with a friendlier interval nearby), notes the chosen instrument cannot show, and abcjs's own parse errors reworded with line and character. Tips (grey) note things worth knowing: no K: line, a broken rhythm (C>D), a leap of more than an octave, an accidental repeated within a bar, lyrics over rests, and an instrument view shifted by octaves. The ? beside each opens an explanation with a corrected example. A tune with no L: line gets L:1/4 whether or not it has a K: line.

**Playing along.** The loop button in the transport repeats the tune without a gap. Play chooses what sounds: the melody with its chord symbols, the chords alone as a backing track while the picture still follows the melody, or the melody alone. Harmony puts a Roman numeral under each chord symbol, coloured by function (green tonic, blue subdominant, red dominant); Detect chords writes a chord for each half bar from the melody and the key when none are written, shows it, and plays it, so a tune with no chords still has a backing track. Written chord symbols always win. Style sets how those chords are accompanied. Band, the default, is the page's own accompanist: chord voicings on electric piano that move by the smallest step from one chord to the next, a bass line of roots and fifths with approach notes into the next chord, and a drum kit whose patterns thicken with the Energy slider, vary from bar to bar, and fill at the end of every fourth bar; Detail adds sevenths, ninths, approach notes and ghost notes, and the arrow deals a new variation (the variation is seeded, so a loop repeats exactly). At low Energy a soft pad holds each chord under the sparse hits, and the drummer clicks the count-in. The band is scheduled from the exact AudioContext time at which abcjs starts its own audio, so it stays locked to the melody. The classic styles play through abcjs's own pattern engine: Block chords, Boom-chick, Waltz, Arpeggio, Bossa, Swing (swung eighths) and March, each with its own bass, chord instrument and drums; Auto takes the waltz in triple time and boom-chick otherwise, Plain is abcjs's own, and a tune that sets `%%MIDI gchord` itself keeps it. A page opened from disk plays the styles without drums.

**The band's score as text.** The Pattern button beside the Band's sliders opens the band's parts as text, in a small pattern language of the TidalCycles and Strudel family written for this page (so the page stays one file under one licence). One bar is one cycle, and the steps of a line share the bar equally, so `bd ~ sd ~` is a kick on one and a snare on three. `~` rests, `_` holds the step before it on, `[ ]` subdivides a step, `< >` alternates bar by bar, `*` and `/` speed a step up or slow it down, `!` repeats it, `@` weights it, `?` drops it by chance (`?0.3` for a 30% chance), `(3,8)` spreads three hits over eight steps the Euclidean way, `:` sets a level (`sd:.2` is a ghost note), `,` and a new line stack parts, and `//` starts a comment. The score has sections: `drums:`, `bass:` and `chords:` open a part (lines before any label are drums). Drum words are `bd` kick, `sd` snare, `hh` closed hat, `oh` open hat, `rim`, `cp` clap, `cr` crash, `rd` ride, `sh` shaker and `tb` tambourine. Bass words are relative to the chord in force: `r` the root, `3` `5` `7` its third, fifth and seventh, `8` the root an octave up, `a` an approach note into the next chord, `n` the next chord's root. Chord words are `ch` the voicing (voice-led as before), `pad` the voicing held softly, and `c1`..`c4` its notes from the bottom, for arpeggios. Control lines automate the band over bars: `energy =`, `detail =`, `drums =`, `bass =` and `chords =` take a pattern of numbers (`energy = <.3 .5 .7 .9>` steps up over four bars) or of signals (`sine`, `tri`, `saw`, `square`, `rand`, with `:lo:hi` for a range), read at each hit, so `energy = sine/8:.3:.9` is an LFO that swells and fades over eight bars; the part names set a level. While the sliders write the text, moving them rewrites it, which is the lesson: a band's part is a few lines a class can read. Edit the text and it is yours: a part you leave out is still the sliders', the text is saved and shared with the cell, and a mistake is named under the box with its part and line while that part plays the sliders' version. Back to the sliders throws the edits away.

**Game.** The Game button in a notation cell's header fills the screen with that tune on one scrolling line under a fixed cursor, the instrument view large, a progress bar, count-in digits and a flourish at the end; Esc returns. Names switches the staff, instrument and runner between letters and movable-do solfège (la-based minor). Chord symbols in the ABC (`"G"`, `"D7"`, `"Em"`) get a small Wicki-Hayden shape beside the name and outline their keys on the piano and Wicki-Hayden views while they are in force.

**Presenting.** Present shows one cell at a time: PageDown / PageUp move, the number box jumps, Esc returns. Present 3D lays the cells out in space (impress.js), starting from an overview; the 3D button in a cell's header sets its position, rotation, scale and stage background, and Reset 3D layout on the overview clears them all (with Undo). Plain Present is the lighter mode: no 3D transforms, so text stays crisp and it works on any machine.

**Menu (⋯).** Text font, proportional spacing, Share link, Export, Import and Clear.

**Sharing.** Share link copies a URL that carries every cell, compressed, in the address itself (no server involved). Export writes the same content as a text file; Import reads one back.

### Document format

Plain text. An optional first line `=== page {json}` holds page settings (text font, proportional spacing). Then, per cell, a separator line `=== heading`, `=== text` or `=== abc`, optionally followed by json (`x y z r rx ry s` for 3D position, `bg` background, `tr` transposition, `inst` instrument view), and the cell's text verbatim until the next separator. A file without separators becomes one text cell.

## On a phone or tablet

The page adapts below 700 px: the notation transport moves under the ABC text, cell tools are always visible on touch screens, and in Present mode the navigation sits at the top corner. The playback cursor's drag handle is wider for fingers.

## Sample cells

A first visit (or an empty page after Clear) shows four sample cells. They live in the `SAMPLE` list near the top of the *Cells* section of `index.html`, one entry per cell with a `type` (`heading`, `text` or `abc`) and its `text`; edit that list to change them. Once a lesson has been saved in a browser, the samples are not shown again there.

## Offline assets

- `vendor/abcjs-basic-min.js`, `vendor/abcjs-audio.css`: abcjs 6.7.0 (MIT).
- `vendor/impress.js`: impress.js 2.0.0 (MIT), used by Present 3D.
- `vendor/soundfont/`: samples from midi-js-soundfonts (MIT, the FluidR3_GM set throughout, so every instrument plays at the same level), used by abcjs playback, plus the acoustic bass and the percussion notes the accompaniment uses: piano, and the recorder, nylon guitar (for the ukulele) and electric piano (for the Wicki-Hayden keyboard) that the Instrument views play with; `piano-embedded.js` holds the piano as base64 for pages opened from disk, which therefore play every view on the piano.
- `fonts/`: local copies of Atkinson Hyperlegible, Atkinson Hyperlegible Next, Atkinson Hyperlegible Mono, Lexend, Andika and Noto Music (all SIL Open Font License), with `fonts/fonts.css`.
- The wordmark is inline SVG outlines made from Cinzel and Caveat (both SIL Open Font License), so it needs no font request.
- `favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`: the arch-and-staff mark (the SVG follows the system's light or dark mode).
- `gcs-accidentals.woff2`: two zero-advance glyphs (♯ ♭) derived from Noto Music so "C♭" is as wide as "C"; also embedded in the pages.

## Licence

MIT (see `LICENSE`). Bundled libraries and samples are MIT (`vendor/LICENSES.md`); fonts are SIL Open Font License 1.1 (`fonts/LICENSES.md`).
