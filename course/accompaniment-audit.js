#!/usr/bin/env node
'use strict';

/*
  Audit how every published tune reaches an accompaniment.

    node course/accompaniment-audit.js
    node course/accompaniment-audit.js --json
    node course/accompaniment-audit.js --md course/accompaniment-audit.md
    node course/accompaniment-audit.js --check course/accompaniment-audit.md
    node course/accompaniment-audit.js --annotate --repair-sources --repair-review

  --annotate adds only source-family facts that are already unambiguous in the
  imported Nottingham path: reel, waltz and Morris dance. It does not guess an
  idiom for nursery songs or other tunes whose function needs a human decision.
*/
const fs = require('fs');
const path = require('path');

// Keep this list and the Auto decision order aligned with index.html. The
// focused test runs the page's own styleFor over every published tune so a new
// playback style cannot silently leave the audit behind.
const STYLES = new Set([
  'pop', 'folk', 'march', 'waltz', 'jig', 'swing', 'bossa', 'ballad',
  'funk', 'reggaeton', 'afrobeats', 'lofi', 'trap', 'house', 'samba',
  'mento', 'minyo', 'persian', 'korean', 'drone', 'sizhu', 'andean',
]);
const CHORD = /"[A-G][#b♯♭]?[^\"]*"/g;
const NOTTINGHAM_ROOT = 'https://github.com/jukedeck/nottingham-dataset/blob/master/ABC_original/';
const NOTTINGHAM_FILES = new Set(['ashover.abc', 'hpps.abc', 'jigs.abc', 'morris.abc', 'playford.abc', 'reelsa-c.abc', 'reelsd-g.abc', 'reelsh-l.abc', 'reelsm-q.abc', 'reelsr-t.abc', 'reelsu-z.abc', 'slip.abc', 'waltzes.abc', 'xmas.abc']);

const field = (abc, name) => ((abc.match(new RegExp(`^${name}:\\s*(.+)$`, 'mi')) || [])[1] || '').trim();
const explicitStyle = abc => ((abc.match(/^%%?style\s+([a-z]+)/mi) || [])[1] || '').toLowerCase();

// Kept deliberately equivalent to index.html's styleFor. The test compares
// every tune with the page so this audit cannot silently drift from playback.
function styleDecision(abc) {
  const own = explicitStyle(abc);
  if (STYLES.has(own)) return { style: own, reason: 'explicit style' };
  const m = abc.match(/^M:\s*(\d+)\/(\d+)/m), num = m ? +m[1] : 4, den = m ? +m[2] : 4;
  const r = field(abc, 'R').toLowerCase();
  if (/jig|slide|slip/.test(r)) return { style: 'jig', reason: 'R field' };
  if (den === 8 && num % 3 === 0 && num !== 3) return { style: 'jig', reason: 'metre only' };
  if (/waltz|mazurka|minuet|valse/.test(r)) return { style: 'waltz', reason: 'R field' };
  if (num === 3) return { style: 'waltz', reason: 'metre only' };
  if (/swing|jazz|blues|rag|foxtrot|shuffle/.test(r)) return { style: 'swing', reason: 'R field' };
  if (/bossa|samba|latin|rumba|tango|beguine/.test(r)) return { style: 'bossa', reason: 'R field' };
  if (/march|polka|schottische|two-?step|quickstep/.test(r)) return { style: 'march', reason: 'R field' };
  if (/ballad|\bair\b|lullaby|hymn|carol|slow|lament|song/.test(r)) return { style: 'ballad', reason: 'R field' };
  if (/funk/.test(r)) return { style: 'funk', reason: 'R field' };
  if (/reggaeton|dembow/.test(r)) return { style: 'reggaeton', reason: 'R field' };
  if (/afrobeats?|afro-?pop/.test(r)) return { style: 'afrobeats', reason: 'R field' };
  if (/lo-?fi|hip-?hop|boom-?bap/.test(r)) return { style: 'lofi', reason: 'R field' };
  if (/house|edm|techno|disco/.test(r)) return { style: 'house', reason: 'R field' };
  if (/trap|drill/.test(r)) return { style: 'trap', reason: 'R field' };
  if (/mento|ring (game|tune)/.test(r)) return { style: 'mento', reason: 'R field' };
  if (/samba|roda|ciranda|coco|batucada|partido/.test(r)) return { style: 'samba', reason: 'R field' };
  if (/korea|arirang|gugak|janggu/.test(r)) return { style: 'korean', reason: 'R field' };
  if (/persian|iran|tasnif|tombak|daf/.test(r)) return { style: 'persian', reason: 'R field' };
  if (/min.?y[oō]|warabe|zashiki|koto/.test(r)) return { style: 'minyo', reason: 'R field' };
  if (/sizhu|silk.and.bamboo|jiangnan/.test(r)) return { style: 'sizhu', reason: 'R field' };
  if (/huayno|andean|sikuri|carnavalito/.test(r)) return { style: 'andean', reason: 'R field' };
  if (/reel|hornpipe|strathspey|country|bluegrass|old-?time|breakdown|fiddle|folk|barn/.test(r)) return { style: 'folk', reason: 'R field' };
  if (num === 2 && den === 4) return { style: 'folk', reason: 'metre only' };
  return { style: 'pop', reason: 'generic fallback' };
}

