# Course: grading and sequencing tunes

Tools for turning a pile of free ABC tunes into a practice sequence: short melodies a class can master one at a time, several per level, the way a climbing gym sets several routes at each grade.

| Path | What it is |
|---|---|
| `analyze.js` | The analyzer. Measures a parsed abcjs tune, tags the skills it needs, grades it against the skill lattice, and orders a set of tunes so each introduces as little as possible. Runs in Node and in a page (`GCSAnalyze`). |
| `analyze-cli.js` | Command line: grade every `.abc` file under the paths given, print a summary, write JSON, CSV, a Markdown sequence and a tune set for the board. |
| `board.html` | **The route board.** The current set as a climbing wall: one column per level, several tunes in each, with an incipit, the skills each asks for, who has sent it, and Open, which plays it in the main page. |
| `set.json` | The current tune set, written by the CLI. |
| `samples/` | Public domain tunes typed as test material: a dozen well-known tunes across the levels, and twenty beginner songs (so-mi-la chants, do-re-mi songs, first classroom songs) for levels 1 and 2. |

## Running

```bash
node course/analyze-cli.js course/samples
```

```bash
node course/analyze-cli.js path/to/tunes --ignore key --json out/report.json --csv out/features.csv --md out/sequence.md
```

`--ignore key` leaves the key signature out of the level, which suits this page because Transpose moves every tune to whatever key the class reads; `--ignore key,range` also drops range for pianists. Ignored dimensions are still measured and reported. `--min N` skips fragments shorter than N notes; `--show N` lists N tunes per level.

The JSON holds every tune's ABC, features, grade and the skills it introduces at its place in the sequence, which is what a course page will load. The CSV is one row per tune for a spreadsheet. The Markdown is the sequence as a table.

## The route board

`board.html` reads `set.json` and lays the set out like a gym wall. Serve the folder (`serve.command`, or GitHub Pages) and open `course/board.html`; a page opened from disk cannot read the set.

- **Roster** takes one name per line. With *Everyone* selected, each card's *Who sent it* opens chips to tap for each student; with a student selected, each card has one *Mark sent* button, sent routes turn green, the header counts their sends per level, and the lowest level with a route still unsent is outlined as the one to try next.
- **Open** builds a share link (the same format as the main page's Share link) carrying the tune as a heading and a notation cell and opens the main page with it, ready to Play or Game. If the page already holds a lesson of your own, it asks before replacing it.
- Names and sends live in the browser's storage, under their own key, apart from lessons. **Export** writes them to a file and **Import** merges one back, so a class can move between computers. The light or dark setting is shared with the main page.

A set is made from any graded folder:

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

The thresholds are a first calibration against the sample tunes and the Nottingham folk collection (Hot Cross Buns 1, Mary Had a Little Lamb 2, Twinkle and Amazing Grace 3, Oh! Susanna 4, Greensleeves 5; Drunken Sailor and Golden Slippers the easiest of the dance tunes at 3). They are a starting point. Once students attempt tunes, pass rates per level are the better authority, as climbers' consensus corrects a route setter's grade.

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
