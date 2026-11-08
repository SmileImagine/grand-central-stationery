#!/usr/bin/env node
/*
  Grade dances and write a dance set for the lab and the board.

    node course/dance-cli.js course/dances                                  step files (*.dances.txt)
    node course/dance-cli.js --book path/book.txt "Title|1922|https://archive.org/details/..."
    node course/dance-cli.js course/dances --book ... --json course/dance-set.json --md out/dances.md

  A .dances.txt file holds dances separated by blank lines, each with a
  title: line and the lab's feet: and arms: lines; lines before the first
  title apply to every dance in the file (source, licence). --book reads an
  OCR'd public-domain dance book (Internet Archive djvu text) and grades each
  dance's prose, then reports how the grades line up with the book's own
  classified index. --ignore tempo leaves a dimension out of the level.
*/
const fs = require('fs'), path = require('path');
const D = require('./dance-analyze.js');

const args = process.argv.slice(2), opts = { paths: [], books: [], ignore: [], show: 4 };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--book') { const file = args[++i], meta = (args[i + 1] && !args[i + 1].startsWith('--') && args[i + 1].includes('|')) ? args[++i].split('|') : []; opts.books.push({ file, title: meta[0] || path.basename(file), year: meta[1] || '', source: meta[2] || '' }); }
  else if (a === '--json') opts.json = args[++i];
  else if (a === '--md') opts.md = args[++i];
  else if (a === '--ignore') opts.ignore = args[++i].split(',');
  else if (a === '--show') opts.show = +args[++i];
  else opts.paths.push(a);
}
const steps = [], prose = [];
for (const p of opts.paths) {
  const files = fs.statSync(p).isDirectory() ? fs.readdirSync(p).filter(f => f.endsWith('.dances.txt')).map(f => path.join(p, f)) : [p];
  for (const file of files) {
    let shared = '';
    for (const chunk of fs.readFileSync(file, 'utf8').split(/\n\s*\n/)) {
      if (!chunk.trim()) continue;
      if (!/^\s*title\s*:/im.test(chunk)) { shared += chunk + '\n'; continue; }
      const r = D.analyzeSteps(shared + chunk, { ignore: opts.ignore }); r.source = path.relative(process.cwd(), file); r.text = (shared + chunk).split('\n').filter(l => l.trim() && !/^\s*\/\//.test(l) && !/^\s*(source|licence|license|note)\s*:/i.test(l)).join('\n'); steps.push(r);
    }
  }
}
for (const b of opts.books) {
  const dances = D.readBook(fs.readFileSync(b.file, 'utf8'), { title: b.title, year: b.year, source: b.source, licence: 'public domain' });
  console.log(`${b.title}: ${dances.length} dances found, ${dances.filter(d => d.bookClass).length} classified by the book`);
  for (const d of dances) { const r = D.analyzeProse(d, { ignore: opts.ignore }); r.source = b.title; prose.push(r); }
}

function report(name, items, lattice) {
  if (!items.length) return;
  const seq = D.sequence(items), byLevel = {}; seq.forEach(it => (byLevel[it.grade.level] = byLevel[it.grade.level] || []).push(it));
  console.log(`\n== ${name}: ${items.length}`);
  for (const L of Object.keys(byLevel).sort()) { console.log(`Level ${L}: ${byLevel[L].length}`); byLevel[L].slice(0, opts.show).forEach(it => console.log(`  ${it.title.padEnd(34)} ${it.meta.bookClass ? 'class ' + it.meta.bookClass : ''} ${Object.values(it.grade.reasons).join(' · ')}`)); }
  console.log('Rungs by dimension:'); for (const d in lattice) { const n = new Array(6).fill(0); items.forEach(it => n[it.grade.rungs[d] - 1]++); console.log(`  ${lattice[d].label.padEnd(12)} ${n.join(' ')}`); }
  return seq;
}
const stepSeq = report('Steps', steps, D.STEP_LATTICE) || [];
const proseSeq = report('Dances from books', prose, D.PROSE_LATTICE) || [];
if (prose.some(p => p.meta.bookClass)) {
  const c = D.calibrate(prose);
  console.log(`\nAgainst the books' classes (1 small children, 2 larger boys and girls, 3 adults): ${c.counts[1]}/${c.counts[2]}/${c.counts[3]} dances; mean level ${[1, 2, 3].map(k => c.meanLevel[k] == null ? '-' : c.meanLevel[k].toFixed(2)).join(' / ')}; rank agreement (Kendall tau) ${c.kendall == null ? '-' : c.kendall.toFixed(2)}`);
  for (const k of [1, 2, 3]) console.log(`  class ${k}: levels ${c.table[k].sort().join(' ')}`);
}
if (opts.json) {
  const levels = {}; for (const d in D.STEP_LATTICE) D.STEP_LATTICE[d].rungs.forEach((r, i) => (levels[i + 1] = levels[i + 1] || []).push(r.name));
  const proseLevels = {}; for (const d in D.PROSE_LATTICE) D.PROSE_LATTICE[d].rungs.forEach((r, i) => (proseLevels[i + 1] = proseLevels[i + 1] || []).push(r.name));
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const out = { name: 'Dance set', generated: new Date().toISOString().slice(0, 10), levels, proseLevels,
    steps: stepSeq.map(it => ({ id: slug(it.title), title: it.title, level: it.grade.level, score: it.grade.score, rungs: it.grade.rungs, reasons: it.grade.reasons, skills: it.skills, introduces: it.introduces, metre: it.features.metre, bpm: it.features.bpm, source: it.meta.source || it.source, licence: it.meta.licence || '', text: it.text })),
    dances: proseSeq.map(it => ({ id: slug(it.title), title: it.title, level: it.grade.level, score: it.grade.score, rungs: it.grade.rungs, reasons: it.grade.reasons, skills: it.skills, introduces: it.introduces, country: it.meta.country, book: it.meta.book, year: it.meta.year, bookClass: it.meta.bookClass, tempo: it.features.tempo, measures: it.features.measures, figures: it.features.figures, source: it.meta.source, licence: it.meta.licence, text: it.text })) };
  fs.writeFileSync(opts.json, JSON.stringify(out, null, 1)); console.log(`\nwrote ${opts.json}`);
}
if (opts.md) {
  const rows = [...stepSeq, ...proseSeq].map((it, i) => `| ${i + 1} | ${it.grade.level} | ${it.title} | ${it.kind} | ${it.features.metre || (it.meta.country || '')} | ${it.introduces.join(', ')} | ${it.source} |`);
  fs.writeFileSync(opts.md, `| # | Level | Dance | Kind | Metre / origin | Brings in | Source |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`); console.log(`wrote ${opts.md}`);
}
