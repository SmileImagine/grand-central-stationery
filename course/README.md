# Course: grading and sequencing tunes

Tools for turning a pile of free ABC tunes into a practice sequence: short melodies a class can master one at a time, several per level, the way a climbing gym sets several climbs at each grade.

| Path | What it is |
|---|---|
| `analyze.js` | The analyzer. Measures a parsed abcjs tune, tags the skills it needs, grades it against the skill lattice, and orders a set of tunes so each introduces as little as possible. Runs in Node and in a page (`GCSAnalyze`). |
| `analyze-cli.js` | Command line: grade every `.abc` file under the paths given, print a summary, write JSON, CSV, a Markdown sequence and a tune set for the board. |
| `board.html` | **The practice board.** A student picks their name and sees their level's tunes to choose from; the teacher sees every level, who is ready to show a tune, and marks passes. Open plays any tune in the main page. |
| `set.json` | The current tune set, written by the CLI. |
| `rhythm-analyze.js`, `rhythm-cli.js` | The rhythm analyzer: grades drum patterns written as the lab writes them (`kick: x... x...`) on a six-level lattice (subdivision, syncopation, parts and how they interlock, metre, length, tempo), and imports two free corpora, the GrooveSteps grids (CC0) and the Groove MIDI Dataset (CC BY 4.0), quantising each performance to the grid that fits and keeping the bar the drummer played most. `rhythms/traditional.rhythms.txt` holds typed traditional patterns (CC0). |
| `dance-analyze.js`, `dance-cli.js` | The dance analyzer: grades steps in the lab's step language (feet, pace, arms, metre, length, tempo) and dances described in prose from public-domain folk-dance books (step vocabulary, figures, formation, length, interaction, tempo), checking its grades against the book's own classified index. `dances/steps.dances.txt` holds basic social and folk steps (CC0). |
| `rhythm-set.json`, `dance-set.json` | The graded rhythm and dance sets the CLIs write; the lab's corpus pickers read them. |
| `sources/` | The public-domain and CC0 texts and data the analyzers read, with a README on where each came from and what was looked at and left out. |
| `samples/` | Public domain tunes typed as test material: a dozen well-known tunes across the levels, twenty-one beginner songs (so-mi-la chants, do-re-mi songs, first classroom songs), eight original pentatonic tunes written for the course and released CC0 to fill level 2, and four famous classical openings. |

## Running

```bash
node course/analyze-cli.js course/samples
```

```bash
node course/analyze-cli.js path/to/tunes --ignore key --json out/report.json --csv out/features.csv --md out/sequence.md
```

`--ignore key` leaves the key signature out of the level, which suits this page because Transpose moves every tune to whatever key the class reads; `--ignore key,range` also drops range for pianists. Ignored dimensions are still measured and reported. `--min N` skips fragments shorter than N notes; `--show N` lists N tunes per level.

The JSON holds every tune's ABC, features, grade and the skills it introduces at its place in the sequence, which is what a course page will load. The CSV is one row per tune for a spreadsheet. The Markdown is the sequence as a table.

## Rhythms and dances

```bash
node course/rhythm-cli.js course/rhythms --groovesteps course/sources/groovesteps-drum-patterns.json --groove ~/Downloads/groove --per 8 --json course/rhythm-set.json
```

```bash
node course/dance-cli.js course/dances --book course/sources/burchenal-1922-folk-dances-from-old-homelands.txt "Folk-Dances from Old Homelands|1922|https://archive.org/details/folkdancesfromol00burc" --json course/dance-set.json
```