function sourceAnnotation(tune) {
  if (field(tune.abc, 'R')) return null;
  const base = path.basename(tune.source || '').toLowerCase();
  if (/^reels.*\.abc$/.test(base)) return { rhythm: 'reel' };
  if (base === 'waltzes.abc') return { rhythm: 'waltz' };
  if (base === 'morris.abc') return { rhythm: 'Morris dance', style: 'folk' };
  return null;
}

function annotateSourceRhythms(set) {
  const changes = [];
  for (const tune of set.tunes) {
    const annotation = sourceAnnotation(tune);
    if (!annotation) continue;
    const lines = [`R:${annotation.rhythm}`];
    if (annotation.style) lines.push(`%%style ${annotation.style}`);
    tune.abc = tune.abc.replace(/^(T:.*)$/m, `$1\n${lines.join('\n')}`);
    if (!tune.rhythm) tune.rhythm = annotation.rhythm;
    changes.push({ id: tune.id, title: tune.title, ...annotation });
  }
  return changes;
}

function canonicalNottinghamSource(tune) {
  const source = tune.source || '', file = path.basename(source).toLowerCase();
  if (!/private\/tmp|scratchpad/i.test(source) || !/%\s*Nottingham Music Database/i.test(tune.abc) || !NOTTINGHAM_FILES.has(file)) return null;
  return NOTTINGHAM_ROOT + file;
}

function repairSourcePaths(set) {
  const changes = [];
  for (const tune of set.tunes) {
    const source = canonicalNottinghamSource(tune);
    if (!source) continue;
    tune.source = source;
    if (!tune.licence) tune.licence = 'GPL-3.0';
    changes.push({ id: tune.id, title: tune.title, source });
  }
  return changes;
}

// Published tunes in the review queue keep their original set entry in a
// metadata line so --restore can put it back byte-for-byte. Repair that stored
// entry and its ABC body too, or restoring a reviewed tune would resurrect the
// private import path and lose the source-family rhythm.
function repairReviewQueue(itemsDir) {
  const changes = [];
  if (!fs.existsSync(itemsDir)) return changes;
  for (const file of fs.readdirSync(itemsDir).filter(name => name.endsWith('.abc')).sort()) {
    const full = path.join(itemsDir, file);
    let text = fs.readFileSync(full, 'utf8');
    if (!/^%\s*review-from:\s*published\s*$/mi.test(text)) continue;
    const meta = text.match(/^%\s*review-set-entry:\s*(\{.*\})\s*$/mi);
    if (!meta) continue;
    let entry;
    try { entry = JSON.parse(meta[1]); } catch (err) { throw new Error(`${file}: invalid review-set-entry JSON`); }
    const before = text;
    const annotation = sourceAnnotation({ abc: text, source: entry.source || '' });
    if (annotation) {
      const lines = [`R:${annotation.rhythm}`];
      if (annotation.style) lines.push(`%%style ${annotation.style}`);
      text = text.replace(/^(T:.*)$/m, `$1\n${lines.join('\n')}`);
      if (!entry.rhythm) entry.rhythm = annotation.rhythm;
    }
    const source = canonicalNottinghamSource({ abc: text, source: entry.source || '' });
    if (source) {
      entry.source = source;
      if (!entry.licence) entry.licence = 'GPL-3.0';
    }
    text = text.replace(/^%\s*review-set-entry:\s*\{.*\}\s*$/mi, `% review-set-entry: ${JSON.stringify(entry)}`);
    if (text !== before) {
      fs.writeFileSync(full, text);
      changes.push({ file, id: entry.id, source: entry.source, rhythm: entry.rhythm || '' });
    }
  }
  return changes;
}

