#!/usr/bin/env node
/*
  Grade drum patterns and write a rhythm set for the lab and the board.

    node course/rhythm-cli.js course/rhythms                      text files (*.rhythms.txt)
    node course/rhythm-cli.js --groovesteps path/drum_patterns.json
    node course/rhythm-cli.js --groove path/to/groove            the Groove MIDI Dataset folder (info.csv inside)
    node course/rhythm-cli.js course/rhythms --groove ~/groove --groovesteps ~/drum_patterns.json --json course/rhythm-set.json

  A .rhythms.txt file holds patterns separated by blank lines, each with a
  title: line and the lab's part lines. --ignore tempo leaves tempo out of the
  level. --per N keeps at most N Groove MIDI patterns per style. --show N
  lists N per level.
*/
const fs = require('fs'), path = require('path');
const R = require('./rhythm-analyze.js');

const args = process.argv.slice(2), opts = { paths: [], ignore: [], per: 12, show: 3 };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--groove') opts.groove = args[++i];
  else if (a === '--groovesteps') opts.groovesteps = args[++i];
  else if (a === '--json') opts.json = args[++i];
  else if (a === '--md') opts.md = args[++i];
  else if (a === '--ignore') opts.ignore = args[++i].split(',');
  else if (a === '--per') opts.per = +args[++i];
  else if (a === '--show') opts.show = +args[++i];
  else opts.paths.push(a);
}
const items = [];
const tidy = t => t.split('\n').filter(l => l.trim() && !/^\s*\/\//.test(l) && !/^\s*(source|licence|license)\s*:/i.test(l)).join('\n');
function add(p, where) { const r = R.analyze(p, { ignore: opts.ignore }); r.source = where; if (typeof p === 'string') r.text = tidy(p); items.push(r); }

// text corpora
for (const p of opts.paths) {
  const files = fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(f => f.endsWith('.rhythms.txt')).map(f => path.join(p, f)) : [p];
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    let shared = '';
    for (const chunk of text.split(/\n\s*\n/)) {
      if (!chunk.trim()) continue;
      if (!/^\s*title\s*:/im.test(chunk)) { shared += chunk + '\n'; continue; }   // leading lines without a title apply to every pattern in the file (source, licence)
      add(shared + chunk, path.relative(process.cwd(), file));
    }
  }
}
// GrooveSteps (CC0)
if (opts.groovesteps) { const json = JSON.parse(fs.readFileSync(opts.groovesteps, 'utf8')); for (const p of R.fromGrooveSteps(json)) add(p, 'GrooveSteps'); }
// Groove MIDI Dataset (CC BY 4.0)
if (opts.groove) {
  const dir = opts.groove, csv = fs.readFileSync(path.join(dir, 'info.csv'), 'utf8').trim().split('\n');
  const head = csv.shift().split(','), col = k => head.indexOf(k);
  const perStyle = {}, seen = new Set();
  for (const line of csv) {
    const c = line.split(','); if (c[col('beat_type')] !== 'beat') continue;   // fills are not patterns
    const style = c[col('style')], ts = c[col('time_signature')].split('-').map(Number), bpm = +c[col('bpm')];
    if ((perStyle[style] || 0) >= opts.per) continue;
    let p; try { p = R.fromMidi(fs.readFileSync(path.join(dir, c[col('midi_filename')])), { meter: ts, bpm, style, id: c[col('id')], title: `${style.replace(/\//g, ' ')} ${bpm}`, source: 'Groove MIDI Dataset (Magenta)', licence: 'CC BY 4.0' }); } catch (e) { console.error(`${c[col('midi_filename')]}: ${e.message}`); continue; }
    if (!p || p.played < 2) continue;
    const key = R.toText({ ...p, title: '', meta: {} }); if (seen.has(key)) continue; seen.add(key);
    perStyle[style] = (perStyle[style] || 0) + 1;
    add(p, 'Groove MIDI Dataset');
  }
}

const seq = R.sequence(items);
const byLevel = {}; for (const it of seq) (byLevel[it.grade.level] = byLevel[it.grade.level] || []).push(it);
console.log(`${items.length} patterns`);
for (const L of Object.keys(byLevel).sort()) {
  console.log(`\nLevel ${L}: ${byLevel[L].length}`);
  byLevel[L].slice(0, opts.show).forEach(it => console.log(`  ${(it.title || '(untitled)').padEnd(40)} ${it.source.padEnd(22)} ${Object.values(it.grade.reasons).join(' · ')}`));
}
const dims = Object.keys(R.LATTICE);
console.log('\nRungs by dimension (how many patterns sit on each):');
for (const d of dims) { const n = new Array(6).fill(0); items.forEach(it => n[it.grade.rungs[d] - 1]++); console.log(`  ${R.LATTICE[d].label.padEnd(12)} ${n.join(' ')}`); }

if (opts.json) {
  const levels = {}; for (const d of dims) R.LATTICE[d].rungs.forEach((r, i) => (levels[i + 1] = levels[i + 1] || []).push(r.name));
  const out = { name: 'Rhythm set', generated: new Date().toISOString().slice(0, 10), levels, patterns: seq.map(it => ({ id: (it.meta.id || it.title || '').toString().replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'p' + Math.random().toString(36).slice(2, 8), title: it.title, level: it.grade.level, score: it.grade.score, rungs: it.grade.rungs, reasons: it.grade.reasons, skills: it.skills, introduces: it.introduces, ontario: it.ontario, metre: it.features.metre, bpm: it.features.bpm, parts: it.features.parts, style: it.meta.style || '', source: it.meta.source || it.source, licence: it.meta.licence || '', text: it.text })) };
  fs.writeFileSync(opts.json, JSON.stringify(out, null, 1)); console.log(`\nwrote ${opts.json}`);
}
if (opts.md) {
  const rows = seq.map((it, i) => `| ${i + 1} | ${it.grade.level} | ${it.title} | ${it.features.metre} | ${it.features.parts} | ${it.introduces.join(', ')} | ${it.source} |`);
  fs.writeFileSync(opts.md, `| # | Level | Pattern | Metre | Parts | Brings in | Source |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`); console.log(`wrote ${opts.md}`);
}
