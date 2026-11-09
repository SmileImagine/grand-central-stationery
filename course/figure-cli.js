#!/usr/bin/env node
/*
  Grade square-dance figures from Taminations and write a figure set.

    node course/figure-cli.js path/to/taminations-flutter/assets --json course/figure-set.json [--programmes ms,plus] [--md out.md] [--show N]

  --programmes picks the Callerlab programmes to read (default ms,plus: the social-dance end, which is what a school
  would teach); 'all' reads through Challenge 3.

  Taminations (Brad Christie, GPL-3.0, github.com/bradchristie/taminations-flutter) describes every Callerlab
  call as animations: each <tam> is one call from one formation, with a <path> per dancer role made of named
  moves (defined in src/moves.xml as Bézier movements with beat counts). This reads those files, measures each
  figure (programme, beats, moves per dancer, distinct roles, starting formation, the author's difficulty) and
  grades it on a six-rung lattice like the other analyzers. Figures are formation-level, not footwork, so the
  set is for a figure course, not the step lattice.
*/
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), opts = { show: 3, programmes: 'ms,plus' }; let root = null;
for (let i = 0; i < args.length; i++) { const a = args[i]; if (a === '--json') opts.json = args[++i]; else if (a === '--programmes') opts.programmes = args[++i]; else if (a === '--md') opts.md = args[++i]; else if (a === '--show') opts.show = +args[++i]; else root = a; }
if (!root) { console.error('wants the Taminations assets folder'); process.exit(1); }

