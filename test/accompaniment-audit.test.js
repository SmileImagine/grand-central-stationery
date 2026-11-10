#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const Audit = require('../course/accompaniment-audit.js');

const root = path.resolve(__dirname, '..');
const set = JSON.parse(fs.readFileSync(path.join(root, 'course', 'set.json'), 'utf8'));
const report = Audit.buildReport(set, 'course/set.json');
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };

// Run index.html's own styleFor so the report is about actual playback, not a
// second interpretation that merely resembles it.
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').split('\n');
function lift(name) {
  const start = html.findIndex(line => new RegExp(`^    (function ${name}\\(|const ${name}\\b)`).test(line));
  if (start < 0) throw new Error(`index.html has no top-level ${name}`);
  if (/;\s*$/.test(html[start]) && !/[{[(]\s*$/.test(html[start])) return html[start];
  let end = start + 1; while (end < html.length && !/^    [}\]];?\s*$/.test(html[end])) end++;
  return html.slice(start, end + 1).join('\n');
}
const pageStyleFor = new Function(`${lift('STYLES')}\n${lift('LEGACY_STYLE')}\n${lift('styleFor')}\nreturn styleFor;`)();

assert(report.tunes.length === set.tunes.length, 'every published tune must be audited');
assert(new Set(report.tunes.map(t => t.id)).size === report.tunes.length, 'audited tune IDs must be unique');
for (const tune of set.tunes) {
  const item = report.tunes.find(t => t.id === tune.id);
  assert(item.style === pageStyleFor('auto', tune.abc), `${tune.title}: audit style ${item.style} differs from page ${pageStyleFor('auto', tune.abc)}`);
}

for (const tune of set.tunes.filter(t => /(?:^|\/)reels[^/]*\.abc$/i.test(t.source || ''))) {
  assert(Audit.styleDecision(tune.abc).style === 'folk', `${tune.title}: an imported reel must not fall through to pop`);
  assert(/^R:\s*reel$/mi.test(tune.abc), `${tune.title}: imported reel lacks its R field`);
}
const morris = set.tunes.find(t => /(?:^|\/)morris\.abc$/i.test(t.source || ''));
assert(morris && Audit.styleDecision(morris.abc).style === 'folk', 'the Morris tune must use the folk accompaniment');

const nottingham = set.tunes.filter(t => /%\s*Nottingham Music Database/i.test(t.abc));
assert(nottingham.length > 0, 'expected imported Nottingham tunes');
for (const tune of nottingham) {
  assert(tune.source.startsWith(Audit.NOTTINGHAM_ROOT), `${tune.title}: source is not the canonical Nottingham repository file`);
  assert(Audit.NOTTINGHAM_FILES.has(path.basename(tune.source)), `${tune.title}: source names an unknown Nottingham file`);
  assert(tune.licence === 'GPL-3.0', `${tune.title}: repository licence is not explicit`);
}
assert(!set.tunes.some(t => /private\/tmp|scratchpad/i.test(t.source || '')), 'published set contains a private scratch source path');
assert(report.summary.temporaryPaths === 0 && report.summary.canonicalNottinghamSources === nottingham.length, 'source repair summary is wrong');

const markdown = Audit.renderMarkdown(report);
assert(markdown === fs.readFileSync(path.join(root, 'course', 'accompaniment-audit.md'), 'utf8'), 'course/accompaniment-audit.md is stale');
assert(report.summary.harmony['written chords'] > 0 && report.summary.harmony['detected chords'] > 0 && report.summary.harmony['tonic drone'] > 0, 'audit must distinguish written, detected and drone harmony');

console.log(`Accompaniment audit checks passed (${checks} checks; ${report.tunes.length} tunes).`);
