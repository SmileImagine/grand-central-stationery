# Tune quality: three plans (10 November 2026)

The goal, in the user's words: tunes that are **filled out** (the characteristic
accompaniment, notes, rhythms, accents, dynamics and timbres; short is fine,
excerpts are fine), **diverse** (accurate to many heritages, plus original
modern bangers kids will love), with a **very high quality backing band**,
**style picker** (characteristic reharmonisation, instrumentation, timbre) and
**arranger and musicians**.

Below: where things stand, three plans written from three chairs (a
musicologist, a DJ, a choir director and band leader), what each would add to
the list, and a combined order of work.

## Where things stand

Read from `index.html` and `course/set.json` on this branch.

**The tunes.** The published set has 45 tunes:

| Source | Count | Notes |
| --- | --- | --- |
| English, American, French, German nursery and game songs | 17 | none has written chords; the Band detects them |
| Nottingham fiddle tunes (England, Anglo-American) | 16 | chords written; two are fragments ("B. Variation", "First Frost, second part"); Soldier's Joy appears twice |
| India (Fox Strangways 1914: Garhwali songs, Hindustani ragas, a Maratha lullaby) | 9 | no chords, by design (drone) |
| Originals (`original-pentatonic.abc`) | 3 | gentle pentatonic studies, not bangers |

Nothing yet from Africa, the Caribbean, Latin America, East or Southeast Asia,
the Middle East, Indigenous America, Eastern Europe or the Jewish diaspora. The
rhythm and dance corpora (`world.rhythms.txt`, 42 patterns; `world.dances.txt`,
24) are already broader than the tune set, so the tune set is the bottleneck.

**The sounds.** Five pitched sample sets (grand piano, acoustic bass, nylon
guitar, electric piano, recorder; about 15 MB) and a General MIDI kit of ten
drums (kick, snare, rim, clap, closed and open hat, crash, ride, tambourine,
shaker). No strings, brass, winds besides recorder, accordion, fiddle, banjo,
steel pan, marimba, kora, synth bass, synth pad, 808, congas, bongos, cowbell,
claves, agogô, tabla, djembe or talking drum.

**The Band.** Three parts (drums, bass, chords) written by `scoreFor` as one
`if` chain over nine styles (pop, folk, march, waltz, jig, swing, bossa,
ballad, drone). Energy and Detail shape density; voicings move by the smallest
step; the bass has approach notes. The melody gets phrase-shaped dynamics from
`humanize`.

**The arranger.** `arrange()` writes one five-chorus arc (plain, rich,
approached, peak, quiet) by adding sevenths, ii–V approaches and tritone
substitutes. It does not know the style: a reel or a jig gets jazz tritone
substitutes, which no fiddler would play. There are no intros, endings,
breaks, key changes or sections; a tune is the same length every time round.

So the engine is sound (one clock, a text score, controls) but the content
layer above it is thin and mostly Anglo-American, and the style layer is a
groove switch rather than an idiom.

---

## Plan A: the musicologist

*Starting question: what makes this music itself? Get that right per
tradition, and say honestly what is traditional and what is an arrangement.*

### A1. A tune dossier for every tune

Each tune carries, in its ABC header or a companion block, what the tradition
says it needs:

- **Function**: dance, game, lullaby, work song, ceremony, story, concert.
- **Characteristic elements**: the rhythm cell (habanera, clave, tresillo,
  Scotch snap, dotted hornpipe), the accompaniment idiom (drone, ostinato,
  boom-chick, call and response, heterophony, colotomic gong cycle), the
  ornaments (Irish cuts and rolls, Indian meend and gamak, Arabic
  quarter-tone inflection, blues bends), the instrumentation, the tuning or
  mode, the form.
- **Performance practice**: tempo range, swing or lilt amount, who sings or
  plays what, where the accents fall.
- **Provenance and honesty level**: *traditional* (as documented),
  *arranged* (traditional melody, our accompaniment in its idiom), or
  *fusion* (deliberately crossed, labelled so). Source citation and licence.
- **Respect flags**: sacred or ceremonial material excluded (as the dance
  corpus already does), and a note on who may review it.

