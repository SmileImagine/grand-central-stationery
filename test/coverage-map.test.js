#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Coverage = require('../course/coverage-map.js');

const root = path.resolve(__dirname, '..');
const set = JSON.parse(fs.readFileSync(path.join(root, 'course', 'set.json'), 'utf8'));
const report = Coverage.buildReport(set, 'course/set.json');
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };

assert(report.tunes.length === set.tunes.length, 'every published tune must be mapped');
assert(report.regions.reduce((sum, region) => sum + report.matrix[region].total, 0) === report.tunes.length, 'region totals must equal the tune set');
assert(report.tunes.find(t => t.id === 'hindostan-1-bhup').region === 'South Asia', 'Bhup must map from its explicit India origin to South Asia');
assert(report.tunes.find(t => t.id === 'beginner-songs-4-bounce-high-bounce-low').region === 'North America (general)', 'USA must remain general North America');
assert(Coverage.regionOf('Canada') !== 'North American Indigenous', 'a country alone must not imply Indigenous identity');
assert(Coverage.regionOf('Ojibwe, Canada') === 'North American Indigenous', 'an explicitly named Indigenous identity must win over country');
assert(report.matrix['North American Indigenous'].total === 0, 'the current set must expose its Indigenous coverage gap');
assert(report.matrix['South Asia'].functions.lullaby > 0, 'the South Asia lullaby must be represented');
assert(report.summary.missingOrigin > 0 && report.summary.missingFunction > 0, 'missing metadata must remain visible');

for (const region of report.regions) {
  const row = report.matrix[region];
  assert(Object.values(row.levels).reduce((a, b) => a + b, 0) === row.total, `${region}: level counts do not total`);
  assert(Object.values(row.functions).reduce((a, b) => a + b, 0) === row.total, `${region}: function counts do not total`);
}

assert(Coverage.renderMarkdown(report) === fs.readFileSync(path.join(root, 'course', 'coverage-map.md'), 'utf8'), 'course/coverage-map.md is stale');
console.log(`Coverage map checks passed (${checks} checks; ${report.tunes.length} tunes, ${report.regions.length} regions).`);
