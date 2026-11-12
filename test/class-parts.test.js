#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Parts = require('../course/class-parts.js');

const root = path.resolve(__dirname, '..');
const PS = require('./published-set.js')(); if (!PS) require('./published-set.js').skip(__filename.split('/').pop());
const set = PS.set;
const report = Parts.buildReport(set, 'course/set.json');
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };

assert(report.tunes.length === set.tunes.length, 'every published tune must have a class-part row');
assert(new Set(report.tunes.map(t => t.id)).size === report.tunes.length, 'class-part IDs must be unique');
assert(report.tunes.every(t => t.musicMinusOne.bodyPercussion === 'mute band drums'), 'percussion must replace drums');
assert(report.tunes.every(t => t.musicMinusOne.bassOstinato === 'mute band bass'), 'ostinato must replace bass');
assert(report.tunes.every(t => t.musicMinusOne.ukulele === 'mute band chords'), 'ukulele must replace comping chords');
assert(report.tunes.filter(t => !t.writtenChords.length).every(t => t.ukuleleStatus === 'needs harmony review'), 'missing harmony must not become an invented ukulele chart');

for (const [num, den, compound] of [[2, 4, false], [3, 4, false], [4, 4, false], [6, 8, true], [9, 8, true], [12, 8, true]]) {
  const recipe = Parts.metreRecipe(num, den, compound);
  assert(recipe && recipe.pulses * recipe.duration === recipe.units, `${num}/${den}: pulse cell must fill one bar`);
}

assert(Parts.transposeChord('C', 2) === 'D', 'transpose a plain chord');
assert(Parts.transposeChord('Bbmaj7/D', 2) === 'Cmaj7/E', 'transpose chord root and slash bass');
assert(Parts.chordSymbols('K:C\n"C"C "not a chord" D "G7/B"E').join(',') === 'C,G7/B', 'extract only chord symbols');
assert(report.summary.withWrittenHarmony + report.summary.withoutWrittenHarmony === set.tunes.length, 'harmony summary must partition the library');
assert(report.summary.generatedBodyCells === set.tunes.length, 'every current metre should receive a body-percussion cell');
assert(report.summary.generatedBassCells === set.tunes.length, 'every current key/metre should receive a bass recipe');

// Rounds: the course's copy of the page's round scoring must agree with index.html's, tune by tune.
const vm = require('vm');
const Rounds = require('../course/round-fit.js');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const pick = re => { const m = re.exec(page); assert(m, `index.html must define ${re}`); return m[0]; };
const sandbox = {};
vm.runInNewContext(pick(/const ROUND_COST = .*?;\n/) + pick(/function roundFit\([\s\S]*?\n    }\n/) + pick(/function roundPlan\([\s\S]*?\n    }\n/) + 'this.roundFit = roundFit; this.roundPlan = roundPlan; this.ROUND_COST = ROUND_COST;', sandbox);
assert(JSON.stringify(sandbox.ROUND_COST) === JSON.stringify(Rounds.ROUND_COST), 'round interval costs must match index.html');
for (const tune of set.tunes) {
  const tl = Rounds.timeline(tune.abc); if (!tl) continue;
  const bars = Math.max(1, Math.round(tl.total / tl.barMs));
  for (const groups of [2, 3, 4]) for (const written of [null, 1, 2]) {
    const run = (F, P) => JSON.stringify(P((e, n) => F(tl.events, tl.total, e * tl.barMs, n, tl.beatMs, tl.bars, tl.firstBar), bars, groups, written));
    assert(run(Rounds.roundFit, Rounds.roundPlan) === run(sandbox.roundFit, sandbox.roundPlan), `${tune.id}: round plan for ${groups} groups (every=${written}) must match index.html`);
  }
}
const row = title => report.tunes.find(t => t.title === title);
assert(row('Frère Jacques').round.kind === 'round' && row('Frère Jacques').round.every === 2, 'Frère Jacques must be a round with entries two bars apart');
assert(row('Engine, Engine, Number Nine').round.kind === 'unison', 'a so-mi chant must be named as mostly unison, not a round');
assert(row('Skip to My Lou').round.kind === 'no', 'Skip to My Lou does not work as a round');
assert(report.tunes.filter(t => t.round.line).every(t => /^%%round [234] every=\d+$/.test(t.round.line)), 'a suggested round line must be one the page reads');

const markdown = Parts.renderMarkdown(report);
const committed = fs.readFileSync(path.join(root, 'course', 'class-parts.md'), 'utf8');
assert(markdown === committed, 'course/class-parts.md is stale');
assert(markdown.includes('not finished arrangements'), 'report must state its safety boundary');
assert(markdown.includes('needs harmony review'), 'report must expose the harmony queue');

console.log(`Class-part checks passed (${checks} checks; ${report.tunes.length} tunes).`);