`--groove` wants the unzipped Groove MIDI Dataset folder (the one with `info.csv`); `--per N` keeps N patterns per style. A `.rhythms.txt` or `.dances.txt` file holds several patterns separated by blank lines, each with a `title:` line; lines before the first title (source, licence) apply to all. `--book` reads an OCR'd book from the Internet Archive, cuts it into dances by its index and, when the book classifies its dances by age, reports how the grades line up (Kendall's tau between the book's class and the level). Book dances take their level from the mean of their six rungs, stretched so that a mean of 4 is level 6, because the highest-rung rule bunched them at levels 5 and 6 (figure count or a partner change alone put a dance at the top); typed steps and drum patterns keep the highest-rung rule. The main page's Rhythm and Dance cells and the lab page `lab/Rhythm and Dance v1.html` play the same text (the lab's picker loads any pattern or step from the sets). The step language gained `z`, a step across behind, for grapevines and horas; the Dancer view plays a step sequence as a rigged figure the way an animator blocks locomotion: the `feet:` line is a contact timeline (each foot planted until its next event, then flying in an arc to land on the beat), the pelvis is derived from the supporting feet (over the standing foot, shifting just after a landing with some anticipation before, dipping in a wide stance, lifting in a hop or jump), bone lengths are fixed and knees and elbows are solved by two-bone inverse kinematics, so proportions cannot drift; effort marks after a token shape the in-betweens, after Laban's effort factors (`!` sudden and `~` sustained for time, `_` strong and `^` light for weight, `@` indirect for space, `=` bound for flow), and two shape lines, `level:` (l m h, sinking and rising) and `lean:` (f b l r c, the shoulders), set the body, `turn:` (`r` or `l` per quarter turn) rotates the dancer's frame so later steps head the new way and the figure is seen from the side or face on, `hips:` (l r f b c) pushes or tilts the pelvis with the shoulders countering, and `shoulders:` (l r u c) lifts one or both; the Dancer can be seen from behind, from in front (mirrored) or from three-quarters; the analyzer accepts all of these and records them as skills without grading on them; the Syllables view speaks a beat in Kodály words, fruit words (Prodigies: beat, cher-ry, pine-ap-ple, av-o-ca-do, blue-ber-ry; mel-on and wa-ter-mel-on for a note held over two or four beats), 1 e &amp; a counting with onsets only, takadimi, or Carnatic konnakol (each run of hits is a group: ta ka di mi for four, ta ki ta for three, ta di gi na tom for five).

### Square-dance figures and the Ontario curriculum

```bash
node course/figure-cli.js path/to/taminations-flutter/assets --json course/figure-set.json
```

`figure-cli.js` reads Taminations' call animations (GPL-3.0; a sparse clone of `assets/` is enough) and grades each call from each starting formation on programme, beats, moves per dancer, roles, formation and the author's difficulty; by default it reads Mainstream and Plus (1,442 figures), `--programmes all` goes through Challenge 3. Figures are formation-level, not footwork, so `figure-set.json` is a corpus for a figure course rather than for the step views.

Every entry in the tune, rhythm and dance sets also carries `ontario`, the grade in which *The Ontario Curriculum, Grades 1–8: The Arts* first names a concept the tune, pattern or step uses, with the concepts that put it there (for tunes, from the duration, pitch, dynamics, texture and form concepts the ABC shows, each row naming its element; `--ignore key,texture` leaves the key-signature and chord-symbol rows out, as the first set does). `ontario.md` sets out the alignment, and `ontario-glossary.md` (data in `ontario-terms.json`) places each Music and Dance term of the curriculum's glossary at the first grade whose strand text uses it: the music strand's duration progression matches the rhythm lattice nearly rung for rung; the dance strand progresses by elements and form rather than footwork, so its grade and the step lattice answer different questions. The board and the pickers filter by it: **For** on the board, and the grade select beside the lab's and the main page's Example pickers, keep the items at or under a grade (a grade is a floor, so grade 3 shows grades 1 to 3); the choice is one setting shared by all three through the browser's storage.

## The practice board

`board.html` reads `set.json`. Serve the folder (`serve.command`, or GitHub Pages) and open `course/board.html`; a page opened from disk cannot read the set.

The lesson it is built for: a student chooses a tune at their level and practises it, performs it for the teacher or hands in a video, and the teacher marks it passed. Once half the tunes at a level are passed, the next level opens; nothing stops a student trying a harder tune early.

- **The student's page.** *I am* names the student, and **My level** lets the student set the level they are working on, because on their own computer the board cannot see the teacher's passes (the choice travels with Export). The page then shows the level they are on, with every tune there as a card: its first bars, what it brings in that earlier tunes did not (outlined), **Open**, which plays it in the main page, and **Practise**, which puts it on their list at the top of the page. A practised tune has **Ready to show**, which tells the teacher; the levels ahead and the levels done sit below, folded. Each student's choice of name is kept for the browser tab only.
- **For** keeps the tunes whose concepts (rhythm, pitch, marks of expression, form) the Ontario curriculum has named by a grade; each card's last tag gives the tune's grade, and hovering it names the concepts. Levels, passes and the ready queue count only the tunes shown.
- **The teacher's page.** With *the teacher* chosen, the page opens with the tools row: **Test** picks a student and **Draw a piece** opens a random tune at their level in the main page (one they have not passed or been tested on, when there is one), with a dialog to mark the performance on the achievement chart's four levels; the mark is saved with the date and the tune, and a 3 or 4 also passes the tune. **Export levels and marks** writes a spreadsheet (CSV): each student's current and chosen level, passes per level, tunes practising and ready, their tests and average mark, then every test, then the set's tunes with their Ontario grade and who has passed them. Below the tools, the tests so far, then the queue of students who are ready to show, each with Open, **Not yet** and **Passed**, then every level as a wall of cards. **Class** on a card lists the students with their state; tapping a name marks that tune passed (and again clears it). Each level says how many students are on it.
- **Class list** takes one name per line. Names and progress (practising, ready, passed, with a date) live in the browser's storage, under their own key, apart from lessons. **Export** writes them to a file and **Import** merges one back, so a class can move between computers, and the teacher's computer can take in a student's progress. The light or dark setting is shared with the main page.

The board is one browser's record, with no accounts: a classroom computer, or an export passed around. A shared server behind it is the step after this.

A set is made from any graded folder (and `--annotate course/set.json` refreshes the Ontario grades of an existing set from the ABC it carries, when its source tunes are not all to hand):

```bash
node course/analyze-cli.js course/samples path/to/tunes --ignore key --set course/set.json --per-level 6 --name "Set of 8 November"
```

`--per-level N` takes the first N tunes at each level in sequence order, so the earliest ones introduce one skill each; `--skip K` passes over the first K at each level, which is how the next set rotates to new tunes a fortnight later. Tunes titled "Missing title" are left out. The first committed set is the sample tunes plus the easiest tunes from the Nottingham database (its originals, which are public domain melodies transcribed for free use): the beginner songs fill levels 1 and 2.

## What is measured

The melody is the first voice, read across lines. Pitch is measured as scale degrees from the tonic of the key signature's relative major, so a minor tune reads la-based (as the page's Names toggle does) and the grade does not change under Transpose. Tied notes count once, at their combined length.

