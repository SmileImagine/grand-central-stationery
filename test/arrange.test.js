#!/usr/bin/env node
'use strict';
// The arranger in each style: the chords it adds belong to that style's harmony.
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
const names = ['PC_COLORS', 'LETTER_PC', 'ACC_SEMI', 'SHARP_NAMES', 'collect', 'spell', 'chordPcs', 'tuneBars', 'keyInfoOf', 'melodyChordFinder', 'arrange', 'STYLES', 'harmonyOf'];
const page = new Function(`${names.map(lift).join('\n')}\nreturn { ${names.filter(n => n !== 'SHARP_NAMES').join(', ')}, FLAT_NAMES, SHARP_NAMES };`)();
const { chordPcs, arrange, harmonyOf, keyInfoOf } = page;

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
  const tunes = JSON.parse(fs.readFileSync(path.join(root, 'course/set.json'), 'utf8')).tunes;
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

const set = JSON.parse(fs.readFileSync(path.join(root, 'course/set.json'), 'utf8')).tunes;
const tuneAbc = id => set.find(t => t.id === id).abc;
const chorded = set.filter(t => /"[A-G]/.test(t.abc));

for (const t of chorded) for (const style of Object.keys(page.STYLES).filter(k => k !== 'auto')) {
  const { lines, ch, added } = arrangeIn(t.abc, style);
  const where = `${t.id} in ${style}`;
  assert(lines.length === 5 && lines.every(l => /^%%band [1-5]: energy=\d+ detail=\d+ seed=\d+( \|.*\|)?$/.test(l)), `${where}: five chart lines\n${lines.join("\n")}`);
  for (const c of added) assert(chordPcs(c), `${where}: "${c}" is a chord`);
  const h = harmonyOf(style);
  if (h.moves === false) assert(ch.every(c => c === null), `${where}: a drone writes no chord changes`);
  if (style === 'jig') for (const c of added) assert(/^[A-G][#b]?m?$/.test(c), `${where}: a jig adds only plain triads, not ${c}`);
  if (['folk', 'march', 'waltz'].includes(style)) for (const c of added) assert(/^[A-G][#b]?(7)?$/.test(c), `${where}: ${style} adds only major triads and dominant sevenths, not ${c}`);
  if (style === 'pop') for (const c of added) assert(!/7/.test(c), `${where}: pop adds no sevenths, not ${c}`);
  if (style === 'ballad') for (const c of added) assert(!/^([A-G][#b]?)7$/.test(c) || ch[2].includes(c) || ch[1].includes(c) || ch[4].includes(c), `${where}: ${c}`);
  if (!['swing', 'bossa'].includes(style)) assert(!/6/.test([...added].join(' ')) || style === 'swing', `${where}: sixths are swing's`);
}

// The styles sound different from one another on the same tune: Soldier's Joy, already full of secondary dominants.
const joy = tuneAbc('reelsr-t-49-soldiers-joy');
const by = Object.fromEntries(['pop', 'folk', 'jig', 'swing', 'bossa', 'ballad'].map(s => [s, arrangeIn(joy, s)]));
const list = r => [...r.added].join(' ');
assert([...by.swing.added].some(c => /6$/.test(c)), `swing gives the tonic a sixth: ${list(by.swing)}`);
assert([...by.bossa.added].some(c => /maj7$/.test(c)), `bossa gives a major seventh: ${list(by.bossa)}`);
assert(![...by.jig.added].some(c => /7/.test(c)), `a jig has no sevenths: ${list(by.jig)}`);
assert([...by.pop.added].some(c => /add9$/.test(c)), `pop gives an add9: ${list(by.pop)}`);
assert(new Set(['pop', 'folk', 'jig', 'swing', 'bossa'].map(k => by[k].lines.slice(1, 4).join('\n'))).size === 5, 'pop, folk, jig, swing and bossa arrange Soldier\'s Joy five ways');

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

console.log(`Arranger checks passed (${checks} checks; ${chorded.length} chorded tunes in ${Object.keys(page.STYLES).length - 1} styles).`);
