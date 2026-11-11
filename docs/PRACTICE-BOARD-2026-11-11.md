# The Practice Board as the front of the course (11 November 2026)

The board is now the page teachers share: three ways in (Teach, Practice,
Assess), six levels, and for each piece a short card a non-specialist can
read. A card opens the **piece view**: the main page's own notation cell, in
Game mode, with one bar across the top for the job in hand. Everything plays on
the page's one Player and AudioContext clock; nothing new renders or plays
music.

| File | What it does |
| --- | --- |
| `course/practice.js` | The shared core (Node and page): links, levels and piece facts, phrases, a phrase written out as a tune, tempo steps, local practice history, assessment records, step/wait, the advisory listener. |
| `course/piece.js`, `course/piece.css` | The piece view, loaded by `index.html` only on `#tune=`. |
| `course/board.html` | The board: Teach, Practice, Assess; levels; piece cards; Class records. |
| `index.html` | Five small hooks: the `PIECE` route flag, no saving on that route, no present-mode keys there, `GCS.piece` (show one cell, play one note), and `fitWhole` in `twoLineWidth`. |
| `test/practice.test.js` | 449 checks, run by `make smoke`. |

## The journeys

Every way in is three steps, numbered across the bar, each with one main
button (Play, which reads Pause while the music plays). The step decides what
is on screen, whether it repeats and its tempo; there are no separate Repeat,
Play phrase or Play along buttons, which did the same thing in the first version.

| | Teach | Practice | Assess |
| --- | --- | --- | --- |
| 1 | **Listen**: the whole piece once, full speed, with the band | the same | **Hear it**: the student's name; the piece played for them |
| 2 | **Learn the loops**: one loop on repeat, from about 60 % and five BPM faster each time round to full speed (or **Note by note**: Next, Back, Hear it, Listen to me) | the same, with a history | **The attempt**: optional listening; its flags appear in the panel |
| 3 | **Put it together**: the whole piece on repeat, slow to full speed, the band playing | the same, with a history | **Decide**: pass, needs more practice or not assessed, a level 1–4 if wanted, tempo, help, note, Save |

Each step keeps its own tempo while the page is open. **Faster each time
round** (on unless turned off; remembered on this computer) adds five BPM at
each repeat up to the written tempo, then holds. Teach records nothing; Practice
keeps the history below.

**Teacher, class piece.** Board → Teach → a level → a card → **Teach** opens
step 1 → Listen → Next: learn the loops (◀ ▶ or ← → between loops) → Next:
put it together → **Copy link** for students.

**Student.** A shared link, or Board → Practice → their level → **Practise**:
the same three steps.

**Teacher assessing.** Board → Assess → the student → a piece (or **Draw a
piece**) → **Assess**: Hear it → The attempt → Decide → Save, which returns to
step 1 for the next student.

The ▾ arrow at the bar's left folds it to one slim row (▸ opens it again;
remembered). **More** opens the full player (the transport and the Melody, Band
and Mixer drawers, each tab with its own fold arrow); while it is open the
instrument steps aside so the music and the drawers both fit.

## Links

The piece view: `index.html#tune=<id>&level=<n>&mode=<teach|practice|assess>&step=<1-3>&loop=<n>&by=note&bpm=<n>&inst=<recorder|uke|piano|wh|off>&tr=<±n>&cuts=<1.5.9>`.
Only these keys are written (`SETUP_KEYS`); links from the first piece view
(`mode=step|slow`, `phrase=`, `view=whole`) still open where they meant. A link
carrying a name, note, result or progress is read without them, and **Copy
link** turns Assess into Teach. The board: `course/board.html#do=<teach|practice|assess>&level=<n>&tune=<id>`.
The page keeps its own address current with `replaceState`, so the address bar
is always a link to what is on screen; pasting another address reloads the view.
The board's link carries the class instrument and the transposition that brings
the piece into its range (Frère Jacques: `inst=recorder&tr=5`).

## Loops

A loop is the few bars learned on repeat before going on: usually a musical
phrase, but the teacher decides (**Set up loops…** in step 2).

Where loops fall, in order of authority: the teacher's cuts (**Set up loops…**: tap the bars
where loops begin; saved per piece on this computer and carried in the link);
a `%%phrases 1 5 9` line in the tune; the tune's structure (part labels, double
bars and repeats make sections; a breath mark or fermata ends a phrase; source
lines of two to six bars are loops); otherwise sections cut into equal lengths
of about four bars at the nearest barline. Lengths, not bar counts, so pickups
and short bars (Highland Mary, Daisy Daisy) fall right. Endings are never cut
from the bars they end. Four bars or fewer stay whole. The bar says when a
phrasing is a guess.

