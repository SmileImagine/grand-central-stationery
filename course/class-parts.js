#!/usr/bin/env node
'use strict';

/*
  Classroom-part inventory and conservative recipe generator.

  It does not rewrite a published tune or claim that an automatically made
  bass line is an arrangement. It answers the safer first questions: which
  charts already supply harmony, what one-bar pulse and tonic/fifth cells fit
  the metre, which band part a class performance would replace, and which
  tunes work as rounds: each tune sung against itself by 2, 3 and 4 groups,
  scored as the page scores a %%round line (course/round-fit.js).
*/
const fs = require('fs');
const path = require('path');
const ABCJS = require(path.join(__dirname, '..', 'vendor', 'abcjs-basic-min.js'));
const Analyze = require('./analyze.js');
const Fit = require('./classroom-fit.js');
const Rounds = require('./round-fit.js');

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ABC_PC = ['C,', '^C,', 'D,', '_E,', 'E,', 'F,', '^F,', 'G,', '_A,', 'A,', '_B,', 'B,'];
const EASY_UKE = new Set(['C', 'C7', 'D', 'D7', 'Dm', 'E', 'E7', 'Em', 'F', 'G', 'G7', 'A', 'A7', 'Am', 'Bb']);

const esc = value => String(value || '').replace(/\|/g, '\\|');
const keyPc = key => {
  const m = /^([A-G])([#b]?)/.exec(key || '');
  return m ? (PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12 : null;
};

function chordSymbols(abc) {
  const out = [];
  for (const m of abc.matchAll(/"([^"]+)"/g)) {
    const token = m[1].replace(/^[\^_<>@]/, '').trim();
    if (/^[A-G](?:#|b)?(?:[^\s"]*)$/.test(token) && !out.includes(token)) out.push(token);
  }
  return out;
}

function transposeChord(chord, semitones) {
  if (!semitones) return chord;
  return chord.replace(/(^|\/)([A-G])([#b]?)/g, (all, slash, letter, accidental) => {
    const root = letter + accidental;
    return slash + Fit.transposeKey(root, semitones);
  });
}

function metreRecipe(num, den, compound) {
  const units = num * 8 / den;
  const pulses = compound ? num / 3 : num;
  if (!Number.isInteger(units) || !Number.isInteger(pulses) || pulses < 1 || units % pulses) return null;
  const duration = units / pulses;
  const d = duration === 1 ? '' : String(duration);
  return { units, pulses, duration, body: `${Array(pulses).fill(`B${d}`).join(' ')} |` };
}

function bassRecipe(key, metre) {
  const tonic = keyPc(key);
  if (tonic === null || !metre) return null;
  const fifth = (tonic + 7) % 12, d = metre.duration === 1 ? '' : String(metre.duration);
  const notes = Array.from({ length: metre.pulses }, (_, i) => `${ABC_PC[i % 2 ? fifth : tonic]}${d}`);
  return `${notes.join(' ')} |`;
}

// A tune as a round, from the page's plans for 2, 3 and 4 groups: 'round' when some plan fits well (85% or more of the
// notes sounding together on the beats) with no clash on a downbeat, 'try' when one comes close (80%, one downbeat
// clash), 'unison' when the groups would mostly sing the same notes (a so-mi chant: an echo, not a round), else 'no'.
// Each verdict keeps the most groups that reach it, and the %%round line to try.
const pct = x => Math.round(x * 100) + '%';
function roundVerdict(abc) {
  const r = Rounds.rounds(abc);
  if (!r) return { kind: 'no', status: 'not read', plan: null, line: null };
  const plans = r.plans.filter(p => p.parts === p.groups && p.fit !== null), parted = plans.filter(p => p.same <= 0.5);
  const most = list => list.reduce((a, b) => (!a || b.groups > a.groups || (b.groups === a.groups && b.fit > a.fit) ? b : a), null);
  const line = p => `%%round ${p.groups} every=${p.every}`;
  const good = most(parted.filter(p => p.fit >= 0.85 && !p.clash.length));
  if (good) return { kind: 'round', plan: good, line: line(good), status: `round: \`${line(good)}\`, ${pct(good.fit)}, no downbeat clash` };
  const near = most(parted.filter(p => p.fit >= 0.8 && p.clash.length <= 1));
  if (near) return { kind: 'try', plan: near, line: line(near), status: `try by ear: \`${line(near)}\`, ${pct(near.fit)}${near.clash.length ? `, downbeat clash in bar ${near.clash[0]}` : ''}` };
  if (plans.length && !parted.length) return { kind: 'unison', plan: plans[0], line: null, status: `mostly unison (${pct(plans[0].same)} the same notes): an echo, not a round` };
  const best = parted.reduce((a, b) => (!a || b.fit > a.fit ? b : a), null);
  return { kind: 'no', plan: best, line: null, status: best ? `not a round (best ${best.groups} every ${best.every}: ${pct(best.fit)}, ${best.clash.length} downbeat clash${best.clash.length === 1 ? '' : 'es'})` : 'too short for a round' };
}

function buildReport(set, source = 'course/set.json') {
  const fits = new Map(Fit.buildReport(set, source).tunes.map(tune => [tune.id, tune]));
  const tunes = set.tunes.map(tune => {
    const analyzed = Analyze.analyzeAbc(tune.abc, ABCJS)[0];
    if (!analyzed || analyzed.error || !analyzed.features) throw new Error(`${tune.id}: cannot analyze class parts`);
    const f = analyzed.features, voice = fits.get(tune.id).fits.voice;
    const transpose = voice.possible ? voice.transpose : 0;
    const rehearsalKey = voice.possible ? voice.suggestedKey : (f.keyName || tune.key || '');
    const writtenChords = chordSymbols(tune.abc), chords = writtenChords.map(chord => transposeChord(chord, transpose));
    const metre = metreRecipe(f.metreNum, f.metreDen, f.metreCompound);
    const hardChords = chords.filter(chord => !EASY_UKE.has(chord.replace(/\/.*$/, '')));
    const round = roundVerdict(tune.abc), roundCandidate = round.kind === 'round' || round.kind === 'try';
    let bassStatus = 'meter/key review';
    if (metre && keyPc(rehearsalKey) !== null) {
      if (!writtenChords.length) bassStatus = 'provisional tonic/fifth; harmony review';
      else if (writtenChords.length <= 2) bassStatus = 'simple-harmony rehearsal cell';
      else bassStatus = 'pulse recipe only; follow written chord roots';
    }
    return {
      id: tune.id,
      title: tune.title || f.title,
      level: tune.level,
      writtenKey: f.keyName || tune.key || '',
      rehearsalKey,
      transpose,
      metre: `${f.metreNum}/${f.metreDen}`,
      bars: f.barCount,
      bodyCell: metre ? metre.body : null,
      bassCell: bassRecipe(rehearsalKey, metre),
      bassStatus,
      writtenChords,
      chords,
      hardChords,
      harmonyStatus: writtenChords.length ? `${writtenChords.length} distinct written chord${writtenChords.length === 1 ? '' : 's'}` : 'no written chord symbols',
      ukuleleStatus: !writtenChords.length ? 'needs harmony review' : hardChords.length ? `review ${hardChords.join(', ')}` : 'ready from written chords',
      roundCandidate,
      round: { kind: round.kind, line: round.line, groups: round.plan && round.plan.groups, every: round.plan && round.plan.every, fit: round.plan && Math.round(round.plan.fit * 100) / 100, same: round.plan && Math.round(round.plan.same * 100) / 100, clash: round.plan ? round.plan.clash : [] },
      roundStatus: round.status,
      musicMinusOne: {
        bodyPercussion: 'mute band drums',
        bassOstinato: 'mute band bass',
        ukulele: 'mute band chords',
      },
    };
  });
  return {
    schema: 1,
    source,
    policy: 'Generated cells are rehearsal recipes, not approved arrangements; written harmony is never invented.',
    tunes,
    summary: {
      withWrittenHarmony: tunes.filter(t => t.writtenChords.length).length,
      withoutWrittenHarmony: tunes.filter(t => !t.writtenChords.length).length,
      easyUkulele: tunes.filter(t => t.writtenChords.length && !t.hardChords.length).length,
      roundCandidates: tunes.filter(t => t.roundCandidate).length,
      rounds: tunes.filter(t => t.round.kind === 'round').length,
      roundsToTry: tunes.filter(t => t.round.kind === 'try').length,
      unisonChants: tunes.filter(t => t.round.kind === 'unison').length,
      generatedBodyCells: tunes.filter(t => t.bodyCell).length,
      generatedBassCells: tunes.filter(t => t.bassCell).length,
    },
  };
}

function renderMarkdown(report) {
  const missing = report.tunes.filter(t => !t.writtenChords.length);
  const rounds = report.tunes.filter(t => t.round.kind === 'round'), tries = report.tunes.filter(t => t.round.kind === 'try'), unison = report.tunes.filter(t => t.round.kind === 'unison');
  return [
    '# Classroom-part inventory and rehearsal recipes',
    '',
    `Generated deterministically from \`${report.source}\` (${report.tunes.length} published tunes). These are **one-bar rehearsal recipes, not finished arrangements**. The generator never fabricates chord changes or a descant: it repeats a metre-appropriate body-percussion pulse, offers a tonic/fifth bass cell in the suggested rehearsal key, reports the chart's existing chord symbols, and sings each tune against itself to find the ones that work as rounds.`,
    '',
    'When the class takes a generated part, music-minus-one should mute the matching band part: body percussion → drums, bass ostinato → bass, ukulele → chords.',
    '',
    '## Summary',
    '',
    `- ${report.summary.generatedBodyCells}/${report.tunes.length} tunes have a generated body-percussion pulse cell; ${report.summary.generatedBassCells}/${report.tunes.length} have a tonic/fifth rehearsal cell.`,
    `- ${report.summary.withWrittenHarmony} tunes contain written chord symbols; ${report.summary.withoutWrittenHarmony} need harmony review before a ukulele part is claimed.`,
    `- ${report.summary.easyUkulele} tunes use only the small inspected ukulele-chord set after the suggested transposition.`,
    `- ${report.summary.rounds} tunes work as rounds and ${report.summary.roundsToTry} more are worth trying by ear; ${report.summary.unisonChants} would have the groups mostly singing the same notes.`,
    '',
    '## Per-tune recipes',
    '',
    '| Tune | L | Rehearsal key | Metre | Body percussion (L:1/8) | Bass cell (L:1/8) | Harmony / ukulele | As a round |',
    '|---|---:|---|---:|---|---|---|---|',
    ...report.tunes.map(t => `| ${esc(t.title)} | ${t.level} | ${esc(t.rehearsalKey || '—')}${t.transpose ? ` (${t.transpose > 0 ? '+' : ''}${t.transpose})` : ''} | ${t.metre} | ${t.bodyCell ? `\`${t.bodyCell}\`` : 'review'} | ${t.bassCell ? `\`${t.bassCell}\`` : 'review'}<br>${esc(t.bassStatus)} | ${esc(t.harmonyStatus)}<br>${esc(t.ukuleleStatus)} | ${esc(t.roundStatus)} |`),
    '',
    '## Harmony queue',
    '',
    'These charts have no written chord symbols. A teacher, arranger, or source should supply harmony—or explicitly mark a drone/unaccompanied treatment—before a ukulele chart or chord-following bass is generated.',
    '',
    ...missing.map(t => `- **${t.title}:** ${t.writtenKey || 'unknown key'}, ${t.metre}, level ${t.level}.`),
    '',
    '## Rounds',
    '',
    'Each tune is sung against itself by 2, 3 and 4 groups, the groups coming in at the distance the page picks for a `%%round` line with no `every=` (course/round-fit.js keeps a copy of the page\'s scoring). On every beat, each pair of notes the groups sound together is scored: unisons, thirds, fifths, sixths and octaves fit, fourths count half, seconds, sevenths and the tritone clash. A clash on a downbeat is what the ear catches; a passing one between beats is normal in a round. Bars are counted as played, repeats written out. The verdict keeps the most groups that reach it; the line goes after the tune\'s melody to try it on the page, where the same fit shows as a tip. Listen before publishing a round.',
    '',
    '**Work as rounds** (85% or more, no clash on a downbeat):',
    '',
    ...(rounds.length ? rounds.map(t => `- **${t.title}:** \`${t.round.line}\` (${pct(t.round.fit)}).`) : ['- None in this set.']),
    '',
    '**Worth trying by ear** (80% or more, at most one downbeat clash):',
    '',
    ...(tries.length ? tries.map(t => `- **${t.title}:** \`${t.round.line}\` (${pct(t.round.fit)}${t.round.clash.length ? `; clash on the downbeat of bar ${t.round.clash[0]}` : ''}).`) : ['- None in this set.']),
    '',
    '**Mostly unison** (the groups would sing the same notes more than half the time, as so–mi chants do; better as an echo or with an ostinato than as a round):',
    '',
    ...(unison.length ? unison.map(t => `- **${t.title}:** ${pct(t.round.same)} the same notes.`) : ['- None in this set.']),
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
  if (opt.help) { console.log('Usage: node course/class-parts.js [--set FILE] [--json] [--md FILE] [--check FILE]'); return; }
  const set = JSON.parse(fs.readFileSync(opt.set, 'utf8'));
  const source = path.relative(process.cwd(), path.resolve(opt.set)) || path.basename(opt.set);
  const report = buildReport(set, source), markdown = renderMarkdown(report);
  if (opt.md) fs.writeFileSync(opt.md, markdown);
  if (opt.check) {
    const old = fs.existsSync(opt.check) ? fs.readFileSync(opt.check, 'utf8') : '';
    if (old !== markdown) throw new Error(`${opt.check} is stale; run node course/class-parts.js --md ${opt.check}`);
    console.log(`${report.tunes.length} tunes have current class-part guidance`);
  }
  if (opt.json) console.log(JSON.stringify(report, null, 2));
  else if (!opt.md && !opt.check) process.stdout.write(markdown);
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (err) { console.error(err.message || err); process.exit(1); }
}

module.exports = { chordSymbols, transposeChord, metreRecipe, bassRecipe, roundVerdict, buildReport, renderMarkdown };
