#!/usr/bin/env node
/*
  Grade a folder of ABC tunes and lay them out as a practice sequence.

    node course/analyze-cli.js course/samples
    node course/analyze-cli.js tunes/*.abc --json out/report.json --csv out/features.csv --md out/sequence.md

  Every .abc file given (or found under a folder given) is split at X: fields,
  parsed with the vendored abcjs and analyzed with course/analyze.js. Output:

    stdout       a count of tunes per level and, per level, the easiest tunes
    --json FILE  every tune: its ABC, features, grade and the skills it
                 introduces in the suggested sequence
    --csv FILE   one row per tune, features and rungs, for a spreadsheet
    --md FILE    the suggested sequence as a Markdown table
    --set FILE   write a tune set for the practice board (course/board.html):
                 --per-level N tunes at each level (default 6), taken in
                 sequence order, --skip K skipping the first K at each level
                 so a later set rotates to new tunes; --name "Set title"
    --min N      skip tunes with fewer than N notes (default 4)
    --show N     tunes to list per level on stdout (default 5)
    --ignore D   leave dimensions out of the level, comma separated
                 (e.g. --ignore key,range for a class that transposes
                 and plays piano); they are still measured and reported
*/
const fs = require('fs');
const path = require('path');
const ABCJS = require(path.join(__dirname, '..', 'vendor', 'abcjs-basic-min.js'));
const A = require(path.join(__dirname, 'analyze.js'));

const args = process.argv.slice(2);
const opt = { json: null, csv: null, md: null, set: null, name: null, perLevel: 6, skip: 0, min: 4, show: 5, ignore: [] };
const inputs = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--json' || a === '--csv' || a === '--md' || a === '--set' || a === '--name') opt[a.slice(2)] = args[++i];
  else if (a === '--per-level') opt.perLevel = +args[++i];
  else if (a === '--skip') opt.skip = +args[++i];
  else if (a === '--min' || a === '--show') opt[a.slice(2)] = +args[++i];
  else if (a === '--ignore') opt.ignore = args[++i].split(',').map(s => s.trim()).filter(Boolean);
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^\/\*\n?/, '')); process.exit(0); }
  else inputs.push(a);
}
if (!inputs.length) inputs.push(path.join(__dirname, 'samples'));

function abcFiles(p) {
  const st = fs.statSync(p);
  if (st.isDirectory()) return fs.readdirSync(p).filter(n => !n.startsWith('.')).flatMap(n => abcFiles(path.join(p, n)));
  return /\.abc$/i.test(p) ? [p] : [];
}

const reports = [];
let skipped = 0, failed = 0;
for (const file of inputs.flatMap(abcFiles)) {
  const text = fs.readFileSync(file, 'utf8');
  for (const r of A.analyzeAbc(text, ABCJS, { file: path.relative(process.cwd(), file) }, { ignore: opt.ignore })) {
    if (r.error) { failed++; continue; }
    if (!r.grade || r.features.noteCount < opt.min) { skipped++; continue; }
    reports.push(r);
  }
}
if (!reports.length) { console.error('No tunes found.'); process.exit(1); }

const seq = A.sequence(reports);

// ---- stdout summary ----
const byLevel = new Map();
for (const r of reports) byLevel.set(r.grade.level, (byLevel.get(r.grade.level) || 0) + 1);
for (const d of opt.ignore) if (!A.LATTICE[d]) { console.error(`Unknown dimension "${d}". Dimensions: ${Object.keys(A.LATTICE).join(', ')}`); process.exit(1); }
console.log(`${reports.length} tunes graded${opt.ignore.length ? ` (level ignores ${opt.ignore.join(', ')})` : ''}${skipped ? `, ${skipped} skipped (too short or no key)` : ''}${failed ? `, ${failed} failed to parse` : ''}.\n`);
console.log('Level  Tunes');
for (let l = 1; l <= 6; l++) console.log(`  ${l}    ${String(byLevel.get(l) || 0).padStart(5)}`);
const dims = Object.keys(A.LATTICE);
for (let l = 1; l <= 6; l++) {
  const list = reports.filter(r => r.grade.level === l).sort((a, b) => a.grade.score - b.grade.score).slice(0, opt.show);
  if (!list.length) continue;
  console.log(`\nLevel ${l}`);
  for (const r of list) {
    const f = r.features, g = r.grade;
    const hardest = dims.filter(d => g.rungs[d] === l).map(d => `${d}: ${g.reasons[d]}`).join('; ');
    console.log(`  ${(f.title || '(untitled)').slice(0, 36).padEnd(36)} ${f.keyName.padEnd(5)} ${`${f.metreNum}/${f.metreDen}`.padEnd(5)} ${String(f.barCount).padStart(3)} bars  score ${g.score.toFixed(2).padStart(5)}  ${hardest}`);
  }
}

