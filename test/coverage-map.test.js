#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Coverage = require('../course/coverage-map.js');

const root = path.resolve(__dirname, '..');
const set = JSON.parse(fs.readFileSync(path.join(root, 'course', 'set.json'), 'utf8'));
const report = Coverage.buildReport(set, 'course/set.json');
const pipeline = Coverage.buildPipeline(root);
const runway = Coverage.launchRunway(report, pipeline);
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };

assert(report.tunes.length === set.tunes.length, 'every published tune must be mapped');
assert(report.regions.reduce((sum, region) => sum + report.matrix[region].total, 0) === report.tunes.length, 'region totals must equal the tune set');
assert(report.tunes.find(t => t.id === 'hindostan-1-bhup').region === 'South Asia', 'Bhup must map from its explicit India origin to South Asia');
assert(report.tunes.find(t => t.id === 'beginner-songs-4-bounce-high-bounce-low').region === 'North America (general)', 'USA must remain general North America');
assert(Coverage.regionOf('Canada') !== 'North American Indigenous', 'a country alone must not imply Indigenous identity');
assert(Coverage.regionOf('Ojibwe, Canada') === 'North American Indigenous', 'an explicitly named Indigenous identity must win over country');
assert(report.matrix['North American Indigenous'].total === 0, 'the current set must expose its Indigenous coverage gap');
// The South Asian lullabies (Rama's, Nirguna's) are in the review queue, so the map counts none; it must still read the type.
assert(Coverage.functionOf('lullaby') === 'lullaby', 'a lullaby rhythm must map to the lullaby function');
assert(report.matrix['South Asia'].functions.lullaby === report.tunes.filter(t => t.region === 'South Asia' && t.function === 'lullaby').length, 'South Asia lullabies must match the published set');
// Gaps are counted, never hidden: some Nottingham reels name no origin; every published tune now names its type.
assert(report.summary.missingOrigin > 0 && Number.isInteger(report.summary.missingFunction) && report.summary.missingFunction >= 0, 'missing metadata must remain visible');
assert(pipeline.records.find(record => record.id === 'sansa-akroma').region === 'West Africa', 'Sansa Akroma must fill the private West African pipeline only from its explicit Ghana origin');
assert(pipeline.records.find(record => record.id === 'sansa-akroma').function === 'game song', 'Sansa Akroma must fill the private game-song function from its explicit R field');
assert(pipeline.records.find(record => record.id === 'go-le-mimli').region === 'West Africa', 'Go le mimli must fill the private West African pipeline from its explicit Ghana origin');
assert(pipeline.records.find(record => record.id === 'go-le-mimli').function === 'song or air', 'Go le mimli must fill a distinct private teaching/storytelling song function');
assert(pipeline.matrix['West Africa'].holding >= 2, 'the private pipeline must expose both West African candidates');
assert(pipeline.matrix['West Africa'].functions['game song'] >= 1 && pipeline.matrix['West Africa'].functions['song or air'] >= 1, 'West Africa must show two distinct private classroom functions');
const riceSong = pipeline.records.find(record => record.id === 'i-plant-some-rice');
assert(riceSong && riceSong.region === 'Southeast Asia', 'I Plant Some Rice must fill the private Southeast Asian pipeline only from its explicit Philippine origin');
assert(riceSong.function === 'song or air', 'I Plant Some Rice must expose its explicit action-song function without being promoted to a published tune');
assert(pipeline.matrix['Southeast Asia'].holding >= 1 && pipeline.matrix['Southeast Asia'].review === 0, 'the Southeast Asian candidate must remain in the private workshop');
const aloha = pipeline.records.find(record => record.id === 'aloha-oe');
assert(aloha && aloha.region === 'Pacific', 'Aloha ʻOe must fill the private Pacific pipeline only from its explicit Hawaiʻi origin');
assert(aloha.function === 'song or air', 'Aloha ʻOe must expose its stated composed-song function');
const usagi = pipeline.records.find(record => record.id === 'usagi-to-kame');
assert(usagi && usagi.region === 'East Asia', 'Usagi to Kame must fill the private East Asian pipeline only from its explicit Japan origin');
assert(usagi.function === 'song or air', 'Usagi to Kame must expose its stated teaching-song function');
const freeze = pipeline.records.find(record => record.id === 'freeze-on-one');
assert(freeze && freeze.generated === true, 'Freeze on One must be explicitly counted as generated');
assert(report.tunes.filter(tune => tune.generated).length === 42, 'the published set must keep its forty-two explicit course originals (three, then thirty-nine listening bridges on 12 November 2026)');
assert(pipeline.records.find(record => record.id === 'black-hills-powwow-song').kind === 'fragment', 'incomplete recordings must retain their fragment identity');
const publishedIds = new Set(report.tunes.map(tune => tune.id));
const completeWorkshop = pipeline.records.filter(record => record.queue === 'holding' && record.kind !== 'fragment' && record.kind !== 'link' && (!record.compositionDraft || record.status === 'ready') && !publishedIds.has(record.id) && !record.published);
assert(pipeline.records.filter(record => record.published).every(record => publishedIds.has(record.published)), 'every record marked published must name a tune in the published set');
assert(runway.total === report.tunes.length + completeWorkshop.length, 'launch runway must count each published or launch-eligible workshop tune exactly once');
assert(runway.generated === report.tunes.filter(tune => tune.generated).length + completeWorkshop.filter(record => record.generated).length, 'launch runway must count every launch-eligible generated tune exactly once');
assert(pipeline.records.filter(record => record.compositionDraft && record.status !== 'ready').length >= 30, 'the Ontario composition batch must remain outside the launch runway until its review gates pass');
assert(runway.remaining === Math.max(0, runway.target - runway.total), 'launch runway remaining count must follow the target');
// The 25% allowance on generated works was lifted on 12 November 2026: the share is reported, never capped.
assert(runway.maxGenerated === undefined && Math.abs(runway.generatedShare - runway.generated / runway.total) < 1e-12, 'launch runway reports the generated share without a cap');

for (const region of report.regions) {
  const row = report.matrix[region];
  assert(Object.values(row.levels).reduce((a, b) => a + b, 0) === row.total, `${region}: level counts do not total`);
  assert(Object.values(row.functions).reduce((a, b) => a + b, 0) === row.total, `${region}: function counts do not total`);
}

assert(Coverage.renderMarkdown(report, pipeline) === fs.readFileSync(path.join(root, 'course', 'coverage-map.md'), 'utf8'), 'course/coverage-map.md is stale');
console.log(`Coverage map checks passed (${checks} checks; ${report.tunes.length} tunes, ${report.regions.length} regions).`);