Features per tune: note and bar counts, distinct bars and the repetition they imply, range in semitones, degrees used, chromatic pitch classes and the share of notes outside the key, largest leap, mean interval, share of leaps wider than a 3rd, the set of durations in beats (the beat is the dotted unit in 6/8, 9/8 and 12/8), the smallest division, syncopations (a note starting off the beat and lasting past the next beat), ties, triplets, rests, pickup, repeats and endings, chord symbols, grace notes, double stops, key signature, key and metre changes.

## The skill lattice

Seven dimensions, six rungs each. A tune sits on the first rung whose test it passes; its **level** is its highest rung over the dimensions counted. A **score** (weighted rungs plus density and length) orders tunes within a level. The rungs are in `LATTICE` in `analyze.js`, one line each, meant to be edited.

| Rung | Pitch set | Range | Leaps | Rhythm | Metre | Length (bars once) |
|--:|---|---|---|---|---|---|
| 1 | three pentatonic notes | 4th | to a 4th | beats and half beats | 4/4, 2/4 | 8 |
| 2 | pentatonic | 6th | to a 5th | rests, or the compound beat in three | 3/4 | 16 |
| 3 | diatonic | octave | to a 6th | dotted figures, ties, off-beat rests | 6/8, cut time | 24 |
| 4 | one chromatic note | 11th | to an octave | quarter-beats, triplets, some syncopation | 9/8, 12/8, 3/8, 3/2 | 32 |
| 5 | a few chromatic notes | two octaves | wide or angular | sustained syncopation, odd lengths | irregular | 48 |
| 6 | freely chromatic | more | very angular | finer or irregular tuplets | changes | more |

Key signature is the seventh dimension (one accidental, two, three, four, five or more, key changes).

The thresholds are a first calibration against the sample tunes and the Nottingham folk collection (Hot Cross Buns 1, Mary Had a Little Lamb 2, Twinkle and Amazing Grace 3, Oh! Susanna 4, Greensleeves 5; Drunken Sailor and Golden Slippers the easiest of the dance tunes at 3). They are a starting point. Once students attempt tunes, pass rates per level are the better authority, as climbers' consensus corrects a setter's grade.

## Sequencing

`sequence()` is greedy: start from the lowest-scoring tune, then always take the tune that brings the fewest skills no earlier tune asked for, breaking ties by level and score. Each tune in the result lists what it introduces (`degree:fa`, `dur:1/2`, `leap:5th`, `metre:6/8`, `tie`, `syncopation`, `pickup`). A course can then pick, per level, several tunes that introduce one skill each, and rotate them every couple of weeks.

## Where tunes come from

Melodies that are safe to use: public domain (in the US, anything published through 1930; elsewhere, composers dead seventy years or more; folk tunes everywhere), Creative Commons, machine-composed, or written by teachers and students. ABC sources that fit the page directly:

- **Nottingham Music Database**: about 1,000 British and American folk dance tunes with chord symbols, public domain melodies. The copy at `github.com/jukedeck/nottingham-dataset` has the originals and a cleaned set; the repository is GPL-3, so take the originals, or treat any cleaned files you redistribute under that licence.
- **The Session** (`thesession.org`): Irish traditional tunes, CC BY-SA. Attribution and share-alike are required.
- **abcnotation.com**, Henrik Norbeck's collection: large aggregations of traditional tunes.
- **folk-rnn**: thousands of machine-composed tunes in ABC.
- **Essen Folksong Collection**, **KernScores**, **Mutopia**, **OpenScore**: folk and classical scores in kern, LilyPond or MusicXML, convertible to ABC with music21 or abc2xml's companion tools.

Bartók's Mikrokosmos is public domain in Canada and the EU but under US copyright until 2036. Its ordering of skills, like a method book's, is not copyrightable and is fair to borrow.

Copyrighted melodies with a generated backing track are not fair use: the melody is the composition. Album art, photographs of artists and band logos each carry their own rights (copyright, publicity, trademark).
