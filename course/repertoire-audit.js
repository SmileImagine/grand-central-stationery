#!/usr/bin/env node
'use strict';

// Evidence audit for the private tune workshop and review queue. A filled
// reviewer field names work still required; it never means that review passed.
const fs = require('fs');
const path = require('path');

const CORE = ['function', 'elements', 'practice', 'honesty', 'licence', 'respect', 'review'];
const EXTRA = ['accompaniment', 'lyrics'];

const field = (text, name) => ((text.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi')) || [])[1] || '').trim();
const comments = (text, prefix) => {
  const out = {};
  for (const line of text.split('\n')) {
    const match = line.match(new RegExp(`^%\\s*${prefix}-([a-z-]+):\\s*(.*)$`, 'i'));
    if (match) out[match[1].toLowerCase()] = match[2].trim();
  }
  return out;
};
const urls = text => [...text.matchAll(/^%\s*source-url:\s*(\S+)\s*(.*)$/gmi)].map(match => ({ url: match[1], label: match[2].trim() }));

function readRecords(root) {
  const records = [];
  for (const queue of ['holding', 'review']) {
    const dir = path.join(root, 'course', queue, 'items');
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(name => name.endsWith('.abc')).sort()) {
      const full = path.join(dir, file), abc = fs.readFileSync(full, 'utf8');
      const dossier = comments(abc, 'dossier');
      const meta = comments(abc, queue === 'holding' ? 'holding' : 'review');
      const holding = comments(abc, 'holding');
      const missing = CORE.filter(key => !dossier[key]);
      records.push({
        queue,
        file: path.relative(root, full),
        id: meta.id || file.replace(/\.abc$/, ''),
        title: field(abc, 'T') || file.replace(/\.abc$/, ''),
        origin: field(abc, 'O'),
        rhythm: field(abc, 'R'),
        kind: meta.kind || holding.kind || 'tune',
        source: field(abc, 'S'),
        sourceUrls: urls(abc),
        dossier,
        missing,
        abc,
        from: queue === 'review' ? meta.from || '' : 'holding',
        sourceCheck: holding['source-check'] || (queue === 'holding' ? meta['source-check'] : ''),
        classroomCheck: holding['classroom-check'] || (queue === 'holding' ? meta['classroom-check'] : ''),
        reviewStatus: holding['review-status'] || '',
        reviewPacket: holding['review-packet'] || '',
        status: meta.status || '',
        hasHowRead: /^N:HOW READ\b/m.test(abc),
        hasUncertain: /^N:UNCERTAIN\b/m.test(abc),
        hasRange: /classroom range|young[- ]unison|written range|rehearsal key|\bspan(?:s|ning)?\b[^\n]*(?:C|D|E|F|G|A|B)[#b]?[0-9]/i.test(abc),
      });
    }
  }
  return records;
}

function buildReport(records) {
  return {
    records,
    summary: {
      total: records.length,
      holding: records.filter(record => record.queue === 'holding').length,
      review: records.filter(record => record.queue === 'review').length,
      completeCore: records.filter(record => !record.missing.length).length,
      stableSource: records.filter(record => record.source && record.sourceUrls.some(link => /^https:\/\//.test(link.url))).length,
      plateRecord: records.filter(record => record.hasHowRead && record.hasUncertain).length,
      rangeRecord: records.filter(record => record.hasRange).length,
      classroomPassed: records.filter(record => record.classroomCheck === 'passed').length,
      reviewPackets: records.filter(record => record.reviewStatus === 'packet-ready' && record.reviewPacket).length,
    },
  };
}

const yes = value => value ? 'yes' : '**no**';
const safe = value => String(value || '').replace(/\|/g, '\\|');
function renderMarkdown(report) {
  const incomplete = report.records.filter(record => record.missing.length || !record.source || !record.sourceUrls.length || !record.hasHowRead || !record.hasUncertain || !record.hasRange);
  return [
    '# Workshop and review-queue repertoire audit',
    '',
    'Generated from the private `course/holding/items` and `course/review/items` records. The seven core dossier fields are function, characteristic elements, performance practice, provenance/honesty, licence, respect flags and required reviewer. A named reviewer is a request for human review, **not a completed sign-off**.',
    '',
    '## Summary',
    '',
    `- ${report.summary.total} records: ${report.summary.holding} in the workshop and ${report.summary.review} in review.`,
    `- ${report.summary.completeCore}/${report.summary.total} have all seven core dossier fields.`,
    `- ${report.summary.stableSource}/${report.summary.total} have both an exact citation and an HTTPS source link.`,
    `- ${report.summary.plateRecord}/${report.summary.total} carry both \`N:HOW READ\` and \`N:UNCERTAIN\`; ${report.summary.rangeRecord}/${report.summary.total} state classroom range or rehearsal-key guidance.`,
    `- Human classroom/culture/language reviews recorded as passed: ${report.summary.classroomPassed}.`,
    `- Human-review packets prepared but not completed: ${report.summary.reviewPackets}.`,
    '',
    '## Evidence queue',
    '',
    '| Queue | Tune | Core | Citation + link | Plate record | Range/key | Evidence still missing | Required human review |',
    '|---|---|---:|---|---|---|---|---|',
    ...incomplete.map(record => `| ${record.queue} | ${safe(record.title)} | ${CORE.length - record.missing.length}/7 | ${yes(record.source && record.sourceUrls.length)} | ${yes(record.hasHowRead && record.hasUncertain)} | ${yes(record.hasRange)} | ${safe(record.missing.join(', ') || 'plate/range/source record as marked')} | ${safe(record.dossier.review || '**not named**')} |`),
    '',
    '## Full inventory',
    '',
    '| Queue | Tune | Origin stated | Function/type stated | Core dossier | Source check | Classroom check |',
    '|---|---|---|---|---:|---|---|',
    ...report.records.map(record => `| ${record.queue}${record.queue === 'review' ? ` (${record.from})` : ''} | ${safe(record.title)} | ${safe(record.origin || '**missing**')} | ${safe(record.rhythm || '**missing**')} | ${CORE.length - record.missing.length}/7 | ${safe(record.sourceCheck || 'not recorded')} | ${safe(record.classroomCheck || 'not passed')} |`),
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const options = { root: path.resolve(__dirname, '..'), md: null, check: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root' || arg === '--md' || arg === '--check') options[arg.slice(2)] = argv[++i];
    else if (arg === '--json') options.json = true;
    else if (arg === '-h' || arg === '--help') options.help = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return options;
}

function run(argv) {
  const options = parseArgs(argv);
  if (options.help) {
    console.log('Usage: node course/repertoire-audit.js [--json] [--md FILE] [--check FILE]');
    return;
  }
  const report = buildReport(readRecords(path.resolve(options.root)));
  const markdown = renderMarkdown(report);
  if (options.md) fs.writeFileSync(options.md, markdown);
  if (options.check) {
    const old = fs.existsSync(options.check) ? fs.readFileSync(options.check, 'utf8') : '';
    if (old !== markdown) throw new Error(`${options.check} is stale; run node course/repertoire-audit.js --md ${options.check}`);
    console.log(`${report.summary.total} private repertoire records have current evidence guidance`);
  }
  if (options.json) console.log(JSON.stringify(report, (key, value) => key === 'abc' ? undefined : value, 2));
  else if (!options.md && !options.check) process.stdout.write(markdown);
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (error) { console.error(error.message || error); process.exit(1); }
}

module.exports = { CORE, EXTRA, readRecords, buildReport, renderMarkdown };
