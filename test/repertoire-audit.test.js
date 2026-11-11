#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Audit = require('../course/repertoire-audit.js');

const root = path.resolve(__dirname, '..');
const report = Audit.buildReport(Audit.readRecords(root));
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };

const itemFiles = ['holding', 'review'].flatMap(queue => fs.readdirSync(path.join(root, 'course', queue, 'items')).filter(file => file.endsWith('.abc')));
assert(report.records.length === itemFiles.length, 'every private repertoire record must be audited');
assert(report.summary.completeCore < report.summary.total, 'the report must keep incomplete dossiers visible');
assert(report.summary.classroomPassed === 0, 'no human classroom/cultural review has been recorded as passed');
assert(report.summary.reviewPackets === 2, 'the Sansa and Ilocos Sur packets must be counted separately from completed human review');

const sansa = report.records.find(record => record.id === 'sansa-akroma');
assert(sansa && sansa.queue === 'holding', 'Sansa Akroma must remain in the workshop');
assert(sansa.missing.length === 0, 'Sansa Akroma must have all seven core dossier fields');
assert(sansa.origin === 'Ghana' && sansa.rhythm === 'singing game', 'Sansa Akroma coverage must come from explicit fields');
assert(sansa.hasHowRead && sansa.hasUncertain && sansa.hasRange, 'Sansa Akroma must carry plate, uncertainty and range records');
assert(sansa.reviewStatus === 'packet-ready' && sansa.reviewPacket, 'Sansa Akroma must link its prepared human-review packet');
assert(fs.existsSync(path.join(root, 'course', 'holding', sansa.reviewPacket)), 'Sansa Akroma review packet link must resolve');

const goLeMimli = report.records.find(record => record.id === 'go-le-mimli');
assert(goLeMimli && goLeMimli.queue === 'holding', 'Go le mimli must remain in the workshop');
assert(goLeMimli.missing.length === 0, 'Go le mimli must have all seven core dossier fields');
assert(/^Ghana \(Volta Region, Èwè-Dòmè\)$/.test(goLeMimli.origin) && goLeMimli.rhythm === 'storytelling teaching song', 'Go le mimli coverage must come from its explicit community and function fields');
assert(goLeMimli.hasHowRead && goLeMimli.hasUncertain && goLeMimli.hasRange, 'Go le mimli must carry plate, uncertainty and range records');
assert(goLeMimli.classroomCheck !== 'passed', 'Go le mimli must not imply that cultural or classroom review occurred');
assert(/%%band drums: ~\n%%band bass: ~\n%%band chords: ~/.test(goLeMimli.abc), 'Go le mimli must not generate harmony or an inferred regional drum part');
assert((goLeMimli.abc.match(/^V:[123]\b/gm) || []).length === 3 && /\[V:3\][\s\S]*z6 \|\]/.test(goLeMimli.abc), 'Go le mimli must retain the source melody and both clapping layers');

const riceSong = report.records.find(record => record.id === 'i-plant-some-rice');
assert(riceSong && riceSong.queue === 'holding', 'I Plant Some Rice must remain in the workshop');
assert(riceSong.missing.length === 0, 'I Plant Some Rice must have all seven core dossier fields');
assert(/^Philippines \(Ilocos Sur, Ilocano\)$/.test(riceSong.origin) && riceSong.rhythm === "children's action song", 'I Plant Some Rice coverage must come from explicit origin and function fields');
assert(riceSong.hasHowRead && riceSong.hasUncertain && riceSong.hasRange, 'I Plant Some Rice must carry plate, uncertainty and range records');
assert(riceSong.reviewStatus === 'packet-ready' && riceSong.reviewPacket, 'I Plant Some Rice must link its prepared human-review packet');
assert(fs.existsSync(path.join(root, 'course', 'holding', riceSong.reviewPacket)), 'I Plant Some Rice review packet link must resolve');
assert(riceSong.classroomCheck !== 'passed', 'I Plant Some Rice must not imply that Ilocano or classroom review occurred');
assert(/%%band drums: ~\n%%band bass: ~\n%%band chords: ~/.test(riceSong.abc), 'I Plant Some Rice must not generate harmony or inferred Philippine accompaniment');
assert(/historical schoolbook's English adaptation, not as authenticated traditional Ilocano text/i.test(riceSong.abc), 'I Plant Some Rice must distinguish the English adaptation from authenticated Ilocano words');

for (const record of report.records.filter(record => record.sourceCheck === 'verified')) {
  assert(record.missing.length === 0, `${record.title}: verified source check needs all core dossier fields`);
  assert(record.source && record.sourceUrls.some(link => /^https:\/\//.test(link.url)), `${record.title}: verified source check needs citation and stable link`);
  assert(record.hasHowRead && record.hasUncertain, `${record.title}: verified source check needs HOW READ and UNCERTAIN`);
  assert(record.hasRange, `${record.title}: verified source check needs classroom range or rehearsal-key guidance`);
}

const markdown = Audit.renderMarkdown(report);
assert(markdown === fs.readFileSync(path.join(root, 'course', 'repertoire-audit.md'), 'utf8'), 'course/repertoire-audit.md is stale');
console.log(`Private repertoire audit checks passed (${checks} checks; ${report.records.length} records).`);
