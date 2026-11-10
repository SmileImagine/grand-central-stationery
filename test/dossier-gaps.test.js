#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Dossiers = require('../course/dossier-gaps.js');

const root = path.resolve(__dirname, '..');
const set = JSON.parse(fs.readFileSync(path.join(root, 'course', 'set.json'), 'utf8'));
const report = Dossiers.buildReport(set, 'course/set.json');
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };

assert(report.tunes.length === set.tunes.length, 'every published tune must appear');
assert(new Set(report.tunes.map(t => t.id)).size === report.tunes.length, 'dossier rows must be unique');
assert(report.required.join(',') === Dossiers.REQUIRED.join(','), 'required fields must remain explicit');
assert(report.tunes.every(t => t.completed + t.missing.length === Dossiers.REQUIRED.length), 'done and missing fields must partition every dossier');
assert(report.queue.length === report.tunes.length, 'priority queue must contain every tune');
assert(report.queue.every((t, i, a) => !i || a[i - 1].priority >= t.priority), 'priority queue must be descending');
assert(report.summary.privateSource === 0, 'published library must not contain private source paths');

const fake = '% dossier-function: game\n% dossier-licence: CC0\nR:round\n';
const fields = Dossiers.dossierFields(fake);
assert(fields.function === 'game' && fields.licence === 'CC0', 'parse explicit dossier fields');
assert(!fields.practice, 'ordinary ABC metadata must not count as an explicit dossier field');
assert(Dossiers.sourceEvidence({ abc: 'S:Song\n', source: 'course/samples/x.abc' }).kind === 'internal container only', 'generic S: must not hide an internal source path');
assert(Dossiers.sourceEvidence({ abc: 'C:Studio (original, CC0)\n', source: 'course/samples/x.abc' }).kind === 'local original', 'a local original may use its repository file as provenance');
assert(Dossiers.sourceEvidence({ abc: 'S:https://example.test/source\n', source: '' }).kind === 'external citation', 'external citation must be recognized');

const markdown = Dossiers.renderMarkdown(report);
const committed = fs.readFileSync(path.join(root, 'course', 'dossier-gaps.md'), 'utf8');
assert(markdown === committed, 'course/dossier-gaps.md is stale');
assert(markdown.includes('editorial seeds'), 'report must distinguish seeds from claims');
assert(markdown.includes('Do not turn a country into a cultural identity'), 'report must retain the non-inference rule');

console.log(`Dossier-gap checks passed (${checks} checks; ${report.tunes.length} tunes).`);
