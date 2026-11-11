#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const root = __dirname, itemsDir = path.join(root, 'items'), outFile = path.join(root, 'index.json');
const stages = ['inbox', 'transcription', 'source-check', 'classroom-check', 'ready'];
// The teacher's verdict, apart from the stage: include it in the course, keep considering it, or reject it (with a note).
const decisions = ['include', 'considering', 'reject'];
// What the piece is: a whole tune, or a fragment (a bar or two taken down without the words, dance, drum or
// variants that made it music), with holding-kind-note saying what is missing.
const kinds = ['tune', 'fragment'];
// Fields that may run over several lines, one "% holding-response: ..." line each, joined with newlines.
const MULTI = ['response', 'decision-note'];
const metaOf = text => {
  const meta = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^%\s*holding-([a-z-]+):\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    meta[k] = MULTI.includes(k) && k in meta ? meta[k] + '\n' + v : v;
  }
  for (const k of MULTI) if (k in meta) meta[k] = meta[k].trim();
  return meta;
};
// A tune's dossier (docs/TUNE-QUALITY-PLANS-2026-11-10.md, A1): "% dossier-function: ..." lines, in a fixed order.
// accompaniment: what the tradition plays, who plays it, the source for that, and what the band substitutes;
// lyrics: which verses are sung in class, which are left out and why, and who checked the language.
const DOSSIER = ['function', 'elements', 'practice', 'accompaniment', 'lyrics', 'honesty', 'licence', 'respect', 'review'];
const dossierOf = text => {
  const d = {};
  for (const line of text.split('\n')) { const m = line.match(/^%\s*dossier-([a-z]+):\s*(.*)$/i); if (m && DOSSIER.includes(m[1].toLowerCase())) d[m[1].toLowerCase()] = m[2].trim(); }
  return Object.keys(d).length ? d : null;
};
// "% source-url: <url> <what it is>" lines: where to read the original (a scan, a book page, a transcription).
const sourceUrlsOf = text => [...text.matchAll(/^%\s*source-url:\s*(\S+)\s*(.*)$/gmi)].map(m => ({ url: m[1], label: m[2].trim() }));
// "% performance-url: <url> <who, when, what it shows>" lines: a performance to listen to; "% performance-note: ..."
// says where one might be found when there is no link (an archive and its shelf mark).
const performanceUrlsOf = text => [...text.matchAll(/^%\s*performance-url:\s*(\S+)\s*(.*)$/gmi)].map(m => ({ url: m[1], label: m[2].trim() }));
const performanceNotesOf = text => [...text.matchAll(/^%\s*performance-note:\s*(.+)$/gmi)].map(m => m[1].trim());
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
  for (const s of sourceUrlsOf(text)) if (!/^https?:\/\//.test(s.url)) errors.push(`${file}: source-url wants a web address, not ${s.url}`);
  for (const s of performanceUrlsOf(text)) if (!/^https?:\/\//.test(s.url)) errors.push(`${file}: performance-url wants a web address, not ${s.url}`);
  if (!field(text, 'S')) errors.push(`${file}: wants an S: source`);
  if (meta.status === 'ready' && (meta['source-check'] !== 'verified' || meta['classroom-check'] !== 'passed'))
    errors.push(`${file}: ready requires source-check: verified and classroom-check: passed`);
  if (meta.decision && !decisions.includes(meta.decision)) errors.push(`${file}: holding-decision wants ${decisions.join(', ')}`);
  if (meta.kind && !kinds.includes(meta.kind)) errors.push(`${file}: holding-kind wants ${kinds.join(' or ')}`);
  if (meta.kind === 'fragment' && !meta['kind-note']) errors.push(`${file}: a fragment wants a holding-kind-note saying what is missing`);
  if (meta.decision === 'reject' && !meta['decision-note']) errors.push(`${file}: a rejected tune wants a holding-decision-note saying why`);
  return {
    id, file: `items/${file}`, title: field(text, 'T') || id,
    subtitle: [...text.matchAll(/^T:\s*(.+)$/gmi)].slice(1).map(m => m[1].trim()).join(' · '),
    source: field(text, 'S'), sourceUrls: sourceUrlsOf(text), performances: performanceUrlsOf(text), performanceNotes: performanceNotesOf(text), status: meta.status || 'inbox', owner: meta.owner || '',
    sourceCheck: meta['source-check'] || 'pending', classroomCheck: meta['classroom-check'] || 'pending',
    updated: meta.updated || '', blocked: meta.blocked || '', notes: field(text, 'N'),
    kind: meta.kind || 'tune', kindNote: meta['kind-note'] || '',
    decision: meta.decision || 'considering', decisionNote: meta['decision-note'] || '',
    response: meta.response || '', responseUpdated: meta['response-updated'] || '',
    dossier: dossierOf(text)
  };
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const counts = Object.fromEntries(stages.map(s => [s, items.filter(it => it.status === s).length]));
const now = new Date(), localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const output = JSON.stringify({ generated: localDate, stages, counts, items }, null, 1) + '\n';
if (process.argv.includes('--check')) {
  const old = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  const undated = s => s.replace(/"generated": "[^"]*"/, '');   // a rebuild on another day is not a change
  if (undated(old) !== undated(output)) { console.error('course/holding/index.json is stale; run node course/holding/build.js'); process.exit(1); }
  console.log(`${items.length} holding items; board is current`);
} else {
  fs.writeFileSync(outFile, output);
  console.log(`wrote ${path.relative(process.cwd(), outFile)} (${items.length} items)`);
}