function harmonySource(abc, decision) {
  const bandLines = [...abc.matchAll(/^%%?band\s+(.+)$/gmi)].map(m => m[1]);
  if (bandLines.some(line => /(?:^|\s)(?:chords|bass)\s*:|\|/.test(line))) return 'written chart';
  if (decision.style === 'drone') return 'tonic drone';
  if (decision.style === 'sizhu' || decision.style === 'andean') return 'no chords (heterophony)';   // the tune on a second instrument, no chords (index.html's noChords styles)
  if ((abc.match(CHORD) || []).length) return 'written chords';
  return 'detected chords';
}

function buildReport(set, source = 'course/set.json') {
  const tunes = set.tunes.map(tune => {
    const decision = styleDecision(tune.abc);
    const setSource = tune.source || '';
    const issues = [];
    if (decision.reason === 'generic fallback') issues.push('idiom not stated');
    if (!field(tune.abc, 'S') && !field(tune.abc, 'C')) issues.push('no source or composer in ABC');
    if (!field(tune.abc, 'O')) issues.push('no origin in ABC');
    if (/private\/tmp|scratchpad/i.test(setSource)) issues.push('temporary import path');
    return {
      id: tune.id,
      title: tune.title,
      level: tune.level,
      style: decision.style,
      chosenBy: decision.reason,
      harmony: harmonySource(tune.abc, decision),
      rhythm: field(tune.abc, 'R'),
      origin: field(tune.abc, 'O'),
      source: field(tune.abc, 'S') || field(tune.abc, 'C'),
      issues,
    };
  });
  const countBy = key => Object.fromEntries([...new Set(tunes.map(t => t[key]))].sort().map(value => [value, tunes.filter(t => t[key] === value).length]));
  return {
    schema: 1,
    source,
    tunes,
    summary: {
      styles: countBy('style'),
      selection: countBy('chosenBy'),
      harmony: countBy('harmony'),
      needingIdiomDecision: tunes.filter(t => t.issues.includes('idiom not stated')).length,
      provenanceFlags: tunes.filter(t => t.issues.some(i => i !== 'idiom not stated')).length,
      temporaryPaths: set.tunes.filter(t => /private\/tmp|scratchpad/i.test(t.source || '')).length,
      canonicalNottinghamSources: set.tunes.filter(t => (t.source || '').startsWith(NOTTINGHAM_ROOT)).length,
    },
  };
}

