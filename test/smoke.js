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

const set = JSON.parse(fs.readFileSync(path.join(root, 'course/set.json'), 'utf8'));
assert(set.tunes.length === 45, `expected 45 published tunes, found ${set.tunes.length}`);
assert(new Set(set.tunes.map(t => t.id)).size === set.tunes.length, 'published tune IDs are not unique');
assert(!set.tunes.some(t => /\bsketch\b/i.test(`${t.title}\n${t.abc}`)), 'a sketch remains in the published set');

const sampleText = files.filter(f => f.includes(`${path.sep}course${path.sep}samples${path.sep}`) && f.endsWith('.abc')).map(f => fs.readFileSync(f, 'utf8')).join('\n');
assert(!/\bA SKETCH\b|\(sketch\)/i.test(sampleText), 'a marked sketch remains in course/samples');

const main = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const token of ['course/holding/board.html', 'lab/Play%20Along%20v1.html', 'class="tbtn play clock"', 'class="playmark"', 'class="dep-tempo"', 'class="lintmirror"', 'class="linttip warn" popover="manual"', 'class="nextup"', 'data-nota="staff"', 'stringglow', 'this.lastHand = ', 'course/library.html', 'case \'room\'']) assert(main.includes(token), `main page is missing ${token}`);
assert(fs.existsSync(path.join(root, 'lab/Play Along v1.html')), 'Play Along lab is missing');

console.log(`Smoke checks passed (${checks} checks; ${set.tunes.length} published tunes; ${holding.stdout.trim().split(" ")[0]} workshop items).`);
