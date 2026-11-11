#!/usr/bin/env node
'use strict';
/*
  The drummer's fills, from the Groove MIDI Dataset (Magenta, Google; CC BY 4.0):
    Jon Gillick, Adam Roberts, Jesse Engel, Douglas Eck and David Bamman, "Learning to Groove with Inverse Sequence
    Transformations", ICML 2019. https://magenta.tensorflow.org/datasets/groove

    node vendor/build-fills.js <groove folder>          the unzipped groove-v1.0.0-midionly.zip (info.csv inside)
    node vendor/build-fills.js <groove folder> --stats  counts only, nothing written

  Ten drummers played fills on a Roland TD-11 kit; the dataset marks those takes "fill". Each take starts on a bar line
  in 4/4. Here, each take's last bar (the bar the fill is in) is cut where the fill starts: the first beat in it with a
  tom, three or more snare or tom hits, or hits with no hi-hat or ride keeping time. The fill runs from that beat to
  the bar line, one to four beats; a hit on the next downbeat is its landing (a crash, a kick) and is kept as a flag,
  not a hit. The tail of a longer fill is kept as a shorter fill too, when the tail starts on a hit. Each hit keeps:
    the step it is nearest to, in 24ths of a beat (a sixteenth is 6, an eighth-note triplet 8, a 32nd 3; a grace note
      just before the fill's first beat is negative),
    the drum (K kick, S snare, X cross-stick, H closed hat, P pedal hat, O open hat, T high tom, M mid tom, F floor
      tom, C crash, R ride),
    its velocity, 1 to 9 (from the TD-11's 1-127),
    and how early or late the drummer played it against that step, in hundredths of a beat (a minus is early).
  Fills alike in their hits (the same steps on the same drums) are kept once, and twelve of each length a genre, from
  the sparsest to the busiest, with up to four more on the snare and kick alone and four more on the triplet grid. The result is written into index.html
  between the gmd-fills markers, a line a genre:  'rock': 'L|flags|hits;...'  where L is the length in beats and
  flags are c (lands with a crash), k (lands with a kick), t (all its steps on the triplet grid), s (on sixteenths).
*/
const fs = require('fs');
const path = require('path');

const src = process.argv[2]; if (!src) { console.error('usage: build-fills.js <groove folder> [--stats]'); process.exit(1); }
const stats = process.argv.includes('--stats');

// A small MIDI reader (as course/rhythm-analyze.js's): note-ons with their tick, note and velocity, and ticks a beat.
function readMidi(d) {
  let i = 0; const u32 = () => (d[i++] << 24 | d[i++] << 16 | d[i++] << 8 | d[i++]) >>> 0, u16 = () => d[i++] << 8 | d[i++];
  if (String.fromCharCode(...d.slice(0, 4)) !== 'MThd') throw new Error('not a MIDI file');
  i = 4; const hlen = u32(); u16(); const ntracks = u16(), ppq = u16(); i = 8 + hlen;
  const notes = [];
  for (let t = 0; t < ntracks; t++) {
    if (String.fromCharCode(...d.slice(i, i + 4)) !== 'MTrk') break;
    i += 4; const len = u32(), end = i + len; let tick = 0, status = 0;
    while (i < end) {
      let delta = 0, b; do { b = d[i++]; delta = (delta << 7) | (b & 0x7f); } while (b & 0x80); tick += delta;
      let s = d[i]; if (s & 0x80) { status = s; i++; } else s = status;
      if (s === 0xff) { const type = d[i++]; let l = 0; do { b = d[i++]; l = (l << 7) | (b & 0x7f); } while (b & 0x80); i += l; if (type === 0x2f) break; }
      else if (s === 0xf0 || s === 0xf7) { let l = 0; do { b = d[i++]; l = (l << 7) | (b & 0x7f); } while (b & 0x80); i += l; }
      else { const hi = s & 0xf0; if (hi === 0x90) { const n = d[i++], v = d[i++]; if (v > 0) notes.push({ tick, note: n, vel: v }); } else if (hi === 0xc0 || hi === 0xd0) i += 1; else i += 2; }
    }
    i = end;
  }
  return { ppq, notes };
}