The lint in the ABC box can then say what is missing ("a son tune with no
clave", "a hornpipe without dotted rhythm").

### A2. A coverage map, then fill it

A grid of regions by function by level, filled from the dossiers, shown in
`course/library.html`. Target a first balanced set of about 120 tunes,
roughly 10 per region, each region with at least a game song, a dance tune, a
lullaby and a song that teaches something (a round, call and response, a
pentatonic or modal tune). Sources stay PD, CC or typed CC0 from teaching
practice, as the course rules say. Candidates already identified: Mário de
Andrade 1928 (Brazil), Sánchez de Fuentes 1923 (Cuba), the Library of Congress
folk song and dance collections, Burchenal (dance tunes), plus typed
teaching-practice songs (Ghanaian, Ewe, Maori, Korean, Japanese warabe uta,
Hebrew and Yiddish, Arabic children's songs) reviewed by a culture bearer
before publishing.

### A3. Styles become idioms

Replace the `if` chain with an **idiom registry**, one data record per
tradition, each holding:

- **Groove** in the band's mini-notation (what exists now), plus the
  tradition's own percussion (clave, bell pattern, tabla theka, darbuka
  maqsum, djembe parts, bodhrán).
- **Harmony grammar**: which reharmonisations are idiomatic. Irish and
  Appalachian: modal I–bVII, drone or open fifths, no sevenths. Blues: I7 IV7
  V7 and the turnaround. Son and salsa: I–IV–V montuno, tumbao bass.
  Highlife: I–IV–V in rolling guitar figures. Bossa: maj7, m7, ii–V and
  chromatic slides (where the current tritone substitutes belong). Hindustani
  and much Arabic and Persian music: no chords, drone and heterophony. Gamelan:
  colotomic layers, no harmony.
- **Instrumentation and timbre**: which sample sets play which part.
- **Ornament rules** applied to the melody by `humanize` (the `fx.scoop` and
  `fx.vib` hooks are the start).
- **Tuning** (the Scala `%%tuning` line already exists: maqam, slendro,
  pelog, just intonation for the drone).

`arrange()` reads the idiom's harmony grammar and stops reharmonising a jig
like a jazz standard.

### A4. Sound sources for the timbres that define traditions

Before any modern synth: fiddle, accordion, banjo, steel guitar, oud or saz,
sitar or tanpura, kora, marimba and balafon, steel pan, harp, bagpipe drone,
congas, bongos, claves, cowbell, agogô, djembe, tabla, darbuka, frame drum,
gongs. Licence-checked samples or small synthesised models (a tanpura and a
gong cycle synthesise well and weigh nothing).

### A5. Measures

- Every published tune has a complete dossier.
- Coverage map: no empty region at levels 1 to 4.
- A culture bearer or specialist has listened to each idiom and signed off
  (name or initials kept in the dossier).
- Blind check: a specialist can name the tradition from the band alone.

**Risk the musicologist sees:** the idiom registry turns into a museum. The
DJ and band leader plans are the counterweight.

---

## Plan B: the DJ

*Starting question: does it slap? Kids decide in four bars. Sound quality,
energy shape and the drop matter more than authenticity labels.*

### B1. Fix the sound first

- **A mix bus**: a gentle compressor on the master, a kick-triggered duck on
  bass and pads (sidechain pump), a high-pass on everything but kick and
  bass, a limiter so a loud chorus never clips. All Web Audio nodes on the
  existing context, no second clock.
- **Loudness**: every style rendered and normalised to one target so
  switching styles does not jump in volume.
- **A modern palette**: synthesised 808 kick and sub bass (pitched, with
  glide), 909-style hats and claps, a supersaw or square lead, a plucky synth,
  a warm pad, brass stabs, a vinyl and tape layer for lo-fi. Synthesised
  voices cost no download.

### B2. Song form with a drop

The arranger writes **sections**, not just choruses: intro (drums only or a
filtered loop), verse, build (snare roll, riser, filter opening), drop (full
band, melody doubled up an octave), breakdown (melody alone over a pad), and
an outro that ends on a hit, not a fade. Transitions: crash on the one, a
reverse cymbal into the drop, a beat of silence before it.

### B3. Modern grooves kids know

New idioms in the registry, grooves only (rhythms and textures are free to
use; no specific song is recreated):

- hip-hop boom bap and trap (half time, rolling hats, 808 slides)
- reggaeton and dembow
- Afrobeats and amapiano (log-drum bass)
- K-pop and EDM four on the floor, with a build and drop
- lo-fi study beat
- drum and bass, baile funk, Jersey club for the high-energy end
- funk and disco (octave bass, sixteenth hats, guitar scratch)

Every PD tune can be **flipped**: Twinkle as Afrobeats, Frère Jacques as trap,
Soldier's Joy as four on the floor. The Style picker already does this; it
needs these grooves and their harmony (minor-key loops, sus chords, the
four-chord loop).

### B4. Ten original bangers

Written for the course (locally written, so licence-clean), each with a hook
inside a recorder's and a child's range, a chantable title line, a dance move,
and its own producer-built arrangement in the chart: two in trap, two in
Afrobeats or amapiano, one EDM, one funk, one reggaeton, one lo-fi, one
pop-punk, one drill-free hip-hop chant. Each one teaches something on the
lattice (a new note, syncopation, a rest on the beat).

### B5. Sets and the room

A **set mode**: a playlist of tunes ordered by BPM and key (Camelot-wheel
neighbours) with the band carrying a groove across the change, so a class
can go from warm-up to a dance break without silence.

### B6. Measures

- An offline render harness (OfflineAudioContext, every tune by every style
  to WAV) so each change is heard, not reasoned about.
- A kids' panel: thumbs up or down per track, kept per style.
- Loudness within 1 LU across styles; no clipping on any render.

**Risk the DJ sees:** everything becomes four on the floor in C minor. The
musicologist's dossiers keep the traditions distinct; the band leader keeps
the class playing instead of only listening.

---

## Plan C: the choir director and band leader

*Starting question: can my class sing and play this with the band, and does
the band play like musicians who are listening to them?*

### C1. Every tune is a chart the room can perform

- **Key and range**: a range check for children's voices (roughly C4 to D5
  for young singers) and for the instruments in the room (recorder, ukulele,
  boomwhackers, Orff barred instruments), with a suggested key. The page
  already transposes.
