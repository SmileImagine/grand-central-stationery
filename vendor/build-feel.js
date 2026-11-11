#!/usr/bin/env node
'use strict';
/*
  The drummer's feel, from the Groove MIDI Dataset's grooves (Magenta, Google; CC BY 4.0; see vendor/build-fills.js):
  how real drummers in each genre lean on each step of a 4/4 bar.

    node vendor/build-feel.js <groove folder>          the unzipped groove-v1.0.0-midionly.zip (info.csv inside)

  Every take marked "beat" in 4/4, its bars but the first and last. Each hit of the kick (K), the snare (S, a cross-stick
  too) and the time-keeper (H: the hi-hat, open, closed or pedalled, and the ride) is placed on the nearest step of the
  bar, in 24ths of a beat on the sixteenths and the triplets (0 6 8 12 16 18 of each beat, so a swung eighth lands on 16).
  For each genre, drum and step, from all its bars:
    the share of bars with a hit there (0-99, in hundredths),
    the hit's average strength against that drum's average in its own take (in hundredths: 100 as strong as usual),
    how much its strength varies from bar to bar within a take (the standard deviation, against its average, in
      hundredths: what one drummer does, not the spread between songs),
    how early or late it is played on average, against the take's own average (in thousandths of a beat; a minus is
      early), so a recording's offset from the click is left out.
  Steps hit in fewer than 3% of the bars are left out. Written into index.html between the gmd-feel markers, a line a
  genre: { bars, K: 'step:share:strength:spread:lean ...', S: ..., H: ... }, bars the number of bars it was read from.
*/
const fs = require('fs');
const path = require('path');

const src = process.argv[2]; if (!src) { console.error('usage: build-feel.js <groove folder>'); process.exit(1); }

// The MIDI reader of vendor/build-fills.js (note-ons with their tick and velocity, and the ticks a beat).
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
const DRUM = { 36: 'K', 38: 'S', 40: 'S', 37: 'S', 42: 'H', 22: 'H', 44: 'H', 46: 'H', 26: 'H', 51: 'H', 59: 'H', 53: 'H' };
const STEPS = [0, 6, 8, 12, 16, 18];

const rows = fs.readFileSync(path.join(src, 'info.csv'), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const acc = new Map();   // genre -> { bars, cells: { K: Map(step -> { n, r, o, ss, sn }) } }
for (const r of rows.filter(r => r[5] === 'beat' && r[6] === '4-4')) {
  const genre = r[3].split('/')[0], { ppq, notes } = readMidi(new Uint8Array(fs.readFileSync(path.join(src, r[7]))));
  const hits = notes.filter(n => DRUM[n.note]).map(n => ({ b: n.tick / ppq, d: DRUM[n.note], v: n.vel }));
  if (!hits.length) continue;
  const nbars = Math.floor(Math.max(...hits.map(h => h.b)) / 4);
  if (nbars < 3) continue;
  if (!acc.has(genre)) acc.set(genre, { bars: 0, cells: { K: new Map(), S: new Map(), H: new Map() } });
  const g = acc.get(genre), take = [];
  for (let bar = 1; bar < nbars - 1; bar++) {
    g.bars++;
    const seen = new Set();
    for (const h of hits) {
      const p = h.b - bar * 4; if (p < -1 / 12 || p >= 4 - 1 / 12) continue;
      const beat = Math.floor(p + 1 / 12), within = (p - beat) * 24;
      let step = STEPS[0], best = Infinity; for (const s of [...STEPS, 24]) if (Math.abs(within - s) < best) { best = Math.abs(within - s); step = s; }
      let q = beat * 24 + step; if (q >= 96) continue; if (q < 0) q += 96;
      const key = h.d + q; if (seen.has(key)) continue; seen.add(key);   // one hit a drum a step a bar (a flam is one)
      take.push({ d: h.d, q, v: h.v, o: (within - step) / 24 });
    }
  }
  // Within the take: each drum's strength against its own average there, the timing against the take's own average
  // (a recording's offset from the click is not feel), and how much one step's strength varies from bar to bar.
  const lean0 = take.reduce((a, h) => a + h.o, 0) / Math.max(1, take.length), mean = {};
  for (const d of ['K', 'S', 'H']) { const vs = take.filter(h => h.d === d).map(h => h.v); mean[d] = vs.reduce((a, v) => a + v, 0) / Math.max(1, vs.length); }
  const by = new Map(); for (const h of take) { const k = h.d + ':' + h.q; if (!by.has(k)) by.set(k, []); by.get(k).push(h); }
  for (const [k, hs] of by) {
    const [d, q] = [k.split(':')[0], +k.split(':')[1]], m = g.cells[d]; if (!m.has(q)) m.set(q, { n: 0, r: 0, o: 0, ss: 0, sn: 0 });
    const c = m.get(q), rs = hs.map(h => h.v / mean[d]), mr = rs.reduce((a, x) => a + x, 0) / rs.length;
    c.n += hs.length; c.r += rs.reduce((a, x) => a + x, 0); c.o += hs.reduce((a, h) => a + h.o - lean0, 0);
    if (rs.length > 1) { c.ss += rs.reduce((a, x) => a + (x - mr) ** 2, 0); c.sn += rs.length - 1; }
  }
}
const out = [];
for (const [genre, g] of [...acc].sort()) {
  const line = {};
  for (const d of ['K', 'S', 'H']) {
    const cells = [];
    for (const [q, c] of [...g.cells[d]].sort((a, b) => a[0] - b[0])) {
      const share = c.n / g.bars; if (share < 0.03) continue;
      const mr = c.r / c.n, sd = c.sn ? Math.sqrt(c.ss / c.sn) : 0;
      cells.push(`${q}:${Math.min(99, Math.round(share * 100))}:${Math.round(mr * 100)}:${Math.round(sd / mr * 100)}:${Math.round(c.o / c.n * 1000)}`);
    }
    line[d] = cells.join(' ');
  }
  out.push(`      ${genre}: ${JSON.stringify({ bars: g.bars, ...line }).replace(/"(bars|[KSH])":/g, '$1: ')},`);
  console.log(`${genre}: ${g.bars} bars, steps K ${line.K.split(' ').length} S ${line.S.split(' ').length} H ${line.H.split(' ').length}`);
}
const block = ['    const GMD_FEEL = {', ...out, '    };'].join('\n');
const page = path.join(__dirname, '..', 'index.html'), html = fs.readFileSync(page, 'utf8');
const a = html.indexOf('// <gmd-feel>'), b = html.indexOf('// </gmd-feel>');
if (a < 0 || b < 0) { console.log(block.slice(0, 1500)); console.error('index.html has no gmd-feel markers'); process.exit(1); }
const lineEnd = html.indexOf('\n', a) + 1, lineStart = html.lastIndexOf('\n', b) + 1;
fs.writeFileSync(page, html.slice(0, lineEnd) + block + '\n' + html.slice(lineStart));
console.log(`index.html: ${block.length} characters of feel`);
