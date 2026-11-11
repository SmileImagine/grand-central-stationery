#!/usr/bin/env node
'use strict';
/*
  Build the CC0 sample sets from Versilian Studios' libraries (public domain, CC0 1.0):
    VCSL        https://github.com/sgossner/VCSL         (Kawai grand, soprano recorder, hi-hat, snare, toms, suspended cymbals)
    VSCO 2 CE   https://github.com/sgossner/VSCO-2-CE    (solo double bass pizzicato, solo violin, trumpet, tuba staccato,
                                                          glockenspiel, marimba, xylophone)

    node vendor/soundfont/build-cc0.js <downloads> [set,set...]

  <downloads> holds the WAVs as fetched, one folder a set: grand/ (Sustains, the v3 layer), recorder/ (Baroque Soprano
  Recorder, Sustain), bass/ (Solo Contrabass, Pizz, v1 rr1), hihat/, snare/ (Snare Drum, Modern 1), tom/ (Tom 1 and
  Tom 2, Stick: TomH_HitS_*, TomL_HitS_*) and cymbal/ (Suspended Cymbal 1 and 2: susCymb*_hit_stick_*); violin/ (Solo Violin,
  Arco Vib, f), trumpet/ (Trumpet, sus), tuba/ (Tuba, stac, v2 rr1), glock/, marimba/ and xylo/ (Percussion). Needs ffmpeg.

  Each note: mono, 44.1 kHz, from its onset (5 ms before it), cut to its instrument's length with a fade, every note of a
  set brought to one loudness (the RMS of its first 0.3 s), the set matched to the FluidR3 set it stands in for on the
  notes both have, kept under -1 dBFS, and written as 96 kbps MP3 named as the Sampler asks (FLAT_NOTE: C4, Db4...).
  Versilian names an octave low (its C3 is middle C): a file's note is its name plus 12, checked by pitch detection.
  The recorder is filed at its written pitch, as a soprano recorder is read: it sounds an octave above (its C4 sounds C5).
  Prints the notes each set keeps, for SAMPLE_NOTES in index.html.
*/
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const src = process.argv[2]; if (!src) { console.error('usage: build-cc0.js <downloads> [set,set...]'); process.exit(1); }
const only = process.argv[3] ? process.argv[3].split(',') : null;   // build just these sets (the others' downloads need not be there)
const out = __dirname, sr = 44100;
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], SHARP = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const flat = m => FLAT[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const midiOf = name => { const m = name.match(/^([A-G]#?)(-?\d)$/); return m ? SHARP[m[1]] + 12 * (+m[2] + 1) : null; };
const read = (f, af) => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, ...(af ? ['-af', af] : []), '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 29 }); return Float32Array.from(new Float32Array(b.buffer, b.byteOffset, b.length / 4)); };
const write = (x, f, ch = 1, rate = '96k') => execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(sr), '-ac', String(ch), '-i', '-', '-c:a', 'libmp3lame', '-b:a', rate, f], { input: Buffer.from(x.buffer) });
// A stereo file as its two channels.
const readPair = (f, hp) => [0, 1].map(c => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-af', `pan=mono|c0=c${c}` + (hp ? `,highpass=f=${hp},highpass=f=${hp}` : ''), '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 29 }); return Float32Array.from(new Float32Array(b.buffer, b.byteOffset, b.length / 4)); });
const rms = (x, from, n) => { let s = 0, k = 0; for (let i = from; i < Math.min(x.length, from + n); i++) { s += x[i] * x[i]; k++; } return Math.sqrt(s / Math.max(1, k)); };
const onset = x => { let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v)); for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk * 0.03) return Math.max(0, i - Math.round(0.005 * sr)); return 0; };
// From the onset, `seconds` long, the last `fade` seconds fading out.
function shape(x, seconds, fade) {
  const o = onset(x), n = Math.min(x.length - o, Math.round(seconds * sr)), y = x.slice(o, o + n), f = Math.min(n, Math.round(fade * sr));
  for (let i = 0; i < f; i++) y[n - f + i] *= Math.cos(i / f * Math.PI / 2) ** 2;
  return y;
}

