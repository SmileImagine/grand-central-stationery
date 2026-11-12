#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Fit = require('../course/classroom-fit.js');

const root = path.resolve(__dirname, '..');
const PS = require('./published-set.js')(); if (!PS) require('./published-set.js').skip(__filename.split('/').pop());
const set = PS.set;
const report = Fit.buildReport(set, 'course/set.json');
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };

assert(report.tunes.length === set.tunes.length, 'every published tune must be reported');
assert(new Set(report.tunes.map(t => t.id)).size === report.tunes.length, 'reported tune IDs must be unique');

for (const tune of report.tunes) for (const profile of Fit.PROFILES) {
  const fit = tune.fits[profile.id];
  if (fit.possible) {
    assert(Number.isInteger(fit.transpose) && Math.abs(fit.transpose) <= Fit.MAX_TRANSPOSE, `${tune.title}/${profile.id}: invalid transposition`);
    assert(fit.low >= profile.low && fit.high <= profile.high, `${tune.title}/${profile.id}: suggestion does not fit`);
    assert(fit.fitsAsWritten === (fit.transpose === 0), `${tune.title}/${profile.id}: as-written flag disagrees`);
  } else {
    const any = Array.from({ length: Fit.MAX_TRANSPOSE * 2 + 1 }, (_, i) => i - Fit.MAX_TRANSPOSE)
      .some(n => tune.low + n >= profile.low && tune.high + n <= profile.high);
    assert(!any, `${tune.title}/${profile.id}: a valid transposition was missed`);
  }
}

const markdown = Fit.renderMarkdown(report);
const committed = fs.readFileSync(path.join(root, 'course', 'classroom-fit.md'), 'utf8');
assert(markdown === committed, 'course/classroom-fit.md is stale');
assert(report.profiles.find(p => p.id === 'voice').asWritten > 0, 'expected some tunes to fit young voices as written');
assert(report.profiles.find(p => p.id === 'voice').unavailable > 0, 'expected the report to expose some tunes too wide for young voices');
assert(Fit.bestFit(59, 67, Fit.PROFILES[0], 'C').transpose === 5, 'an out-of-range C tune should prefer readable F over C-sharp');
assert(Fit.bestFit(60, 67, Fit.PROFILES[0], 'C').transpose === 0, 'a written key that fits must stay put');

console.log(`Classroom fit checks passed (${checks} checks; ${report.tunes.length} tunes, ${Fit.PROFILES.length} profiles).`);
