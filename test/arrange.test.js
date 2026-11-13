#!/usr/bin/env node
'use strict';
// The arranger in each style: the chords it adds belong to that style's harmony. Also the chart's
// ending and texture settings, the band's bars as played (a repeat plays its bars again), its textures, and
// the idiom registry (every style's groove in every metre), and the band listening to the melody (Feel).
// Runs the page's own functions (lifted out of index.html by name) on tunes parsed by abcjs.

const fs = require('fs');
const path = require('path');
const ABCJS = require('../vendor/abcjs-basic-min.js');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('\n');

// A declaration at the script's top level (four spaces in): one line, or up to its closing brace at the same indent.
function lift(name) {
  const start = html.findIndex(l => new RegExp(`^    (function ${name}\\(|const ${name}\\b)`).test(l));
  if (start < 0) throw new Error(`index.html has no top-level ${name}`);
  if (/;\s*$/.test(html[start]) && !/[{[(]\s*$/.test(html[start])) return html[start];
  let end = start + 1; while (end < html.length && !/^    [}\]];?\s*$/.test(html[end])) end++;
  return html.slice(start, end + 1).join('\n');
}
const names = ['PC_COLORS', 'LETTER_PC', 'ACC_SEMI', 'SHARP_NAMES', 'collect', 'spell', 'chordPcs', 'tuneBars', 'keyInfoOf', 'melodyChordFinder', 'arrange', 'STYLES', 'harmonyOf', 'CHART_LINE', 'CHART_NUM', 'parseChart', 'playedBars', 'DRUM', 'textured', 'mulberry', 'pick', 'miniOf', 'hitString', 'FIT_DUPLE', 'fitOf', 'beatsOf', 'downbeat', 'GROOVES', 'GROOVE_COUNT', 'groovePick', 'scoreFor', 'KIT', 'formOf', 'melodyLine', 'bandFeel', 'COMP_FOLDER', 'LOW_LIMIT', 'clearOf'];
const page = new Function(`${names.map(lift).join('\n')}\nreturn { ${names.filter(n => n !== 'SHARP_NAMES').join(', ')}, FLAT_NAMES, SHARP_NAMES };`)();
const { chordPcs, arrange, harmonyOf, formOf, keyInfoOf, parseChart, playedBars, textured, DRUM, GROOVES, scoreFor, fitOf, KIT, melodyLine, bandFeel, COMP_FOLDER, clearOf } = page;

let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };

// The chart lines' chord tokens, chorus by chorus.
const chorusChords = lines => lines.map(l => { const bar = l.indexOf('|'); return bar < 0 ? null : l.slice(bar).split(/[|\s]+/).filter(t => t && t !== '.'); });
const arrangeIn = (abc, style) => {
  const tune = ABCJS.parseOnly(abc)[0];
  const lines = arrange(tune, keyInfoOf(tune.getKeySignature()), { energy: 50, detail: 50, seed: 1 }, harmonyOf(style));
  const ch = chorusChords(lines);
  return { lines, ch, own: new Set(ch[0] || []), added: new Set(ch.flat().filter(c => c && !(ch[0] || []).includes(c))) };
};

// node test/arrange.test.js --show folk,jig <tune id>...: print the arrangements instead of checking them.
if (process.argv[2] === '--show') {
  const PS0 = require('./published-set.js')(); const tunes = PS0 ? PS0.set.tunes : [];
  for (const id of process.argv.slice(4)) for (const style of process.argv[3].split(',')) { console.log(`${id} in ${style}`); for (const l of arrangeIn(tunes.find(t => t.id === id).abc, style).lines) console.log('  ' + l); }
  process.exit(0);
}

