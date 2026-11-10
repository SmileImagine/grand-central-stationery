# The notation dock (9 November 2026)

Design notes for the notation cell's lower half: what was wrong, what the new layout is, and the reasons.

## What was wrong

- **Clutter.** The strip under the staff held the ABC text, the transport, Tempo, Transpose, Feel, three tab buttons and the warnings in one wrapping row, at 13 px. Opening a drawer added a fourth row under it all and squeezed the staff to 40 %.
- **Small controls.** The transport buttons were 26 px squares beside 13 px labels: hard to hit on a classroom display, and harder on a touch screen.
- **An awkward default.** A tune with no chord symbols had a silent band until the teacher opened the Band tab and pressed Arrange (or set Harmony to Detect chords). Every new cell started with the instrument view off, so each new tune began with the same two clicks.
- **One text box for two kinds of text.** The melody's ABC and the band's `%%band` lines shared a box; an arrangement of five long lines buried the tune.
- **The game lost its instrument.** In game mode the open drawer (and the Pattern panel in it) kept its full height while the score kept a fixed 36vh, so on a short screen the instrument, the point of the mode, was left a sliver.

## The layout

```
┌──────────────────────────────────────────────────────────┐
│  staff                                                   │
├──────────────────────────────────────────────────────────┤
│  instrument (when chosen)                                │
├──────────────────────────────────────────────────────────┤
│ ▶  ⏮  🔁   Tempo [80] BPM            (Melody) Band Mixer │  the bar
├──────────────────────────┬───────────────────────────────┤
│ X:1                      │ Instrument [Piano]  Names [..] │  the open drawer
│ T:Scarborough Fair       │ Chords [Auto]  Transpose [0]   │
│ ...                      │ Feel ────●────                 │
│ (warnings under the text)                                │
└──────────────────────────┴───────────────────────────────┘
```

**One bar, three tabs.** The transport (38 px buttons, 46 px when presenting), the tempo and the tabs sit on one line at 14 px. Everything else is in the drawer the tab opens, one at a time; tapping the open tab closes it.

- **Melody**: the tune's ABC on the left, the instrument's controls on the right (Instrument, Names, Chords, Transpose, Feel). ABC feedback is a folded **ABC hints** disclosure directly under the text, not a console-like strip across every drawer. Items can be explained or dismissed for the editing session; a red tab count shows only undismissed items that need attention.
- **Band**: the arrangement on the left, the band's controls on the right (Play, Style, Energy, Detail, variation, Arrange, Pattern), with a line under them saying what the band will play: the arrangement and how many times round, the melody's chord symbols, chords found from the melody, or nothing and why. The Pattern panel opens under both.
- **Mixer**: unchanged.

**Two boxes, one text.** The document format is unchanged: a cell's text is the melody's ABC with its `%%band` lines. The page splits it into the two boxes on load and joins it again on every edit (the arrangement after the melody, without the `%%band` prefix in the box, which is restored on the way out). Arrange and the Pattern panel write the arrangement box. A `%%band` line typed in the melody box would be moved to the band box on the next load; abcjs reads the lines as comments either way.

**What moves when.** Editing, the Melody drawer is open from the start and the mixer closes when the music starts, so the text stays in view while a tune plays. Presenting and in the game, the bar stands alone until a tab is tapped, the drawer is capped (46vh presenting, 40vh in the game) and every drawer closes when the music starts. Leaving Present reopens the Melody drawer. In the game the text box is hidden even with the Melody drawer open: the drawer is there for the instrument and the names.

**Defaults.** Chords (the setting formerly called Harmony) is Auto: the written chord symbols play, and a tune with none gets chords found from the melody and the key, shown and played, so the band plays on a fresh tune with no visit to the Band tab. Numerals adds the Roman numerals; Written only is the old Off. An arrangement in the Band tab takes precedence over found chords. The instrument chosen last is kept in the browser (`gcs-last-inst`) and a new notation cell starts with it.

**The game.** The score takes 32vh, the instrument at least 24vh whatever the dock opens, and the dock is capped at 40vh. Entering the game closes the drawers; so does Play.

**Also.** Space plays and pauses the cell on screen while presenting (outside a text field). Below 700 px the drawer's controls wrap under the text rather than beside it, and the tabs sit on their own line.

## Superseded decisions

- **Sliding drawers are not needed.** The Concourse brief made them passages:
  they fade at a lower light level without changing height during the
  transition, so the staff is not repeatedly re-engraved.
- **A shared rhythm/dance dock is not part of this design.** Those cells keep
  their simpler strip. Their transport may be enlarged independently, but it
  is no longer deferred notation-dock work.

## Addendum: the ukulele's orientation

The fretboard was a plain grid, nut on the left, strings in tab order (A at the top, G at the bottom), and nothing said whose view it was. Tab order is the view of a uke lying face up on the lap with the neck to the left; it is not what a player sees looking down in playing position, where the G string is nearest the eyes. The page keeps tab order, since it matches every chord chart and tab sheet the students will meet, and now says so.

Three cues, chosen as the cheapest that make the picture read as an instrument rather than a grid: a headstock with two pegs a side past the nut, the strings fanning onto it; real fret spacing, each fret a twelfth root of two of the string's remaining length, scaled so the twelfth fret still ends the board (fret 1 is about twice as wide as fret 12), which tells the eye which end is the nut without any drawing; and the body's upper bouts curving out from the fretboard's end to the right edge, with the soundhole, its rosette and the bridge, cut off by the edge so the board keeps its size. A caption under the headstock reads "your uke on your lap, face up, neck to the left".

Weighed and left out for now: perspective on the board (it fights the rectangular tab lane and bends the runner's straight travel), a figure's shoes or body in the background (scenery behind a diagram that already carries lit dots, a runner, chord outlines and a scrolling lane), and a Seen from control for a mirror view (worth adding if a teacher facing the class asks for it; the default view had to be settled first).

## Addendum: score notation and the game window

The later Concourse brief supersedes the old scrolling ukulele lane and the
one-line-only game. A small **Staff · Tab** sign now chooses which notation
occupies the score. Tab is drawn on four strings from the instrument's actual
fingering schedule, so its fret numbers, the highlighted instrument and the
playback cursor cannot disagree; the choice is saved with the cell and as the
last-used default.

Game mode now wraps the tune and shows the current system with the next system
below it. The window advances one system when playback crosses the line. A
**Lines: Two · One** control keeps the former continuous one-line view for
tunes whose pickups or long measures wrap poorly. These items are implemented,
not deferred dock work.