- **A roadmap**: intro, verses, chorus, instrumental, a cappella verse,
  tag ending, written as `%%band` section lines and drawn as a road map the
  class can follow.
- **Parts for the class**: a harmony line (descant, a round entry, a
  partner song), a bass ostinato for the Orff bass bar, a body-percussion or
  classroom-percussion part, a simple ukulele chord part. These are ABC voices
  or rhythm cells the page already knows how to draw.
- **Music minus one**: any part the class covers is muted in the band
  automatically.

### C2. The band plays like musicians

- **Roles and listening**: bass locks to the kick; the comping part leaves
  space while the melody moves and answers when it holds (a fill in the
  melody's long notes, call and response); drums mark phrase ends, not every
  bar.
- **Dynamics that follow the conductor**: the energy control already exists;
  give it a big, live fader (and keys) so the teacher shapes the performance
  in the moment: drop to drums only, bring the band back, build.
- **Real endings and cues**: count-ins in the tune's feel, vamp until cued,
  "one more time" tag, ritardando and a held final chord, a fermata the band
  waits on, a stop-time chorus with only hits on the one.
- **Arranger's craft**: second time through, a different texture; last
  chorus up a step; a break chorus with only clapping; a soli where the
  melody is doubled in thirds or octaves; intros made from the tune's last
  phrase.

### C3. Rehearsal tools

Loop a section by its roadmap name, slow it without changing pitch (the
sample player already makes tempo free), solo or mute a part, and a
"who plays when" strip under the staff.

### C4. Quality bar

The reference is a good school band or a session band at a family concert:
it starts together, stays out of the singers' way, makes the ending land,
and every child knows when to come in. Measure by taking five tunes into a
class, recording what went wrong (entries missed, key too high, band too
busy), and fixing those first.

**Risk the band leader sees:** practical charts in one house style. The
musicologist's idioms and the DJ's grooves keep the variety.

---

## Item 6: anything else?

Points the three chairs would add to the list:

1. **Provenance and respect.** Credit sources, mark what is traditional and
   what is arranged, exclude sacred material, and have a culture bearer listen
   before a tradition goes on the board. (Musicologist.)
2. **Singability and range.** A tune in the wrong key for children is not
   high quality however good the band sounds. (Band leader.)
3. **Form, beginnings and endings.** Most of what makes a backing track sound
   professional is the intro, the transitions and the ending. (DJ and band
   leader.)
4. **Lyrics and language.** Original-language lyrics with a singable
   translation and pronunciation help, where the source has them.
5. **Listening, not reasoning.** An offline render harness so every change is
   heard, and a small panel of teachers and kids who rate tracks.
   (All three.)
6. **Weight and offline.** Every sample set adds megabytes to a page meant to
   work offline. Synthesise what synthesises well (drones, gongs, 808s, synth
   pads, hand percussion); sample only what must be sampled (fiddle, voice,
   accordion, kora).
7. **Teaching hooks.** Each idiom names one thing to listen for ("hear the
   clave", "the bass walks", "the drone never changes") so the style picker
   teaches as well as entertains.

---

## Where the three agree

All three plans need the same five pieces of engine work, so those come first
whatever the emphasis:

1. **An idiom registry** replacing the `scoreFor` `if` chain: groove, harmony
   grammar, instrumentation, ornaments, form template, teaching hook per
   style; `styleFor` picks from it; `arrange()` reads its harmony grammar.
2. **More parts**: a fourth band part for counter-melody, riffs and fills, and
   a percussion part for each tradition's own instruments (clave, bell,
   congas, tabla, darbuka).
3. **Sections in the chart**: intro, ending, break, build, drop, key change,
   as `%%band` section lines the Pattern panel can show.
4. **A sound palette and mix bus**: synthesised voices first, a few
   licence-checked sample sets, master compression and loudness matching.
5. **A render-and-listen harness** in `test/`: every tune by every style to
   audio, with a rubric.

## Suggested order

| Phase | Work | Lead chair |
| --- | --- | --- |
| 0 | Render harness, rubric, coverage map of the current 45 tunes | all |
| 1 | Idiom registry; make `arrange()` style-aware (no tritone subs on a reel); section lines with intro and ending | band leader |
| 2 | Mix bus, loudness, synthesised modern palette; trap, Afrobeats, reggaeton, EDM, funk, lo-fi grooves | DJ |
| 3 | Tune dossiers; first wave of world tunes (Latin America, West Africa, East Asia, Middle East) with their idioms, percussion and tunings | musicologist |
| 4 | Ten original bangers with producer-built charts | DJ |
| 5 | Class parts, range check, music minus one, live energy fader, rehearsal loops | band leader |
| 6 | Second wave of tunes to fill the coverage map; culture-bearer reviews | musicologist |

### Progress

- Phase 1, done on 10 November 2026: `arrange()` reads each style's
  harmony (`STYLES[k].harmony`: rich, approach, cadence, colour, moves,
  hit), so a reel gets no tritone substitutes; the Band plays a two-bar
  intro from the tune's last bars (`%%band intro=N`, 0 for none) and ends
  on a ringing final chord the last time round (`ending=hit|none`; soft
  styles leave out the crash). The Band also now follows repeats: it used
  to stop after the written length, leaving the second half of every
  repeated fiddle tune to the melody alone.
- Phase 1, done later the same day: the idiom registry. Each style's
  groove is an entry in `GROOVES`, and `STYLES` holds the rest of its idiom
  (name, harmony, swing, and `fit`: the metres it plays in and the style it
  gives way to elsewhere). Every one of 52,800 scores (style, metre,
  energy, detail, seed) came out the same as the old `if` chain. A time
  round can change its texture: `%%band 3: texture=stop` (stop time), `drums`
  (a break), `unplugged`, `claps` (backbeat claps only), `full`.
- Phase 2, started: the master bus has a gentle compressor, a +2 dB trim
  and a limiter (`MASTER`). Measured in the browser: the page used to play
  at about -34 dB RMS with peaks at -18 dBFS; now about -22 dB RMS, peaks
  -7, and the fullest chorus -19, peaks -4, with no clipping. The styles
  land within about 2 dB of one another. Five modern styles use the samples
  already shipped: funk, reggaeton (dembow), Afrobeats (with the 12/8 bell in
  compound time), lo-fi hip-hop and house; Auto picks them from an `R:`
  line. New kit words: `cb` cowbell, `cl` claves, `wb`/`lwb` wood blocks,
  `ca` cabasa.
- Phase 2, continued: synthesised voices, made in Web Audio with no
  download: an 808 kick (a long falling boom) and a 909 kick (a short
  punch), a sub bass, a saw bass, a pluck and a pad. A style names them in
  `STYLES[k].sound`; house, reggaeton, Afrobeats and the new trap style use
  them. Their levels (`SYNTH_LEVEL`) were set from solo measurements so the
  dance styles play within about 2 dB of pop. `pump` ducks the chords and
  bass under each kick (house deepest). A `build` texture drops the kick and
  bass for the last two bars under a snare roll; the dance styles (pop,
  funk, reggaeton, Afrobeats, trap, house) build their third time round
  into the fullest fourth by default, and Arrange writes it as
  `texture=build`.
- Left out on purpose: a key change for the last time round. Sound alone
  could go up a step, but the staff, the instrument view and the chord
  symbols would still show the old key, which would mislead a class
  reading along; it needs transposed display first.
- Phase 3, started: tune dossiers and a first wave of seven tunes, in the
  holding board, now kept in the workshop branch off the public site
  (source and classroom checks pending; nothing published).
  Dossiers are `% dossier-function/elements/practice/honesty/licence/
  respect/review:` lines in the ABC; `course/holding/build.js` carries them
  into the board, which shows them under each card.
  - Jamaica, from Jekyll, *Jamaican Song and Story* (1907, public domain):
    Pass the ball, Galloway road, Carry banana, Little Sally Water. Notes
    converted from Project Gutenberg's MusicXML and checked bar by bar
    against the page images.
  - Japan, from Daisyfield's public-domain transcriptions: Konpira fune
    fune and Kazoe-uta (Nagai and Obata, 1895), Sakura (koto version, book
    not named). These still want checking against the 1890s books.
  - Two new idioms for them: mento (Jamaican country band: off-beat strum,
    rumba-box bass in 3+3+2, shaker, hand drum, rim on the last beat) and
    min'yo (taiko, hyoshigi, chanchiki bell, an open-fifth drone on the
    song's final, no chord changes). A drone style now keeps a chord the
    tune writes (the open fifth) instead of filling with the key's triad.
  - Second wave, read bar by bar from public-domain scans (each scan
    deskewed or enhanced, and for Andrade the 900 ppi line layer laid over
    the 150 ppi page so the beams could be told apart):
    - Brazil: Sambalele, a roda from Laranjal, Sao Paulo (Andrade, *Ensaio
      sobre a musica brasileira*, 1928, Wikimedia Commons), with a new
      samba de roda style (surdo, ganza, tamborim, agogo, palmas,
      cavaquinho). Its 1928 verse has words a class may change.
    - Korea: Arirang as Homer Hulbert wrote it down (*The Korean
      Repository*, February 1896; archive.org), the earliest written
      Arirang, with a modest Korean style (janggu after the semachi
      jangdan, an open fifth). Bar 2's flags are missing in the print.
    - Iran: Mikhahi labu? ("Do you want hot beetroot?"), Blair Fairchild,
      *Twelve Persian Folk-Songs* (1904; University of Rochester), with a
      Persian frame-drum style, generic and flagged as ours.
  - West Africa: still none. No public-domain or openly licensed staff
    transcription of Ghanaian or other West African songs was found. A
    culture bearer's version, or a community video transcribed by ear by
    someone who can hear it and typed as CC0, is the way in; the recording
    itself stays the community's.
- Classroom check (10 November 2026): every title, note and word of the
  published, workshop and sample pieces was read for the classroom. The
  pieces with findings, and the workshop itself, are kept in a separate
  branch with the teacher's review notes, off main and so off the public
  site, until a teacher decides; the set builder never grades them into a
  set.
- Removed later (10 November 2026): the two-bar intro. It was too long and
  its chords were wrong, so playing from the top now has a bar of clicks in
  the metre's beats (four in 4/4, three in 3/4, two in 6/8) and the melody
  comes in with the band. `intro=` is no longer a setting.
- Phase 5 (C2, the band plays like musicians), started: each style comps on
  its own instrument (`STYLES[k].comp`: nylon guitar for folk, jig, waltz,
  bossa, samba, mento and Afrobeats; piano for pop, march, swing and ballad;
  electric piano for funk and lo-fi), and on another when the melody plays
  that same instrument. A guitar strums: down from the root on the beat, up
  across the top strings between beats. Voicings keep two semitones under
  the melody (a guitar only leans that way) and leave out a chord tone a
  semitone under the melody note struck with them. With Feel above 0
  (`bandFeel`) the bass and chords lean on the beat, a chord's top note
  sings, the band steps back under a busy melody and speaks up where it
  holds or rests, swells with the melody's phrases, and wanders a few ms
  either side of the grid; where the melody holds two beats or more and the
  chord changes, the bass walks up into it by the key's steps
  (`STYLES[k].walk`).
- Phase 5, continued: the band answers the melody where it breathes (a note
  held or a rest of two beats or more before a bar line). The comping
  instrument plays two to four chord tones under the held note, most times;
  at a four-bar phrase the drums fill the last beat on the style's fill drum
  (`STYLES[k].fill`: snare, or rim in the soft and Latin styles) and crash
  into the new phrase (not in a soft style). Walks and answers come once in
  two bars at most; the pad and synth styles leave them out. All 20 styles
  were compiled on Daisy Daisy without errors. Not yet heard by a person:
  all of this needs listening.
- Phase 0, done (10 November 2026): the Band is measured, not only
  reasoned about. `node test/band-report.js` (`make band-metrics`) has the
  page itself, in headless Chrome, play every published tune in its Auto
  style and five tunes through all 20 styles (137 plays, about 7 minutes;
  `--quick --no-audio` in seconds), scores each with `test/band-metrics.js`
  and writes `docs/BAND-METRICS.md`, compared with
  `test/band-metrics.baseline.json`. Note metrics: flat ninths against the
  tune, chords above it, chord fit, mud (low interval limits), voice
  leading, bass roots, timing looseness per part, accents, playing into the
  melody's holes, bar-to-bar repetition, the arc. Audio metrics, from
  offline renders through the page's own bus: loudness (BS.1770), the
  melody's prominence over the band, masking, spectral tilt, low mids,
  centroid, width, render cost. Each guardrail carries its reason and is a
  first guess; four metrics that measured the wrong thing were fixed on the
  first day. A voice bench sets samples against synthesis.
- Measured and fixed the same day, against the baseline (137 plays): a held
  pad an octave down muddied the bass in 64 plays, now 6 (voicings are
  spaced over the bass by the low interval limits, `clearOf`, and never
  pushed over the tune); the band's timing was sequencer-tight (drums 1.3
  ms, out of bounds in 132 plays), now a few ms (drums 3.6, bass 3.9,
  chords 5.9; 12 plays out); the melody stands further over the band (+0.4
  LU; the dance styles from about 0.8 LU to about 3.5); the mix is brighter
  (centroid 369 to 409 Hz) and no longer mono (width 0.02 to 0.10), from a
  place and a few filters for each part (`TONE`: the comping left, the
  cymbals and shakers right, the tune with presence), a little room always
  open and a light exciter (`SOUND`). Guardrails broken: 475 to 234. This state is now the saved baseline for the next change.
  Still out: width under 0.15 in most plays (the tune and bass stay in the
  middle; possibly the bound is wrong for a classroom backing), chords
  touching the tune in about 40.
