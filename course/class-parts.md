# Classroom-part inventory and rehearsal recipes

Generated deterministically from `course/set.json` (40 published tunes). These are **one-bar rehearsal recipes, not finished arrangements**. The generator never fabricates chord changes or a descant: it repeats a metre-appropriate body-percussion pulse, offers a tonic/fifth bass cell in the suggested rehearsal key, reports the chart's existing chord symbols, and sings each tune against itself to find the ones that work as rounds.

When the class takes a generated part, music-minus-one should mute the matching band part: body percussion → drums, bass ostinato → bass, ukulele → chords.

## Summary

- 40/40 tunes have a generated body-percussion pulse cell; 40/40 have a tonic/fifth rehearsal cell.
- 15 tunes contain written chord symbols; 25 need harmony review before a ukulele part is claimed.
- 9 tunes use only the small inspected ukulele-chord set after the suggested transposition.
- 4 tunes work as rounds and 4 more are worth trying by ear; 4 would have the groups mostly singing the same notes.

## Per-tune recipes

| Tune | L | Rehearsal key | Metre | Body percussion (L:1/8) | Bass cell (L:1/8) | Harmony / ukulele | As a round |
|---|---:|---|---:|---|---|---|---|
| Bounce High, Bounce Low | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | mostly unison (100% the same notes): an echo, not a round |
| Ring Around the Rosie | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | mostly unison (75% the same notes): an echo, not a round |
| Starlight, Star Bright | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | mostly unison (100% the same notes): an echo, not a round |
| Rain, Rain, Go Away | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 2: 75%, 2 downbeat clashes) |
| Engine, Engine, Number Nine | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | mostly unison (100% the same notes): an echo, not a round |
| Evening Bells | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>ready from written chords | not a round (best 2 every 2: 91%, 2 downbeat clashes) |
| Crows on the Fence | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>ready from written chords | round: `%%round 4 every=2`, 89%, no downbeat clash |
| Merrily We Roll Along | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 2: 85%, 4 downbeat clashes) |
| Mary Had a Little Lamb | 2 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 2: 85%, 4 downbeat clashes) |
| Clickety Clack | 2 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>ready from written chords | not a round (best 2 every 2: 78%, 1 downbeat clash) |
| Rocky Mountain | 2 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=1`, 91%, downbeat clash in bar 1 |
| Skip to My Lou | 3 | F (+5) | 2/4 | `B2 B2 |` | `F,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 3: 59%, 4 downbeat clashes) |
| Twinkle, Twinkle, Little Star | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=1`, 90%, downbeat clash in bar 1 |
| Baa, Baa, Black Sheep | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=1`, 90%, downbeat clash in bar 1 |
| This Old Man | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 4: 81%, 2 downbeat clashes) |
| Lightly Row | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 4: 78%, 0 downbeat clashes) |
| Jingle Bells (chorus) | 3 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 6: 68%, 7 downbeat clashes) |
| Amazing Grace | 3 | G | 3/4 | `B2 B2 B2 |` | `G,2 D,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=2`, 90%, no downbeat clash |
| Frère Jacques | 4 | F (+5) | 4/4 | `B2 B2 B2 B2 |` | `F,2 C,2 F,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=2`, 90%, no downbeat clash |
| Highland Mary | 4 | F (-2) | 4/4 | `B2 B2 B2 B2 |` | `F,2 C,2 F,2 C,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>review Gm | not a round (best 3 every 2: 72%, 1 downbeat clash) |
| Astley's Ride | 4 | F (-9) | 4/4 | `B2 B2 B2 B2 |` | `F,2 C,2 F,2 C,2 |`<br>pulse recipe only; follow written chord roots | 11 distinct written chords<br>review Gm, Gm/g | not a round (best 3 every 4: 87%, 5 downbeat clashes) |
| The First Frost - Second part | 4 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 6 distinct written chords<br>review Bm | not a round (best 4 every 6: 74%, 16 downbeat clashes) |
| Oh! Susanna | 4 | C (-7) | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 4 every=2`, 82% |
| Daisy Daisy | 4 | G (-7) | 3/4 | `B2 B2 B2 |` | `G,2 D,2 G,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>ready from written chords | not a round (best 3 every 16: 72%, 23 downbeat clashes) |
| O where will you go | 5 | GDor | 5/8 | `B B B B B |` | `G, D, G, D, G, |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 33%, 1 downbeat clash) |
| Tom And Jerry | 5 | A | 4/4 | `B2 B2 B2 B2 |` | `A,2 E,2 A,2 E,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review F#m, Bm | not a round (best 3 every 8: 80%, 8 downbeat clashes) |
| B. Variation | 5 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review Bm | not a round (best 3 every 4: 80%, 0 downbeat clashes) |
| Mother, send to the dhobi | 5 | BPhr | 5/8 | `B B B B B |` | `B, ^F, B, ^F, B, |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 50%, 1 downbeat clash) |
| Chhaila | 5 | Bb | 5/8 | `B B B B B |` | `_B, F, _B, F, _B, |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 70%, 0 downbeat clashes) |
| Bhup | 5 | C | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 4 every 3: 75%, 0 downbeat clashes) |
| Desh | 5 | CMix | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 2: 63%, 6 downbeat clashes) |
| Bhairavi | 5 | CPhr | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 8: 71%, 0 downbeat clashes) |
| Malkos | 5 | Cm | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=1`, 93%, no downbeat clash |
| O give me those pretty eyes | 6 | GDor | 3/4 | `B2 B2 B2 |` | `G,2 D,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 4 every 1: 57%, 4 downbeat clashes) |
| The Donegall | 6 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | not a round (best 4 every 8: 86%, 7 downbeat clashes) |
| Walking In My Sleep | 6 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>ready from written chords | not a round (best 3 every 8: 91%, 4 downbeat clashes) |
| Fred Roden's Reel | 6 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | not a round (best 2 every 1: 72%, 2 downbeat clashes) |
| Sweet Ellen | 6 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review Bm | not a round (best 2 every 11: 84%, 4 downbeat clashes) |
| Billy In The Lowground | 6 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | not a round (best 2 every 16: 80%, 0 downbeat clashes) |
| Dance All Night | 6 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | not a round (best 3 every 4: 70%, 19 downbeat clashes) |

## Harmony queue

These charts have no written chord symbols. A teacher, arranger, or source should supply harmony—or explicitly mark a drone/unaccompanied treatment—before a ukulele chart or chord-following bass is generated.

- **Bounce High, Bounce Low:** C, 2/4, level 1.
- **Ring Around the Rosie:** C, 2/4, level 1.
- **Starlight, Star Bright:** C, 2/4, level 1.
- **Rain, Rain, Go Away:** C, 2/4, level 1.
- **Engine, Engine, Number Nine:** C, 2/4, level 1.
- **Merrily We Roll Along:** C, 4/4, level 2.
- **Mary Had a Little Lamb:** G, 4/4, level 2.
- **Rocky Mountain:** C, 2/4, level 2.
- **Skip to My Lou:** C, 2/4, level 3.
- **Twinkle, Twinkle, Little Star:** C, 4/4, level 3.
- **Baa, Baa, Black Sheep:** C, 4/4, level 3.
- **This Old Man:** C, 4/4, level 3.
- **Lightly Row:** C, 4/4, level 3.
- **Jingle Bells (chorus):** G, 4/4, level 3.
- **Amazing Grace:** G, 3/4, level 3.
- **Frère Jacques:** C, 4/4, level 4.
- **Oh! Susanna:** G, 2/4, level 4.
- **O where will you go:** GDor, 5/8, level 5.
- **Mother, send to the dhobi:** BPhr, 5/8, level 5.
- **Chhaila:** Bb, 5/8, level 5.
- **Bhup:** C, 3/4, level 5.
- **Desh:** CMix, 3/4, level 5.
- **Bhairavi:** CPhr, 3/4, level 5.
- **Malkos:** Cm, 3/4, level 5.
- **O give me those pretty eyes:** GDor, 3/4, level 6.

## Rounds

Each tune is sung against itself by 2, 3 and 4 groups, the groups coming in at the distance the page picks for a `%%round` line with no `every=` (course/round-fit.js keeps a copy of the page's scoring). On every beat, each pair of notes the groups sound together is scored: unisons, thirds, fifths, sixths and octaves fit, fourths count half, seconds, sevenths and the tritone clash. A clash on a downbeat is what the ear catches; a passing one between beats is normal in a round. Bars are counted as played, repeats written out. The verdict keeps the most groups that reach it; the line goes after the tune's melody to try it on the page, where the same fit shows as a tip. Listen before publishing a round.

**Work as rounds** (85% or more, no clash on a downbeat):

- **Crows on the Fence:** `%%round 4 every=2` (89%).
- **Amazing Grace:** `%%round 4 every=2` (90%).
- **Frère Jacques:** `%%round 4 every=2` (90%).
- **Malkos:** `%%round 4 every=1` (93%).

**Worth trying by ear** (80% or more, at most one downbeat clash):

- **Rocky Mountain:** `%%round 2 every=1` (91%; clash on the downbeat of bar 1).
- **Twinkle, Twinkle, Little Star:** `%%round 2 every=1` (90%; clash on the downbeat of bar 1).
- **Baa, Baa, Black Sheep:** `%%round 2 every=1` (90%; clash on the downbeat of bar 1).
- **Oh! Susanna:** `%%round 4 every=2` (82%).

**Mostly unison** (the groups would sing the same notes more than half the time, as so–mi chants do; better as an echo or with an ostinato than as a round):

- **Bounce High, Bounce Low:** 100% the same notes.
- **Ring Around the Rosie:** 75% the same notes.
- **Starlight, Star Bright:** 100% the same notes.
- **Engine, Engine, Number Nine:** 100% the same notes.
