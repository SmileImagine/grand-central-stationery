#!/usr/bin/env node
'use strict';

/*
  Classroom range report for the published tune set.

  The tune analyzer already measures written low and high pitches. This tool
  turns those measurements into a practical answer for a teacher: can the
  class sing or play the tune as written, and if not, will the page's
  one-octave Transpose control put it in range?

    node course/classroom-fit.js
    node course/classroom-fit.js --json
    node course/classroom-fit.js --md course/classroom-fit.md
    node course/classroom-fit.js --check course/classroom-fit.md
*/
const fs = require('fs');
const path = require('path');
const ABCJS = require(path.join(__dirname, '..', 'vendor', 'abcjs-basic-min.js'));
const Analyze = require(path.join(__dirname, 'analyze.js'));

// These are deliberately named, inspectable teaching profiles rather than a
// claim that every child or every instrument has the same range.
const PROFILES = [
  { id: 'voice', name: 'Young unison voices', low: 60, high: 74, note: 'C4-D5; the plan\'s deliberately conservative starting range' },
  { id: 'recorder', name: 'Soprano recorder', low: 72, high: 98, note: 'C5-D7, ordinary written/sounding range' },
  { id: 'ukulele', name: 'Soprano ukulele (12 frets)', low: 60, high: 81, note: 'C4-A5; melody notes available on the page\'s standard tuning' },
  { id: 'oneOctave', name: 'One-octave classroom set', low: 60, high: 72, note: 'C4-C5; a conservative Boomwhacker or barred-instrument set' },
];
const MAX_TRANSPOSE = 12;
const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const ROOT_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const MODE_TO_MAJOR = { '': 0, maj: 0, ion: 0, m: 3, min: 3, aeo: 3, dor: 10, phr: 8, lyd: 7, mix: 5, loc: 1 };
const MAJOR_SIGNATURE_COST = [0, 5, 2, 3, 4, 1, 6, 1, 4, 3, 2, 5];