- Samples against synthesis, measured: the processor is not the limit (a
  sampled voice renders at 0.005 of real time, the costliest synthesised
  one at 0.023); the sample sets are. The FluidR3 sets stop near 8 kHz (piano,
  guitar), 5 to 6 kHz (electric piano, recorder) and 1.3 kHz (bass), every
  note is cut at 3.1 s, the bitrates run from 35 to 128 kbps, and all 88
  notes are kept in stereo: about 15 MB. The sampler can now keep only every
  few notes and retune the nearest (`SAMPLE_STEP`, off): retuning by a
  semitone moves the spectrum by about 1 dB for piano, guitar, recorder and
  bass (7.6 dB for the electric piano), so sets of every third note (a third
  of the download) are viable. The next step for timbre is better samples,
  mono, longer, every third note, which would weigh less than today's.
  Waiting for a decision on sources, licences and download weight.
- Better samples, done the same day (the user agreed the download): CC0
  sets from Versilian Studios, converted by `vendor/soundfont/build-cc0.js`
  (mono, from the onset, levelled to the set each replaces, 96 kbps MP3):
  the Kawai grand from VCSL (37 notes, 2.0 MB, for 2.1 MB before), the
  Baroque soprano recorder from VCSL (13 notes, 0.7 MB, for 4.5 MB), the
  solo double bass played pizzicato from VSCO 2 (14 notes, 0.4 MB, for 1.6
  MB) and a hi-hat, open hat, pedal hat, snare and cross-stick from VCSL
  (0.1 MB; the other drums stay). The sampler plays each note from the
  nearest one a set keeps (`SAMPLE_NOTES`), and `SAMPLE_SETS.use` switches
  between the old and new sets (`--samples old` in the report). The
  recorder is filed at its written pitch and so sounds an octave above it,
  as a soprano recorder does: a class hears the register it plays in.
  Measured against the baseline (137 plays, exciter off): the mix's
  centroid 409 to 682 Hz, its tilt -3.4 to -2.4 dB an octave, the melody 1.5 LU further over the
  band, the cymbals reaching 20 kHz (7 kHz before), notes sustaining 4.5 to
  6 s (3.1 before); a play loads about a quarter more (943 KB for 759:
  longer notes), the sets weigh less than half. This is the saved baseline. With real top end the exciter moved the centroid 2
  Hz, so it is off (`SOUND.air` 0). Still FluidR3: the nylon guitar (the
  only CC0 one found, FreePats', was recorded in poor conditions and comes
  as .7z) and the electric piano (none found; to be synthesised). Next from
  the same libraries, all CC0: a fiddle (VSCO 2 solo violin), brass for the
  marches, harp, glockenspiel, marimba and xylophone for the Orff class,
  and balafon, kalimba, mbira, conga, darbuka, frame drum and agogo for the
  world styles.
