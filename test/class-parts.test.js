#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Parts = require('../course/class-parts.js');

const root = path.resolve(__dirname, '..');
const set = JSON.parse(fs.readFileSync(path.join(root, 'course', 'set.json'), 'utf8'));
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

const markdown = Parts.renderMarkdown(report);
const committed = fs.readFileSync(path.join(root, 'course', 'class-parts.md'), 'utf8');
assert(markdown === committed, 'course/class-parts.md is stale');
assert(markdown.includes('not finished arrangements'), 'report must state its safety boundary');
assert(markdown.includes('needs harmony review'), 'report must expose the harmony queue');

console.log(`Class-part checks passed (${checks} checks; ${report.tunes.length} tunes).`);
