# The curriculum's glossary, by grade

*The Ontario Curriculum, Grades 1–8: The Arts* (2009) ends with a glossary (pp. 159–177) arranged by strand. This places each Music and each Dance term at the first grade whose strand text uses it: in the grade's Fundamental Concepts box, or failing that in its overall and specific expectations (including their examples and teacher prompts). The grade is a floor, as elsewhere in `ontario.md`: a term first used in grade 3 is in play from grade 3 on. The data is `ontario-terms.json`; the definitions stay in the document, which is the Queen's Printer's.

The placing is by the words of the text, so it has the limits of a word search: a term the curriculum expresses differently is unplaced (the Dance glossary's *personal space* and *general space* appear in grade 1 as "personal and general space"; *bar lines* and *time signature* are concepts the Music strand writes as "bar" and "metre"), and a term used in an example counts as used. Read the unplaced lists as "not in these words", not "not taught".

## Music: 117 of 144 terms placed

| Grade | First named in the Fundamental Concepts | First used in the expectations |
|---|---|---|
| 1 | accent, articulation, aural/oral, bar, beat, body percussion, call and response, duration, dynamics, elements of music, expressive controls, found sounds, harmony, manipulatives, metre, monophony (monophonic music), notation, notation, note, ostinato, phrase, pitch, rest, rhythm, stick (or rhythmic) notation, texture, timbre, unison, visual prompts | accompaniment, echo singing, folk song, historical periods, musicianship, perform, style, syllables, symbols, tempo |
| 2 | bordun, crescendo, decrescendo, homophony (homophonic music), legato, one-line staff, pentatonic scale, percussion instrument, pitched percussion instruments, rhythmic (or stick) notation, scale, staff, two-line staff, verse and chorus, visual representation | melody, melody map/melodic contour |
| 3 | canon, partner song, round, section, ternary form (ABA form) | chant, interpretation, soundscape, technology |
| 4 | accidental, coda, ensemble, fermata, interval, key signature, leap, major scale, oral prompts, polyphony (polyphonic music), sforzando (sfz), skip, step, syncopation | compose, devised notation, family of instruments, head tone, non-traditional notation, recorder, standard notation |
| 5 | chord, oral count, rondo | brass instrument, dotted rhythm, major and minor keys, movement, non-pitched percussion instruments, tablature |
| 6 | anacrusis, compound metre, first and second endings, ledger lines, perfect intervals, pick-up note(s), slur, theme and variations, triplet | improvise, triple metre |
| 7 | blues scale, gamelan, triad | — |
| 8 | minuet | absolute music, arrange, chromatic scale, conducting patterns, fusion form, notation software, program music |

Unplaced: active listening, bar lines, bass clef, da capo al coda, da capo al fine, dal segno al coda, dal segno al fine, dotted note or rest, duple metre, half step, invented notation, major interval, measure, minor interval, minor scales, musical literacy, notes and rests, numbers for notation (scales), question and answer, rhythmic pattern, roman numerals, sight reading, stringed instrument, time signature, whole step, wind instrument, woodwind instrument.

## Dance: 51 of 78 terms placed

| Grade | First named in the Fundamental Concepts | First used in the expectations |
|---|---|---|
| 1 | body, body base, body zones, elements of dance, energy, freeze, locomotor movement, mirroring, non-locomotor movement, quality, relationship, shape, space, tempo, time | dance form, dance piece, dance style, pathway, percussive movement, phrase, stimulus, style |
| 2 | force | — |
| 3 | pattern, pattern form | AB, ABA, canon, contrast, movement vocabulary, prop, repetition |
| 4 | asymmetry, duration, geometric, narrative form, negative space, symmetry | choreography, sustained movement |
| 5 | — | call and response, choreographic form, posture |
| 6 | — | body storming, choreographer, flocking |
| 7 | — | theatre in the round, theme and variation |
| 8 | — | genre, notation (invented dance notation) |

Unplaced: accent, audience etiquette, balance, bound movement, collage, compositional form, contact improvisation, dance sequence, direct action, ensemble, entrance and exit, fluid movement, free-flow movement, general space, motif, organic movement, pedestrian movement, personal space, positive space, retrograde, rhythmic movement, rondo, site specific, static, technique, transitions, unison movement.

## Reading the two side by side

The Music glossary's placing follows the strand's own progression: notation, the elements and their first values in grades 1 and 2 (beat, rhythm, metre, pentatonic scale, staff, crescendo), the forms and textures of grades 3 to 5 (round, canon, ternary form, polyphony, chord, rondo), and reading concepts in grade 6 (anacrusis, compound metre, ledger lines, slur, triplet), with grades 7 and 8 adding the blues scale, triads, the chromatic scale and program music. That is the same ladder the tune and rhythm analyzers' `ontario()` tables climb, so a term's grade here and a tune's grade there agree where they overlap.

The Dance glossary's placing is flatter and earlier: most of its vocabulary (body, space, energy, time, relationship, locomotor and non-locomotor movement, pathway, level, shape, mirroring, freeze) is grade 1, because the elements of dance are all introduced in grade 1 and later grades deepen them. What arrives later is the vocabulary of form and craft: pattern forms (AB, ABA, canon) in grade 3, symmetry and asymmetry, negative space and narrative form in grade 4, call and response and choreographic form in grade 5, flocking in grade 6, theme and variation in grade 7, genre and notation in grade 8. That matches what `ontario.md` found for the step language: the dance curriculum does not progress by footwork, so a step's grade comes from the element or form it brings in.

## Source

- The Ontario Curriculum, Grades 1–8: The Arts (2009): https://www.edu.gov.on.ca/eng/curriculum/elementary/arts18b09curr.pdf. Glossary pp. 159–177 (Dance from p. 159, Music from p. 174 in the document's own page numbers).