// The semitones from each VSCO set's file names to the pitch it sounds (pitch detection, scratch tools/pitch.js).
const OCTAVE = { violin: 0, trumpet: 12, tuba: 12, glock: 12, marimba: 12, xylo: 12 };
const TRUMPET_LAYER = /_v3_rr1/;   // v3 is the forte (10-20 dB over v1), a march's bright trumpet
// An ffmpeg filter for a set's notes before they are shaped and levelled. The tuba: a gentle dip at 300 Hz, where its
// harmonics give the march band most of its 200-500 Hz (by ear not muddy, its notes being short; this only eases them).
const FILTER = { vsco_tuba: 'equalizer=f=300:t=q:w=1:g=-2.5' };
// [set folder, downloads folder, the files kept, each file's MIDI note, length in seconds (by note), fade, the FluidR3 set it replaces]
const SETS = [
  ['vcsl_grand_piano', 'grand', f => /_v3_rr1/.test(f), f => midiOf(f.split('_')[2]) + 12, m => m < 48 ? 6 : m < 72 ? 5 : 3.5, 0.6, 'acoustic_grand_piano'],
  ['vcsl_soprano_recorder', 'recorder', f => /\.wav$/.test(f), f => midiOf(f.split('_')[2]), () => 4.5, 0.4, 'recorder'],
  ['vsco_double_bass_pizz', 'bass', f => /_v1_rr1/.test(f), f => midiOf(f.split('_')[2]) + 12, () => 3, 0.5, 'acoustic_bass'],
  // VSCO 2 CE: the fiddle, the march's brass and the Orff class's bars. Each name's octave was checked by pitch detection
  // (OCTAVE below); the glockenspiel and xylophone are filed at their written pitch, as they are read (they sound two
  // octaves and one octave up). The melody sets are levelled to the piano they stand in for, the tuba to the bass.
  ['vsco_violin', 'violin', f => /_f\.wav$/.test(f), f => midiOf(f.split('_')[2]) + OCTAVE.violin, () => 4.5, 0.4, 'acoustic_grand_piano'],
  ['vsco_trumpet', 'trumpet', f => TRUMPET_LAYER.test(f), f => midiOf(f.split('_')[3]) + OCTAVE.trumpet, () => 4, 0.4, 'acoustic_grand_piano'],
  ['vsco_tuba', 'tuba', f => /_v2_rr1_/.test(f), f => midiOf(f.split('_')[2]) + OCTAVE.tuba, () => 1.2, 0.25, 'acoustic_bass'],
  ['vsco_glockenspiel', 'glock', f => /\.wav$/.test(f), f => midiOf(f.replace('.wav', '').split('_')[2]) + OCTAVE.glock - 24, () => 3, 0.8, 'acoustic_grand_piano'],
  ['vsco_marimba', 'marimba', f => /\.wav$/.test(f), f => midiOf(f.split('_')[3]) + OCTAVE.marimba, m => m < 60 ? 3 : 2, 0.5, 'acoustic_grand_piano'],
  ['vsco_xylophone', 'xylo', f => /\.wav$/.test(f), f => midiOf(f.split('_')[2]) + OCTAVE.xylo - 12, () => 1.5, 0.4, 'acoustic_grand_piano'],
];
// The kit (kit-mp3; CC0 from VCSL but for the kick and crash, which are CC BY 4.0, below): for each General MIDI drum the band plays, its takes. A drum struck harder is brighter, not only louder, and no
// two strikes sound the same, so the snare, the closed hat and the toms keep three strengths (p soft, the middle, f hard)
// and the rest one, each in two takes (Versilian's round robins, rr1 and rr2, or two strikes of one cymbal). The closed
// hat also has l, the loose (half-open) hit. Every take of a drum is brought to the loudness of its middle take, so the
// band's velocity still sets how loud it is and the take only sets its colour.
// Files: the note's name for the middle take (D2.mp3), then the strength and the take (D2p.mp3, D2f-2.mp3, D2-2.mp3);
// KIT_TAKES in index.html names the strengths each drum has. The floor tom is the low tom played a fourth down (slower).
// The toms have no FluidR3 sample to match, so they sit 1 dB under the snare. The hats and cymbals stay in stereo (their
// two microphones hear nearly unrelated noise, which a mono sum turns into hiss) at 128 kbps; the drums are mono, 96 kbps.
// The ride is VCSL's suspended cymbal 2 struck softly with a stick, two strikes, matched to the FluidR3 ride it replaces. The stereo ones are high-passed (the number: 200 Hz for
// the hats, 350 for the cymbals, as a kit's overhead microphones are) and levelled by both channels' power, not their sum
// (a sum of two unrelated channels reads 3 dB low). The last number trims a drum (dB): the suspended cymbals ring
// longer than the FluidR3 ones, so at the same onset level they added 2 LU to the drums alone.
const KIT = [
  [38, 1.4, { '': 'snare/Snare2_HitSN_v6_rr%_Mid.wav', p: 'snare/Snare2_HitSN_v3_rr%_Mid.wav', f: 'snare/Snare2_HitSN_v9_rr%_Mid.wav' }],
  [37, 0.8, { '': 'snare/Snare2_stick_v1_rr%_Mid.wav' }],
  [42, 1.0, { '': 'hihat/HiHat_HitC_v3_rr%_Mid.wav', p: 'hihat/HiHat_HitC_v1_rr%_Mid.wav', f: 'hihat/HiHat_HitC_v4_rr%_Mid.wav', l: 'hihat/HiHat_HitLoose_rr%_Mid.wav' }, 0, 200],
  [44, 0.8, { '': 'hihat/HiHat_Close_rr%_Mid.wav' }, 0, 200],
  [46, 2.5, { '': 'hihat/HiHat_HitO_rr%_Mid.wav' }, 0, 200],
  // The kick and crash from the DrumGizmo MuldjordKit (Lars Muldjord, CC BY 4.0; muld/, its Samples/KdrumL and
  // Samples/CrashL as fetched, hits numbered from the softest): the kick its own microphone with a little of the room
  // (both ambience microphones at a fifth), the crash its overhead pair, the drummer's left heard on the audience's right.
  [36, 0.9, { p: [kick(5), kick(6)], '': [kick(12), kick(13)], f: [kick(22), kick(23)] }, 0, 0, -2.5],   // 2.5 dB under the FluidR3 kick's onset level: a whole hit then carries the same energy
  [49, 5.5, { p: [crash(2), crash(3)], '': [crash(5), crash(6)], f: [crash(7), crash(9)] }, 0, 300, -3, 1.5],
  [51, 2.5, { '': ['cymbal/susCymb2_hit_stick_pp1.wav', 'cymbal/susCymb2_hit_stick_mp1.wav'] }, 0, 350, -2],
  [50, 1.5, { '': 'tom/TomH_HitS_v3_rr%_Mid.wav', p: 'tom/TomH_HitS_v2_rr%_Mid.wav', f: 'tom/TomH_HitS_v4_rr%_Mid.wav' }],
  [47, 1.6, { '': 'tom/TomL_HitS_v3_rr%_Mid.wav', p: 'tom/TomL_HitS_v2_rr%_Mid.wav', f: 'tom/TomL_HitS_v4_rr%_Mid.wav' }],
  [43, 1.9, { '': 'tom/TomL_HitS_v3_rr%_Mid.wav', p: 'tom/TomL_HitS_v2_rr%_Mid.wav', f: 'tom/TomL_HitS_v4_rr%_Mid.wav' }, 5],
];
const TOMS = [50, 47, 43];
function kick(n) { return { mix: [[`muld/${n}-KdrumL-KdrumL.flac`, 1], [`muld/${n}-KdrumL-AmbL.flac`, 0.2], [`muld/${n}-KdrumL-AmbR.flac`, 0.2]] }; }
function crash(n) { return { pair: [`muld/${n}-CrashL-OHR.flac`, `muld/${n}-CrashL-OHL.flac`], blend: 0.6 }; }   // the near overhead 13 dB over the far one: 0.6 of it into the far side leaves the crash 4 dB right
// Played `semis` lower: read more slowly (linear interpolation), as a drum tuned down rings lower and longer.
const lower = (x, semis) => { if (!semis) return x; const r = Math.pow(2, -semis / 12), n = Math.floor((x.length - 1) * r), y = new Float32Array(n); for (let i = 0; i < n; i++) { const p = i / r, k = Math.floor(p), f = p - k; y[i] = x[k] * (1 - f) + x[k + 1] * f; } return y; };
const fluid = (set, m) => { const f = path.join(out, `${set}-mp3`, `${flat(m)}.mp3`); return fs.existsSync(f) ? read(f) : null; };
const level = x => rms(x, onset(x), Math.round(0.3 * sr));