A loop is written out as a tune of its own: the header with the key, metre,
unit and tempo in force where it starts; its bars with fresh barlines; the chord
in force at its first note; its verses' words, with held syllables (`_`) kept on
their notes. A loop holding first and second endings keeps its repeat, so it
plays as written. The test re-parses every loop of all 37 tunes: the same
notes, lengths and words as those bars of the whole, and no new abcjs warnings.

Display: a loop (or a short piece) is drawn as large as it fits whole, on one
to three systems with a staff space up to 6 % of the height (`fitWhole`); where
nothing fits legibly (a phone), Game mode's two sliding systems return. The
instrument stays under the music, at most a third of the height.

## Practice

**Note by note.** The cursor and the instrument stand on one note; Next note
(space, Enter) moves on, Back (Backspace) back, Hear it (H) plays the note. With
**Listen to me** on, a steady note that matches moves on too; an octave away
counts and says why (the recorder sounds an octave above what it reads). The
microphone is ignored while the page's own note sounds. Next note always works.
A redraw (folding the bar, More, turning a tablet) keeps the note.

**Slow to faster.** Steps 2 and 3 start a little over half speed (60 %, in
fives, never under 40 BPM). Tempo is timing only: the melody's pitches at 50
and 55 BPM were checked identical in the browser, and a loop played 75 → 80 BPM
across a repeat without stopping.

## What is stored, and where

| Store | Holds | Never |
| --- | --- | --- |
| The address | the setup above | names, progress, results, notes |
| `gcs-practice-v1` (this browser) | per piece: run-throughs, loop runs and each loop's best tempo, whole-piece best tempo, step runs, notes stepped, notes the microphone matched, a short log | scores or accuracy |
| `gcs-phrase-cuts` (this browser) | the teacher's loop cuts per piece | |
| `gcs-course-v1` (this browser, the board's store) | the class list, practising/ready/passed per student, assessments: date, piece, loop, result, optional 1–4, tempo, help, note, kept flags | |
| `sessionStorage` (this tab) | the student being assessed or practising | |

A run is the music playing from its start to its end (each time round when
repeating). The progress line says what was done ("played 4 times · 2 of 3
loops tried · whole piece up to 72 BPM (90% of full speed)") and the tempo
ladder fills to the best tempo of the loop or piece on screen. It never
claims the playing was right.

## Listening

Advisory only. McLeod's pitch method (as in the Play Along lab), a three-frame
stability gate, then an edit-distance alignment of heard notes with written
ones: wrong, missed, extra, an octave away; then timing against the player's own
median tempo: a hesitation, a note early or late. No flag is ever "certain":
"likely" at best, "unsure" for misses, octaves and rhythm. The whole attempt gets
a reliability (none, low, medium), lowered by a noisy room or a count far from
the written one, and the panel says that echoes and two instruments at once
fool it. The teacher keeps or dismisses each flag; only the decision is the
result.

## Checked

- `make smoke` (with `test/practice.test.js`, 449 checks): links and their
  privacy, level and grade filters, loop sources and fallbacks, teacher
  cuts, every loop of every tune re-parsed, endings, key and metre changes,
  the chord in force, a round's line, tempo steps, step/wait, practice history
  (including broken storage), assessment states and notes, and the listener on
  synthetic tones and attempts.
- In the browser (localhost): board → piece → board; step mode advancing by
  key; slow mode at 50 → 55 BPM with identical pitches; two looped runs
  counted; phrase arrows, whole piece, the address kept current; an assessment
  saved into the board's store with nothing in the address; the lesson page
  unchanged and nothing saved over it.
- Sizes: phone 375×812, tablet 768×1024, desktop 1280×800, projector
  1920×1080; no sideways scroll; every control in the bar at least 40 px tall.

## Limits

- Listening needs a served page (a page opened from disk cannot use the
  microphone) and works for one melody instrument at a time; the band playing
  along makes it unreliable. It was checked on synthetic signals, not yet with a
  class.
- A run counts the music playing, not the class playing along.
- Phrase cuts land on barlines; a phrase that starts with a pickup in the
  middle of a bar (common in hymns) starts at the barline after it.
- *Dance All Night* writes its double stops in the old `+GB+` way, which abcjs
  reads as unknown decorations: it drops those notes, so their bars play short,
  on the board and in the lesson page alike. It needs re-typing as `[GB]`.
- Progress lives in one browser; Export and Import on the board move the class
  records, not a learner's practice history.
- The tests run `practice.js` in Node; the piece view's wiring to the Player is
  checked in the browser, not by a test.

## Next

The highest-value next step is **listening checked with real players**: a
recorder and a ukulele in a classroom, step mode and an assessment, against a
teacher's own judgement, to set the gate and the confidence words from evidence
rather than synthetic tones. After that: export a learner's practice history
with the class records, and a teacher's phrase cuts shared with the class (they
travel in the link today, and are saved only on the computer that set them).
