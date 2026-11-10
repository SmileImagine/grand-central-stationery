#!/usr/bin/env node
'use strict';
/*
  Build the CC0 sample sets from Versilian Studios' libraries (public domain, CC0 1.0):
    VCSL        https://github.com/sgossner/VCSL         (Kawai grand, soprano recorder, hi-hat, snare)
    VSCO 2 CE   https://github.com/sgossner/VSCO-2-CE    (solo double bass, pizzicato)

    node vendor/soundfont/build-cc0.js <downloads>

  <downloads> holds the WAVs as fetched, one folder a set: grand/ (Sustains, the v3 layer), recorder/ (Baroque Soprano
  Recorder, Sustain), bass/ (Solo Contrabass, Pizz, v1 rr1), hihat/ and snare/ (Snare Drum, Modern 1). Needs ffmpeg.

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

const src = process.argv[2]; if (!src) { console.error('usage: build-cc0.js <downloads>'); process.exit(1); }
const out = __dirname, sr = 44100;
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'], SHARP = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const flat = m => FLAT[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const midiOf = name => { const m = name.match(/^([A-G]#?)(-?\d)$/); return m ? SHARP[m[1]] + 12 * (+m[2] + 1) : null; };
const read = f => { const b = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-'], { maxBuffer: 1 << 29 }); return Float32Array.from(new Float32Array(b.buffer, b.byteOffset, b.length / 4)); };
const write = (x, f) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k', f], { input: Buffer.from(x.buffer) });
const rms = (x, from, n) => { let s = 0, k = 0; for (let i = from; i < Math.min(x.length, from + n); i++) { s += x[i] * x[i]; k++; } return Math.sqrt(s / Math.max(1, k)); };
const onset = x => { let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v)); for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk * 0.03) return Math.max(0, i - Math.round(0.005 * sr)); return 0; };
// From the onset, `seconds` long, the last `fade` seconds fading out.
function shape(x, seconds, fade) {
  const o = onset(x), n = Math.min(x.length - o, Math.round(seconds * sr)), y = x.slice(o, o + n), f = Math.min(n, Math.round(fade * sr));
  for (let i = 0; i < f; i++) y[n - f + i] *= Math.cos(i / f * Math.PI / 2) ** 2;
  return y;
}

// [set folder, downloads folder, the files kept, each file's MIDI note, length in seconds (by note), fade, the FluidR3 set it replaces]
const SETS = [
  ['vcsl_grand_piano', 'grand', f => /_v3_rr1/.test(f), f => midiOf(f.split('_')[2]) + 12, m => m < 48 ? 6 : m < 72 ? 5 : 3.5, 0.6, 'acoustic_grand_piano'],
  ['vcsl_soprano_recorder', 'recorder', f => /\.wav$/.test(f), f => midiOf(f.split('_')[2]), () => 4.5, 0.4, 'recorder'],
  ['vsco_double_bass_pizz', 'bass', f => /_v1_rr1/.test(f), f => midiOf(f.split('_')[2]) + 12, () => 3, 0.5, 'acoustic_bass'],
];
// The kit: one sample for each General MIDI drum the band plays; the rest stay with the FluidR3 percussion.
const KIT = [['snare/Snare2_HitSN_v6_rr1_Mid.wav', 38, 1.4], ['snare/Snare2_stick_v1_rr1_Mid.wav', 37, 0.8], ['hihat/HiHat_HitC_v3_rr1_Mid.wav', 42, 1.0], ['hihat/HiHat_Close_rr1_Mid.wav', 44, 0.8], ['hihat/HiHat_HitO_rr1_Mid.wav', 46, 2.5]];
const fluid = (set, m) => { const f = path.join(out, `${set}-mp3`, `${flat(m)}.mp3`); return fs.existsSync(f) ? read(f) : null; };
const level = x => rms(x, onset(x), Math.round(0.3 * sr));

const notes = {};
for (const [name, dir, keep, midi, seconds, fade, old] of SETS) {
  const files = fs.readdirSync(path.join(src, dir)).filter(keep).sort();
  const shaped = files.map(f => { const m = midi(f); return { m, x: shape(read(path.join(src, dir, f)), seconds(m), fade) }; }).filter(s => s.m !== null).sort((a, b) => a.m - b.m);
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
fs.mkdirSync(path.join(out, 'vcsl_kit-mp3'), { recursive: true });
for (const [file, m, seconds] of KIT) {
  const x = shape(read(path.join(src, file)), seconds, Math.min(0.3, seconds / 3)), o = fluid('percussion', m);
  let g = o ? level(o) / Math.max(1e-6, level(x)) : 1; const peak = x.reduce((p, v) => Math.max(p, Math.abs(v)), 0); g = Math.min(g, 0.89 / peak);
  for (let i = 0; i < x.length; i++) x[i] *= g;
  write(x, path.join(out, 'vcsl_kit-mp3', `${flat(m)}.mp3`));
}
notes.vcsl_kit = KIT.map(k => k[1]).sort((a, b) => a - b);
console.log(`vcsl_kit: ${KIT.length} drums (${notes.vcsl_kit.map(flat).join(' ')}), the rest from percussion`);
console.log('\nSAMPLE_NOTES = ' + JSON.stringify(notes));