// chordPcs reads the new symbols the styles write.
const pcs = n => chordPcs(n).pcs.slice().sort((a, b) => a - b).join(' ');
assert(pcs('Cadd9') === '0 2 4 7', 'Cadd9 is C E G and D');
assert(pcs('C9') === '0 2 4 7 10', 'C9 has its seventh');
assert(pcs('Cmaj9') === '0 2 4 7 11', 'Cmaj9 has the major seventh');
assert(pcs('C7b9') === '0 1 4 7 10', 'C7b9 has the flat ninth');
assert(pcs('C5') === '0 7', 'C5 is a power chord');
assert(pcs('C6') === '0 4 7 9' && pcs('Am7') === '0 4 7 9', 'C6 and Am7 unchanged');

// keyInfoOf: a mode's final and its signature's notes.
const dor = keyInfoOf(ABCJS.parseOnly('X:1\nK:Ador\nA|]\n')[0].getKeySignature());
assert(dor.tonic === 9 && dor.scale.slice().sort((a, b) => a - b).join(' ') === '0 2 4 6 7 9 11', 'A Dorian: tonic A, the notes of G major');

const PS = require('./published-set.js')(); if (!PS) require('./published-set.js').skip('arrange.test.js');
const set = PS.set.tunes;
const tuneAbc = id => { const t = set.find(x => x.id === id); if (!t) throw new Error(`${id} is not in the published set`); return t.abc; };
const chorded = set.filter(t => /"[A-G]/.test(t.abc));

for (const t of chorded) for (const style of Object.keys(page.STYLES).filter(k => k !== 'auto')) {
  const { lines, ch, added } = arrangeIn(t.abc, style);
  const where = `${t.id} in ${style}`;
  assert(lines.length === 5 && lines.every(l => /^%%band [1-5]: energy=\d+ detail=\d+ seed=\d+( texture=build)?( \|.*\|)?$/.test(l)), `${where}: five chart lines\n${lines.join("\n")}`);
  for (const c of added) assert(chordPcs(c), `${where}: "${c}" is a chord`);
  const h = harmonyOf(style);
  if (h.moves === false) assert(ch.every(c => c === null), `${where}: a drone writes no chord changes`);
  if (style === 'jig') for (const c of added) assert(/^[A-G][#b]?m?$/.test(c), `${where}: a jig adds only plain triads, not ${c}`);
  if (['folk', 'march', 'waltz'].includes(style)) for (const c of added) assert(/^[A-G][#b]?(7)?$/.test(c), `${where}: ${style} adds only major triads and dominant sevenths, not ${c}`);
  if (style === 'pop') for (const c of added) assert(!/7/.test(c), `${where}: pop adds no sevenths, not ${c}`);
  if (style === 'ballad') for (const c of added) assert(!/^([A-G][#b]?)7$/.test(c) || ch[2].includes(c) || ch[1].includes(c) || ch[4].includes(c), `${where}: ${c}`);
  if (!['swing', 'bossa'].includes(style)) assert(!/6/.test([...added].join(' ')) || style === 'swing', `${where}: sixths are swing's`);
}

// The styles sound different from one another on the same tune: Astley's Ride, already full of secondary dominants.
const joy = tuneAbc('reelsa-c-15-astley-s-ride');
const by = Object.fromEntries(['pop', 'folk', 'jig', 'swing', 'bossa', 'ballad'].map(s => [s, arrangeIn(joy, s)]));
const list = r => [...r.added].join(' ');
assert([...by.swing.added].some(c => /6$/.test(c)), `swing gives the tonic a sixth: ${list(by.swing)}`);
assert([...by.bossa.added].some(c => /maj7$/.test(c)), `bossa gives a major seventh: ${list(by.bossa)}`);
assert(![...by.jig.added].some(c => /7/.test(c)), `a jig has no sevenths: ${list(by.jig)}`);
assert([...by.pop.added].some(c => /add9$/.test(c)), `pop gives an add9: ${list(by.pop)}`);
assert(new Set(['pop', 'folk', 'jig', 'swing', 'bossa'].map(k => by[k].lines.slice(1, 4).join('\n'))).size === 5, 'pop, folk, jig, swing and bossa arrange Astley\'s Ride five ways');

// A plain tune of triads (written for this test): where each style puts its approach chords.
const plainTune = 'X:1\nT:Plain test\nM:4/4\nL:1/8\nK:G\n"G"G2B2 d2B2|"G"G2B2 A2G2|"D"F2A2 d4|"G"B2d2 "C"e2c2|"G"d2B2 "D"A2F2|"G"G2B2 A2B2|"Em"E2G2 B4|"C"c2e2 "D"d2c2|"G"B6 z2|]\n';
const p = Object.fromEntries(['pop', 'folk', 'jig', 'swing', 'ballad'].map(s => [s, arrangeIn(plainTune, s)]));
assert(p.folk.added.has('A7') && p.folk.added.has('B7') && ![...p.folk.added].some(c => /m7/.test(c)), `folk: secondary dominants A7 (into D) and B7 (into Em), no ii: ${list(p.folk)}`);
assert(p.ballad.added.has('Em7') && p.ballad.added.has('A7'), `ballad: ii-V into D: ${list(p.ballad)}`);
assert(p.swing.added.has('G6'), `swing: G6: ${list(p.swing)}`);
assert(p.pop.added.has('F'), `pop: the flat seventh into the tonic: ${list(p.pop)}`);
assert(![...p.jig.added].some(c => /7/.test(c)), `jig: no sevenths: ${list(p.jig)}`);

// A Dorian jig: its cadence is the mode's own minor v (Em), not E or E7, and its moves stay in the mode.
const dorian = 'X:1\nT:Test jig\nM:6/8\nL:1/8\nR:jig\nK:Ador\n"Am"A2A ABA|"Am"cBA "G"G2E|"Am"A2A ABc|"G"d2B G2B|\n"Am"A2A ABA|"Am"cBA "G"G2E|"Am"A2A "Am"cBA|"Am"A3 A3|]\n';
const dj = arrangeIn(dorian, 'jig');
for (const c of dj.added) { const cp = chordPcs(c); assert(cp.pcs.every(p => dor.scale.includes(p)), `Dorian jig: ${c} is in the mode`); }
assert(!dj.ch[4].includes('E') && !dj.ch[4].includes('E7'), `Dorian jig: no major V at the end (${dj.ch[4]})`);

// The chart's way out: ending=hit|none on the settings line. There is no intro (a bar of clicks counts the tune in).
const sect = parseChart('%%band ending=none\n%%band 1: energy=30 | C | G |');
assert(sect.defaults.ending === 'none' && !sect.problems.length, `ending setting: ${JSON.stringify(sect)}`);
assert(parseChart('%%band intro=2').problems.length === 1, 'intro is not a setting');
assert(parseChart('%%band ending=fade').problems.length === 1, 'ending wants hit or none');

// The band's bars as played. Written: a one-beat pickup, then bars of four beats, the last of three (ms at 1000 a beat).
const W = [[0, 1], [1, 5], [5, 9], [9, 12]].map(([a, b]) => ({ s: a * 1000, e: b * 1000, beats: b - a }));
const mark = (w, s) => ({ ms: s * 1000, ev: { measureStart: true, measureNumber: w } });
const show = bars => bars.map(b => `${b.w}${b.pickup ? 'p' : ''}@${b.s / 1000}-${b.e / 1000}`).join(' ');
// No repeats: as written.
let pb = playedBars(W, 1, [mark(0, 0), mark(1, 1), mark(2, 5), mark(3, 9)], 12000);
assert(show(pb) === '0p@0-1 1@1-5 2@5-9 3@9-12', `as written: ${show(pb)}`);
// Played twice (|: ... :|): the pickup again joins the three-beat bar before it, making a whole bar.
pb = playedBars(W, 1, [mark(0, 0), mark(1, 1), mark(2, 5), mark(3, 9), mark(0, 12), mark(1, 13), mark(2, 17), mark(3, 21)], 24000);
assert(show(pb) === '0p@0-1 1@1-5 2@5-9 3@9-13 1@13-17 2@17-21 3@21-24', `repeated: ${show(pb)}`);
// A bar no note starts (tied into) follows the one before it.
pb = playedBars(W, 1, [mark(0, 0), mark(1, 1), mark(3, 9)], 12000);
assert(show(pb) === '0p@0-1 1@1-5 2@5-9 3@9-12', `tied: ${show(pb)}`);
// After a whole bar, a repeated pickup stays a bar of its own for the band to wait through.
const W2 = [[0, 1], [1, 5], [5, 9]].map(([a, b]) => ({ s: a * 1000, e: b * 1000, beats: b - a }));
pb = playedBars(W2, 1, [mark(0, 0), mark(1, 1), mark(2, 5), mark(0, 9), mark(1, 10), mark(2, 14)], 18000);
assert(show(pb) === '0p@0-1 1@1-5 2@5-9 0p@9-10 1@10-14 2@14-18', `pickup after a whole bar: ${show(pb)}`);
// No timings: as written.
assert(show(playedBars(W, 1, [], 12000)) === '0p@0-1 1@1-5 2@5-9 3@9-12', 'no timings: as written');

// A time round's texture: who plays. Two bars of four beats (1000 ms a beat) of a little band.
const TB = [{ s: 0, e: 4000, beats: 4, w: 0 }, { s: 4000, e: 8000, beats: 4, w: 1 }];
const band = [];
for (const b of TB) for (let k = 0; k < 4; k++) {
  band.push({ part: 'drums', t: b.s + k * 1000, dur: 0, midi: k % 2 ? DRUM.snare : DRUM.kick, vel: 1 });
  band.push({ part: 'bass', t: b.s + k * 1000 + 5, dur: 0.9, midi: 40, vel: 1 });
  if (k % 2) for (const m of [52, 55, 59]) band.push({ part: 'chords', t: b.s + k * 1000 + (m - 52), dur: 0.9, midi: m, vel: 1 });   // offbeat comping
}
const parts = ns => [...new Set(ns.map(n => n.part))].sort().join(' ');
assert(textured(band, 'full', TB) === band && textured(band, undefined, TB) === band, 'full: the band as it is');
assert(parts(textured(band, 'drums', TB)) === 'drums', 'drums: a break');
assert(parts(textured(band, 'unplugged', TB)) === 'bass chords', 'unplugged: no drums');
const claps = textured(band, 'claps', TB);
assert(claps.every(n => n.midi === DRUM.clap) && claps.map(n => n.t).join(' ') === '1000 3000 5000 7000', `claps on 2 and 4: ${claps.map(n => n.t)}`);
const stop = textured(band, 'stop', TB);
assert(stop.every(n => n.t % 4000 < 60) && stop.filter(n => n.part === 'chords').length === 6 && stop.filter(n => n.midi === DRUM.kick).length === 2, `stop: one hit a bar, the offbeat chord moved onto the downbeat: ${stop.map(n => n.part + '@' + n.t)}`);
assert(stop.every(n => n.part === 'drums' || n.dur <= 0.9), 'stop: the hits are short');
assert(parseChart('%%band 3: texture=stop').choruses[0].params.texture === 'stop' && parseChart('%%band texture=loud').problems.length === 1, 'texture= is read');

// The idiom registry: every style has a groove, gives way only to styles that have one, and writes all three parts
// in every metre, with drum words the kit knows.
const metres = [{ nb: 2, compound: false }, { nb: 3, compound: false }, { nb: 4, compound: false }, { nb: 2, compound: true }, { nb: 4, compound: true }];
for (const k of Object.keys(page.STYLES).filter(k => k !== 'auto')) {
  assert(typeof GROOVES[k] === 'function', `${k} has a groove`);
  for (const to of Object.values(fitOf(k))) assert(GROOVES[to], `${k} gives way to ${to}, which has a groove`);
  for (const m of metres) for (const e of [0.1, 0.5, 0.9]) {
    const score = scoreFor(e, 0.6, m, 3, k), parts = score.split(/^(drums|bass|chords):$/m);
    const plays = part => { const i = parts.indexOf(part); return i >= 0 && !!parts[i + 1].trim(); };
    assert(plays('bass') && plays('chords') && (plays('drums') || e < 0.35), `${k} in ${m.nb}${m.compound ? ' compound' : ''} at ${e}: bass and chords always, drums from the middle energy up\n${score}`);
    const drumWords = (score.split('bass:')[0].match(/[a-z]+/g) || []).filter(w => w !== 'drums');
    for (const w of drumWords) assert(KIT[w], `${k}: "${w}" is a drum word`);
  }
}

// Each style's grooves: as many different scores as GROOVE_COUNT says, each naming itself, in the metre it lives in.
const { GROOVE_COUNT, groovePick } = page;
const home = { waltz: { nb: 3, compound: false }, jig: { nb: 2, compound: true } };
for (const [k, n] of Object.entries(GROOVE_COUNT)) {
  assert(page.STYLES[k] && GROOVES[k], `${k}: a style with grooves`);
  const m = home[k] || { nb: 4, compound: false }, seen = new Map();
  for (let v = 0; v < n; v++) for (const e of [0.5, 0.9]) {
    const out = {}, score = scoreFor(e, 0.6, m, 3, k, v, out);
    assert(out.name && out.i === v && out.n === n, `${k} groove ${v + 1}: names itself (${JSON.stringify(out)})`);
    if (e === 0.5) seen.set(score, out.name);
  }
  assert(seen.size === n && new Set(seen.values()).size === n, `${k}: ${n} grooves, each its own score and name (${[...seen.values()].join(', ')})`);
  assert(scoreFor(0.5, 0.6, m, 3, k, n) === scoreFor(0.5, 0.6, m, 3, k, 0), `${k}: the grooves come round again`);
}
// The groove a tune plays: from its title, the same every time, different titles different grooves; a %%style line can name one.
const titles = ['Twinkle', 'Skip to My Lou', 'Bounce High', 'Daisy Bell', 'Crows on the Fence', 'Arirang', 'Sakura', 'Mary Had a Little Lamb'];
const picks = titles.map(t => groovePick(`X:1\nT:${t}\nM:4/4\nK:C\nCDEF|`));
assert(picks.every((p, i) => p.named === null && p.hash === groovePick(`X:9\nT:${titles[i]}\nM:2/4\nK:G\nGABc|`).hash), 'the title chooses, whatever else changes');
assert(new Set(picks.map(p => p.hash % 4)).size >= 3, `titles spread over the grooves: ${picks.map(p => p.hash % 4)}`);
assert(groovePick('X:1\nT:A\n%%style folk 3\nK:C\nC|').named === 2 && groovePick('X:1\nT:A\n%%style folk\nK:C\nC|').named === null, '%%style folk 3 names the third groove');

// Japanese, Korean, Persian and Indian (the drone): each its own instruments (no two share a sound) and its own drum
// strokes, written beat by beat in every metre.
const worlds = ['minyo', 'korean', 'persian', 'drone'];
for (const part of ['drums', 'bass', 'chords']) { const s = worlds.map(k => page.STYLES[k].sound[part]); assert(s.every(Boolean) && new Set(s).size === 4, `the four styles' ${part}: ${s}`); }
for (const m of metres) {
  const words = worlds.map(k => new Set((scoreFor(0.6, 0.6, m, 3, k).split('bass:')[0].match(/[a-z]+/g) || []).filter(w => w !== 'drums')));
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert(![...words[a]].some(w => words[b].has(w)), `${worlds[a]} and ${worlds[b]} share no drum stroke in ${m.nb}${m.compound ? ' compound' : ''}: ${[...words[a]]} / ${[...words[b]]}`);
  assert(words.every(ws => ws.size >= 2 && ![...ws].some(w => ['bd', 'sd', 'rim', 'hh'].includes(w))), `the four play their own drums, not the kit's: ${words.map(w => [...w])}`);
}
assert(/^\[dha\] \[dhin\]|<\[\[dha\] \[dhin\] \[dhin\] \[dha\]\]/.test(scoreFor(0.6, 0.6, { nb: 4 }, 3, 'drone', 0).split('\n')[1]), `teentaal: ${scoreFor(0.6, 0.6, { nb: 4 }, 3, 'drone', 0)}`);
assert(/deong ~ ~\] \[deong ~ deok\] \[kung deok ~/.test(scoreFor(0.6, 0.6, { nb: 3 }, 3, 'korean', 0)), 'semachi in three');
assert(/dum ~ tak\] \[dum:\.75 tak ~/.test(scoreFor(0.6, 0.6, { nb: 2, compound: true }, 3, 'persian', 0)), 'Persian 6/8: dum - tak dum tak -');

// A style that builds writes its third time round as a build; one that does not, never.
for (const k of ['pop', 'house', 'folk', 'jig', 'ballad']) {
  const lines = arrange(ABCJS.parseOnly(plainTune)[0], keyInfoOf(ABCJS.parseOnly(plainTune)[0].getKeySignature()), { energy: 50, detail: 50, seed: 1 }, harmonyOf(k), formOf(k));
  assert(lines.filter(l => /texture=build/.test(l)).length === (page.STYLES[k].build ? 1 : 0) && (!page.STYLES[k].build || /^%%band 3: .*texture=build/.test(lines[2])), `${k}: build on the third time round only if it builds\n${lines.join('\n')}`);
}
const built = textured(band, 'build', TB);
assert(!built.some(n => n.midi === DRUM.kick || n.part === 'bass') && built.filter(n => n.midi === DRUM.snare).length === 8 + 16, `build: no kick or bass, a roll of eighths then sixteenths: ${built.filter(n => n.midi === DRUM.snare).length}`);

// The band listening (bandFeel), at 1000 ms a beat in two bars of four. The melody: four quarters in bar 1, then a note
// held for the whole of bar 2. Two bass notes and two chords of three notes each bar, one on the beat and one off it.
const FB = [{ s: 0, e: 4000, beats: 4 }, { s: 4000, e: 8000, beats: 4 }];
const tune = melodyLine([0, 1000, 2000, 3000, 4000].map((ms, i) => ({ ms, midis: [72 + i] })).concat([{ ms: 8000, midis: [] }]), 8000);
assert(tune.length === 5 && tune[4].end === 8000 && tune[0].end === 1000 && tune[0].pcs[0] === 0, `melodyLine: onsets, ends at the next event, pitch classes: ${JSON.stringify(tune)}`);
const plain = () => { let hit = 0; const out = []; for (const s of [0, 4000]) for (const at of [0, 1500]) { out.push({ part: 'bass', t: s + at, midi: 36, vel: 0.8 }); hit++; for (const m of [55, 60, 64]) out.push({ part: 'chords', t: s + at, midi: m, vel: 0.5, hit }); } out.push({ part: 'drums', t: 0, midi: DRUM.kick, vel: 0.9 }); return out; };
const same = bandFeel(plain(), tune, FB, 0, 1);
assert(JSON.stringify(same) === JSON.stringify(plain()), 'Feel 0 plays the score exactly');
const felt = bandFeel(plain(), tune, FB, 0.6, 1), at = (part, t, midi) => felt.find(n => n.part === part && Math.abs(n.t - t) < 30 && (midi === undefined || n.midi === midi));
assert(JSON.stringify(bandFeel(plain(), tune, FB, 0.6, 1)) === JSON.stringify(felt), 'the same seed plays the same way');
assert(at('bass', 0).vel > at('bass', 1500).vel, `the bass leans on the downbeat: ${at('bass', 0).vel} against ${at('bass', 1500).vel}`);
assert(at('chords', 0, 64).vel > at('chords', 0, 60).vel, 'a chord\'s top note sings over its inner note');
assert(at('bass', 5500).vel > at('bass', 1500).vel, `the band speaks up where the melody holds: ${at('bass', 5500).vel} against ${at('bass', 1500).vel}`);
for (const h of [1, 2, 3, 4]) { const ts = felt.filter(n => n.hit === h).map(n => n.t); assert(new Set(ts).size === 1 && Math.abs(ts[0] - [0, 1500, 4000, 5500][h - 1]) <= 20, `a chord's notes move together, a few ms at most: ${ts}`); }
assert(felt.every((n, i) => i === 0 || felt[i - 1].t <= n.t), 'still in time order');
assert(Object.keys(page.STYLES).every(k => !page.STYLES[k].comp || COMP_FOLDER[page.STYLES[k].comp]), 'every comping instrument has samples');
// Voicings clear of the bass: nothing under it, no close interval too low for its register, nothing pushed over the tune.
assert(clearOf([52, 55, 60], 48).join() === '52,55,60', 'a C chord over C3 is clear as it is');
assert(clearOf([40, 43, 48], 48).join() === '52,55,60', 'a close chord under the bass goes up over it');
assert(clearOf([47, 50, 55], 43).join() === '50,55,59', `a third too low for its register opens out: ${clearOf([47, 50, 55], 43)}`);
assert(clearOf([47, 50, 55, 60], 43, 58).join() === '50,55', `a note that would rise over the tune is left out: ${clearOf([47, 50, 55, 60], 43, 58)}`);

// The melody's sound: the tune's R: line with no instrument view, and every General MIDI program onto a set that is on disk.
const PROGRAM_FOLDER = new Function(`${html.slice(html.findIndex(l => /^    const PROGRAM_FOLDER = /.test(l))).join('\n').split(/;\s*\n/)[0]}; return PROGRAM_FOLDER;`)();
const { voiceFor } = new Function(`${lift('TUNE_VOICE')}\n${lift('voiceFor')}\nreturn { voiceFor };`)();
assert(voiceFor('X:1\nR:reel\nK:D') === 40 && voiceFor('X:1\nR:Jig\nK:G') === 40, 'a reel and a jig take the fiddle');
assert(voiceFor('X:1\nR:march\nK:F') === 56, 'a march takes the trumpet');
assert(voiceFor('X:1\nR:song\nK:C') === 0 && voiceFor('X:1\nK:C') === 0, 'a song, or a tune with no R: line, keeps the piano');
const onDisk = f => fs.existsSync(path.join(root, 'vendor', 'soundfont', f + '-mp3'));
const named = new Set([...Array(129).keys()].map(PROGRAM_FOLDER));
for (const k of Object.keys(page.STYLES)) for (const f of Object.values(page.STYLES[k].sound || {})) if (/^vsco_|^vcsl_/.test(f)) named.add(f);
for (const f of named) assert(onDisk(f), `program or style sound ${f} has samples on disk`);
assert(PROGRAM_FOLDER(40) === 'vsco_violin' && PROGRAM_FOLDER(56) === 'vsco_trumpet' && PROGRAM_FOLDER(58) === 'vsco_tuba' && PROGRAM_FOLDER(13) === 'vsco_xylophone', 'fiddle, trumpet, tuba and xylophone programs reach their sets');

console.log(`Arranger checks passed (${checks} checks; ${chorded.length} chorded tunes in ${Object.keys(page.STYLES).length - 1} styles).`);
