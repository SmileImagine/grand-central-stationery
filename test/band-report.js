#!/usr/bin/env node
'use strict';
/*
  Measure the Band: every published tune in its Auto style, and a sweep of five tunes through every style, played
  in headless Chrome by the page itself (test/band-lab.js), scored by test/band-metrics.js.

    node test/band-report.js                          notes and audio, report to docs/BAND-METRICS.md
    node test/band-report.js --no-audio               the note metrics only (quick)
    node test/band-report.js --quick                  the sweep only, audio capped at 12 s
    node test/band-report.js --baseline               also save the results as test/band-metrics.baseline.json
    node test/band-report.js --json out.json          also write every result
    node test/band-report.js --styles pop,folk        the sweep in these styles only
    node test/band-report.js --sound air=0,room=0.2   the mix's settings (index.html's SOUND) for this run
    node test/band-report.js --samples old            the FluidR3 sample sets instead of the CC0 ones (SAMPLE_SETS)
    node test/band-report.js --set TONE.chordsHi.pan=0.3  any number in GCS.lab for this run (comma-separated for several)
    node test/band-report.js --out docs/x.md          write the report elsewhere (runs side by side)
    node test/band-report.js --keep --json x.json     keep every play's notes in the JSON (to look into one)

  The report compares each run with the saved baseline, so a change to the Band shows what it moved. It needs Google
  Chrome (or Edge, or CHROME=path) and python3 for a local server; it installs nothing.
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const M = require('./band-metrics.js');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2), flag = f => args.includes(f), opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const audio = !flag('--no-audio'), quick = flag('--quick');
const STYLES = ['pop', 'folk', 'march', 'waltz', 'jig', 'swing', 'bossa', 'ballad', 'funk', 'reggaeton', 'afrobeats', 'lofi', 'trap', 'house', 'samba', 'mento', 'minyo', 'persian', 'korean', 'drone'];
const SWEEP = ['waltzes-11-daisy-daisy', 'reelsa-c-28-billy-in-the-lowground', 'first-tunes-3-twinkle-twinkle-little-star', 'beginner-songs-11-skip-to-my-lou', 'original-pentatonic-2-crows-on-the-fence'];
const tunes = JSON.parse(fs.readFileSync(path.join(root, 'course/set.json'), 'utf8')).tunes;
const styles = opt('--styles') ? opt('--styles').split(',') : STYLES;
const sound = opt('--sound') ? Object.fromEntries(opt('--sound').split(',').map(kv => { const [k, v] = kv.split('='); return [k, Number(v)]; })) : null;
const jobs = [
  ...(quick ? [] : tunes.map(t => ({ id: t.id, abc: t.abc, style: 'auto', kind: 'auto' }))),
  ...SWEEP.map(id => tunes.find(t => t.id === id)).filter(Boolean).flatMap(t => styles.map(s => ({ id: t.id, abc: t.abc, style: s, kind: 'sweep' }))),
];

const get = url => new Promise((res, rej) => http.get(url, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROMES = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);

let usedSound = null;
async function main() {
  const chrome = CHROMES.find(p => fs.existsSync(p)); if (!chrome) throw new Error('No Chrome found: set CHROME=/path/to/chrome');
  const port = 8790 + Math.floor(Math.random() * 100);
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gcs-band-'));
  const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', '--no-first-run', '--no-default-browser-check', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
  const stop = () => { try { browser.kill(); } catch (e) {} try { server.kill(); } catch (e) {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} };
  process.on('exit', stop); process.on('SIGINT', () => { stop(); process.exit(130); });
  try {
    for (let i = 0; i < 100; i++) { try { if ((await get(`http://127.0.0.1:${port}/index.html`)).status === 200) break; } catch (e) {} await sleep(100); }
    let dport = null; for (let i = 0; i < 100 && !dport; i++) { try { dport = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch (e) { await sleep(100); } }
    if (!dport) throw new Error('Chrome did not open its DevTools port');
    const page = JSON.parse((await get(`http://127.0.0.1:${dport}/json/list`)).body).find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let seq = 0; const waiting = new Map();
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
    const cdp = (method, params = {}) => new Promise(res => { const id = ++seq; waiting.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
    const evaluate = async (expression, awaitPromise = false) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result && r.result.result && r.result.result.value; };
    await cdp('Page.navigate', { url: `http://127.0.0.1:${port}/index.html` });
    for (let i = 0; i < 300; i++) { if (await evaluate('document.readyState === "complete" && !!window.GCS && !!window.ABCJS').catch(() => false)) break; await sleep(100); }
    for (const f of ['band-metrics.js', 'band-lab.js']) await evaluate(fs.readFileSync(path.join(__dirname, f), 'utf8'));
    if (sound) await evaluate(`Object.assign(GCS.lab.SOUND, ${JSON.stringify(sound)})`);
    if (opt('--samples') === 'old') await evaluate('GCS.lab.SAMPLE_SETS.use = false');
    for (const kv of (opt('--set') || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); if (!/^[A-Za-z_][\w.]*$/.test(k) || !Number.isFinite(Number(v))) throw new Error(`--set wants path=number: ${kv}`); await evaluate(`GCS.lab.${k} = ${Number(v)}`); }
    usedSound = await evaluate('GCS.lab.SOUND ? JSON.stringify(GCS.lab.SOUND) : null');
    await evaluate(`BandLab.start(${JSON.stringify({ jobs: jobs.map(({ id, abc, style }) => ({ id, abc, style })), inst: 'recorder', audio, keepNotes: flag('--keep'), maxMs: quick ? 12000 : 24000 })})`);
    const t0 = Date.now(); let last = -1;
    for (;;) { const s = await evaluate('BandLab.state()'); if (s.at !== last) { process.stderr.write(`\r${s.at}/${s.of} played (${Math.round((Date.now() - t0) / 1000)} s)`); last = s.at; } if (s.done) { if (s.error) throw new Error(s.error); break; } await sleep(500); }
    process.stderr.write('\n');
    const results = JSON.parse(await evaluate('JSON.stringify(BandLab.results())'));
    results.forEach((r, i) => { r.kind = jobs[i].kind; });
    if (audio) { results.voices = await evaluate('BandLab.voices()', true); results.thinning = await evaluate("BandLab.thinning(['acoustic_grand_piano', 'acoustic_guitar_nylon', 'electric_piano_1', 'recorder', 'acoustic_bass'])", true); }
    ws.close();
    return results;
  } finally { stop(); }
}

// ---- the report ----
const median = a => { const b = a.filter(x => x !== null && x !== undefined && Number.isFinite(x)).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const fmt = (x, d = 2) => x === null || x === undefined || !Number.isFinite(x) ? '–' : (Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(d));
const bytesOf = used => used.reduce((a, u) => { const [folder, note] = u.split('|'); const f = path.join(root, 'vendor/soundfont', `${folder}-mp3`, `${note}.mp3`); try { return a + fs.statSync(f).size; } catch (e) { return a; } }, 0);
const NOTE_COLS = [['flatNinth', 'flat 9th'], ['chordsAbove', 'above'], ['chordFit', 'fit'], ['mud', 'mud'], ['topMove', 'top move'], ['bassRoots', 'roots'], ['timingDrums', 'drums ms'], ['timingBass', 'bass ms'], ['timingChords', 'chords ms'], ['accentBass', 'accent'], ['answered', 'answered'], ['repeatDrums', 'drum repeat'], ['arcRange', 'arc']];
const AUDIO_COLS = [['lufs', 'LUFS'], ['peak', 'peak'], ['prominence', 'melody LU'], ['masked', 'masked'], ['tilt', 'tilt dB/oct'], ['bandLowMid', 'band 200–500'], ['centroid', 'centroid Hz'], ['width', 'width'], ['cpu', 'cpu ×'], ['kb', 'samples KB']];

function report(results, base) {
  const ok = results.filter(r => !r.error);
  for (const r of ok) { r.fails = [...M.check(r.notes, M.GUARDS, r.style), ...(r.audio ? M.check(r.audio, M.AUDIO_GUARDS, r.style) : [])]; if (r.audio) r.audio.kb = Math.round(bytesOf(r.used) / 1024); }
  const lines = [];
  lines.push('# The Band, measured', '');
  lines.push(`Generated by \`node test/band-report.js${audio ? '' : ' --no-audio'}${quick ? ' --quick' : ''}\` on ${new Date().toISOString().slice(0, 10)}: ${ok.length} plays (${ok.filter(r => r.kind === 'auto').length} published tunes in their Auto style, ${ok.filter(r => r.kind === 'sweep').length} in the style sweep), melody on the recorder, Feel 50${opt('--set') ? `, ${opt('--set')}` : ''}${usedSound ? `, sound ${usedSound.replace(/"/g, '')}` : ''}, ${opt('--samples') === 'old' ? 'the FluidR3 samples' : 'the CC0 samples where there are'}, the first time round${audio ? `, rendered offline up to ${quick ? 12 : 24} s` : ''}. Metrics and guardrails are in \`test/band-metrics.js\`; a bound is a first guess, to be changed when listening disagrees.`, '');
  const errs = results.filter(r => r.error); if (errs.length) lines.push(`**${errs.length} plays failed:** ${errs.map(r => `${r.id} (${r.asked})`).join(', ')}.`, '');
  // Guardrails broken, most often first.
  const count = new Map(); for (const r of ok) for (const f of r.fails) count.set(f.metric, (count.get(f.metric) || 0) + 1);
  const all = [...M.GUARDS, ...M.AUDIO_GUARDS];
  lines.push('## Guardrails', '', '| Metric | Bound | Plays outside | Why |', '| --- | --- | --- | --- |');
  for (const [k, lo, hi, why, ex] of all) lines.push(`| ${k} | ${lo === null ? '' : '≥ ' + lo}${lo !== null && hi !== null ? ', ' : ''}${hi === null ? '' : '≤ ' + hi} | ${count.get(k) || 0} of ${ok.filter(r => k in r.notes || (r.audio && k in r.audio)).length} | ${why}${ex ? ` (not in ${ex === 'brass' ? 'the march: a tuba’s sound is there' : `the ${ex} styles`})` : ''} |`);
  lines.push('');
  // Against the baseline: the median of each metric over the same plays.
  if (base) {
    const key = r => r.id + '|' + r.asked, B = new Map(base.filter(r => !r.error).map(r => [key(r), r]));
    const pairs = ok.filter(r => B.has(key(r))).map(r => [B.get(key(r)), r]);
    lines.push(`## Against the baseline (${pairs.length} plays in both)`, '', '| Metric | Baseline | Now | Change |', '| --- | --- | --- | --- |');
    for (const [k] of [...NOTE_COLS, ...AUDIO_COLS]) {
      const a = median(pairs.map(([b]) => (b.notes[k] ?? (b.audio || {})[k]))), b = median(pairs.map(([, r]) => (r.notes[k] ?? (r.audio || {})[k])));
      if (a === null && b === null) continue; lines.push(`| ${k} | ${fmt(a)} | ${fmt(b)} | ${a === null || b === null ? '' : (b - a >= 0 ? '+' : '') + fmt(b - a)} |`);
    }
    lines.push('');
  }
  const table = (title, rows, label) => {
    lines.push(`## ${title}`, '', `Notes. Medians of ${label}.`, '', `| ${label === 'the five tunes' ? 'Style' : 'Tune'} | ${NOTE_COLS.map(c => c[1]).join(' | ')} | outside |`, `| --- | ${NOTE_COLS.map(() => '---').join(' | ')} | --- |`);
    for (const [name, rs] of rows) lines.push(`| ${name} | ${NOTE_COLS.map(([k]) => fmt(median(rs.map(r => r.notes[k])))).join(' | ')} | ${[...new Set(rs.flatMap(r => r.fails.map(f => f.metric)))].join(', ')} |`);
    lines.push('');
    if (!rows.some(([, rs]) => rs.some(r => r.audio))) return;
    lines.push('Audio.', '', `| ${label === 'the five tunes' ? 'Style' : 'Tune'} | ${AUDIO_COLS.map(c => c[1]).join(' | ')} |`, `| --- | ${AUDIO_COLS.map(() => '---').join(' | ')} |`);
    for (const [name, rs] of rows) lines.push(`| ${name} | ${AUDIO_COLS.map(([k]) => fmt(median(rs.map(r => r.audio && r.audio[k])))).join(' | ')} |`);
    lines.push('');
  };
  const sweep = ok.filter(r => r.kind === 'sweep'), byStyle = new Map(); for (const r of sweep) { if (!byStyle.has(r.asked)) byStyle.set(r.asked, []); byStyle.get(r.asked).push(r); }
  if (sweep.length) table('Each style (the sweep)', [...byStyle], 'the five tunes');
  const auto = ok.filter(r => r.kind === 'auto');
  if (auto.length) table('Each published tune (Auto)', auto.map(r => [`${r.id.replace(/^[a-z-]+?-\d+-/, '')} (${r.style})`, [r]]), 'one play');
  if (results.voices) {
    const kb = folder => { const d = path.join(root, 'vendor/soundfont', folder + '-mp3'); try { const fs_ = fs.readdirSync(d); return { kb: Math.round(fs_.reduce((a, f) => a + fs.statSync(path.join(d, f)).size, 0) / 1024), files: fs_.length }; } catch (e) { return { kb: 0, files: 0 }; } };
    lines.push('## Voices: samples and synthesis', '', 'Each voice alone on the same passage (four-note chords every half second for 8 s; drums a kick, snare and hat). **cpu ×**: seconds of offline rendering per second of sound, on this machine. **95% under**: the frequency below which 95% of a note\'s energy lies. **top**: the highest frequency within 60 dB of its loudest. **sustain**: how long one held note sounds within 40 dB of its peak, from its start (s). **download**: the whole set on disk.', '', '| Voice | made by | download KB | files | cpu × | 95% under Hz | top Hz | sustain s |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
    for (const v of results.voices) { const k = v.synth ? { kb: 0, files: 0 } : kb(v.folder); lines.push(`| ${v.folder} | ${v.synth ? 'synthesis' : 'samples'} | ${k.kb} | ${k.files} | ${fmt(v.cpu, 3)} | ${v.rolloff} | ${v.top} | ${fmt(v.sustain)} |`); }
    lines.push('');
  }
  if (results.thinning) {
    lines.push('## Thinner sample sets', '', 'A set may keep only every few notes and retune the nearest for the rest (`SAMPLE_STEP` in index.html). The cost: the log-spectral distance between each note from G3 to C5 and its neighbour retuned to it (dB, third-octave bands 100 Hz to 8 kHz, median). Every third note kept means a semitone at most and a third of the download; every fourth, a tone and a quarter.', '', '| Set | a semitone dB | a tone dB |', '| --- | --- | --- |');
    for (const t of results.thinning) lines.push(`| ${t.folder} | ${fmt(t.semitone)} | ${fmt(t.tone)} |`);
    lines.push('');
  }
  lines.push('## Reading the columns', '',
    '- **flat 9th**: share of the melody\'s time with a band note a semitone under it (in any octave). **above**: with a chord note at or above it. **fit**: the melody\'s strong-beat notes that are in the chord.',
    '- **mud**: chords (with the bass under them) breaking a low interval limit. **top move**: semitones the chords\' top voice moves at a change. **roots**: downbeat bass notes on the root.',
    '- **drums / bass / chords ms**: the spread of onsets around the grid, the part\'s own lean taken out. A sequencer is 0; a good player is a few ms.',
    '- **accent**: correlation of the bass\'s velocity with the beat\'s strength. **answered**: the band\'s onsets a beat in the melody\'s holes (two beats or more) against its average; above 1 it plays more where the melody leaves room. **drum repeat**: how alike each bar\'s drums are to the last (1 the same). **arc**: the fullest time round\'s weight against the lightest.',
    '- **LUFS**: integrated loudness (BS.1770). **melody LU**: the melody alone against the band alone. **masked**: share of the melody\'s three strongest third-octave bands (frame by frame) where the band is as loud. **tilt**: slope of the octave-band spectrum, 63 Hz to 8 kHz. **band 200–500**: the band alone, its share of energy in the low mids. **width**: side against mid (0 is mono). **cpu ×**: seconds to render a second of the band offline. **samples KB**: the sample files the play loads.', '');
  return lines.join('\n');
}

main().then(results => {
  const basePath = path.join(__dirname, 'band-metrics.baseline.json'), slim = results.map(({ capture, used, ...r }) => r);
  const base = fs.existsSync(basePath) ? JSON.parse(fs.readFileSync(basePath, 'utf8')) : null;
  fs.writeFileSync(opt('--out') || path.join(root, 'docs/BAND-METRICS.md'), report(results, flag('--baseline') ? null : base));
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(results, null, 1));
  if (flag('--baseline')) fs.writeFileSync(basePath, JSON.stringify(slim));
  const bad = results.filter(r => r.error);
  console.log(`Wrote docs/BAND-METRICS.md: ${results.length - bad.length} plays measured${bad.length ? `, ${bad.length} failed` : ''}${flag('--baseline') ? '; saved the baseline' : base ? '; compared with the baseline' : ''}.`);
  if (bad.length) { console.error(bad.slice(0, 3).map(r => `${r.id} ${r.asked}: ${r.error.split('\n')[0]}`).join('\n')); process.exitCode = 1; }
}).catch(err => { console.error(err); process.exit(1); });
