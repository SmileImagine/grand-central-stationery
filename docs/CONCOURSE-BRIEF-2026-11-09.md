# The Concourse: a design brief for the notation cell (9 November 2026)

What a design firm might propose if it were asked to treat the notation cell as an interactive exhibit installed in Grand Central Terminal itself. Written as the firm's concept note: the building's lessons, the materials, the lighting states, the pieces, and what each costs to build. The dock of `NOTATION-DOCK-2026-11-09.md` was the starting point.

## Implementation status

The brief is now the current notation-cell direction. Its core pieces ship in
`index.html`: the stone/brass surfaces and sign hierarchy, passage-style
drawers, clock transport, title/key/tempo departure sign, measure beam,
playback lighting states, staff-or-tab score, two-line game with a one-line
fallback, the next-up sign, and object-like instrument materials. The clock,
beam, cursor, instrument and game window all derive from the Player's audio
timeline.

Three proposals were refined during implementation:

- Restart and Repeat remain separate signed buttons beside the clock rather
  than hiding restart behind a long press or making Repeat an invisible rim.
  Both actions stay discoverable and keyboard accessible.
- Names remains an instrument control in the Melody passage. Staff/Tab is a
  score notation choice, while letter/solfège names affect several instrument
  drawings and are clearer beside Instrument.
- Mobile drawers continue to wrap below the text rather than becoming modal
  bottom sheets. This preserves the existing edit-and-watch workflow and
  avoids a second drawer implementation.

The exact three-second inactivity timer proposed for every region was reduced
to a CSS lighting state: during playback passages recede, and in Present the
dock fades after a three-second delay; hover or focus restores it. This keeps
focus predictable without tracking touch-idle state separately.

## The brief in one line

The Main Concourse works because it is one clear volume with one object at its centre, a single hierarchy of signs, quiet materials, and everything else put below the floor. The notation cell should work the same way: one thing in focus at full strength, the signs that say what is next at half, and every control in a passage until it is wanted.

## What the building teaches

- **One volume, one object.** The concourse is a single room with the information-booth clock at its centre. Nothing competes with it. The cell's room is the staff and the instrument; its clock is the transport.
- **A single hierarchy of signs.** The departures board is the only large text in the room. The track gates are small bronze signs with Roman capitals. Everything else is wayfinding at knee height. The cell today has four sizes of control at once (38 px buttons, 14 px tabs, 13 px labels, 12 px inputs) with no rule about which is loudest.
- **Light does the pointing.** The famous photographs are of beams from the east windows falling across the floor. The building has no highlight colour; it has light and shade on stone. The cell should light the bar being played and let the rest fall into shade, instead of outlining things in blue.
- **Materials, not borders.** Tennessee pink marble, Botticino cream, Guastavino tile, brass and opal glass meet without trim. The cell's panels, 6 px radii and `#ddd` borders are web forms; in the room they should be surfaces that meet.
- **The passages.** Ramps and corridors carry every service out of the concourse. They are lit lower and signed smaller, and you go down into them. The drawers are the passages.

The page already speaks this language in places: the wordmark is a concourse window whose mullions are staff lines, the clock is a whole note on its post, Present mode has the barrel-vault vignette, the backwards constellations at night and the east-window rays by day, and the sign lettering is Cinzel. The brief extends that language into the cell rather than adding a new one.

## Materials

The palette comes from the building, kept light enough that engraving stays legible. Values are proposals to tune on the real display.

