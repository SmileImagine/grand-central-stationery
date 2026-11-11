# Chord voices on the instrument views (prototype, 10 November 2026)

A chord is shown as voices: one ring per voice, in its note's colour, that holds while the chord sounds and glides to its note in the next chord. No hand fingering is calculated. Everything is drawn from the playhead in `paint()` (`InstrumentView.voices(track, t)`), on the same clock as the melody's runner.

## Choices made (the defaults)

**Which chords.** The piano shows the Band's voicing as it plays it: `Band.prepare` now records each voicing it comps (`res.voicings`: time, chord, notes). The Band's notes are unchanged: `node test/band-report.js --quick --no-audio` gives byte-identical JSON before and after. The written symbol still outlines its keys in every octave, as before, so the piano shows both: the outline for the symbol and the rings for the voicing. When the Band is silent (Play: Melody only, or a page opened from disk), the symbols are voiced by the Band's smallest-step rule (`stepVoicing`). `?voices=written` forces that; `?voices=off` turns the rings off.

**How voices pair.** On the piano they pair low to high. With the same number of voices, that is also the pairing with the least movement (in one dimension the sorted pairing is optimal), so voices never cross. The Band's smallest-step voicing therefore shows as real voice leading. In Daisy Daisy, D→A7 keeps A, D splits into C♯ (down) and E (up), and F♯ steps to G.

**When the count changes.** The smaller chord's voices pair in order with the notes they move least to (dynamic programming). Each voice left over pairs with its nearest neighbour. A new voice splits off a neighbour and fades in as it slides. A voice that goes merges into a neighbour and fades out. No dot appears or vanishes in place.

**Fretted: voice = string.** Yes, this is the natural reading. Each string is a voice and its ring moves only along its own string. Each string takes the chord tone nearest the fret it was on (`stringVoicing`). Few fingers and a low position weigh more than movement (`MOVE = 0.35`), which gives the shapes a class learns: C 0003, G 0232, F 2010, Am 2000, D7 2223, G7 0212. With movement weighted at 1, the voices move less but leave those shapes (C after G becomes 0433), so that weight is the one dial to argue about. An open string's ring sits hollow just past the nut. The ukulele takes the pitch classes the Band plays, so a seventh that Detail adds shows, and re-voices them on its strings.

**Timing.** The ring uses the recorder's curve (`glide`, shared now). It holds, then slides in the last stretch, up to 400 ms, gathering speed so it lands exactly on the change. A ring that moved brightens as it lands. Unlike the recorder, the rings do not lean early: a held key or fret whose dot drifts away reads as let go. This branch merges `claude/recorder-animation-readability-801265` to share the curve and the `frame(u, t, dt)` signature.

## Left open

- **Ukulele: melody and chords together.** The view shows both: the melody's runner and the chord rings. In class a ukulele usually strums the chords while the children sing, so the chords alone may be the better default there.
- **Guitar.** There is no guitar view yet. `stringVoicing` works for six strings, but strumming every string puts a non-root bass on the low strings (G7 120001, D 200232). A guitar needs muted strings (x) and the root (or a slash bass) as the lowest voice.
- **Piano range.** With chords, the piano reaches down to C3, so it is three octaves and its keys are smaller. A Band note below C3 (a pad) is shown an octave in.
- **"As played" detail.** The rings follow the Band's choices exactly: Detail's sevenths, Arrange's choruses, and a chord re-voiced under a high melody note. A new voicing within one chord moves the rings too. If that is too busy, show one voicing per chord change.
- **Wicki-Hayden.** No rings yet. A pitch has several keys there, so it would want the layout's least-travel scheduling.
- **Count-in.** Before the first chord, its rings wait faint. They could glide in instead.

## Seen in passing (not changed here)

With Transpose +2, the instrument view's melody sits 4 semitones up (Evening Bells: 73, 71, 68 for A G E) while the sound is right (71, 69, 66). `allMidis` / `eventMidis` add `this.transpose` to pitches that `visualTranspose` has already moved. The chord rings follow the sound, so they are right.
