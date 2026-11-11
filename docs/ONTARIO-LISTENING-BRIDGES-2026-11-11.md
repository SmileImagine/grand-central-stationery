# Ontario Listening Bridges: 30-piece draft plan

This workshop-only set contains three original pieces for every level from JK
through Grade 8. JK and SK use the same 2016 Kindergarten Program expectations
but take different developmental steps: JK begins with a binary choice and an
immediate echo; SK adds partner response, direction and a longer phrase. Grades
1–8 follow the elements-of-music progression in the 2009 Ontario Arts
curriculum. The intended target in `% composition-elements:` is an editorial
claim; it stays separate from concepts detected mechanically by the analyzer.

Every piece is a **listening bridge**, not an imitation. Its record names a
great artist and recording, one feature to compare, cultural/historical framing
to review, and a distance note saying what was not copied. Search links are
temporary discovery links: before classroom publication, replace each with an
authorized label, artist, archive or library link that works in the school.

## Sequence

| Level | Draft 1 | Draft 2 | Draft 3 | Curriculum centre |
| --- | --- | --- | --- | --- |
| JK | *Hello, Echo* ↔ Ella Jenkins | *Big Drum, Small Drum* ↔ Kodo | *Silver Drop* ↔ Evelyn Glennie | beat, sound quality, speed, volume; echo and wait |
| SK | *Mirror Steps* (was *Pata Steps*) ↔ Miriam Makeba | *Pan Parade* ↔ Lord Kitchener | *Bamboo Breath* ↔ Riley Lee | shared pulse, movement, contour, resonance and silence |
| 1 | *Water Groove* ↔ Fela Kuti | *Sing It Up, Sing It Down* (was *Sodade Shape*) ↔ Cesária Évora | *Cumbia Switch* ↔ Lucho Bermúdez | beat/rhythm, 2/4 and 4/4, mi-so-la, unison, call/response |
| 2 | *Mbira Mirror* ↔ Stella Chiweshe | *Gong Garden* ↔ Gamelan Sekar Jaya | *Kora Steps* ↔ Toumani Diabaté | long notes/rests, pentatonic pitch, bordun, AB and verse/chorus |
| 3 | *Carry the Line* (was *Cape Town Round*) ↔ Abdullah Ibrahim | *Question in the Circle* ↔ Nusrat Fateh Ali Khan | *Three-Beat Testimony* ↔ Mercedes Sosa/Violeta Parra | 3/4, sixteenths, dynamics, round/partner song, ABA |
| 4 | *Lantern in the Window* (was *Son Lantern*) ↔ Compay Segundo | *Arc of the Night* ↔ Umm Kulthum | *Signal Chorus* (was *Bahia Signal*) ↔ Ilê Aiyê | syncopation, staff/interval/accidental thinking, major/minor, fermata, two parts |
| 5 | *Landó Lines* ↔ Susana Baca | *Drone Rondo* ↔ Ravi Shankar | *Ska Steps* ↔ The Skatalites | dotted figures, 6/8, part singing, I–V, rondo |
| 6 | *Five Windows* ↔ Paul Desmond/Dave Brubeck Quartet | *Nine-Spoke Carousel* ↔ Zakir Hussain | *Crossing Lines* ↔ Thomas Mapfumo | 5/4, 9/8, 6/4, pickup, triplet, intervals, I–IV–V, layering |
| 7 | *Blue Engine* ↔ Muddy Waters/Willie Dixon | *Bassline Constellation* (was *Log-Drum Constellation*) ↔ Kabza De Small | *Lead the Line* (was *Dabke Drive*) ↔ Omar Souleyman | blues scale/12 bars, triads, marcato, repertoire rhythm, texture and arranging |
| 8 | *Sahel Guitar Layers* ↔ Ali Farka Touré | *Interlock City* (was *Gamelan City*) ↔ I Nyoman Windha | *Cinema Assembly* ↔ A. R. Rahman | encountered keys/rhythms, world timbres, mono/homo/polyphony, form and arrangement for purpose |

## Review and completion (11 November 2026)

