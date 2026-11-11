#!/usr/bin/env node
'use strict';
// The Band's heterophony part ("%%band melody2: pipa 2"): the line parses, at ornament level 0 the part plays the
// melody's own notes, and its fills stay in the tune's scale, in time, and the same for the same seed. Also the two
// styles that turn it on (sizhu and andean): no bass, no chords. Runs the page's own functions (lifted out of
// index.html by name, as test/arrange.test.js does) on published tunes parsed by abcjs.

const fs = require('fs');
const path = require('path');
const ABCJS = require('../vendor/abcjs-basic-min.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('\n');
function lift(name) {
  const start = html.findIndex(l => new RegExp(`^    (function ${name}\\(|const ${name}\\b)`).test(l));
  if (start < 0) throw new Error(`index.html has no top-level ${name}`);
  if (/;\s*$/.test(html[start]) && !/[{[(]\s*$/.test(html[start])) return html[start];
  let end = start + 1; while (end < html.length && !/^    [}\]];?\s*$/.test(html[end])) end++;
  return html.slice(start, end + 1).join('\n');
}
const names = ['PC_COLORS', 'LETTER_PC', 'ACC_SEMI', 'SHARP_NAMES', 'chordPcs', 'keyInfoOf', 'STYLES', 'CHART_LINE', 'CHART_NUM', 'parseChart', 'mulberry', 'pick', 'miniOf', 'hitString', 'FIT_DUPLE', 'fitOf', 'GROOVES', 'scoreFor', 'HETERO_SOUNDS', 'parseHetero', 'topLine', 'tuneScale', 'heterophony'];
const page = new Function(`${names.map(lift).join('\n')}\nreturn { ${names.filter(n => n !== 'SHARP_NAMES').join(', ')} };`)();
const { parseChart, parseHetero, topLine, tuneScale, heterophony, keyInfoOf, scoreFor, STYLES, HETERO_SOUNDS } = page;

let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };
const pcOf = m => ((m % 12) + 12) % 12;

// ---- the line ----
{
  const c = parseChart('X:1\nK:F\nA A | D G |\n%%band melody2: pipa 2\n%%band melody2 3: off\n%%band hetero 2: guitar 0 octave=1');
  assert(!c.problems.length, `melody2 lines should parse: ${c.problems.join(' ')}`);
  assert(c.defaults.hetero === 'pipa 2', 'melody2: sets the part for every time round');
  assert(c.choruses.find(ch => ch.n === 3).params.hetero === 'off', 'melody2 3: sets the third time round');
  assert(c.choruses.find(ch => ch.n === 2).params.hetero === 'guitar 0 octave=1', 'hetero is another name for melody2');
  const bad = parseChart('%%band melody2: banjo 7');
  assert(bad.problems.length === 1 && /"banjo" and "7" are not/.test(bad.problems[0]), `an unknown sound or level is named (${bad.problems})`);
  const h = parseHetero('erhu 3 octave=-1');
  assert(h.sound === 'erhu' && h.level === 3 && h.octave === -1 && !h.off && !h.problems.length, 'parseHetero reads sound, level and octave');
  assert(parseHetero('').sound === 'recorder' && parseHetero('').level === 1, 'the defaults: the recorder, ornament 1');
  assert(parseHetero('off').off, 'off silences the part');
  for (const [k, s] of Object.entries(HETERO_SOUNDS)) assert(Number.isInteger(s.prog) && s.prog >= 0 && s.prog < 128 && s.name, `${k} has a GM program and a name`);
}

// ---- the part, on published tunes ----
const set = JSON.parse(fs.readFileSync(path.join(root, 'course/set.json'), 'utf8')).tunes;
const lineOf = abc => {
  const tune = ABCJS.parseOnly(abc)[0], f = tune.setUpAudio({});
  const tr = f.tracks.find(t => t.some(e => e.cmd === 'note' && e.startChar !== undefined));
  return { line: topLine(tr.filter(e => e.cmd === 'note' && e.duration > 0)), key: keyInfoOf(tune.getKeySignature()), beat: tune.getBeatLength() };
};
let fills = 0, tunes = 0;
for (const t of set) {
  const { line, key, beat } = lineOf(t.abc); if (line.length < 4) continue; tunes++;
  const scale = tuneScale(line, key.scale), compound = Math.abs(beat * 8 / 3 - Math.round(beat * 8 / 3)) < 1e-6;
  assert(scale.every(pc => line.some(n => pcOf(n.pitch) === pc)), `${t.id}: the scale holds only notes the tune plays`);
  // Level 0: the melody doubled exactly.
  const same = heterophony(line, { level: 0, seed: 3, beat, compound, scale });
  assert(same.length === line.length && same.every((n, i) => n.pitch === line[i].pitch && Math.abs(n.start - line[i].start) < 1e-9 && Math.abs(n.dur - line[i].dur) < 1e-9 && n.shift === 0 && !n.fill), `${t.id}: level 0 plays the melody's notes`);
  const total = line.reduce((a, n) => a + n.dur, 0);
  for (const level of [1, 2, 3]) for (const plucked of [false, true]) for (const seed of [1, 2, 7]) {
    const o = { level, seed, beat, compound, plucked, scale }, out = heterophony(line, o);
    assert(JSON.stringify(out) === JSON.stringify(heterophony(line, o)), `${t.id}: the same seed plays the same`);
    assert(Math.abs(out.reduce((a, n) => a + n.dur, 0) - total) < 1e-6, `${t.id} level ${level}: the part takes the melody's time, no more`);
    for (let i = 0; i < out.length; i++) {
      const n = out[i], under = line.find(m => n.start >= m.start - 1e-9 && n.start < m.start + m.dur - 1e-9);
      assert(under && n.start + n.dur <= under.start + under.dur + 1e-9, `${t.id} level ${level}: every note lies within a melody note (${n.start}+${n.dur} ${n.pitch}; under ${under && [under.start, under.dur, under.pitch]})`);
      assert(Math.abs(n.shift) <= [0, 6, 10, 14][level], `${t.id} level ${level}: a few ms off the melody, no more`);
      if (n.fill) { fills++; assert(pcOf(n.pitch) === pcOf(under.pitch) || scale.includes(pcOf(n.pitch)), `${t.id} level ${level}: fill ${n.pitch} under ${under.pitch} is outside the scale ${scale}`); }
      else assert(n.pitch === under.pitch, `${t.id} level ${level}: a note that is not a fill is the melody's`);
    }
  }
}
assert(tunes > 30 && fills > 1000, `the fills happen (${fills} over ${tunes} tunes)`);
// A pentatonic tune's fills are pentatonic: Bhup (raga Bhupali, C D E G A) never fills with an F or a B.
{
  const { line, key, beat } = lineOf(set.find(t => t.id === 'hindostan-1-bhup').abc), scale = tuneScale(line, key.scale);
  assert(scale.join() === '0,2,4,7,9', `Bhup's scale is C D E G A (found ${scale})`);
  const out = heterophony(line, { level: 3, seed: 5, beat, scale });
  assert(out.some(n => n.fill) && out.every(n => scale.includes(pcOf(n.pitch))), 'Bhup heterophony stays in its pentatonic scale');
  assert(JSON.stringify(out) !== JSON.stringify(heterophony(line, { level: 3, seed: 6, beat, scale })), 'another seed (time round) ornaments differently');
  const up = heterophony(line, { level: 0, seed: 5, beat, scale, octave: 1 });
  assert(up.every((n, i) => n.pitch === line[i].pitch + 12), 'octave=1 plays the line an octave up');
}

// ---- the styles that turn it on: a clapper or a bombo, no bass, no chords ----
for (const key of ['sizhu', 'andean']) {
  const st = STYLES[key]; assert(st && st.noChords && st.hetero && !parseHetero(st.hetero).problems.length, `${key} turns on a heterophony part`);
  for (const metre of [{ nb: 2 }, { nb: 3 }, { nb: 4 }, { nb: 2, compound: true }]) for (const energy of [0.2, 0.5, 0.9]) {
    const score = scoreFor(energy, 0.5, metre, 1, key), parts = score.split(/\n(?=bass:|chords:)/);
    assert(/^bass:\n~$/.test(parts[1]) && /^chords:\n~$/.test(parts[2]), `${key}: no bass and no chords (${score})`);
  }
}
assert(/^drums:\nwb ~\n/.test(scoreFor(0.5, 0.5, { nb: 2 }, 1, 'sizhu')), 'sizhu: the clapper on the downbeat');

console.log(`Heterophony checks passed (${checks} checks; ${fills} fills over ${tunes} tunes, all in scale).`);
