# Accompaniment audit

Generated deterministically from `course/set.json` (40 published tunes). This records what the page will actually do on **Auto**; it does not invent cultural metadata or treat detected chords as reviewed harmony.

## Summary

- Auto styles: drone: 8; folk: 20; pop: 10; waltz: 2.
- Style selected by: R field: 11; explicit style: 9; generic fallback: 10; metre only: 10.
- Harmony source: detected chords: 17; tonic drone: 8; written chords: 15.
- 10 tunes still fall through to generic pop because neither the tune nor its rhythm names an idiom.
- 29 tunes have at least one provenance field to repair; a temporary import path is never presented as a usable source.
- 12 Nottingham imports link to their canonical repository files; 0 published source paths point into temporary or private directories.

## Idiom decisions still needed

| Tune | Level | Auto style | Harmony | What is known |
|---|---:|---|---|---|
| Evening Bells | 2 | pop | written chords | source: Grand Central Stationery (original, CC0) |
| Crows on the Fence | 2 | pop | written chords | source: Grand Central Stationery (original, CC0) |
| Merrily We Roll Along | 2 | pop | detected chords | O: USA |
| Mary Had a Little Lamb | 2 | pop | detected chords | O: USA |
| Twinkle, Twinkle, Little Star | 3 | pop | detected chords | O: France |
| Baa, Baa, Black Sheep | 3 | pop | detected chords | O: England |
| This Old Man | 3 | pop | detected chords | O: England |
| Lightly Row | 3 | pop | detected chords | O: Germany |
| Jingle Bells (chorus) | 3 | pop | detected chords | O: USA; source: James Lord Pierpont (1857) |
| Frère Jacques | 4 | pop | detected chords | O: France |

## Whole-set audit

| Tune | Auto style | Chosen by | Harmony | Flags |
|---|---|---|---|---|
| Bounce High, Bounce Low | folk | metre only | detected chords | no source or composer in ABC |
| Ring Around the Rosie | folk | metre only | detected chords | no source or composer in ABC |
| Starlight, Star Bright | folk | metre only | detected chords | no source or composer in ABC |
| Rain, Rain, Go Away | folk | metre only | detected chords | no source or composer in ABC |
| Engine, Engine, Number Nine | folk | metre only | detected chords | no source or composer in ABC |
| Evening Bells | pop | generic fallback | written chords | idiom not stated; no origin in ABC |
| Crows on the Fence | pop | generic fallback | written chords | idiom not stated; no origin in ABC |
| Merrily We Roll Along | pop | generic fallback | detected chords | idiom not stated; no source or composer in ABC |
| Mary Had a Little Lamb | pop | generic fallback | detected chords | idiom not stated; no source or composer in ABC |
| Clickety Clack | folk | metre only | written chords | no origin in ABC |
| Rocky Mountain | folk | metre only | detected chords | no source or composer in ABC |
| Skip to My Lou | folk | metre only | detected chords | no source or composer in ABC |
| Twinkle, Twinkle, Little Star | pop | generic fallback | detected chords | idiom not stated; no source or composer in ABC |
| Baa, Baa, Black Sheep | pop | generic fallback | detected chords | idiom not stated; no source or composer in ABC |
| This Old Man | pop | generic fallback | detected chords | idiom not stated; no source or composer in ABC |
| Lightly Row | pop | generic fallback | detected chords | idiom not stated; no source or composer in ABC |
| Jingle Bells (chorus) | pop | generic fallback | detected chords | idiom not stated |
| Amazing Grace | waltz | metre only | detected chords | — |
| Frère Jacques | pop | generic fallback | detected chords | idiom not stated; no source or composer in ABC |
| Highland Mary | folk | explicit style | written chords | no origin in ABC |
| Astley's Ride | folk | R field | written chords | no origin in ABC |
| The First Frost - Second part | folk | R field | written chords | no origin in ABC |
| Oh! Susanna | folk | metre only | detected chords | — |
| Daisy Daisy | waltz | R field | written chords | no origin in ABC |
| O where will you go | drone | explicit style | tonic drone | — |
| Tom And Jerry | folk | R field | written chords | no origin in ABC |
| B. Variation | folk | R field | written chords | no origin in ABC |
| Mother, send to the dhobi | drone | explicit style | tonic drone | — |
| Chhaila | drone | explicit style | tonic drone | — |
| Bhup | drone | explicit style | tonic drone | — |
| Desh | drone | explicit style | tonic drone | — |
| Bhairavi | drone | explicit style | tonic drone | — |
| Malkos | drone | explicit style | tonic drone | — |
| O give me those pretty eyes | drone | explicit style | tonic drone | — |
| The Donegall | folk | R field | written chords | no origin in ABC |
| Walking In My Sleep | folk | R field | written chords | no origin in ABC |
| Fred Roden's Reel | folk | R field | written chords | no origin in ABC |
| Sweet Ellen | folk | R field | written chords | no origin in ABC |
| Billy In The Lowground | folk | R field | written chords | no origin in ABC |
| Dance All Night | folk | R field | written chords | no origin in ABC |

## Provenance repair queue

- **Bounce High, Bounce Low:** no source or composer in ABC.
- **Ring Around the Rosie:** no source or composer in ABC.
- **Starlight, Star Bright:** no source or composer in ABC.
- **Rain, Rain, Go Away:** no source or composer in ABC.
- **Engine, Engine, Number Nine:** no source or composer in ABC.
- **Evening Bells:** idiom not stated; no origin in ABC.
- **Crows on the Fence:** idiom not stated; no origin in ABC.
- **Merrily We Roll Along:** idiom not stated; no source or composer in ABC.
- **Mary Had a Little Lamb:** idiom not stated; no source or composer in ABC.
- **Clickety Clack:** no origin in ABC.
- **Rocky Mountain:** no source or composer in ABC.
- **Skip to My Lou:** no source or composer in ABC.
- **Twinkle, Twinkle, Little Star:** idiom not stated; no source or composer in ABC.
- **Baa, Baa, Black Sheep:** idiom not stated; no source or composer in ABC.
- **This Old Man:** idiom not stated; no source or composer in ABC.
- **Lightly Row:** idiom not stated; no source or composer in ABC.
- **Jingle Bells (chorus):** idiom not stated.
- **Frère Jacques:** idiom not stated; no source or composer in ABC.
- **Highland Mary:** no origin in ABC.
- **Astley's Ride:** no origin in ABC.
- **The First Frost - Second part:** no origin in ABC.
- **Daisy Daisy:** no origin in ABC.
- **Tom And Jerry:** no origin in ABC.
- **B. Variation:** no origin in ABC.
- **The Donegall:** no origin in ABC.
- **Walking In My Sleep:** no origin in ABC.
- **Fred Roden's Reel:** no origin in ABC.
- **Sweet Ellen:** no origin in ABC.
- **Billy In The Lowground:** no origin in ABC.
- **Dance All Night:** no origin in ABC.
