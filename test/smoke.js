#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const skip = new Set(['.git', '.claude', 'vendor', 'old']);
const files = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory() && skip.has(ent.name)) continue;
    const file = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(file); else files.push(file);
  }
}
walk(root);

let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };
const rel = file => path.relative(root, file);

for (const file of files.filter(f => f.endsWith('.json'))) {
  JSON.parse(fs.readFileSync(file, 'utf8')); checks++;
}

for (const file of files.filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(file, 'utf8'); let n = 0;
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attrs = match[1];
    if (/\bsrc\s*=/.test(attrs) || /\btype\s*=\s*["'](?!text\/javascript|application\/javascript)/i.test(attrs)) continue;
    if (match[2].trim()) new vm.Script(match[2], { filename: `${rel(file)} inline script ${++n}` });
  }
  checks++;
}

const holding = spawnSync(process.execPath, ['course/holding/build.js', '--check'], { cwd: root, encoding: 'utf8' });
assert(holding.status === 0, holding.stderr || holding.stdout || 'holding board is stale');
const sets = spawnSync(process.execPath, ['course/build-sets.js', '--check'], { cwd: root, encoding: 'utf8' });
assert(sets.status === 0, sets.stderr || sets.stdout || 'course/sets.js is stale');

const arranger = spawnSync(process.execPath, ['test/arrange.test.js'], { cwd: root, encoding: 'utf8' });
assert(arranger.status === 0, arranger.stderr || arranger.stdout || 'arranger checks failed');
const review = spawnSync(process.execPath, ['course/review/build.js', '--check'], { cwd: root, encoding: 'utf8' });
assert(review.status === 0, review.stderr || review.stdout || 'review queue is stale');
const classroomFit = spawnSync(process.execPath, ['test/classroom-fit.test.js'], { cwd: root, encoding: 'utf8' });
assert(classroomFit.status === 0, classroomFit.stderr || classroomFit.stdout || 'classroom range checks failed');
const classParts = spawnSync(process.execPath, ['test/class-parts.test.js'], { cwd: root, encoding: 'utf8' });
assert(classParts.status === 0, classParts.stderr || classParts.stdout || 'class-part checks failed');
const dossierGaps = spawnSync(process.execPath, ['test/dossier-gaps.test.js'], { cwd: root, encoding: 'utf8' });
assert(dossierGaps.status === 0, dossierGaps.stderr || dossierGaps.stdout || 'dossier gap checks failed');
const accompanimentAudit = spawnSync(process.execPath, ['test/accompaniment-audit.test.js'], { cwd: root, encoding: 'utf8' });
assert(accompanimentAudit.status === 0, accompanimentAudit.stderr || accompanimentAudit.stdout || 'accompaniment audit checks failed');
const coverageMap = spawnSync(process.execPath, ['test/coverage-map.test.js'], { cwd: root, encoding: 'utf8' });
assert(coverageMap.status === 0, coverageMap.stderr || coverageMap.stdout || 'coverage map checks failed');
const set = JSON.parse(fs.readFileSync(path.join(root, 'course/set.json'), 'utf8'));
// A piece in the review queue is out of circulation, not lost: the published set and the queue's published pieces
// still make the 45 tunes, and the workshop and the queue's workshop pieces the 13 items.
const queue = JSON.parse(fs.readFileSync(path.join(root, 'course/review/index.json'), 'utf8')).items;
const inReview = from => queue.filter(it => it.from === from).length;
assert(set.tunes.length + inReview('published') === 45, `expected 45 tunes published or in review, found ${set.tunes.length} + ${inReview('published')}`);
assert(!set.tunes.some(t => queue.some(it => it.id === t.id)), 'a piece is both published and in the review queue');
// The set builder leaves every queued tune out, so a regenerated set cannot bring one back from course/samples.
const os = require('os'), trial = path.join(os.tmpdir(), `gcs-set-trial-${process.pid}.json`);
const built = spawnSync(process.execPath, ['course/analyze-cli.js', '--set', trial], { cwd: root, encoding: 'utf8' });
assert(built.status === 0, built.stderr || 'the set builder failed');
const trialIds = JSON.parse(fs.readFileSync(trial, 'utf8')).tunes.map(t => t.id); fs.unlinkSync(trial);
const leaked = trialIds.filter(id => queue.some(it => it.id === id));
assert(!leaked.length, `the set builder would publish queued tunes: ${leaked.join(', ')}`);
assert(new Set(set.tunes.map(t => t.id)).size === set.tunes.length, 'published tune IDs are not unique');
assert(!set.tunes.some(t => /\bsketch\b/i.test(`${t.title}\n${t.abc}`)), 'a sketch remains in the published set');
for (const [id, key, abcKey] of [
  ['hindostan-folk-1-o-give-me-those-pretty-eyes', 'GDor', 'Gdor'],
  ['hindostan-folk-2-mother-send-to-the-dhobi', 'BPhr', 'Bphr'],
  ['hindostan-folk-3-o-where-will-you-go', 'GDor', 'Gdor'],
]) {
  const tune = set.tunes.find(t => t.id === id);
  assert(tune && tune.key === key && tune.abc.includes(`\nK:${abcKey}\n`), `${id} must encode its declared tonic and modal signature`);
}

const sampleText = files.filter(f => f.includes(`${path.sep}course${path.sep}samples${path.sep}`) && f.endsWith('.abc')).map(f => fs.readFileSync(f, 'utf8')).join('\n');
assert(!/\bA SKETCH\b|\(sketch\)/i.test(sampleText), 'a marked sketch remains in course/samples');

const main = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const token of ['course/holding/board.html', 'lab/Play%20Along%20v1.html', 'class="tbtn play clock"', 'class="playmark"', 'class="dep-tempo"', 'class="lintmirror"', 'class="linttip warn" popover="manual"', 'class="nextup"', 'data-nota="staff"', 'stringglow', 'this.lastHand = ', 'keysByPitch', '12-tone approximation', 'firmer air / leak', 'course/library.html', 'case \'room\'']) assert(main.includes(token), `main page is missing ${token}`);
assert(fs.existsSync(path.join(root, 'lab/Play Along v1.html')), 'Play Along lab is missing');

const workshop = JSON.parse(fs.readFileSync(path.join(root, 'course/holding/index.json'), 'utf8')).items.length;
assert(workshop + inReview('holding') === 16, `expected 16 workshop items in the workshop or in review, found ${workshop} + ${inReview('holding')}`);
console.log(`Smoke checks passed (${checks} checks; ${set.tunes.length} published tunes; ${workshop} workshop items; ${queue.length} in review).`);