- Still open: synth leads; West African tunes; more from Andrade, Jekyll,
  Fairchild and the Japanese books; original bangers (phase 4); the live
  energy fader (phase 5).

## Decisions for the user

- **Which chair leads** the first two phases: the order above starts with the
  band leader's form work because every later idiom and banger depends on
  sections and endings; the DJ's sound work is the quickest audible win.
- **How much download weight** is acceptable for new samples.
- **Who reviews** each tradition, and whether tunes wait in
  `course/holding` until they do.
- **Who writes the originals**: Claude-drafted, teacher-drafted, or
  co-written with students (the course rules allow locally written work).

## Parallel progress

Codex worked on these in a separate branch (`codex/tune-quality-range-guide`)
while the review queue was being built on main. On 10 November they were
ported onto main one commit at a time and every generated report was rebuilt
against the current set: 37 published tunes, since eight published tunes are
now in the review queue. Each report has a `--check` mode, a focused test and
a `make` target, and the smoke test runs all five.

- **Classroom range and singability (Phase 5):** `course/classroom-fit.js`
  and `course/classroom-fit.md` read every published tune for young voices,
  recorder, ukulele and a one-octave classroom set, and suggest a readable
  rehearsal key within the page's ±12-semitone Transpose.
- **Accompaniment identity audit (Phases 0 and 3):**
  `course/accompaniment-audit.js` and its report record the style Auto
  actually picks, why, and whether the harmony is written, detected or a
  drone. High-confidence source-family annotations restore reel, waltz and
  Morris identities in `course/set.json`; ambiguous songs stay queued rather
  than guessed. Its style list now includes the newer idioms (funk to drone).