const attrs = s => { const o = {}; for (const m of s.matchAll(/([\w:-]+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; };
const blocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\b([^>]*?)(/>|>([\\s\\S]*?)</${tag}>)`, 'g'))].map(m => ({ attrs: attrs(m[1]), inner: m[3] || '' }));

// moves.xml: a named path is movements (with beats) and moves (other paths); its length in beats is the sum
const movesXml = fs.readFileSync(path.join(root, 'src', 'moves.xml'), 'utf8'), PATHS = {};
for (const p of blocks(movesXml, 'path')) PATHS[p.attrs.name] = p.inner;
const beatsOf = (name, depth = 0) => {
  const inner = PATHS[name]; if (inner === undefined || depth > 8) return 2;
  let b = 0; for (const mv of blocks(inner, 'movement')) b += parseFloat(mv.attrs.beats || 1);
  for (const mv of blocks(inner, 'move')) b += mv.attrs.beats ? parseFloat(mv.attrs.beats) : beatsOf(mv.attrs.select, depth + 1);
  return b;
};

const PROGRAMME = { ms: 'Mainstream', plus: 'Plus', a1: 'Advanced 1', a2: 'Advanced 2', c1: 'Challenge 1', c2: 'Challenge 2', c3a: 'Challenge 3A', c3b: 'Challenge 3B' };
const FAMILIAR = /^(Static Square|Facing Couples|Lines|Lines Facing|Circle|Eight Chain Thru|Squared Set|Couples)/i, WAVE = /wave|two-faced|column|diamond/i;
const LATTICE = {
  programme: { label: 'Programme', rungs: [
    { name: 'Mainstream', test: f => f.programme === 'ms' }, { name: 'Plus', test: f => f.programme === 'plus' }, { name: 'Advanced 1', test: f => f.programme === 'a1' },
    { name: 'Advanced 2', test: f => f.programme === 'a2' }, { name: 'Challenge 1', test: f => f.programme === 'c1' }, { name: 'Challenge 2 and 3', test: () => true }] },
  length: { label: 'Length', rungs: [
    { name: 'up to 4 beats', test: f => f.beats <= 4 }, { name: 'up to 8', test: f => f.beats <= 8 }, { name: 'up to 12', test: f => f.beats <= 12 },
    { name: 'up to 16', test: f => f.beats <= 16 }, { name: 'up to 24', test: f => f.beats <= 24 }, { name: 'longer', test: () => true }] },
  moves: { label: 'Moves', rungs: [
    { name: 'one move', test: f => f.moves <= 1 }, { name: 'two', test: f => f.moves <= 2 }, { name: 'three', test: f => f.moves <= 3 },
    { name: 'four', test: f => f.moves <= 4 }, { name: 'five or six', test: f => f.moves <= 6 }, { name: 'more', test: () => true }] },
  roles: { label: 'Roles', rungs: [
    { name: 'everyone the same', test: f => f.roles <= 1 }, { name: 'two parts', test: f => f.roles <= 2 }, { name: 'three', test: f => f.roles <= 3 },
    { name: 'four', test: f => f.roles <= 4 }, { name: 'six', test: f => f.roles <= 6 }, { name: 'everyone different', test: () => true }] },
  formation: { label: 'Formation', rungs: [
    { name: 'square, facing couples, lines, circle', test: f => FAMILIAR.test(f.from) }, { name: 'eight chain thru', test: f => /eight chain/i.test(f.from) },
    { name: 'waves, two-faced lines', test: f => WAVE.test(f.from) }, { name: 'other named formation', test: f => !!f.from }, { name: 'unnamed', test: () => true }, { name: 'other', test: () => false }] },
  difficulty: { label: 'Author', rungs: [
    { name: 'difficulty 1', test: f => f.difficulty <= 1 }, { name: 'difficulty 1 to 2', test: f => f.difficulty < 2 }, { name: 'difficulty 2, or unrated', test: f => f.difficulty <= 2 || f.difficulty === 9 },
    { name: 'difficulty 2 to 3', test: f => f.difficulty < 3 }, { name: 'difficulty 3', test: f => f.difficulty <= 3 }, { name: 'other', test: () => true }] },
};
function grade(f) {
  const rungs = {}, reasons = {}; for (const d in LATTICE) { let i = LATTICE[d].rungs.findIndex(r => r.test(f)); if (i < 0) i = LATTICE[d].rungs.length - 1; rungs[d] = i + 1; reasons[d] = LATTICE[d].rungs[i].name; }
  const vals = Object.values(rungs), score = vals.reduce((s, x) => s + x, 0) / vals.length;
  return { level: Math.max(...vals), score: Math.round(score * 100) / 100, rungs, reasons };
}

const items = [];
const wanted = opts.programmes === 'all' ? Object.keys(PROGRAMME) : opts.programmes.split(',');
for (const prog of wanted) {
  const dir = path.join(root, prog); if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.xml'))) {
    const xml = fs.readFileSync(path.join(dir, file), 'utf8'), fam = (xml.match(/<tamination[^>]*title="([^"]*)"/) || [])[1] || file;
    for (const tam of blocks(xml, 'tam')) {
      const a = tam.attrs; if (a.display === 'none') continue;
      const paths = blocks(tam.inner, 'path').map(p => blocks(p.inner, 'move').map(m => ({ name: m.attrs.select, beats: m.attrs.beats ? parseFloat(m.attrs.beats) : beatsOf(m.attrs.select) })));
      if (!paths.length) continue;
      const f = { programme: prog, title: a.title || fam, family: fam, from: a.from || '', difficulty: a.difficulty ? +a.difficulty : 9,
        beats: Math.max(...paths.map(p => p.reduce((s, m) => s + m.beats, 0))), moves: Math.max(...paths.map(p => p.length)), roles: new Set(paths.map(p => p.map(m => m.name).join('|'))).size, dancers: paths.length };
      items.push({ ...f, grade: grade(f), text: paths.map(p => p.map(m => m.name).join(', ')).join(' | '), source: `Taminations ${prog}/${file}`, licence: 'GPL-3.0' });
    }
  }
}
items.sort((a, b) => a.grade.level - b.grade.level || a.grade.score - b.grade.score || a.beats - b.beats);
const byLevel = {}; for (const it of items) (byLevel[it.grade.level] = byLevel[it.grade.level] || []).push(it);
console.log(`${items.length} figures`);
for (const L of Object.keys(byLevel).sort()) { console.log(`\nLevel ${L}: ${byLevel[L].length}`); byLevel[L].slice(0, opts.show).forEach(it => console.log(`  ${it.title.padEnd(34)} from ${it.from.padEnd(24)} ${Object.values(it.grade.reasons).join(' · ')}`)); }
console.log('\nRungs by dimension:'); for (const d in LATTICE) { const n = new Array(6).fill(0); items.forEach(it => n[it.grade.rungs[d] - 1]++); console.log(`  ${LATTICE[d].label.padEnd(12)} ${n.join(' ')}`); }
if (opts.json) {
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const out = { name: 'Square dance figures', generated: new Date().toISOString().slice(0, 10), source: 'Taminations (Brad Christie), github.com/bradchristie/taminations-flutter, GPL-3.0', programmes: PROGRAMME,
    figures: items.map(it => ({ id: slug(`${it.programme}-${it.title}-${it.from}`), title: it.title, family: it.family, programme: PROGRAMME[it.programme], from: it.from, level: it.grade.level, score: it.grade.score, rungs: it.grade.rungs, reasons: it.grade.reasons, beats: it.beats, moves: it.moves, roles: it.roles, dancers: it.dancers, difficulty: it.difficulty === 9 ? null : it.difficulty, moveNames: it.text, source: it.source, licence: it.licence })) };
  fs.writeFileSync(opts.json, JSON.stringify(out)); console.log(`\nwrote ${opts.json}`);
}
if (opts.md) { fs.writeFileSync(opts.md, `| # | Level | Figure | From | Programme | Beats | Moves | Roles |\n|---|---|---|---|---|---|---|---|\n${items.map((it, i) => `| ${i + 1} | ${it.grade.level} | ${it.title} | ${it.from} | ${PROGRAMME[it.programme]} | ${it.beats} | ${it.moves} | ${it.roles} |`).join('\n')}\n`); console.log(`wrote ${opts.md}`); }