// ---- files ----
const ensureDir = p => fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
if (opt.json) {
  ensureDir(opt.json);
  fs.writeFileSync(opt.json, JSON.stringify({ generated: new Date().toISOString(), lattice: Object.fromEntries(dims.map(d => [d, A.LATTICE[d].rungs.map(r => r.name)])), tunes: seq }, null, 1));
  console.log(`\nWrote ${opt.json}`);
}
if (opt.csv) {
  ensureDir(opt.csv);
  const cols = ['title', 'file', 'index', 'keyName', 'metreNum', 'metreDen', 'noteCount', 'barCount', 'distinctBars', 'effectiveBars', 'repetition', 'rangeSemitones', 'lowMidi', 'highMidi',
    'degreeCount', 'pitchClasses', 'chromaticClasses', 'chromaticFraction', 'maxLeap', 'meanInterval', 'leapFraction', 'smallestBeatFraction', 'syncopations', 'syncopationFraction',
    'tieCount', 'tieOverBar', 'tripletCount', 'restCount', 'restFraction', 'notesPerBeat', 'pickup', 'repeats', 'chordSymbols', 'keyAccidentals', 'keyChanges', 'metreChanges', 'rhythmRung'];
  const q = v => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const rows = [[...cols, 'level', 'score', ...dims.map(d => 'rung_' + d), 'skills', 'introduces'].join(',')];
  for (const r of seq) rows.push([...cols.map(c => q(typeof r.features[c] === 'number' ? Math.round(r.features[c] * 1000) / 1000 : r.features[c])), r.grade.level, r.grade.score, ...dims.map(d => r.grade.rungs[d]), q(r.features.skills.join(' ')), q(r.introduces.join(' '))].join(','));
  fs.writeFileSync(opt.csv, rows.join('\n') + '\n');
  console.log(`Wrote ${opt.csv}`);
}
if (opt.md) {
  ensureDir(opt.md);
  const lines = ['# Suggested sequence', '', `${seq.length} tunes. Each introduces the skills listed, which no earlier tune asked for.`, '', '| # | Level | Tune | Key | Metre | Bars | Introduces |', '|--:|--:|---|---|---|--:|---|'];
  seq.forEach((r, i) => { const f = r.features; lines.push(`| ${i + 1} | ${r.grade.level} | ${f.title.replace(/\|/g, '/')} | ${f.keyName} | ${f.metreNum}/${f.metreDen} | ${f.barCount} | ${r.introduces.join(', ')} |`); });
  fs.writeFileSync(opt.md, lines.join('\n') + '\n');
  console.log(`Wrote ${opt.md}`);
}
if (opt.set) {
  ensureDir(opt.set);
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const usable = seq.filter(r => r.features.title && !/^missing title/i.test(r.features.title));
  const tunes = [];
  for (let l = 1; l <= 6; l++) {
    for (const r of usable.filter(r => r.grade.level === l).slice(opt.skip, opt.skip + opt.perLevel)) {
      const f = r.features;
      tunes.push({ id: slug(path.basename(f.file, '.abc') + '-' + (f.index + 1) + '-' + f.title), title: f.title, level: l, score: r.grade.score, key: f.keyName, metre: `${f.metreNum}/${f.metreDen}`,
        bars: f.barCount, origin: f.origin || '', composer: f.composer || '', rhythm: f.rhythm || '', source: f.file, skills: f.skills, introduces: r.introduces, abc: r.abc.trim() + '\n' });
    }
  }
  const set = { name: opt.name || `Set of ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, generated: new Date().toISOString().slice(0, 10), perLevel: opt.perLevel, skip: opt.skip,
    levels: Object.fromEntries([1, 2, 3, 4, 5, 6].map(l => [l, dims.filter(d => !opt.ignore.includes(d)).map(d => A.LATTICE[d].rungs[l - 1].name)])), tunes };
  fs.writeFileSync(opt.set, JSON.stringify(set, null, 1));
  console.log(`Wrote ${opt.set}: ${tunes.length} tunes (${[1, 2, 3, 4, 5, 6].map(l => tunes.filter(t => t.level === l).length).join('/')} per level)`);
}