- **Published provenance repair:** all 16 Nottingham imports point at their
  exact `ABC_original` file in `jukedeck/nottingham-dataset` with its GPL-3.0
  licence, in place of private scratch paths: the 12 still published, and
  (`--repair-review`) the stored set entries of the 4 in the review queue, so
  a restore brings back the repaired source.
- **Coverage map and Phase 6 gap queue:** `course/coverage-map.js` cross-tabs
  the published tunes by region, level, function and Auto style. Eight target
  regions are empty, 15 tunes state no origin and 17 no function or type. The
  classifier never infers Indigenous identity from a country. The South Asian
  lullabies are queued for review, so the map currently shows none.
- **Latin American holding tunes (Phase 3):** *Canoinha nova* and the Paraíba
  version of *Meu barco é veleiro*, from Mário de Andrade's 1928
  public-domain *Ensaio*, are provisional plate readings with the
  plate-reading and culture-bearer checks named. Read for the classroom like
  the rest, both wait for a teacher's review in the workshop branch.
- **Class parts (Phase 5):** `course/class-parts.js` gives each published tune
  conservative one-bar body-percussion and tonic/fifth rehearsal recipes,
  reports existing harmony, ukulele readiness, round and descant candidates
  and matching music-minus-one mutes, without inventing chord changes.
- **Dossier gap report (Phase 3):** `course/dossier-gaps.js` counts only
  explicit `% dossier-*:` fields as complete (0 of 37 so far); ordinary ABC
  metadata is kept as an editorial seed, not promoted to a cultural claim.
- **Original-tune decision (Phase 4):** originals should be agent-written and
  enter `course/holding` for musical, classroom and editorial review before
  publication. None has been drafted yet.