Every draft was reviewed and rewritten where the notes did not carry what the
record claimed, then completed to the standard of *Freeze on One*: all nine
dossier fields, a CC0 citation, `N:HOW READ` (a bar-by-bar compositional audit,
including a check against the reference's hook and common children's songs) and
`N:UNCERTAIN`. What the review found and fixed:

- **Words on the wrong notes.** Several drafts had a `w:` line under only their
  second music line, so the first half was silent and the words landed early.
  Every sung piece now has one syllable per note, checked against abcjs.
- **Bars of the wrong length** (stray pickups in *Five Windows* and *Crossing
  Lines*) are gone.
- **Claims the music did not make.** A rondo in eight bars, a round never
  tested as one, partner songs, layering and polyphony written as one line,
  "mirror" without a mirror. These pieces now have the form in the notes:
  *Drone Rondo* is A B A C A (20 bars), *Carry the Line* is a round at four
  bars (`%%round 2 every=4`, scored 92% by the page), *Three-Beat Testimony*
  and *Landó Lines* have a written second part, *Mbira Mirror*'s B is A
  backwards, *Interlock City* and *Sahel Guitar Layers* write their textures.
- **Grade fit.** Grade 1 pieces use quarters, eighths and quarter rests on
  mi-so-la; *Big Drum, Small Drum* no longer leaps a fifth for JK; Grade 3
  pieces lost Grade 5 syncopation.
- **Borrowed identity.** Titles that named the reference's tradition or place
  were changed (shown above), and `%%style drone` (the page's tanpura and
  tabla) was replaced where it imitated a tradition the piece is not.
- **Improv cues** now sit where the music leaves room to answer (rests, held
  notes, a silent bar, the final fermata), not at bars 1-2 and 5-6 every time.
- **Listening links.** 22 of 30 now point to an authorized page (the artist's
  or label's channel or auto-generated upload, Smithsonian Folkways, Real World
  Records, Luaka Bop, ECM, davebrubeck.com, Apple Music). Eight are still
  discovery searches: Abdullah Ibrahim, Mercedes Sosa, Ilê Aiyê, Umm Kulthum,
  Ravi Shankar, the Skatalites, Thomas Mapfumo and I Nyoman Windha.

Status: 28 are at `classroom-check` with the source check passed. *Signal
Chorus* (the Ilê Aiyê album pairing is unconfirmed) and *Interlock City* (no
authorized Windha recording found) stay at the source check. No human review
has happened: every piece still needs a classroom trial, a second score reader
and the specialist named in its record, and the title changes need confirming.

## Improvisation design

The first step is constrained, visible choice, but choice works musically only
with four companions: listening, turn-taking, a shared pulse and a clear reply
window. Each draft therefore carries two JSON cue comments:

```text
% improv: {"id":"A","bars":"1-2","role":"leader then class","prompt":"Echo or answer?","choices":["echo","change the ending","rest"],"replyBars":2}
```

The main page's **Improv** drawer reads the cue, shows it during the named bars,
and lets a conductor select a choice without stopping playback. It deliberately
does not generate the students' answer: the people in the room must listen and
make it. A later pass can add advance notice, keyboard shortcuts, cycle
rotation/random draw, and an optional take log.

## Editorial gates

1. Replace discovery searches with authorized recording links and verify
   artist, composer, title, date, place and language.
2. Have a relevant culture bearer or specialist review each context note and
   the boundary between listening reference and classroom original.
3. Have an Ontario music teacher confirm the intended grade/element claim.
4. Trial singability, range, tempo, cue timing and instrumentation with the
   named age group; record changes in the workshop response.
5. Confirm the new melody against the reference and common repertoire for
   accidental resemblance before publication.
6. Keep these records on the workshop branch until source and classroom checks
   pass; nothing in this plan changes the public catalogue.

## Curriculum sources

- Ontario Ministry of Education, *The Ontario Curriculum, Grades 1–8: The
  Arts* (2009), Music strand: <https://www.edu.gov.on.ca/eng/curriculum/elementary/arts18b09curr.pdf>
- Ontario Ministry of Education, *The Kindergarten Program* (2016):
  <https://files.ontario.ca/books/edu_the_kindergarten_program_english_aoda_web_oct7.pdf>

