#!/usr/bin/env node
'use strict';

/*
  Coverage map for the published tune set.

  It deliberately uses only fields the tune states. A blank O: remains
  Unspecified; a title that sounds like a game is not silently promoted to a
  reviewed game song. That makes the map useful as a queue for Phase 6.
*/
const fs = require('fs');
const path = require('path');
const Audit = require('./accompaniment-audit.js');
const Repertoire = require('./repertoire-audit.js');

const REGIONS = [
  'North America (general)',
  'North American Indigenous',
  'Caribbean',
  'Latin America',
  'West Africa',
  'Europe',
  'Middle East',
  'South Asia',
  'East Asia',
  'Southeast Asia',
  'Pacific',
  'Unspecified',
];
const FUNCTIONS = ['game song', 'dance tune', 'lullaby', 'song or air', 'other named', 'unspecified'];
const TARGET_FUNCTIONS = FUNCTIONS.slice(0, 4);

const field = (abc, name) => ((abc.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi')) || [])[1] || '').trim();

function regionOf(origin) {
  const value = (origin || '').toLowerCase();
  if (!value) return 'Unspecified';
  // Explicit nation/community identity wins over the containing country;
  // the inverse inference (Canada/USA => Indigenous) is never made.
  if (/ojibwe|anishinaabe|haudenosaunee|cree|inuit|métis|first nation|native american|indigenous/.test(value)) return 'North American Indigenous';
  if (/india|hindustan|garhwal|maharashtra|tamil|bengal|punjab|nepal|pakistan|sri lanka|bangladesh/.test(value)) return 'South Asia';
  if (/england|france|germany|ireland|scotland|wales|britain|europe/.test(value)) return 'Europe';
  if (/usa|united states|canada/.test(value)) return 'North America (general)';
  if (/caribbean|jamaica|trinidad|haiti|barbados|cuba|puerto rico|dominican/.test(value)) return 'Caribbean';
  if (/mexico|brazil|argentina|chile|peru|colombia|venezuela|latin america/.test(value)) return 'Latin America';
  if (/ghana|nigeria|senegal|mali|guinea|gambia|sierra leone|liberia|west africa/.test(value)) return 'West Africa';
  if (/arab|middle east|egypt|lebanon|syria|iraq|iran|persia|turkey|palestine|israel|jordan/.test(value)) return 'Middle East';
  if (/china|japan|korea|taiwan|east asia/.test(value)) return 'East Asia';
  if (/indonesia|philippines|vietnam|thailand|malaysia|singapore|cambodia|laos|myanmar|southeast asia/.test(value)) return 'Southeast Asia';
  if (/maori|aotearoa|new zealand|samoa|tonga|fiji|hawai|polynesia|pacific/.test(value)) return 'Pacific';
  return 'Unspecified';
}

function functionOf(rhythm) {
  const value = (rhythm || '').toLowerCase();
  if (!value) return 'unspecified';
  if (/game|play song|singing game/.test(value)) return 'game song';
  if (/reel|hornpipe|waltz|morris|jig|polka|dance|march|mazurka|strathspey/.test(value)) return 'dance tune';
  if (/lullaby|cradle/.test(value)) return 'lullaby';
  if (/song|air|round|hymn|carol|chant/.test(value)) return 'song or air';
  return 'other named';
}

function buildReport(set, source = 'course/set.json') {
  const tunes = set.tunes.map(tune => {
    const origin = field(tune.abc, 'O') || tune.origin || '';
    const rhythm = field(tune.abc, 'R') || tune.rhythm || '';
    const composer = field(tune.abc, 'C') || tune.composer || '';
    return {
      id: tune.id,
      title: tune.title,
      level: tune.level,
      origin,
      rhythm,
      region: regionOf(origin),
      function: functionOf(rhythm),
      style: Audit.styleDecision(tune.abc).style,
      generated: /grand central stationery.*original|ai-assisted original|course original/i.test(composer),
    };
  });
  const matrix = Object.fromEntries(REGIONS.map(region => [region, {
    levels: Object.fromEntries([1, 2, 3, 4, 5, 6].map(level => [level, tunes.filter(t => t.region === region && t.level === level).length])),
    functions: Object.fromEntries(FUNCTIONS.map(fn => [fn, tunes.filter(t => t.region === region && t.function === fn).length])),
    styles: Object.fromEntries([...new Set(tunes.filter(t => t.region === region).map(t => t.style))].sort().map(style => [style, tunes.filter(t => t.region === region && t.style === style).length])),
    total: tunes.filter(t => t.region === region).length,
  }]));
  return {
    schema: 1,
    source,
    regions: REGIONS,
    functions: FUNCTIONS,
    tunes,
    matrix,
    summary: {
      explicitOrigin: tunes.filter(t => t.origin).length,
      explicitFunction: tunes.filter(t => t.function !== 'unspecified').length,
      emptyRegions: REGIONS.filter(region => region !== 'Unspecified' && matrix[region].total === 0),
      noEarlyLevels: REGIONS.filter(region => region !== 'Unspecified' && ![1, 2, 3, 4].some(level => matrix[region].levels[level] > 0)),
      missingOrigin: tunes.filter(t => !t.origin).length,
      missingFunction: tunes.filter(t => t.function === 'unspecified').length,
    },
  };
}

function buildPipeline(root) {
  const records = Repertoire.readRecords(root).map(record => ({
    id: record.id,
    title: record.title,
    queue: record.queue,
    from: record.from,
    origin: record.origin,
    rhythm: record.rhythm,
    kind: record.kind,
    status: record.status,
    region: regionOf(record.origin),
    function: functionOf(record.rhythm),
    generated: /^%\s*holding-generated:\s*true\s*$/mi.test(record.abc),
    compositionDraft: /^%\s*composition-series:/mi.test(record.abc),
    // The set id of a record published early and kept here for correction (holding-published or review-published).
    published: ((record.abc || '').match(/^%\s*(?:holding|review)-published:\s*(\S+)/mi) || [])[1] || null,
  }));
  const matrix = Object.fromEntries(REGIONS.map(region => {
    const here = records.filter(record => record.region === region);
    return [region, {
      holding: here.filter(record => record.queue === 'holding').length,
      review: here.filter(record => record.queue === 'review').length,
      functions: Object.fromEntries(FUNCTIONS.map(fn => [fn, here.filter(record => record.function === fn).length])),
      total: here.length,
    }];
  }));
  return { records, matrix };
}

function launchRunway(report, pipeline, target = 100, maxGeneratedShare = 0.25) {
  const inventory = new Map(report.tunes.map(tune => [tune.id, { id: tune.id, generated: tune.generated, queue: 'published' }]));
  // A complete sourced transcription enters the existing runway while it moves through review. A newly composed
  // curriculum draft waits until its explicit `ready` gate; otherwise a planning batch of originals would be
  // mistaken for 30 launch-ready works and would obscure the source/classroom/cultural checks still required.
  // A record already published counts once, as its published tune.
  for (const record of (pipeline ? pipeline.records : []).filter(record => record.queue === 'holding' && record.kind !== 'fragment' && !record.published && (!record.compositionDraft || record.status === 'ready'))) {
    if (!inventory.has(record.id)) inventory.set(record.id, { id: record.id, generated: record.generated, queue: 'holding' });
  }
  const items = [...inventory.values()];
  const total = items.length;
  const generated = items.filter(item => item.generated).length;
  const maxGenerated = Math.floor(target * maxGeneratedShare);
  return {
    target,
    total,
    generated,
    sourced: total - generated,
    remaining: Math.max(0, target - total),
    maxGenerated,
    generatedSlots: Math.max(0, maxGenerated - generated),
    generatedShare: total ? generated / total : 0,
  };
}

const styleCounts = styles => Object.entries(styles).map(([k, v]) => `${k} ${v}`).join(', ') || '—';
function renderMarkdown(report, pipeline = null) {
  const metadataQueue = report.tunes.filter(t => !t.origin || t.function === 'unspecified');
  const launch = launchRunway(report, pipeline);
  const pipelineLines = pipeline ? [
    '## Private workshop and review pipeline',
    '',
    'These candidates are **not published coverage**. They show which empty cells have evidence in progress and which still have no candidate at all. Review items remain withheld until their stated human reviews and decisions occur.',
    '',
    '| Region | Workshop | Review | Game | Dance | Lullaby | Song/air | Total |',
    '|---|---:|---:|---:|---:|---:|---:|---:|',
    ...REGIONS.map(region => { const row = pipeline.matrix[region]; return `| ${region} | ${row.holding} | ${row.review} | ${TARGET_FUNCTIONS.map(fn => row.functions[fn]).join(' | ')} | ${row.total} |`; }),
    '',
    `- Published-empty regions with private candidates: ${report.summary.emptyRegions.filter(region => pipeline.matrix[region].total > 0).join(', ') || 'none'}.`,
    `- Published-empty regions with no private candidate: ${report.summary.emptyRegions.filter(region => pipeline.matrix[region].total === 0).join(', ') || 'none'}.`,
    '',
  ] : [];
  return [
    '# Tune coverage map',
    '',
    `Generated deterministically from \`${report.source}\` (${report.tunes.length} published tunes). Regions come only from explicit \`O:\` fields and functions only from \`R:\`; **Unspecified** is evidence to repair, not an inferred identity. A country such as USA or Canada is never treated as Indigenous without the tune saying so.`,
    '',
    '## Launch runway',
    '',
    `- **${launch.total}/${launch.target}** unique published-or-workshop tunes. Review-queue copies and incomplete workshop fragments are not additive.`,
    `- **${launch.generated}/${launch.total}** are explicitly labelled course originals or generated works (${(launch.generatedShare * 100).toFixed(1)}%); the launch allowance is at most ${launch.maxGenerated}/${launch.target} (25%).`,
    `- **${launch.remaining}** tunes remain to reach ${launch.target}. At most ${launch.generatedSlots} additional originals could fit under the numerical allowance, but source-backed repertoire remains the priority for geographic and cultural coverage.`,
    '',
    '## Coverage by region, level and function',
    '',
    '| Region | L1 | L2 | L3 | L4 | L5 | L6 | Game | Dance | Lullaby | Song/air | Total | Auto styles |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...report.regions.map(region => { const row = report.matrix[region]; return `| ${region} | ${[1, 2, 3, 4, 5, 6].map(level => row.levels[level]).join(' | ')} | ${TARGET_FUNCTIONS.map(fn => row.functions[fn]).join(' | ')} | ${row.total} | ${styleCounts(row.styles)} |`; }),
    '',
    '## Priority gaps',
    '',
    `- Empty target regions: ${report.summary.emptyRegions.join(', ') || 'none'}.`,
    `- No tune at levels 1-4: ${report.summary.noEarlyLevels.join(', ') || 'none'}.`,
    `- ${report.summary.missingOrigin} tunes have no explicit origin; ${report.summary.missingFunction} have no explicit classroom function or tune type.`,
    `- Only ${report.summary.explicitOrigin}/${report.tunes.length} tunes state an origin and ${report.summary.explicitFunction}/${report.tunes.length} state a function/type.`,
    '',
    ...pipelineLines,
    '## Metadata queue',
    '',
    '| Tune | Level | Origin | Function/type | Region used |',
    '|---|---:|---|---|---|',
    ...metadataQueue.map(t => `| ${t.title.replace(/\|/g, '\\|')} | ${t.level} | ${t.origin || '**missing**'} | ${t.rhythm || '**missing**'} | ${t.region} |`),
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const opt = { set: path.join(__dirname, 'set.json'), md: null, check: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--set' || a === '--md' || a === '--check') opt[a.slice(2)] = argv[++i];
    else if (a === '--json') opt.json = true;
    else if (a === '-h' || a === '--help') opt.help = true;
    else throw new Error(`Unknown option ${a}`);
  }
  return opt;
}

function run(argv) {
  const opt = parseArgs(argv);
  if (opt.help) {
    console.log('Usage: node course/coverage-map.js [--set FILE] [--json] [--md FILE] [--check FILE]');
    return;
  }
  const set = JSON.parse(fs.readFileSync(opt.set, 'utf8'));
  const source = path.relative(process.cwd(), path.resolve(opt.set)) || path.basename(opt.set);
  const root = path.resolve(__dirname, '..');
  const pipeline = fs.existsSync(path.join(root, 'course', 'holding', 'items')) ? buildPipeline(root) : null;
  const report = buildReport(set, source), markdown = renderMarkdown(report, pipeline);
  if (opt.md) fs.writeFileSync(opt.md, markdown);
  if (opt.check) {
    const old = fs.existsSync(opt.check) ? fs.readFileSync(opt.check, 'utf8') : '';
    if (old !== markdown) throw new Error(`${opt.check} is stale; run node course/coverage-map.js --md ${opt.check}`);
    console.log(`${report.tunes.length} tunes have current coverage guidance`);
  }
  if (opt.json) console.log(JSON.stringify(report, null, 2));
  else if (!opt.md && !opt.check) process.stdout.write(markdown);
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (err) { console.error(err.message || err); process.exit(1); }
}

module.exports = { REGIONS, FUNCTIONS, TARGET_FUNCTIONS, regionOf, functionOf, buildReport, buildPipeline, launchRunway, renderMarkdown };