const notes = {};
for (const [name, dir, keep, midi, seconds, fade, old] of SETS) {
  if (only && !only.includes(name)) continue;
  const files = fs.readdirSync(path.join(src, dir)).filter(keep).sort();
  const shaped = files.map(f => { const m = midi(f); return { m, x: shape(read(path.join(src, dir, f), FILTER[name]), seconds(m), fade) }; }).filter(s => s.m !== null).sort((a, b) => a.m - b.m);
  for (const s of shaped) { const g = 0.1 / Math.max(1e-6, level(s.x)); for (let i = 0; i < s.x.length; i++) s.x[i] *= g; }   // one loudness across the set
  const ratios = shaped.map(s => { const o = fluid(old, s.m); return o ? level(o) / level(s.x) : null; }).filter(Boolean).sort((a, b) => a - b);
  let gain = ratios.length ? ratios[ratios.length >> 1] : 1;
  const peak = Math.max(...shaped.map(s => s.x.reduce((p, v) => Math.max(p, Math.abs(v)), 0)));
  gain = Math.min(gain, 0.89 / peak);                                  // no note over -1 dBFS
  fs.mkdirSync(path.join(out, `${name}-mp3`), { recursive: true });
  for (const s of shaped) { for (let i = 0; i < s.x.length; i++) s.x[i] *= gain; write(s.x, path.join(out, `${name}-mp3`, `${flat(s.m)}.mp3`)); }
  notes[name] = shaped.map(s => s.m);
  console.log(`${name}: ${shaped.length} notes ${flat(shaped[0].m)}-${flat(shaped[shaped.length - 1].m)}, matched to ${old} on ${ratios.length} (gain ${gain.toFixed(2)})`);
}
if (!only || only.includes('kit')) {
fs.mkdirSync(path.join(out, 'kit-mp3'), { recursive: true });
let snareLevel = null;
for (const [m, seconds, layers, semis, stereo, trimDb, win] of KIT) {   // stereo: the high-pass in Hz for a stereo drum
  // Each take as its channels (one, or two for the stereo ones), cut from the onset of their sum.
  const takes = [];
  for (const [layer, file] of Object.entries(layers)) for (const rr of [1, 2]) {
    // A take: one file (% its round robin), or one of two named, each a file, a mix of mono files ({ mix: [[file, gain]] }),
    // or a stereo pair of mono files ({ pair: [left, right] }).
    const one = Array.isArray(file) ? file[rr - 1] : file.replace('%', rr), at = f => path.join(src, f);
    const hpf = stereo ? `highpass=f=${stereo},highpass=f=${stereo}` : null;
    const raw = one.mix ? [one.mix.map(([f, g]) => read(at(f)).map(v => v * g)).reduce((a, b) => a.map((v, i) => v + (b[i] || 0)))] : one.pair ? (([l, r]) => one.blend ? [l.map((v, i) => v + one.blend * (r[i] || 0)), r] : [l, r])(one.pair.map(f => read(at(f), hpf))) : stereo ? readPair(at(one), stereo) : [read(at(one))];
    const chans = raw.map(x => lower(x, semis || 0));
    const sum = chans[0].map((v, i) => chans.reduce((a, c) => a + c[i], 0) / chans.length), o = onset(sum), n = Math.min(sum.length - o, Math.round(seconds * sr)), fade = Math.round(Math.min(0.3, seconds / 3) * sr);
    const cut = chans.map(c => { const y = c.slice(o, o + n); for (let i = 0; i < Math.min(n, fade); i++) y[n - Math.min(n, fade) + i] *= Math.cos(i / Math.min(n, fade) * Math.PI / 2) ** 2; return y; });
    takes.push({ name: flat(m) + layer + (rr === 2 ? '-2' : ''), chans: cut, mono: cut[0].map((v, i) => cut.reduce((a, c) => a + c[i], 0) / cut.length) });
  }
  const span = Math.round((win || 0.3) * sr);   // the window a drum is levelled over (a crash's first second and a half, not its strike)
  const power = t => Math.sqrt(t.chans.reduce((a, c) => { const o0 = onset(t.mono); return a + rms(c, o0, span) ** 2; }, 0) / t.chans.length);   // the level both channels play at
  const mid = power(takes.find(t => t.name === flat(m)) || takes[0]), o = fluid('percussion', m);
  for (const t of takes) { const g = mid / Math.max(1e-6, power(t)); for (const c of t.chans) for (let i = 0; i < c.length; i++) c[i] *= g; }   // every take at the middle one's loudness
  let g = Math.pow(10, (trimDb || 0) / 20) * (o ? rms(o, onset(o), span) / Math.max(1e-6, mid) : TOMS.includes(m) && snareLevel ? snareLevel * Math.pow(10, -1 / 20) / Math.max(1e-6, mid) : 1);
  const peak = Math.max(...takes.flatMap(t => t.chans.map(c => c.reduce((p, v) => Math.max(p, Math.abs(v)), 0)))); g = Math.min(g, 0.89 / peak);
  for (const t of takes) {
    const L = t.chans[0].length, x = new Float32Array(L * t.chans.length);
    for (let i = 0; i < L; i++) for (let c = 0; c < t.chans.length; c++) x[i * t.chans.length + c] = t.chans[c][i] * g;
    write(x, path.join(out, 'kit-mp3', `${t.name}.mp3`), t.chans.length, stereo ? '128k' : '96k');
  }
  if (m === 38) snareLevel = mid * g;
  console.log(`kit ${flat(m)}: ${takes.map(t => t.name).join(' ')}${stereo ? ' (stereo)' : ''}`);
}
notes.kit = KIT.map(k => k[0]).sort((a, b) => a - b);
console.log(`kit: ${KIT.length} drums (${notes.kit.map(flat).join(' ')}), the rest from percussion`);
}
console.log('\nSAMPLE_NOTES = ' + JSON.stringify(notes));