const midiName = midi => midi === null || midi === undefined ? '—' : `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;
const signed = n => n > 0 ? `+${n}` : String(n);

function transposeKey(key, semitones) {
  if (!key || !semitones) return key || '—';
  const m = /^([A-G])([#b]?)(.*)$/.exec(key);
  if (!m) return key;
  const pc = (ROOT_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + semitones + 120) % 12;
  return NOTE_NAMES[pc] + m[3];
}

function keySignatureCost(key) {
  const m = /^([A-G])([#b]?)(.*)$/.exec(key || '');
  if (!m) return 99;
  const root = (ROOT_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 120) % 12;
  const rawMode = m[3].toLowerCase();
  const mode = rawMode === 'm' ? 'm' : rawMode.slice(0, 3);
  const relativeMajor = (root + (MODE_TO_MAJOR[mode] === undefined ? 0 : MODE_TO_MAJOR[mode])) % 12;
  return MAJOR_SIGNATURE_COST[relativeMajor];
}

function bestFit(low, high, profile, key = '') {
  const width = high - low;
  const min = Math.max(-MAX_TRANSPOSE, profile.low - low);
  const max = Math.min(MAX_TRANSPOSE, profile.high - high);
  const candidates = [];
  for (let n = Math.ceil(min); n <= Math.floor(max); n++) candidates.push(n);
  if (!candidates.length) return {
    possible: false,
    fitsAsWritten: false,
    transpose: null,
    low: null,
    high: null,
    reason: width > profile.high - profile.low ? 'too wide' : `needs more than ±${MAX_TRANSPOSE}`,
  };
  const centre = (profile.low + profile.high) / 2;
  // Never move a tune that already fits. Otherwise prefer a readable key,
  // then the smaller shift, then the placement nearest the profile's centre.
  if (candidates.includes(0)) candidates.splice(0, candidates.length, 0);
  else candidates.sort((a, b) => keySignatureCost(transposeKey(key, a)) - keySignatureCost(transposeKey(key, b))
    || Math.abs(a) - Math.abs(b)
    || Math.abs((low + high) / 2 + a - centre) - Math.abs((low + high) / 2 + b - centre)
    || a - b);
  const transpose = candidates[0];
  return { possible: true, fitsAsWritten: transpose === 0, transpose, low: low + transpose, high: high + transpose, reason: null };
}

function buildReport(set, setPath = 'course/set.json') {
  const tunes = set.tunes.map(tune => {
    const analyzed = Analyze.analyzeAbc(tune.abc, ABCJS)[0];
    if (!analyzed || analyzed.error || !analyzed.features || analyzed.features.lowMidi === null) {
      throw new Error(`${tune.id || tune.title}: could not analyze pitches${analyzed && analyzed.error ? ` (${analyzed.error})` : ''}`);
    }
    const f = analyzed.features;
    const fits = Object.fromEntries(PROFILES.map(profile => {
      const fit = bestFit(f.lowMidi, f.highMidi, profile, f.keyName || tune.key);
      if (fit.possible) fit.suggestedKey = transposeKey(f.keyName || tune.key, fit.transpose);
      return [profile.id, fit];
    }));
    return {
      id: tune.id,
      title: tune.title || f.title,
      level: tune.level,
      key: f.keyName || tune.key || '',
      low: f.lowMidi,
      high: f.highMidi,
      span: f.rangeSemitones,
      fits,
    };
  });
  const profiles = PROFILES.map(profile => {
    const results = tunes.map(t => t.fits[profile.id]);
    return {
      ...profile,
      asWritten: results.filter(r => r.fitsAsWritten).length,
      withTranspose: results.filter(r => r.possible).length,
      unavailable: results.filter(r => !r.possible).length,
    };
  });
  return { schema: 1, source: setPath, transposeLimit: MAX_TRANSPOSE, profiles, tunes };
}

function fitLabel(tune, profileId) {
  const fit = tune.fits[profileId];
  if (!fit.possible) return fit.reason;
  if (fit.fitsAsWritten) return 'as written';
  return `${signed(fit.transpose)} → ${fit.suggestedKey} (${midiName(fit.low)}-${midiName(fit.high)})`;
}

function renderMarkdown(report) {
  const voice = report.profiles.find(p => p.id === 'voice');
  const lines = [
    '# Classroom range report',
    '',
    `Generated deterministically from \`${report.source}\` (${report.tunes.length} published tunes). A suggestion stays within the page's ±${report.transposeLimit}-semitone control and puts every melody note in the named range. A key that already fits is left alone; otherwise the report prefers an easier key signature, then the smaller shift. It is a starting key for rehearsal, not a judgement about an individual singer.`,
    '',
    '## Range profiles',
    '',
    '| Profile | Range | As written | With transposition | No fit |',
    '|---|---:|---:|---:|---:|',
    ...report.profiles.map(p => `| ${p.name} | ${midiName(p.low)}-${midiName(p.high)} | ${p.asWritten} | ${p.withTranspose} | ${p.unavailable} |`),
    '',
    ...report.profiles.map(p => `- **${p.name}:** ${p.note}.`),
    '',
    '## Singing keys to try',
    '',
    `${voice.asWritten} tunes already sit wholly in C4-D5. The table lists the rest; “too wide” means transposition cannot solve the span.`,
    '',
    '| Tune | Level | Written key and range | Young voices |',
    '|---|---:|---|---|',
    ...report.tunes.filter(t => !t.fits.voice.fitsAsWritten).map(t => `| ${t.title.replace(/\|/g, '\\|')} | ${t.level} | ${t.key || '—'}; ${midiName(t.low)}-${midiName(t.high)} (${t.span} semitones) | ${fitLabel(t, 'voice')} |`),
    '',
    '## Whole-set classroom check',
    '',
    '| Tune | Voice | Recorder | Ukulele | One octave |',
    '|---|---|---|---|---|',
    ...report.tunes.map(t => `| ${t.title.replace(/\|/g, '\\|')} | ${fitLabel(t, 'voice')} | ${fitLabel(t, 'recorder')} | ${fitLabel(t, 'ukulele')} | ${fitLabel(t, 'oneOctave')} |`),
    '',
  ];
  return lines.join('\n');
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
    console.log('Usage: node course/classroom-fit.js [--set FILE] [--json] [--md FILE] [--check FILE]');
    return;
  }
  const set = JSON.parse(fs.readFileSync(opt.set, 'utf8'));
  const source = path.relative(process.cwd(), path.resolve(opt.set)) || path.basename(opt.set);
  const report = buildReport(set, source);
  const markdown = renderMarkdown(report);
  if (opt.md) fs.writeFileSync(opt.md, markdown);
  if (opt.check) {
    const old = fs.existsSync(opt.check) ? fs.readFileSync(opt.check, 'utf8') : '';
    if (old !== markdown) throw new Error(`${opt.check} is stale; run node course/classroom-fit.js --md ${opt.check}`);
    console.log(`${report.tunes.length} tunes have current classroom range guidance`);
  }
  if (opt.json) console.log(JSON.stringify(report, null, 2));
  else if (!opt.md && !opt.check) process.stdout.write(markdown);
}

if (require.main === module) {
  try { run(process.argv.slice(2)); }
  catch (err) { console.error(err.message || err); process.exit(1); }
}

module.exports = { PROFILES, MAX_TRANSPOSE, midiName, transposeKey, keySignatureCost, bestFit, buildReport, fitLabel, renderMarkdown };
