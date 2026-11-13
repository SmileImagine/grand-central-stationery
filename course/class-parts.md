# Classroom-part inventory and rehearsal recipes

Generated deterministically from `course/set.json` (5 published tunes). These are **one-bar rehearsal recipes, not finished arrangements**. The generator never fabricates chord changes or a descant: it repeats a metre-appropriate body-percussion pulse, offers a tonic/fifth bass cell in the suggested rehearsal key, reports the chart's existing chord symbols, and sings each tune against itself to find the ones that work as rounds.

When the class takes a generated part, music-minus-one should mute the matching band part: body percussion → drums, bass ostinato → bass, ukulele → chords.

## Summary

- 5/5 tunes have a generated body-percussion pulse cell; 5/5 have a tonic/fifth rehearsal cell.
- 1 tunes contain written chord symbols; 4 need harmony review before a ukulele part is claimed.
- 1 tunes use only the small inspected ukulele-chord set after the suggested transposition.
- 1 tunes work as rounds and 1 more are worth trying by ear; 0 would have the groups mostly singing the same notes.

## Per-tune recipes

| Tune | L | Rehearsal key | Metre | Body percussion (L:1/8) | Bass cell (L:1/8) | Harmony / ukulele | As a round |
|---|---:|---|---:|---|---|---|---|
| Bounce High, Bounce Low | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 75%, 0 downbeat clashes) |
| Twinkle, Twinkle, Little Star | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=1`, 90%, downbeat clash in bar 1 |
| This Old Man | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 75%, 1 downbeat clash) |
| Amazing Grace | 3 | G | 3/4 | `B2 B2 B2 |` | `G,2 D,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=2`, 90%, no downbeat clash |
| Walking In My Sleep | 6 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>ready from written chords | not a round (best 3 every 8: 91%, 4 downbeat clashes) |

## Harmony queue

These charts have no written chord symbols. A teacher, arranger, or source should supply harmony—or explicitly mark a drone/unaccompanied treatment—before a ukulele chart or chord-following bass is generated.

- **Bounce High, Bounce Low:** C, 2/4, level 1.
- **Twinkle, Twinkle, Little Star:** C, 4/4, level 3.
- **This Old Man:** C, 4/4, level 3.
- **Amazing Grace:** G, 3/4, level 3.

## Rounds

Each tune is sung against itself by 2, 3 and 4 groups, the groups coming in at the distance the page picks for a `%%round` line with no `every=` (course/round-fit.js keeps a copy of the page's scoring). On every beat, each pair of notes the groups sound together is scored: unisons, thirds, fifths, sixths and octaves fit, fourths count half, seconds, sevenths and the tritone clash. A clash on a downbeat is what the ear catches; a passing one between beats is normal in a round. Bars are counted as played, repeats written out. The verdict keeps the most groups that reach it; the line goes after the tune's melody to try it on the page, where the same fit shows as a tip. Listen before publishing a round.

**Work as rounds** (85% or more, no clash on a downbeat):

- **Amazing Grace:** `%%round 4 every=2` (90%).

**Worth trying by ear** (80% or more, at most one downbeat clash):

- **Twinkle, Twinkle, Little Star:** `%%round 2 every=1` (90%; clash on the downbeat of bar 1).

**Mostly unison** (the groups would sing the same notes more than half the time, as so–mi chants do; better as an echo or with an ostinato than as a round):

- None in this set.
