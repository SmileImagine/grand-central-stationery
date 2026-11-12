# Classroom-part inventory and rehearsal recipes

Generated deterministically from `course/set.json` (119 published tunes). These are **one-bar rehearsal recipes, not finished arrangements**. The generator never fabricates chord changes or a descant: it repeats a metre-appropriate body-percussion pulse, offers a tonic/fifth bass cell in the suggested rehearsal key, reports the chart's existing chord symbols, and sings each tune against itself to find the ones that work as rounds.

When the class takes a generated part, music-minus-one should mute the matching band part: body percussion → drums, bass ostinato → bass, ukulele → chords.

## Summary

- 119/119 tunes have a generated body-percussion pulse cell; 119/119 have a tonic/fifth rehearsal cell.
- 69 tunes contain written chord symbols; 50 need harmony review before a ukulele part is claimed.
- 12 tunes use only the small inspected ukulele-chord set after the suggested transposition.
- 18 tunes work as rounds and 13 more are worth trying by ear; 4 would have the groups mostly singing the same notes.

## Per-tune recipes

| Tune | L | Rehearsal key | Metre | Body percussion (L:1/8) | Bass cell (L:1/8) | Harmony / ukulele | As a round |
|---|---:|---|---:|---|---|---|---|
| Glow and Grow | 1 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 2 every 2: 50%, 2 downbeat clashes) |
| Bounce High, Bounce Low | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 75%, 0 downbeat clashes) |
| Ring Around the Rosie | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | mostly unison (75% the same notes): an echo, not a round |
| Starlight, Star Bright | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | mostly unison (100% the same notes): an echo, not a round |
| Rain, Rain, Go Away | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | mostly unison (75% the same notes): an echo, not a round |
| Hello, Echo | 1 | F | 2/4 | `B2 B2 |` | `F,2 C,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>review B | not a round (best 3 every 1: 46%, 8 downbeat clashes) |
| Engine, Engine, Number Nine | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | mostly unison (100% the same notes): an echo, not a round |
| Lucy Locket | 1 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 1: 67%, 8 downbeat clashes) |
| Big Drum, Small Drum | 2 | D | 2/4 | `B2 B2 |` | `D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>review B | round: `%%round 4 every=2`, 100%, no downbeat clash |
| Water Groove | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 2 every 1: 73%, 4 downbeat clashes) |
| Who Will Answer? | 2 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 3 every 1: 71%, 1 downbeat clash) |
| Sing It Up, Sing It Down | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 3 every 2: 65%, 4 downbeat clashes) |
| Bright-Line Boots | 2 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review B | not a round (best 3 every 1: 79%, 5 downbeat clashes) |
| Evening Bells | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>ready from written chords | not a round (best 2 every 2: 91%, 2 downbeat clashes) |
| Crows on the Fence | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>ready from written chords | round: `%%round 4 every=2`, 89%, no downbeat clash |
| Merrily We Roll Along | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 2: 85%, 4 downbeat clashes) |
| Mary Had a Little Lamb | 2 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 2: 85%, 4 downbeat clashes) |
| Clickety Clack | 2 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>ready from written chords | not a round (best 2 every 2: 78%, 1 downbeat clash) |
| Mountain Window | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 6 distinct written chords<br>review Coquihalla, B | not a round (best 2 every 4: 78%, 0 downbeat clashes) |
| Bamboo Breath | 2 | G | 2/4 | `B2 B2 |` | `G,2 D,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 2 every 2: 71%, 1 downbeat clash) |
| Pan Parade | 2 | D | 2/4 | `B2 B2 |` | `D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>review B | try by ear: `%%round 4 every=1`, 83% |
| Mirrorball Hello | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review B | round: `%%round 4 every=1`, 86%, no downbeat clash |
| Mirror Steps | 2 | G | 2/4 | `B2 B2 |` | `G,2 D,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review B | try by ear: `%%round 2 every=2`, 80% |
| Silver Drop | 2 | D | 2/4 | `B2 B2 |` | `D,2 A,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | round: `%%round 2 every=4`, 100%, no downbeat clash |
| Gong Garden | 2 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 2 every 3: 77%, 2 downbeat clashes) |
| Mbira Mirror | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>review Chachimurenga, B | not a round (best 2 every 1: 81%, 2 downbeat clashes) |
| Cha-ko'mba, ko'mba | 3 | Ab | 3/4 | `B2 B2 B2 |` | `_A,2 _E,2 _A,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review Cha-komba-komba | not a round (best 2 every 3: 67%, 8 downbeat clashes) |
| Au Clair de la Lune | 3 | F (+5) | 4/4 | `B2 B2 B2 B2 |` | `F,2 C,2 F,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 66%, 1 downbeat clash) |
| Skip to My Lou | 3 | F (+5) | 2/4 | `B2 B2 |` | `F,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 7: 75%, 2 downbeat clashes) |
| Twinkle, Twinkle, Little Star | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=1`, 90%, downbeat clash in bar 1 |
| This Old Man | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 75%, 1 downbeat clash) |
| Interlock City | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 3 every 1: 78%, 0 downbeat clashes) |
| Lightly Row | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 4: 78%, 0 downbeat clashes) |
| Jingle Bells (chorus) | 3 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 6: 68%, 7 downbeat clashes) |
| Kora Steps | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 3 every 4: 77%, 0 downbeat clashes) |
| Baa, Baa, Black Sheep | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=1`, 90%, downbeat clash in bar 1 |
| Mīkhāhī labu? | 3 | Am | 4/4 | `B2 B2 B2 B2 |` | `A,2 E,2 A,2 E,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review E5 | try by ear: `%%round 2 every=2`, 86%, downbeat clash in bar 5 |
| When the Saints Go Marching In | 3 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=4`, 80%, downbeat clash in bar 1 |
| Rocky Mountain | 3 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 3: 87%, 2 downbeat clashes) |
| Bassline Constellation | 3 | Fm | 4/4 | `B2 B2 B2 B2 |` | `F,2 C,2 F,2 C,2 |`<br>pulse recipe only; follow written chord roots | 7 distinct written chords<br>review B, Bass, Fm, Bbm, Db, Cm | round: `%%round 2 every=2`, 88%, no downbeat clash |
| Amazing Grace | 3 | G | 3/4 | `B2 B2 B2 |` | `G,2 D,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=2`, 90%, no downbeat clash |
| Bújj, bújj, zöld ág | 3 | F | 2/4 | `B2 B2 |` | `F,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 2 every=4`, 88%, no downbeat clash |
| Drone Rondo | 3 | Dm | 6/8 | `B3 B3 |` | `D,3 A,3 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>review B, D5 | not a round (best 2 every 4: 82%, 2 downbeat clashes) |
| Go le mimli | 3 | C | 6/8 | `B3 B3 |` | `C,3 G,3 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 4: 74%, 7 downbeat clashes) |
| Three-Way Streetlight | 3 | C | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>pulse recipe only; follow written chord roots | 6 distinct written chords<br>review B | round: `%%round 3 every=4`, 88%, no downbeat clash |
| Arirang | 3 | C (-7) | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review C5 | not a round (best 3 every 4: 79%, 6 downbeat clashes) |
| Cuckoo's Nest | 4 | Dm | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 6 distinct written chords<br>review Gm | not a round (best 3 every 2: 60%, 7 downbeat clashes) |
| Frère Jacques | 4 | F (+5) | 4/4 | `B2 B2 B2 B2 |` | `F,2 C,2 F,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=2`, 90%, no downbeat clash |
| Highland Mary | 4 | F (-2) | 4/4 | `B2 B2 B2 B2 |` | `F,2 C,2 F,2 C,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>review Gm | not a round (best 3 every 2: 72%, 1 downbeat clash) |
| Astley's Ride | 4 | F (-9) | 4/4 | `B2 B2 B2 B2 |` | `F,2 C,2 F,2 C,2 |`<br>pulse recipe only; follow written chord roots | 11 distinct written chords<br>review Gm, Gm/g | not a round (best 3 every 4: 87%, 5 downbeat clashes) |
| Three-Beat Testimony | 4 | F | 3/4 | `B2 B2 B2 |` | `F,2 C,2 F,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | round: `%%round 2 every=6`, 86%, no downbeat clash |
| The First Frost - Second part | 4 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 6 distinct written chords<br>review Bm | not a round (best 4 every 6: 74%, 16 downbeat clashes) |
| Voice and Guitar Layers | 4 | CDor (-2) | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>review Fuitar, Ftr | not a round (best 2 every 3: 75%, 0 downbeat clashes) |
| Arc of the Night | 4 | Dm | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 2 every 6: 77%, 0 downbeat clashes) |
| Question in the Circle | 4 | Am | 4/4 | `B2 B2 B2 B2 |` | `A,2 E,2 A,2 E,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | not a round (best 2 every 1: 76%, 1 downbeat clash) |
| Gurkha sing-song | 4 | G (-5) | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review Ghorus | round: `%%round 4 every=1`, 97%, no downbeat clash |
| Rama's lullaby | 4 | C | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 2: 75%, 1 downbeat clash) |
| Screenlight | 4 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 9 distinct written chords<br>review B, Cm, Ab, Fm | not a round (best 2 every 7: 73%, 3 downbeat clashes) |
| Na Bahia tem | 4 | D | 2/4 | `B2 B2 |` | `D,2 A,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 7: 77%, 2 downbeat clashes) |
| Rāna jīnāk | 4 | Em (-5) | 2/4 | `B2 B2 |` | `E,2 B,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review Ellegro | not a round (best 2 every 15: 65%, 8 downbeat clashes) |
| Sakura | 4 | Bm (-3) | 4/4 | `B2 B2 B2 B2 |` | `B,2 ^F,2 B,2 ^F,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review F#5 | not a round (best 2 every 5: 70%, 0 downbeat clashes) |
| Oh! Susanna | 4 | C (-7) | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 4 every=2`, 82% |
| Mu-to-to-li'le | 4 | C | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 2: 62%, 1 downbeat clash) |
| Lead the Line | 4 | Dm | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review B, Gm | not a round (best 2 every 4: 73%, 0 downbeat clashes) |
| Carry the Line | 4 | C | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review B | round: `%%round 2 every=4`, 92%, no downbeat clash |
| Ba ban (八板) | 4 | F | 2/4 | `B2 B2 |` | `F,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 17: 77%, 6 downbeat clashes) |
| The ayah's song | 4 | F (+5) | 3/4 | `B2 B2 B2 |` | `F,2 C,2 F,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 4 every 3: 72%, 0 downbeat clashes) |
| Pass the ball | 4 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=1`, 83%, downbeat clash in bar 5 |
| Carry banana | 4 | E | 3/4 | `B2 B2 B2 |` | `E,2 B,2 E,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review China | not a round (best 2 every 6: 78%, 1 downbeat clash) |
| Nirguna's lullaby | 4 | C (+7) | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 10: 67%, 1 downbeat clash) |
| Si me dan pasteles | 4 | Dm (-5) | 2/4 | `B2 B2 |` | `D,2 A,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 4: 77%, 1 downbeat clash) |
| Cinema Assembly | 4 | Dm (-2) | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 9 distinct written chords<br>review Gm | not a round (best 2 every 6: 77%, 2 downbeat clashes) |
| Daisy Daisy | 4 | G (-7) | 3/4 | `B2 B2 B2 |` | `G,2 D,2 G,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>ready from written chords | not a round (best 2 every 10: 75%, 9 downbeat clashes) |
| Usagi to Kame (兎と亀) | 4 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 3: 76%, 5 downbeat clashes) |
| La Rana | 4 | F (+3) | 3/4 | `B2 B2 B2 |` | `F,2 C,2 F,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review Bba-ra | not a round (best 2 every 6: 79%, 1 downbeat clash) |
| Ska Steps | 4 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>review B | try by ear: `%%round 2 every=8`, 84% |
| A l'entrada del tens clar | 4 | GMix | 3/4 | `B2 B2 B2 |` | `G,2 D,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review E-ya!, All | not a round (best 3 every 16: 79%, 12 downbeat clashes) |
| Galloway road | 4 | D | 2/4 | `B2 B2 |` | `D,2 A,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 3 every=1`, 86%, no downbeat clash |
| I Plant Some Rice | 4 | G | 2/4 | `B2 B2 |` | `G,2 D,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | try by ear: `%%round 2 every=1`, 81% |
| Vámonos por Santa Anita | 4 | F (-2) | 2/4 | `B2 B2 |` | `F,2 C,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review Fayly | not a round (best 2 every 2: 50%, 0 downbeat clashes) |
| Nine-Spoke Carousel | 4 | C (-2) | 9/8 | `B3 B3 B3 |` | `C,3 G,3 C,3 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | not a round (best 2 every 5: 72%, 2 downbeat clashes) |
| O tu'la, mntwa'na (Thula, mntwana) | 4 | C (-4) | 6/8 | `B3 B3 |` | `C,3 G,3 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=1`, 89%, no downbeat clash |
| Little Sally Water | 4 | Eb | 2/4 | `B2 B2 |` | `_E,2 _B,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 80%, 3 downbeat clashes) |
| O where will you go | 5 | GDor | 5/8 | `B B B B B |` | `G, D, G, D, G, |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 33%, 1 downbeat clash) |
| Sugar in the Gourd | 5 | A | 4/4 | `B2 B2 B2 B2 |` | `A,2 E,2 A,2 E,2 |`<br>pulse recipe only; follow written chord roots | 6 distinct written chords<br>review F#m, Bm | try by ear: `%%round 4 every=4`, 83% |
| Soldiers' Joy | 5 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 8 distinct written chords<br>review Bm | not a round (best 3 every 8: 78%, 4 downbeat clashes) |
| Tom And Jerry | 5 | A | 4/4 | `B2 B2 B2 B2 |` | `A,2 E,2 A,2 E,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review F#m, Bm | not a round (best 3 every 8: 80%, 8 downbeat clashes) |
| B. Variation | 5 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review Bm | not a round (best 3 every 4: 80%, 0 downbeat clashes) |
| Mother, send to the dhobi | 5 | BPhr | 5/8 | `B B B B B |` | `B, ^F, B, ^F, B, |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 50%, 1 downbeat clash) |
| Signal Chorus | 5 | C (-7) | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>ready from written chords | not a round (best 2 every 3: 73%, 1 downbeat clash) |
| Lantern in the Window | 5 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 9 distinct written chords<br>review B, Cm, Ab, Fm | try by ear: `%%round 2 every=3`, 84% |
| Konpira fune fune | 5 | C | 2/4 | `B2 B2 |` | `C,2 G,2 |`<br>simple-harmony rehearsal cell | 1 distinct written chord<br>review G5 | not a round (best 4 every 5: 79%, 12 downbeat clashes) |
| Zdravets | 5 | APhr | 9/16 | `B B B B3/2 |` | `A, E, A, E,3/2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 4 every 1: 63%, 6 downbeat clashes) |
| B'qāw ʿala khēr | 5 | C (-10) | 3/8 | `B B B |` | `C, G, C, |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 7: 74%, 0 downbeat clashes) |
| Chhaila | 5 | Bb | 5/8 | `B B B B B |` | `_B, F, _B, F, _B, |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 70%, 0 downbeat clashes) |
| Bhup | 5 | C | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 4 every 3: 75%, 0 downbeat clashes) |
| Desh | 5 | CMix | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 3 every 2: 63%, 6 downbeat clashes) |
| Room for the Verse | 5 | Dm | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>review B, Gm | not a round (best 3 every 2: 72%, 3 downbeat clashes) |
| Draw the Line | 5 | Gm (-2) | 6/8 | `B3 B3 |` | `G,3 D,3 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>review Gm | not a round (best 2 every 6: 73%, 1 downbeat clash) |
| Bhairavi | 5 | CPhr | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 8: 71%, 0 downbeat clashes) |
| Malkos | 5 | Cm | 3/4 | `B2 B2 B2 |` | `C,2 G,2 C,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=1`, 93%, no downbeat clash |
| Greensleeves | 5 | F#m (+2) | 6/8 | `B3 B3 |` | `^F,3 ^C,3 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 3: 56%, 0 downbeat clashes) |
| Blue Room Answer | 5 | Dm | 6/8 | `B3 B3 |` | `D,3 A,3 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>review B | round: `%%round 2 every=6`, 90%, no downbeat clash |
| Crossing Lines | 5 | F (-2) | 6/4 | `B6 B6 |` | `F,6 C,6 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>ready from written chords | not a round (best 2 every 2: 73%, 2 downbeat clashes) |
| Five Windows | 5 | Gm (-2) | 5/4 | `B2 B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 G,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review Gm, Cm | not a round (best 2 every 5: 67%, 4 downbeat clashes) |
| Xianhua diao (鮮花調) | 5 | C | 2/2 | `B4 B4 |` | `C,4 G,4 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 1: 75%, 1 downbeat clash) |
| Resvelons nous | 5 | C | 3/2 | `B4 B4 B4 |` | `C,4 G,4 C,4 |`<br>simple-harmony rehearsal cell | 2 distinct written chords<br>review Contratenor, Ct | not a round (best 2 every 5: 79%, 2 downbeat clashes) |
| O give me those pretty eyes | 6 | GDor | 3/4 | `B2 B2 B2 |` | `G,2 D,2 G,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 4 every 1: 57%, 4 downbeat clashes) |
| Blue Engine | 6 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review B, F7 | not a round (best 2 every 2: 78%, 1 downbeat clash) |
| Adana melody | 6 | Em (-5) | 2/4 | `B2 B2 |` | `E,2 B,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | not a round (best 2 every 2: 66%, 1 downbeat clash) |
| The Donegall | 6 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | not a round (best 4 every 8: 86%, 7 downbeat clashes) |
| Walking In My Sleep | 6 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>pulse recipe only; follow written chord roots | 3 distinct written chords<br>ready from written chords | not a round (best 3 every 8: 91%, 4 downbeat clashes) |
| Many Hands, One Sky | 6 | DMix | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 6 distinct written chords<br>review B, Counterline | not a round (best 4 every 3: 64%, 13 downbeat clashes) |
| Lalishrita | 6 | C | 6/8 | `B3 B3 |` | `C,3 G,3 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 4 every=1`, 89%, no downbeat clash |
| Fred Roden's Reel | 6 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | not a round (best 2 every 1: 72%, 2 downbeat clashes) |
| Sweet Ellen | 6 | D | 4/4 | `B2 B2 B2 B2 |` | `D,2 A,2 D,2 A,2 |`<br>pulse recipe only; follow written chord roots | 5 distinct written chords<br>review Bm | not a round (best 2 every 11: 84%, 4 downbeat clashes) |
| Billy In The Lowground | 6 | C | 4/4 | `B2 B2 B2 B2 |` | `C,2 G,2 C,2 G,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | not a round (best 2 every 16: 80%, 0 downbeat clashes) |
| Dance All Night | 6 | G | 4/4 | `B2 B2 B2 B2 |` | `G,2 D,2 G,2 D,2 |`<br>pulse recipe only; follow written chord roots | 4 distinct written chords<br>ready from written chords | try by ear: `%%round 4 every=8`, 83%, downbeat clash in bar 1 |
| Mafuve | 6 | E | 3/4 | `B2 B2 B2 |` | `E,2 B,2 E,2 |`<br>provisional tonic/fifth; harmony review | no written chord symbols<br>needs harmony review | round: `%%round 3 every=3`, 85%, no downbeat clash |

## Harmony queue

These charts have no written chord symbols. A teacher, arranger, or source should supply harmony—or explicitly mark a drone/unaccompanied treatment—before a ukulele chart or chord-following bass is generated.

- **Bounce High, Bounce Low:** C, 2/4, level 1.
- **Ring Around the Rosie:** C, 2/4, level 1.
- **Starlight, Star Bright:** C, 2/4, level 1.
- **Rain, Rain, Go Away:** C, 2/4, level 1.
- **Engine, Engine, Number Nine:** C, 2/4, level 1.
- **Lucy Locket:** C, 2/4, level 1.
- **Merrily We Roll Along:** C, 4/4, level 2.
- **Mary Had a Little Lamb:** G, 4/4, level 2.
- **Au Clair de la Lune:** C, 4/4, level 3.
- **Skip to My Lou:** C, 2/4, level 3.
- **Twinkle, Twinkle, Little Star:** C, 4/4, level 3.
- **This Old Man:** C, 4/4, level 3.
- **Lightly Row:** C, 4/4, level 3.
- **Jingle Bells (chorus):** G, 4/4, level 3.
- **Baa, Baa, Black Sheep:** C, 4/4, level 3.
- **When the Saints Go Marching In:** C, 4/4, level 3.
- **Rocky Mountain:** C, 2/4, level 3.
- **Amazing Grace:** G, 3/4, level 3.
- **Bújj, bújj, zöld ág:** F, 2/4, level 3.
- **Go le mimli:** C, 6/8, level 3.
- **Frère Jacques:** C, 4/4, level 4.
- **Rama's lullaby:** C, 3/4, level 4.
- **Na Bahia tem:** D, 2/4, level 4.
- **Oh! Susanna:** G, 2/4, level 4.
- **Mu-to-to-li'le:** C, 3/4, level 4.
- **Ba ban (八板):** F, 2/4, level 4.
- **The ayah's song:** C, 3/4, level 4.
- **Pass the ball:** C, 4/4, level 4.
- **Nirguna's lullaby:** F, 3/4, level 4.
- **Si me dan pasteles:** Gm, 2/4, level 4.
- **Usagi to Kame (兎と亀):** C, 2/4, level 4.
- **Galloway road:** D, 2/4, level 4.
- **I Plant Some Rice:** G, 2/4, level 4.
- **O tu'la, mntwa'na (Thula, mntwana):** E, 6/8, level 4.
- **Little Sally Water:** Eb, 2/4, level 4.
- **O where will you go:** GDor, 5/8, level 5.
- **Mother, send to the dhobi:** BPhr, 5/8, level 5.
- **Zdravets:** APhr, 9/16, level 5.
- **B'qāw ʿala khēr:** Bb, 3/8, level 5.
- **Chhaila:** Bb, 5/8, level 5.
- **Bhup:** C, 3/4, level 5.
- **Desh:** CMix, 3/4, level 5.
- **Bhairavi:** CPhr, 3/4, level 5.
- **Malkos:** Cm, 3/4, level 5.
- **Greensleeves:** Em, 6/8, level 5.
- **Xianhua diao (鮮花調):** C, 2/2, level 5.
- **O give me those pretty eyes:** GDor, 3/4, level 6.
- **Adana melody:** Am, 2/4, level 6.
- **Lalishrita:** C, 6/8, level 6.
- **Mafuve:** E, 3/4, level 6.

## Rounds

Each tune is sung against itself by 2, 3 and 4 groups, the groups coming in at the distance the page picks for a `%%round` line with no `every=` (course/round-fit.js keeps a copy of the page's scoring). On every beat, each pair of notes the groups sound together is scored: unisons, thirds, fifths, sixths and octaves fit, fourths count half, seconds, sevenths and the tritone clash. A clash on a downbeat is what the ear catches; a passing one between beats is normal in a round. Bars are counted as played, repeats written out. The verdict keeps the most groups that reach it; the line goes after the tune's melody to try it on the page, where the same fit shows as a tip. Listen before publishing a round.

**Work as rounds** (85% or more, no clash on a downbeat):

- **Big Drum, Small Drum:** `%%round 4 every=2` (100%).
- **Crows on the Fence:** `%%round 4 every=2` (89%).
- **Mirrorball Hello:** `%%round 4 every=1` (86%).
- **Silver Drop:** `%%round 2 every=4` (100%).
- **Bassline Constellation:** `%%round 2 every=2` (88%).
- **Amazing Grace:** `%%round 4 every=2` (90%).
- **Bújj, bújj, zöld ág:** `%%round 2 every=4` (88%).
- **Three-Way Streetlight:** `%%round 3 every=4` (88%).
- **Frère Jacques:** `%%round 4 every=2` (90%).
- **Three-Beat Testimony:** `%%round 2 every=6` (86%).
- **Gurkha sing-song:** `%%round 4 every=1` (97%).
- **Carry the Line:** `%%round 2 every=4` (92%).
- **Galloway road:** `%%round 3 every=1` (86%).
- **O tu'la, mntwa'na (Thula, mntwana):** `%%round 4 every=1` (89%).
- **Malkos:** `%%round 4 every=1` (93%).
- **Blue Room Answer:** `%%round 2 every=6` (90%).
- **Lalishrita:** `%%round 4 every=1` (89%).
- **Mafuve:** `%%round 3 every=3` (85%).

**Worth trying by ear** (80% or more, at most one downbeat clash):

- **Pan Parade:** `%%round 4 every=1` (83%).
- **Mirror Steps:** `%%round 2 every=2` (80%).
- **Twinkle, Twinkle, Little Star:** `%%round 2 every=1` (90%; clash on the downbeat of bar 1).
- **Baa, Baa, Black Sheep:** `%%round 2 every=1` (90%; clash on the downbeat of bar 1).
- **Mīkhāhī labu?:** `%%round 2 every=2` (86%; clash on the downbeat of bar 5).
- **When the Saints Go Marching In:** `%%round 2 every=4` (80%; clash on the downbeat of bar 1).
- **Oh! Susanna:** `%%round 4 every=2` (82%).
- **Pass the ball:** `%%round 2 every=1` (83%; clash on the downbeat of bar 5).
- **Ska Steps:** `%%round 2 every=8` (84%).
- **I Plant Some Rice:** `%%round 2 every=1` (81%).
- **Sugar in the Gourd:** `%%round 4 every=4` (83%).
- **Lantern in the Window:** `%%round 2 every=3` (84%).
- **Dance All Night:** `%%round 4 every=8` (83%; clash on the downbeat of bar 1).

**Mostly unison** (the groups would sing the same notes more than half the time, as so–mi chants do; better as an echo or with an ostinato than as a round):

- **Ring Around the Rosie:** 75% the same notes.
- **Starlight, Star Bright:** 100% the same notes.
- **Rain, Rain, Go Away:** 75% the same notes.
- **Engine, Engine, Number Nine:** 100% the same notes.