| Surface | Light (day) | Dark (night) | From |
| --- | --- | --- | --- |
| Floor (cell background) | `#f6f0e6` Botticino cream | `#0f1d2b` the ceiling's blue, deepened | the concourse floor; the ceiling |
| Ink (staff, text) | `#2a2622` warm black | `#efe7d8` opal | the clock's numerals; its faces |
| Shade (hidden, backgrounded) | ink at 25 % | ink at 25 % | stone in shadow |
| Brass (rules, the clock's rim, active sign) | `#9c7a45` | `#c9a35f` | the clock, the gate signs |
| Light (the beam, the cursor, the lamp) | `#f39322` kept, at 70 % over cream | `#f6c36a` | the east windows |
| Celestial (links, the band's chords) | `#2f6f7e` the ceiling's teal | `#5aa3b4` | the Sky Ceiling |
| Terracotta (warnings) | `#b8603d` | `#d98a66` | Guastavino tile |

Two rules. First, no colour is used as a fill behind text except the floor; colour belongs to lines, marks and light. Second, the accent blue `#087fca` leaves the cell: it was a web convention and reads as a link. The rainbow progress bar and the cheer stay in the game, which is a party and may dress as one.

## The five states of light

The user's second concern was focus: what is in play should be visible and the rest should recede. The building answers with lighting, so the cell has lighting states rather than layouts. Each state names what is at full strength (100 % ink), what is signed (60 %) and what is in shade (25 %, restored to 60 % on hover or touch and to full on use).

| State | When | Full | Signed | Shade |
| --- | --- | --- | --- | --- |
| **Reading** | editing, not playing | staff, text box | bar, open drawer's controls | other cells |
| **Rehearsing** | playing while editing | staff with the beam, instrument | text box, bar | drawer controls |
| **Presenting** | present mode, stopped | staff, instrument | bar | nothing else shown |
| **Performing** | present mode, playing | the lit bar of the staff, the instrument | the rest of the staff, the clock | the bar, after 3 s |
| **Playing the game** | game mode | the two lines, the instrument, the lamp | the clock and the next-up sign | everything else |

The mechanism is one CSS variable per region (`--lit`, an opacity multiplier) set by the paint loop from the state and a short timer, with a 300 ms fade. Nothing moves; things brighten and dim. Anything that has not been touched for three seconds while music plays steps down one level; a touch brings it back for another three seconds. The staff never dims below signed while its cursor is on it.

## The pieces

### The clock is the transport

The information-booth clock becomes the play control: one round face with a brass rim, 56 px presenting and 44 px editing. Its hand sweeps once round per bar while playing, and a small arrow or pause mark at its centre makes the action explicit. The tempo reads on the face in small figures and is edited in the departure line under the title. Restart and Repeat remain small, discoverable signs beside it. It is the one object in the bar that is drawn rather than typeset, which makes it the centre as the real clock is.

### The departures board is the bar

The bar under the staff is set as one line of signage in the board's manner: on the left the clock, then the tune's **title, key and tempo** in Roman capitals with wide tracking, then the gates, **MELODY · BAND · MIXER**, as text with a brass underline on the open one and no pill. Figures that change (tempo, the bar count in the game) change with a single split-flap turn, 180 ms, once; nothing else is animated. The red badge on Melody becomes a terracotta figure beside the word.

### The gates are the drawers

A drawer opens as a passage: the bar stays where it is, and the drawer appears below at the passage's light level (signed, 60 %), its controls in one 15 px size on a surface a shade darker than the floor, with no boxes around them. Inputs are plates: a brass underline, no border. Text boxes keep their rule and their mono. The drawers do not slide, as the dock note says, but they fade in over 150 ms, which costs no re-render.

### The beam

The east-window beam falls on the bar being played: a soft column of the light colour, bar-wide, 6 % over the floor in day and 10 % at night, that moves with the cursor on the same clock and fades at its edges. It replaces the need for a strong cursor outline, so the cursor bar thins and the lamp stays. Presenting, the beam is the only colour on the staff besides the ink.

### The instrument is the exhibit object

The ukulele and the piano are drawn as objects in a vitrine rather than diagrams: the ukulele's top in a wood tone (koa, `#a86b3c` at 60 % over the floor), its board darker, the piano's naturals in opal and sharps in warm black, each with a soft shadow beneath. The ukulele is projected from the player's side: G is the larger near string, A the far string, and the frets, body, headstock and machine heads share that depth and slight tilt. Open-string changes fade at the nut instead of drawing a false hand journey. The lit keys and dots keep their pitch colours, which read better on wood and opal than on grey. The tab lane under the fretboard goes; see the next piece.

### Staff or tab, not both

The score shows the staff or the tablature, never the two together, and the lane under the ukulele is retired. A small sign at the top left of the score, in the gate style, reads **STAFF · TAB** (and **NAMES** for the piano and the Wicki layout, which is the present Names option moved here); the choice is kept in the browser like the instrument. Tab is engraved at the staff's size in the score's space, so a tab line is as tall as a staff line and the runner and the hand follow it as they follow the staff. abcjs engraves tablature from a tuning (four strings, G C E A, re-entrant), to be checked against its tablature option; if it will not take four strings, the page draws its own tab system from the same timing map the lane already uses, under the staff's own bar lines.

### The game's two lines

The game shows two systems, the one being played above and the next below, and both are large. The size is set by height, not by a bar count:

1. The score gets a height budget: 44 vh for two systems, with the instrument keeping its quarter of the screen.
2. The engraving scale is chosen so that two systems fill the budget, clamped between a minimum where the staff space is 2.6 vh (about the size of the present single line) and a maximum where it is 4 vh.
3. At that scale the page asks abcjs to wrap the tune to the width, so the bars per line follow from the scale: typically four bars on a landscape display, two or three on a tablet, one or two on a phone.
4. The window advances by a system as the cursor leaves the top system's last bar, with a 200 ms slide so the eye can follow; the next line is always in view, which is the look-ahead the single scrolling line could not give.

The current one-line scroll stays as an option in the Melody drawer (**Lines: Two · One**) for tunes with pick-ups and long bars where wrapping fights the beat.

### The next-up sign

In the game and when presenting, a small departures line above the score says what is coming: the next section's name (the ABC's `P:` parts, or "second time round"), the next chord when the band plays, and the bars left. It is signed, not lit, and it flips once when it changes.

## Typography

- **Signs**: Cinzel, capitals, tracked at 0.12 em, 13 px editing and 15 px presenting. For gates, the title line, the staff/tab sign and the next-up sign only.
- **Reading**: Atkinson Hyperlegible, 15 px, for every control label, note and tip. One size in the drawers.
- **Figures**: Atkinson Hyperlegible Mono for tempo, transpose and counts, so figures line up on the board.
- **Text boxes**: unchanged, the mono at the per-keystroke size.

## Motion

Everything that moves in the cell moves on the one clock: the cursor, the beam, the clock's hand, the runner, the window of two lines. Everything else changes state: fades of 150 to 300 ms, one flap of 180 ms on a changed figure. No springs, no bounces, no entrance animations. The vault, the rays and the stars are the room and stay as they are.

## On a phone

The concourse is still one volume: the score, the instrument and the bar fill the screen, and the drawers come up as bottom sheets at the passage's light level. The clock stays the one drawn object. The staff/tab sign and the two-line window matter most here, since one line of twelve bars was never readable at 390 px.

## Building it

Implemented in this order, each as a change that could ship alone:

1. **Materials and signage — complete.** Palette variables, brass rules, Cinzel gates and departure line, and unboxed controls.
2. **The beam and lighting states — complete with the timer simplification above.** The beam is one rect in the cursor group and uses its timeline.
3. **Staff or tab — complete.** The page draws tab from the same fingering schedule as the instrument; the old ukulele lane is retired.
4. **The two-line game — complete.** ABC wraps to the screen and the view advances by system; One remains an option.
5. **The clock transport and next-up sign — complete.** The hand sweeps through each measure and changing text gets one flap.

## Left out, and why

- **Perspective, marble textures, photographs of the hall.** Scenery behind a diagram; the page should feel like the room, not show it.
- **A departures board that flips constantly.** The real board flipped because its figures changed; one flap per change is the whole effect.
- **Sound design** (the hall's echo on the count-in). Tempting and cheap, but the room is for the music.
- **Animated drawers.** The staff re-renders on height change; the fade gives the sense of a passage without the cost.
- **Colour as hierarchy.** The building has none; light levels do the work, and they survive a projector better than hue does.
