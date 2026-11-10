#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const root = __dirname, itemsDir = path.join(root, 'items'), outFile = path.join(root, 'index.json');
const stages = ['inbox', 'transcription', 'source-check', 'classroom-check', 'ready'];
const metaOf = text => {
  const meta = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^%\s*holding-([a-z-]+):\s*(.*)$/i);
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
  }
  return meta;
};
const field = (text, name) => {
  const m = text.match(new RegExp('^' + name + ':\\s*(.+)$', 'mi'));
  return m ? m[1].trim() : '';
};
const files = fs.readdirSync(itemsDir).filter(f => f.endsWith('.abc')).sort();
const seen = new Set(), errors = [], items = files.map(file => {
  const text = fs.readFileSync(path.join(itemsDir, file), 'utf8'), meta = metaOf(text);
  const id = meta.id || file.replace(/\.abc$/, '');
  if (seen.has(id)) errors.push(`${file}: duplicate holding-id ${id}`); else seen.add(id);
  if (!stages.includes(meta.status)) errors.push(`${file}: holding-status wants ${stages.join(', ')}`);
  if (!field(text, 'T')) errors.push(`${file}: wants a T: title`);
  if (!field(text, 'S')) errors.push(`${file}: wants an S: source`);
  if (meta.status === 'ready' && (meta['source-check'] !== 'verified' || meta['classroom-check'] !== 'passed'))
    errors.push(`${file}: ready requires source-check: verified and classroom-check: passed`);
  return {
    id, file: `items/${file}`, title: field(text, 'T') || id,
    subtitle: [...text.matchAll(/^T:\s*(.+)$/gmi)].slice(1).map(m => m[1].trim()).join(' · '),
    source: field(text, 'S'), status: meta.status || 'inbox', owner: meta.owner || '',
    sourceCheck: meta['source-check'] || 'pending', classroomCheck: meta['classroom-check'] || 'pending',
    updated: meta.updated || '', blocked: meta.blocked || '', notes: field(text, 'N')
  };
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const counts = Object.fromEntries(stages.map(s => [s, items.filter(it => it.status === s).length]));
const now = new Date(), localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const output = JSON.stringify({ generated: localDate, stages, counts, items }, null, 1) + '\n';
if (process.argv.includes('--check')) {
  const old = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (old !== output) { console.error('course/holding/index.json is stale; run node course/holding/build.js'); process.exit(1); }
  console.log(`${items.length} holding items; board is current`);
} else {
  fs.writeFileSync(outFile, output);
  console.log(`wrote ${path.relative(process.cwd(), outFile)} (${items.length} items)`);
}
