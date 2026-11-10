# Strudel scope (9 November 2026)

The Band should support pattern **methods**, but it should not grow a second,
audio-only melody language.

## Decision

- Methods such as `.fast()`, `.slow()`, `.gain()`, `.degradeBy()`,
  `.euclid()` and `.struct()` apply to every accepted drum, bass or chord
  pattern. The method transforms time or events; it is not tied to a part.
- The ABC melody remains the canonical melody. It drives engraving, timing,
  tablature, instrument fingering, tuning, cursor geometry and the musical
  phrasing rules. Importing `note("c e g")` as sound only would let the heard
  melody disagree with every one of those views.
- A future Strudel melody importer should therefore translate a supported
  note pattern into ABC and ask before replacing or adding a voice. It should
  not be a fourth hidden Band part.
- Audio effects belong after event generation. Reverb is the first supported
  effect: `.room(0..1)` on an imported statement becomes one `room =` control,
  using the largest requested send when stacked statements disagree. A
  deterministic generated impulse feeds a shared wet bus for melody, chords,
  bass and drums, so it adds space without introducing another clock or an
  external asset.

Filters, delay and per-part effects remain outside the importer for now. They
need an explicit per-part effect/bus format; silently approximating them in the
mini-notation would make a shared pattern sound unpredictably different.