const cells = object => Object.entries(object).map(([k, v]) => `${k}: ${v}`).join('; ');
function renderMarkdown(report) {
  const undecided = report.tunes.filter(t => t.issues.includes('idiom not stated'));
  const flagged = report.tunes.filter(t => t.issues.length);
  return [
    '# Accompaniment audit',
    '',
    `Generated deterministically from \`${report.source}\` (${report.tunes.length} published tunes). This records what the page will actually do on **Auto**; it does not invent cultural metadata or treat detected chords as reviewed harmony.`,
    '',
    '## Summary',
    '',
    `- Auto styles: ${cells(report.summary.styles)}.`,
    `- Style selected by: ${cells(report.summary.selection)}.`,
    `- Harmony source: ${cells(report.summary.harmony)}.`,
    `- ${report.summary.needingIdiomDecision} tunes still fall through to generic pop because neither the tune nor its rhythm names an idiom.`,
    `- ${report.summary.provenanceFlags} tunes have at least one provenance field to repair; a temporary import path is never presented as a usable source.`,
    `- ${report.summary.canonicalNottinghamSources} Nottingham imports link to their canonical repository files; ${report.summary.temporaryPaths} published source paths point into temporary or private directories.`,
    '',
    '## Idiom decisions still needed',
    '',
    '| Tune | Level | Auto style | Harmony | What is known |',
    '|---|---:|---|---|---|',
    ...undecided.map(t => `| ${t.title.replace(/\|/g, '\\|')} | ${t.level} | ${t.style} | ${t.harmony} | ${[t.rhythm && `R: ${t.rhythm}`, t.origin && `O: ${t.origin}`, t.source && `source: ${t.source}`].filter(Boolean).join('; ') || '—'} |`),
    '',
    '## Whole-set audit',
    '',
    '| Tune | Auto style | Chosen by | Harmony | Flags |',
    '|---|---|---|---|---|',
    ...report.tunes.map(t => `| ${t.title.replace(/\|/g, '\\|')} | ${t.style} | ${t.chosenBy} | ${t.harmony} | ${t.issues.join('; ') || '—'} |`),
    '',
    '## Provenance repair queue',
    '',
    ...flagged.map(t => `- **${t.title}:** ${t.issues.join('; ')}.`),
    '',
  ].join('\n');
}

function parseArgs(argv) {
  const opt = { set: path.join(__dirname, 'set.json'), md: null, check: null, json: false, annotate: false, repairSources: false, repairReview: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--set' || a === '--md' || a === '--check') opt[a.slice(2)] = argv[++i];
    else if (a === '--json') opt.json = true;
    else if (a === '--annotate') opt.annotate = true;
    else if (a === '--repair-sources') opt.repairSources = true;
    else if (a === '--repair-review') opt.repairReview = true;
    else if (a === '-h' || a === '--help') opt.help = true;
    else throw new Error(`Unknown option ${a}`);
  }
  return opt;
}

function run(argv) {
  const opt = parseArgs(argv);
  if (opt.help) {
    console.log('Usage: node course/accompaniment-audit.js [--set FILE] [--annotate] [--repair-sources] [--repair-review] [--json] [--md FILE] [--check FILE]');
    return;
  }
  const set = JSON.parse(fs.readFileSync(opt.set, 'utf8'));
  if (opt.annotate) {
    const changes = annotateSourceRhythms(set);
    console.log(`${changes.length} source-family rhythm annotations written to ${opt.set}`);
  }
  if (opt.repairSources) {
    const changes = repairSourcePaths(set);
    console.log(`${changes.length} canonical Nottingham sources written to ${opt.set}`);
  }
  if (opt.annotate || opt.repairSources) fs.writeFileSync(opt.set, JSON.stringify(set, null, 1) + '\n');
  if (opt.repairReview) {
    const changes = repairReviewQueue(path.join(__dirname, 'review', 'items'));
    console.log(`${changes.length} reviewed Nottingham entries repaired`);
  }
  const source = path.relative(process.cwd(), path.resolve(opt.set)) || path.basename(opt.set);
  const report = buildReport(set, source), markdown = renderMarkdown(report);
  if (opt.md) fs.writeFileSync(opt.md, markdown);
  if (opt.check) {
    const old = fs.existsSync(opt.check) ? fs.readFileSync(opt.check, 'utf8') : '';
    if (old !== markdown) throw new Error(`${opt.check} is stale; run node course/accompaniment-audit.js --md ${opt.check}`);
    console.log(`${report.tunes.length} tunes have current accompaniment guidance`);
  }
  if (opt.json) console.log(JSON.stringify(report, null, 2));
  else if (!opt.md && !opt.check && !opt.annotate && !opt.repairSources && !opt.repairReview) process.stdout.write(markdown);
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (err) { console.error(err.message || err); process.exit(1); }
}

module.exports = { STYLES, NOTTINGHAM_ROOT, NOTTINGHAM_FILES, styleDecision, sourceAnnotation, annotateSourceRhythms, canonicalNottinghamSource, repairSourcePaths, repairReviewQueue, harmonySource, buildReport, renderMarkdown };
