#!/usr/bin/env node
'use strict';
// The Band's metrics (test/band-metrics.js) on made-up cases whose answers are known.
const M = require('./band-metrics.js');
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// Loudness: a full-scale 997 Hz sine in one channel reads -3.01 LUFS (BS.1770's calibration), and 20 dB down reads -23.
const sine = (amp, f, sr, s) => { const x = new Float32Array(sr * s); for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin(2 * Math.PI * f * i / sr); return x; };
for (const sr of [44100, 48000]) {
  assert(near(M.lufs([sine(1, 997, sr, 5)], sr), -3.01, 0.15), `full-scale sine at ${sr}: ${M.lufs([sine(1, 997, sr, 5)], sr)}`);
  assert(near(M.lufs([sine(0.1, 997, sr, 5)], sr), -23.01, 0.15), 'a sine 20 dB down');
}
assert(M.lufs([new Float32Array(48000 * 2)], 48000) === -Infinity, 'silence is gated out');
assert(near(M.peakDb([sine(0.5, 440, 8000, 1)]), -6.02, 0.05), 'peak of a half-scale sine');

// Two bars of 4/4 at 500 ms a beat. The melody: C5 held through bar 1, then four quarters in bar 2.
const bars = [{ s: 0, e: 2000, beats: 4 }, { s: 2000, e: 4000, beats: 4 }];
const segs = [{ ms: 0, pcs: [0, 4, 7], root: 0 }];
const mel = [{ part: 'melody', ms: 0, midi: 72, vel: 0.8, dur: 2 }, ...[0, 1, 2, 3].map(k => ({ part: 'melody', ms: 2000 + 500 * k, midi: [72, 76, 79, 72][k], vel: 0.7, dur: 0.45 }))];
const chord = (ms, midis, part = 'chords') => midis.map(m => ({ part, ms, midi: m, vel: 0.5, dur: 0.45 }));
const cap = extra => ({ notes: [...mel, ...extra], bars, segs, compound: false });

const clean = M.noteMetrics(cap([...chord(0, [55, 60, 64]), ...chord(1000, [55, 60, 64]), ...chord(2000, [55, 60, 64]), ...chord(3000, [55, 60, 64]), { part: 'bass', ms: 0, midi: 36, vel: 0.8, dur: 0.9 }, { part: 'bass', ms: 2000, midi: 36, vel: 0.8, dur: 0.9 }]));
assert(clean.flatNinth === 0 && clean.chordsAbove === 0 && clean.mud === 0, `a C chord under a C tune: no clash, nothing above, no mud ${JSON.stringify(clean)}`);
assert(clean.chordFit === 1 && clean.bassRoots === 1, 'every strong-beat note in the chord, the bass on the root');
assert(clean.timingChords === 0 && clean.timingBass === 0, 'on the grid exactly: no looseness');
assert(clean.answered < 1, `a steady pattern does not answer the held note: ${clean.answered}`);
const answer = M.noteMetrics(cap([...chord(0, [55, 60, 64]), ...[500, 750, 1000, 1250, 1500].map(t => ({ part: 'chords', ms: t, midi: 64, vel: 0.4, dur: 0.2 })), ...chord(2000, [55, 60, 64])]));
assert(answer.answered > 1.5, `a band that plays into the hole answers it: ${answer.answered}`);

const clash = M.noteMetrics(cap([...chord(0, [59, 62, 67]), ...chord(2000, [59, 62, 67])]));
assert(clash.flatNinth > 0.2 && clash.strongFlatNinth > 0, `a B under a C melody is a flat ninth: ${clash.flatNinth}`);
const high = M.noteMetrics(cap(chord(0, [72, 76, 79]).concat(chord(2000, [72, 76, 79]))));
assert(high.chordsAbove > 0.2, 'chords voiced at the tune are above it');
const muddy = M.noteMetrics(cap(chord(0, [36, 40, 43])));
assert(muddy.mud === 1, 'a close C chord in the second octave is mud');
const loose = M.noteMetrics(cap([0, 500, 1000, 1500, 2000, 2500, 3000, 3500].map((t, i) => ({ part: 'drums', ms: t + [0, 8, -6, 10, -9, 4, -3, 7][i], midi: 42, vel: 0.5, dur: 0 }))));
assert(loose.timingDrums > 4 && loose.timingDrums < 9, `drums a few ms either side: ${loose.timingDrums}`);
const leaning = M.noteMetrics(cap([0, 500, 1000, 1500].map((t, i) => ({ part: 'bass', ms: t, midi: 36, vel: [0.9, 0.5, 0.7, 0.5][i], dur: 0.4 }))));
assert(leaning.accentBass > 0.8, `velocity following the beat correlates: ${leaning.accentBass}`);

// Guardrails report what is out of bounds.
const fails = M.check({ flatNinth: 0.2, chordFit: 0.9, timingDrums: 0 }, M.GUARDS).map(f => f.metric);
assert(fails.includes('flatNinth') && fails.includes('timingDrums') && !fails.includes('chordFit'), `check: ${fails}`);

// Audio: a melody 6 dB over the band is prominent by about 6 LU; a band an octave below the melody leaves its bands free.
const sr = 44100, s = 3;
const mix = (a, b) => { const x = new Float32Array(a.length); for (let i = 0; i < a.length; i++) x[i] = a[i] + b[i]; return x; };
const tune = sine(0.2, 880, sr, s), low = sine(0.1, 220, sr, s);
const A = M.audioMetrics({ mix: { L: mix(tune, low), R: mix(tune, low) }, melody: { L: tune, R: tune }, band: { L: low, R: low }, sr });
assert(near(A.prominence, 6, 1), `prominence ${A.prominence}`);
assert(A.masked === 0, `the band covers none of the melody's bands: ${A.masked}`);
assert(A.width === 0, 'identical channels have no width');
const B = M.audioMetrics({ mix: { L: mix(tune, tune), R: mix(tune, tune) }, melody: { L: tune, R: tune }, band: { L: tune, R: tune }, sr });
assert(B.masked === 1 && near(B.prominence, 0, 0.1), 'a band doubling the melody covers it');

console.log(`Band metrics checks passed (${checks} checks).`);
