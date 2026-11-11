#!/usr/bin/env node
// The review queue: validates course/review/items/*.abc, writes index.json for board.html, and puts a piece back.
//   node course/review/build.js                  write index.json
//   node course/review/build.js --check          exit 1 when index.json is stale (the smoke test runs this)
//   node course/review/build.js --restore <id>   put the piece back where it came from, as it was
const fs = require('fs'), path = require('path');
const root = __dirname, course = path.join(root, '..'), itemsDir = path.join(root, 'items'), outFile = path.join(root, 'index.json');
const STATUSES = ['pending', 'keep', 'change', 'remove'], FROM = ['published', 'holding', 'samples'];
// review-status is the teacher's verdict (keep = include, change = include after a change, pending = still considering,
// remove = reject); review-decision is the note on it and review-response the teacher's answer to the suggestion.
// Those two may run over several lines, one "% review-response: ..." line each, joined with newlines.
const MULTI = ['response', 'decision'];
const metaOf = text => {
  const m = {};
  for (const line of text.split('\n')) {
    const x = line.match(/^%\s*review-([a-z-]+):\s*(.*)$/i); if (!x) continue;
    const k = x[1].toLowerCase(), v = x[2].trim();
    m[k] = MULTI.includes(k) && k in m ? m[k] + '\n' + v : v;
  }
  for (const k of MULTI) if (k in m) m[k] = m[k].trim();
  return m;
};
const body = text => text.split('\n').filter(l => !/^%\s*review-/.test(l)).join('\n');
// "% source-url: <url> <what it is>" lines: where to read the original (a scan, a book page, a transcription).
const sourceUrlsOf = text => [...text.matchAll(/^%\s*source-url:\s*(\S+)\s*(.*)$/gmi)].map(m => ({ url: m[1], label: m[2].trim() }));
// Performances, as in the workshop: "% performance-url: <url> <who, when>" and "% performance-note: where one might be found".
const performanceUrlsOf = text => [...text.matchAll(/^%\s*performance-url:\s*(\S+)\s*(.*)$/gmi)].map(m => ({ url: m[1], label: m[2].trim() }));
const performanceNotesOf = text => [...text.matchAll(/^%\s*performance-note:\s*(.+)$/gmi)].map(m => m[1].trim());
const field = (text, name) => { const m = text.match(new RegExp('^' + name + ':\\s*(.+)$', 'mi')); return m ? m[1].trim() : ''; };

if (process.argv[2] === '--restore') {
  const id = process.argv[3], file = path.join(itemsDir, `${id}.abc`);
  if (!id || !fs.existsSync(file)) { console.error(`no review item ${id}`); process.exit(1); }
  const text = fs.readFileSync(file, 'utf8'), meta = metaOf(text);
  if (meta.from === 'published') {
    const setFile = path.join(course, 'set.json'), set = JSON.parse(fs.readFileSync(setFile, 'utf8'));
    // Back right after the nearest tune it followed that is in the set now (_after lists them, nearest first, back to
    // one that never left; [] means it opened the set), so pieces restored in any order land where they were.
    const entry = JSON.parse(meta['set-entry']);
    if (set.tunes.some(t => t.id === entry.id)) { console.error(`${entry.id} is already in set.json`); process.exit(1); }
    let at = 0; for (const before of entry._after) { const k = set.tunes.findIndex(t => t.id === before); if (k >= 0) { at = k + 1; break; } }
    const abc = body(text).replace(/^\n+/, '').replace(/\n$/, ''), nl = entry.abc === '@abc\n';
    delete entry._after; entry.abc = abc + (nl ? '\n' : '');   // the ABC goes back where its key stands, with its own last newline
    set.tunes.splice(at, 0, entry);
    fs.writeFileSync(setFile, JSON.stringify(set, null, 1) + '\n');
    console.log(`restored ${id} to course/set.json at position ${at}; run node course/build-sets.js`);
  } else if (meta.from === 'samples') {
    // The sample files were never changed: the tune is still in its file, and leaving the queue lets the set builder grade it again.
    console.log(`restored ${id}: it is in ${meta['samples-file']} as it always was, and analyze-cli.js will grade it again`);
  } else {
    fs.writeFileSync(path.join(course, 'holding', 'items', `${id}.abc`), body(text).replace(/^\n+/, ''));
    console.log(`restored ${id} to course/holding/items; run node course/holding/build.js`);
  }
  fs.unlinkSync(file);
  process.argv = process.argv.slice(0, 2);
}

const files = fs.existsSync(itemsDir) ? fs.readdirSync(itemsDir).filter(f => f.endsWith('.abc')).sort() : [];
const errors = [], seen = new Set();
const items = files.map(file => {
  const text = fs.readFileSync(path.join(itemsDir, file), 'utf8'), meta = metaOf(text), id = meta.id || file.replace(/\.abc$/, '');
  if (seen.has(id)) errors.push(`${file}: duplicate review-id ${id}`); else seen.add(id);
  if (!FROM.includes(meta.from)) errors.push(`${file}: review-from wants ${FROM.join(' or ')}`);
  if (!STATUSES.includes(meta.status)) errors.push(`${file}: review-status wants ${STATUSES.join(', ')}`);
  if (!meta.suggestion) errors.push(`${file}: wants a review-suggestion`);
  if (meta.status === 'remove' && !meta.decision) errors.push(`${file}: a removed piece wants a review-decision saying why`);
  if (meta.from === 'published') { try { JSON.parse(meta['set-entry']); } catch (err) { errors.push(`${file}: review-set-entry is not JSON`); } }
  if (meta.from === 'samples' && !fs.existsSync(path.join(course, 'samples', meta['samples-file'] || '-'))) errors.push(`${file}: review-samples-file names no file in course/samples`);
  if (!field(text, 'T')) errors.push(`${file}: wants a T: title`);
  for (const s of sourceUrlsOf(text)) if (!/^https?:\/\//.test(s.url)) errors.push(`${file}: source-url wants a web address, not ${s.url}`);
  for (const s of performanceUrlsOf(text)) if (!/^https?:\/\//.test(s.url)) errors.push(`${file}: performance-url wants a web address, not ${s.url}`);
  return {
    id, file: `items/${file}`, title: field(text, 'T') || id, subtitle: [...text.matchAll(/^T:\s*(.+)$/gmi)].slice(1).map(m => m[1].trim()).join(' · '),
    from: meta.from, status: meta.status, categories: (meta.categories || '').split(/,\s*/).filter(Boolean),
    findings: meta.findings || '', suggestion: meta.suggestion || '', decision: meta.decision || '', source: field(text, 'S'), sourceUrls: sourceUrlsOf(text), performances: performanceUrlsOf(text), performanceNotes: performanceNotesOf(text),
    response: meta.response || '', responseUpdated: meta['response-updated'] || ''
  };
});
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const now = new Date(), localDate = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
const counts = Object.fromEntries(STATUSES.map(s => [s, items.filter(it => it.status === s).length]));
const output = JSON.stringify({ generated: localDate, statuses: STATUSES, counts, items }, null, 1) + '\n';
if (process.argv.includes('--check')) {
  const old = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
  if (old.replace(/"generated": "[^"]*"/, '') !== output.replace(/"generated": "[^"]*"/, '')) { console.error('course/review/index.json is stale; run node course/review/build.js'); process.exit(1); }
  console.log(`${items.length} review items; queue is current`);
} else {
  fs.writeFileSync(outFile, output);
  console.log(`wrote ${path.relative(process.cwd(), outFile)} (${items.length} items)`);
}
