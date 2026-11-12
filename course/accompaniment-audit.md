# Accompaniment audit

Generated deterministically from `course/set.json` (80 published tunes). This records what the page will actually do on **Auto**; it does not invent cultural metadata or treat detected chords as reviewed harmony.

## Summary

- Auto styles: ballad: 9; drone: 13; folk: 38; korean: 1; march: 3; mento: 4; minyo: 2; persian: 4; sizhu: 2; swing: 2; waltz: 2.
- Style selected by: R field: 13; explicit style: 63; metre only: 4.
- Harmony source: detected chords: 28; no chords (heterophony): 2; tonic drone: 13; written chart: 15; written chords: 22.
- 0 tunes still fall through to generic pop because neither the tune nor its rhythm names an idiom.
- 6 tunes have at least one provenance field to repair; a temporary import path is never presented as a usable source.
- 15 Nottingham imports link to their canonical repository files; 0 published source paths point into temporary or private directories.

## Idiom decisions still needed

| Tune | Level | Auto style | Harmony | What is known |
|---|---:|---|---|---|

## Whole-set audit

| Tune | Auto style | Chosen by | Harmony | Flags |
|---|---|---|---|---|
| Bounce High, Bounce Low | folk | metre only | detected chords | — |
| Ring Around the Rosie | folk | metre only | detected chords | — |
| Starlight, Star Bright | folk | metre only | detected chords | — |
| Rain, Rain, Go Away | ballad | R field | detected chords | — |
| Engine, Engine, Number Nine | folk | metre only | detected chords | — |
| Lucy Locket | folk | explicit style | detected chords | — |
| Evening Bells | ballad | explicit style | written chords | — |
| Crows on the Fence | folk | explicit style | written chords | — |
| Merrily We Roll Along | folk | explicit style | detected chords | — |
| Mary Had a Little Lamb | folk | explicit style | detected chords | — |
| Clickety Clack | march | explicit style | written chords | — |
| Cha-ko'mba, ko'mba | folk | explicit style | written chart | — |
| Au Clair de la Lune | folk | explicit style | detected chords | — |
| Skip to My Lou | ballad | R field | detected chords | — |
| Twinkle, Twinkle, Little Star | ballad | explicit style | detected chords | — |
| This Old Man | march | explicit style | detected chords | — |
| Lightly Row | folk | explicit style | detected chords | — |
| Jingle Bells (chorus) | swing | explicit style | detected chords | — |
| Baa, Baa, Black Sheep | folk | explicit style | detected chords | — |
| Mīkhāhī labu? | persian | explicit style | written chords | — |
| When the Saints Go Marching In | swing | explicit style | detected chords | — |
| Rocky Mountain | ballad | R field | detected chords | — |
| Amazing Grace | ballad | explicit style | detected chords | — |
| Bújj, bújj, zöld ág | folk | explicit style | written chart | — |
| Go le mimli | folk | explicit style | written chart | — |
| Arirang | korean | explicit style | written chords | — |
| Cuckoo's Nest | folk | explicit style | written chords | — |
| Frère Jacques | folk | explicit style | detected chords | — |
| Highland Mary | folk | explicit style | written chords | — |
| Astley's Ride | folk | R field | written chords | — |
| The First Frost - Second part | folk | R field | written chords | no origin in ABC |
| Gurkha sing-song | drone | explicit style | tonic drone | — |
| Rama's lullaby | drone | explicit style | tonic drone | — |
| Na Bahia tem | march | explicit style | written chart | — |
| Rāna jīnāk | persian | explicit style | written chart | — |
| Sakura | minyo | explicit style | written chords | — |
| Oh! Susanna | folk | explicit style | detected chords | — |
| Mu-to-to-li'le | folk | explicit style | written chart | — |
| Ba ban (八板) | sizhu | explicit style | no chords (heterophony) | — |
| The ayah's song | drone | explicit style | tonic drone | — |
| Pass the ball | mento | explicit style | detected chords | — |
| Carry banana | mento | explicit style | detected chords | — |
| Nirguna's lullaby | drone | explicit style | tonic drone | — |
| Si me dan pasteles | folk | explicit style | detected chords | — |
| Daisy Daisy | waltz | explicit style | written chords | — |
| Usagi to Kame (兎と亀) | folk | explicit style | written chart | — |
| La Rana | waltz | explicit style | detected chords | — |
| A l'entrada del tens clar | folk | explicit style | written chart | — |
| Galloway road | mento | explicit style | detected chords | — |
| I Plant Some Rice | folk | explicit style | written chart | — |
| Vámonos por Santa Anita | folk | explicit style | detected chords | — |
| O tu'la, mntwa'na (Thula, mntwana) | ballad | explicit style | written chart | — |
| Little Sally Water | mento | explicit style | detected chords | — |
| O where will you go | drone | explicit style | tonic drone | — |
| Sugar in the Gourd | folk | explicit style | written chords | — |
| Soldiers' Joy | folk | explicit style | written chords | — |
| Tom And Jerry | folk | R field | written chords | — |
| B. Variation | folk | R field | written chords | no origin in ABC |
| Mother, send to the dhobi | drone | explicit style | tonic drone | — |
| Konpira fune fune | minyo | explicit style | written chords | — |
| Zdravets | folk | explicit style | written chart | — |
| B'qāw ʿala khēr | persian | explicit style | written chart | — |
| Chhaila | drone | explicit style | tonic drone | — |
| Bhup | drone | explicit style | tonic drone | — |
| Desh | drone | explicit style | tonic drone | — |
| Bhairavi | drone | explicit style | tonic drone | — |
| Malkos | drone | explicit style | tonic drone | — |
| Greensleeves | ballad | explicit style | detected chords | — |
| Xianhua diao (鮮花調) | sizhu | explicit style | no chords (heterophony) | — |
| Resvelons nous | ballad | explicit style | written chart | — |
| O give me those pretty eyes | drone | explicit style | tonic drone | — |
| Adana melody | persian | explicit style | written chart | — |
| The Donegall | folk | R field | written chords | no origin in ABC |
| Walking In My Sleep | folk | R field | written chords | no origin in ABC |
| Lalishrita | drone | explicit style | tonic drone | — |
| Fred Roden's Reel | folk | R field | written chords | no origin in ABC |
| Sweet Ellen | folk | R field | written chords | no origin in ABC |
| Billy In The Lowground | folk | R field | written chords | — |
| Dance All Night | folk | R field | written chords | — |
| Mafuve | folk | explicit style | written chart | — |

## Provenance repair queue

- **The First Frost - Second part:** no origin in ABC.
- **B. Variation:** no origin in ABC.
- **The Donegall:** no origin in ABC.
- **Walking In My Sleep:** no origin in ABC.
- **Fred Roden's Reel:** no origin in ABC.
- **Sweet Ellen:** no origin in ABC.