// The TD-11's notes as the band's drums (the snare's rim shot is a loud snare; a tom's rim, the tom).
const DRUM = { 36: 'K', 38: 'S', 40: 'S', 37: 'X', 42: 'H', 22: 'H', 44: 'P', 46: 'O', 26: 'O', 48: 'T', 50: 'T', 45: 'M', 47: 'M', 43: 'F', 58: 'F', 49: 'C', 55: 'C', 57: 'C', 52: 'C', 51: 'R', 59: 'R', 53: 'R' };
const TIME = new Set(['H', 'P', 'O', 'R']), DRIVE = new Set(['S', 'T', 'M', 'F']), TOMS = new Set(['T', 'M', 'F']);
// The grids a fill may sit on, in 24ths of a beat, coarsest first.
const GRIDS = [6, 8, 4, 3];

const rows = fs.readFileSync(path.join(src, 'info.csv'), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const fills = rows.filter(r => r[5] === 'fill' && r[6] === '4-4');
const out = new Map(), seen = new Set(), why = {};
const skip = k => { why[k] = (why[k] || 0) + 1; };
for (const r of fills) {
  const genre = r[3].split('/')[0], { ppq, notes } = readMidi(new Uint8Array(fs.readFileSync(path.join(src, r[7]))));
  const hits = notes.filter(n => DRUM[n.note]).map(n => ({ b: n.tick / ppq, d: DRUM[n.note], v: n.vel })).sort((a, b) => a.b - b.b);
  if (hits.length < 2) { skip('empty'); continue; }
  // The landing: the last hits, on a bar line after the first bar.
  const last = hits[hits.length - 1].b, L = Math.round(last / 4) * 4;
  let land = [], end;
  if (L >= 4 && Math.abs(last - L) < 0.15) { land = hits.filter(h => Math.abs(h.b - L) < 0.15); end = L; }
  else end = (Math.floor(last / 4) + 1) * 4;
  const bar = hits.filter(h => h.b >= end - 4 - 0.12 && h.b < end - 0.12);
  if (!bar.length) { skip('no bar'); continue; }
  // The beat the fill starts on.
  const beatOf = h => Math.min(3, Math.max(0, Math.floor(h.b - (end - 4) + 0.12)));
  const beats = [0, 1, 2, 3].map(k => bar.filter(h => beatOf(h) === k));
  const fillish = bs => bs.some(h => TOMS.has(h.d)) || bs.filter(h => DRIVE.has(h.d)).length >= 3 || (bs.length && !bs.some(h => TIME.has(h.d)) && bs.some(h => DRIVE.has(h.d)));
  const from = beats.findIndex(fillish);
  if (from < 0) { skip('no fill in the bar'); continue; }
  // Every tail of it that starts on a beat with a hit, longest first.
  for (let start = from; start < 4; start++) {
    const part = bar.filter(h => beatOf(h) >= start); if (!part.length || !beats[start].length) continue;
    if (start > from && !fillish(beats[start])) continue;
    const len = 4 - start, t0 = end - len;
    // The coarsest grid that places the hits within a 64th, on average.
    let grid = null;
    for (const g of GRIDS) { const err = part.reduce((s, h) => { const x = (h.b - t0) * 24 / g; return s + Math.abs(x - Math.round(x)); }, 0) / part.length; if (err * g / 24 < 1 / 16) { grid = g; break; } }
    if (!grid) { skip('off the grid'); continue; }
    const q = part.map(h => { const x = (h.b - t0) * 24 / grid, s = Math.round(x) * grid; return { s, d: h.d, v: Math.max(1, Math.min(9, Math.round(h.v / 127 * 9))), o: Math.max(-9, Math.min(9, Math.round(((h.b - t0) * 24 - s) / 24 * 100))) }; }).filter(h => h.s < len * 24);
    // One hit a drum a step (the louder).
    const by = new Map(); for (const h of q) { const k = h.s + h.d; if (!by.has(k) || by.get(k).v < h.v) by.set(k, h); }
    const hs = [...by.values()].sort((a, b) => a.s - b.s || a.d.localeCompare(b.d));
    if (!hs.some(h => DRIVE.has(h.d) || h.d === 'K')) { skip('no drums'); continue; }
    const sig = len + '/' + hs.map(h => h.s + h.d).join(' ');
    if (seen.has(sig)) { skip('alike'); continue; }
    seen.add(sig);
    const steps = hs.map(h => h.s), flags = (land.some(h => h.d === 'C') ? 'c' : '') + (land.some(h => h.d === 'K') ? 'k' : '') + (steps.every(s => s % 4 === 0) ? 't' : '') + (steps.every(s => s % 6 === 0) ? 's' : '');
    const text = `${len}|${flags}|${hs.map(h => h.s + h.d + h.v + (h.o ? (h.o > 0 ? '+' : '') + h.o : '')).join(' ')}`;
    if (!out.has(genre)) out.set(genre, []);
    out.get(genre).push(text);
  }
}
// Twelve of each length a genre, from the sparsest to the busiest, evenly: the page carries a vocabulary, not the corpus.
const KEEP = 12, EXTRA = 4;
for (const [g, l] of out) {
  const kept = [];
  for (const n of [1, 2, 3, 4]) {
    const of = l.filter(x => x.startsWith(n + '|')).sort((a, b) => a.split(' ').length - b.split(' ').length || (a < b ? -1 : 1));
    if (of.length <= KEEP) { kept.push(...of); continue; }
    const these = new Set(); for (let k = 0; k < KEEP; k++) these.add(of[Math.round(k * (of.length - 1) / (KEEP - 1))]);
    // and a few more for the styles that take only some: on the snare and kick alone (a march), all on the triplet grid (swing, a jig)
    const rest = of.filter(x => !these.has(x)), snare = x => x.split('|')[2].split(' ').every(h => /^-?\d+[SKXHP]/.test(h)), trip = x => /t/.test(x.split('|')[1]) && !/s/.test(x.split('|')[1]);
    for (const test of [snare, trip]) { const add = rest.filter(x => test(x) && !these.has(x)); for (let k = 0; k < Math.min(EXTRA, add.length); k++) these.add(add[Math.round(k * (add.length - 1) / Math.max(1, EXTRA - 1))]); }
    kept.push(...of.filter(x => these.has(x)));
  }
  out.set(g, kept);
}
const total = [...out.values()].reduce((a, l) => a + l.length, 0);
console.log(`${fills.length} fill takes; ${total} fills kept (of ${seen.size} distinct)`, why);
for (const [g, l] of out) { const by = [1, 2, 3, 4].map(n => l.filter(x => x.startsWith(n + '|')).length); console.log(`  ${g}: ${l.length} (by length 1-4: ${by.join(' ')}; triplet ${l.filter(x => x.split('|')[1].includes('t')).length})`); }
if (stats) process.exit(0);
const block = ['    const GMD_FILLS = {', ...[...out].sort().map(([g, l]) => `      ${g}: ${JSON.stringify(l.join(';'))},`), '    };'].join('\n');
const page = path.join(__dirname, '..', 'index.html'), html = fs.readFileSync(page, 'utf8');
const a = html.indexOf('// <gmd-fills>'), b = html.indexOf('// </gmd-fills>');
if (a < 0 || b < 0) { console.error('index.html has no gmd-fills markers'); process.exit(1); }
const lineEnd = html.indexOf('\n', a) + 1, lineStart = html.lastIndexOf('\n', b) + 1;
fs.writeFileSync(page, html.slice(0, lineEnd) + block + '\n' + html.slice(lineStart));
console.log(`index.html: ${block.length} characters of fills`);
