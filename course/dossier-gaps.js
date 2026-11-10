#!/usr/bin/env node
'use strict';

/*
  Dossier gap report for the published library.

  Explicit `% dossier-*:` fields are the only fields that count as completed.
  Existing ABC metadata is reported as a seed for editorial work, never as a
  substitute: R: can suggest function, Q: can seed practice, and O:/S: can
  help provenance, but each still needs a human-authored dossier statement.
*/
const fs = require('fs');
const path = require('path');
const ABCJS = require(path.join(__dirname, '..', 'vendor', 'abcjs-basic-min.js'));
const Analyze = require('./analyze.js');

const REQUIRED = ['function', 'elements', 'practice', 'honesty', 'licence', 'respect', 'review'];
const USABLE_SOURCE = ['external citation', 'bibliographic text', 'local original'];
const LABEL = {
  function: 'Function', elements: 'Characteristic elements', practice: 'Performance practice',
  honesty: 'Provenance/honesty', licence: 'Licence', respect: 'Respect flags', review: 'Reviewer/sign-off',
};
const field = (abc, name) => ((abc.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi')) || [])[1] || '').trim();

function dossierFields(abc) {
  const out = {};
  for (const line of abc.split(/\r?\n/)) {
    const match = line.match(/^%\s*dossier-([a-z-]+):\s*(.*)$/i);
    if (match && REQUIRED.includes(match[1].toLowerCase()) && match[2].trim()) out[match[1].toLowerCase()] = match[2].trim();
  }
  return out;
}

function sourceEvidence(tune) {
  const abcSource = field(tune.abc, 'S');
  const setSource = tune.source || '';
  const composer = field(tune.abc, 'C') || tune.composer || '';
  const generic = /^(song|traditional|trad\.?|unknown|collected)$/i;
  const value = abcSource && !generic.test(abcSource) ? abcSource : setSource;
  if (!value) return { kind: 'missing', value: '' };
  if (/^(?:\/|~|file:)|\/private\/|\/tmp\//i.test(value)) return { kind: 'private path', value };
  if (/^course\//i.test(value) && /\boriginal\b/i.test(composer)) return { kind: 'local original', value };
  if (/^course\//i.test(value)) return { kind: 'internal container only', value };
  if (/^https?:\/\//i.test(value)) return { kind: 'external citation', value };
  return { kind: 'bibliographic text', value };
}

function seedsFor(tune, features, source) {
  const rhythm = field(tune.abc, 'R') || tune.rhythm || '';
  const origin = field(tune.abc, 'O') || tune.origin || '';
  const tempo = field(tune.abc, 'Q');
  const composer = field(tune.abc, 'C') || tune.composer || '';
  const lyrics = /^w:/mi.test(tune.abc);
  const out = {
    function: rhythm ? `R: ${rhythm}` : '',
    elements: `${features.metreNum}/${features.metreDen}; ${features.keyName || tune.key || 'key missing'}; ${features.chordSymbols} chord symbols`,
    practice: tempo ? `Q: ${tempo}` : '',
    honesty: composer ? `C: ${composer}` : '',
    licence: tune.licence || ((composer.match(/\b(CC0|CC[- ]BY(?:[- ]SA)?(?:[- ]\d(?:\.\d)?)?|public domain)\b/i) || [])[1] || ''),
    respect: '',
    review: '',
  };
  return { fields: out, origin, source, lyrics };
}

function priorityOf(row) {
  let score = row.missing.length * 10;
  if (!row.seeds.origin) score += 5;
  if (!USABLE_SOURCE.includes(row.seeds.source.kind)) score += 5;
  if (!row.seeds.fields.licence) score += 4;
  if (!row.seeds.fields.function) score += 2;
  if (!row.seeds.lyrics) score += 1;
  return score;
}

function buildReport(set, source = 'course/set.json') {
  const tunes = set.tunes.map(tune => {
    const analyzed = Analyze.analyzeAbc(tune.abc, ABCJS)[0];
    if (!analyzed || analyzed.error || !analyzed.features) throw new Error(`${tune.id}: cannot analyze dossier seeds`);
    const explicit = dossierFields(tune.abc), sourceInfo = sourceEvidence(tune);
    const seeds = seedsFor(tune, analyzed.features, sourceInfo);
    const missing = REQUIRED.filter(name => !explicit[name]);
    const row = {
      id: tune.id,
      title: tune.title || analyzed.features.title,
      level: tune.level,
      explicit,
      completed: REQUIRED.length - missing.length,
      missing,
      seeds,
      complete: missing.length === 0 && USABLE_SOURCE.includes(sourceInfo.kind),
    };
    row.priority = priorityOf(row);
    return row;
  });
  const queue = [...tunes].sort((a, b) => b.priority - a.priority || a.level - b.level || a.title.localeCompare(b.title));
  return {
    schema: 1,
    source,
    required: REQUIRED,
    tunes,
    queue,
    summary: {
      complete: tunes.filter(t => t.complete).length,
      explicitByField: Object.fromEntries(REQUIRED.map(name => [name, tunes.filter(t => t.explicit[name]).length])),
      seedsByField: Object.fromEntries(REQUIRED.map(name => [name, tunes.filter(t => t.seeds.fields[name]).length])),
      explicitOrigin: tunes.filter(t => t.seeds.origin).length,
      citedSource: tunes.filter(t => USABLE_SOURCE.includes(t.seeds.source.kind)).length,
      internalSourceOnly: tunes.filter(t => t.seeds.source.kind === 'internal container only').length,
      privateSource: tunes.filter(t => t.seeds.source.kind === 'private path').length,
      withLyrics: tunes.filter(t => t.seeds.lyrics).length,
    },
  };
}

const safe = value => String(value || '').replace(/\|/g, '\\|');
function seedList(row) {
  const seeds = [];
  if (row.seeds.origin) seeds.push(`origin: ${row.seeds.origin}`);
  if (row.seeds.fields.function) seeds.push(row.seeds.fields.function);
  if (row.seeds.fields.practice) seeds.push(row.seeds.fields.practice);
  if (row.seeds.fields.honesty) seeds.push(row.seeds.fields.honesty);
  if (row.seeds.fields.licence) seeds.push(`licence: ${row.seeds.fields.licence}`);
  if (row.seeds.lyrics) seeds.push('lyrics present');
  return seeds.join('; ') || 'none';
}

function renderMarkdown(report) {
  return [
    '# Published-tune dossier gap report',
    '',
    `Generated deterministically from \`${report.source}\` (${report.tunes.length} published tunes). Only explicit \`% dossier-*:\` statements count as completed. Existing \`O:\`, \`R:\`, \`Q:\`, \`C:\`, lyrics, chord analysis and source paths appear as **editorial seeds**, not as inferred cultural claims.`,
    '',
    'A complete dossier requires function, characteristic elements, performance practice, provenance/honesty, licence, respect flags, and a reviewer/sign-off field, plus usable provenance: an external citation, bibliographic source, or identified local original.',
    '',
    '## Summary',
    '',
    `- Complete dossiers: **${report.summary.complete}/${report.tunes.length}**.`,
    `- Explicit origins: ${report.summary.explicitOrigin}/${report.tunes.length}; usable provenance sources: ${report.summary.citedSource}/${report.tunes.length}; internal collection paths only: ${report.summary.internalSourceOnly}; private paths: ${report.summary.privateSource}.`,
    `- Lyrics are present in ${report.summary.withLyrics}/${report.tunes.length} charts.`,
    '',
    '| Required dossier field | Explicitly complete | Existing seed only |',
    '|---|---:|---:|',
    ...report.required.map(name => `| ${LABEL[name]} | ${report.summary.explicitByField[name]} | ${report.summary.seedsByField[name]} |`),
    '',
    '## Priority queue',
    '',
    'Higher scores mean more missing dossier fields plus weaker provenance metadata. This is an editorial order, not a judgement about musical value.',
    '',
    '| Tune | L | Done | Source evidence | Existing seeds | Missing explicit fields | Score |',
    '|---|---:|---:|---|---|---|---:|',
    ...report.queue.map(row => `| ${safe(row.title)} | ${row.level} | ${row.completed}/${report.required.length} | ${safe(row.seeds.source.kind)} | ${safe(seedList(row))} | ${row.missing.map(name => LABEL[name]).join(', ')} | ${row.priority} |`),
    '',
    '## Source repair queue',
    '',
    ...report.queue.filter(row => !USABLE_SOURCE.includes(row.seeds.source.kind)).map(row => `- **${row.title}:** ${row.seeds.source.kind}${row.seeds.source.value ? ` (\`${row.seeds.source.value}\`)` : ''}.`),
    '',
    '## Editorial rules for filling gaps',
    '',
    '- Do not turn a country into a cultural identity, or a generic tune-type label into a claimed performance tradition.',
    '- Cite the melody source separately from this repository’s internal sample/collection file.',
    '- Label accompaniment as traditional, arranged, or fusion; do not describe generated harmony as source material.',
    '- A reviewer field names the person or role still needed. It is not “passed” until that review actually occurs.',
    '- Sacred or ceremonial status must be checked before promotion, even when the score itself is public domain.',
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const opt = { set: path.join(__dirname, 'set.json'), md: null, check: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--set' || arg === '--md' || arg === '--check') opt[arg.slice(2)] = argv[++i];
    else if (arg === '--json') opt.json = true;
    else if (arg === '-h' || arg === '--help') opt.help = true;
    else throw new Error(`Unknown option ${arg}`);
  }
  return opt;
}

function run(argv) {
  const opt = parseArgs(argv);
  if (opt.help) { console.log('Usage: node course/dossier-gaps.js [--set FILE] [--json] [--md FILE] [--check FILE]'); return; }
  const set = JSON.parse(fs.readFileSync(opt.set, 'utf8'));
  const source = path.relative(process.cwd(), path.resolve(opt.set)) || path.basename(opt.set);
  const report = buildReport(set, source), markdown = renderMarkdown(report);
  if (opt.md) fs.writeFileSync(opt.md, markdown);
  if (opt.check) {
    const old = fs.existsSync(opt.check) ? fs.readFileSync(opt.check, 'utf8') : '';
    if (old !== markdown) throw new Error(`${opt.check} is stale; run node course/dossier-gaps.js --md ${opt.check}`);
    console.log(`${report.tunes.length} tunes have current dossier-gap guidance`);
  }
  if (opt.json) console.log(JSON.stringify(report, null, 2));
  else if (!opt.md && !opt.check) process.stdout.write(markdown);
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (err) { console.error(err.message || err); process.exit(1); }
}

module.exports = { REQUIRED, dossierFields, sourceEvidence, seedsFor, priorityOf, buildReport, renderMarkdown };
