#!/usr/bin/env node
'use strict';
/*
  The cursors of a song in parts, checked in headless Chrome: each voice's cursor (tl.parts) moves forward along each
  line of the score, never back, except where a repeat or an ending takes it back to notes it has already played; and
  where the voices start a note together in one column, their cursors stand together. Dragging the first voice's
  cursor seeks along the same places (Engine.timeline), so the drag axis is checked the same way.

    node test/cursor-columns.js                       the fixtures below
    node test/cursor-columns.js --set                 also every tune in course/set.json and course/rhythm-set.json
    node test/cursor-columns.js --abc a.abc b.abc     also these files
    node test/cursor-columns.js --dump out.json       write every voice's x and ms for every tune checked
    node test/cursor-columns.js --page other.html     load another copy of the page (to compare a dump before a change)

  abcjs does not always set notes that sound together on two staves in one column: against a triplet, the other
  voice's quarter sits to the left. The cursor took the leftmost head of every voice at the moment, so it stepped back
  there and forward again at its next note (Five Windows, bars 5-8). It needs Google Chrome (or Edge, or CHROME=path)
  and python3 for a local server; it installs nothing.
*/
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2), flag = f => args.includes(f), opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const after = f => { const i = args.indexOf(f); if (i < 0) return []; const out = []; for (let j = i + 1; j < args.length && !args[j].startsWith('--'); j++) out.push(args[j]); return out; };

// together: the voices share every column, so where both start a note the cursors must stand together.
const FIXTURES = [
  { id: 'triplets against quarters', abc: `X:1
T:Triplets against quarters
M:5/4
L:1/8
Q:1/4=104
K:Am
V:1 name="Melody"
V:2 name="Ostinato"
[V:1] "Dm"(3DFA d2 z2 (3DFA c2 | "Am"(3EAc e2 d c A4 | "Dm"(3DFA d2 c A "E"B4 | ^G2 A B E2 z4 |
[V:2] D2 A2 A2 D2 A2 | A,2 E2 E2 A,2 E2 | D2 A2 A2 E2 B2 | E2 B2 B2 E2 B2 |
[V:1] (3cBA (3GFE D2 (3EFG A2 | (3ABc (3dcB A4 z2 |]
[V:2] D2 A2 A2 D2 A2 | A,2 E2 E2 A,4 |]
` },
  // Five Windows (Grand Central Stationery, CC0), its music only: the song that showed the cursor stepping back.
  { id: 'Five Windows', abc: `X:1
T:Five Windows
M:5/4
L:1/8
Q:1/4=104
K:Am
V:1 name="Melody" sname="1"
V:2 name="Ostinato" sname="2"
[V:1] "Am"E2 A B c2 e4 | "Dm"d2 c A F2 z3 E | "E"E2 ^G2 B2 e2 B2 | "Am"e2 c B A2 z4 |
w: Three on the top floor, two by the door, and one, two, three, four, five, lights in the night.
[V:1] "Dm"(3DFA d2 z2 (3DFA c2 | "Am"(3EAc e2 d c A4 | "Dm"(3DFA d2 c A "E"B4 | ^G2 A B E2 z4 |
w: some-one's a-sleep, some-one's a-wake, some-one is play-ing a tune, five of them shin-ing a light out on the street.
[V:1] "Am"E2 A B c2 e4 | "Dm"d2 c A F2 z3 E | "E"E2 ^G2 B2 e2 B2 | e2 d2 B2 "Am"A4 |]
w: Three on the top floor, two by the door, and one, two, three, four, five, all say good-night.
[V:2] A,2 E2 E2 A,2 E2 | D2 A2 A2 D2 A2 | E2 B2 B2 E2 B2 | A,2 E2 E2 A,2 E2 |
[V:2] D2 A2 A2 D2 A2 | A,2 E2 E2 A,2 E2 | D2 A2 A2 E2 B2 | E2 B2 B2 E2 B2 |
[V:2] A,2 E2 E2 A,2 E2 | D2 A2 A2 D2 A2 | E2 B2 B2 E2 B2 | E2 B2 B2 A,4 |]
` },
  { id: 'quarters in two parts', together: true, abc: `X:1
T:Quarters in two parts
M:4/4
L:1/4
Q:1/4=100
K:C
V:1 name="Melody"
V:2 name="Harmony"
[V:1] C D E F | G A B c | c B A G | F E D C |
[V:2] E, F, G, A, | B, C D E | E D C B, | A, G, F, E, |
` },
  { id: 'rests and held notes, with endings', abc: `X:1
T:Rests and held notes
M:4/4
L:1/8
Q:1/4=100
K:G
V:1 name="Melody"
V:2 name="Drone"
[V:1] |: G2 AB c2 BA | G4 z2 D2 |1 GABc d2 cB :|2 A2 G2 G4 |]
[V:2] |: G,8 | z4 D,4 |1 G,4 D,4 :|2 D,4 G,4 |]
` },
  { id: 'two voices on one staff', abc: `X:1
T:One staff
M:3/4
L:1/8
Q:1/4=96
K:D
"D"A2 F2 D2 & D6 | "A"(3EFG A2 c2 & A,2 C2 E2 | "D"d6 & F6 |]
` },
];

const get = url => new Promise((res, rej) => http.get(url, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => res({ status: r.statusCode, body: b })); }).on('error', rej));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHROMES = [process.env.CHROME, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].filter(Boolean);

// In the page: render the tune in a notation cell and read every voice's events.
const PAGE = `window.CursorLab = (() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let engine = null;
  async function cell() {
    if (engine) return engine;
    const before = new Set(GCS.engines.keys());
    GCS.addCell('abc');
    for (let i = 0; i < 200; i++) { for (const [id, e] of GCS.engines) if (!before.has(id) && e.entry) { engine = e; return e; } await sleep(50); }
    throw new Error('no notation cell');
  }
  return { async read(abc) {
    const e = await cell(), old = e.tl;
    e.entry.value = abc; e.render();
    for (let i = 0; i < 400; i++) { if (e.tl && e.tl !== old && !e.pending && !e.busy) break; await sleep(25); if (e.pending && !e.busy) e.render(); }
    if (!e.tl || e.tl === old) throw new Error('the tune did not render');
    // The cursors' events, then the axis dragging the first voice's cursor seeks along (Engine.timeline).
    const parts = [...(e.tl.parts || [e.tl.events]), e.timeline().lines.flatMap(L => L.events.map(p => ({ ...p, line: L.line })))];
    return parts.map(E => { const seen = new Map(); return E.map(p => {
      // A repeat or an ending plays the same notes again: their elements are the ones already seen.
      const els = (p.ev.elements || []).flat(), again = els.some(el => seen.has(el));
      els.forEach(el => seen.set(el, true));
      return { ms: Math.round(p.ms), line: p.line, staff: p.staff, x: p.x === null ? null : Math.round(p.x * 100) / 100, again, ev: e.tl.events.findIndex(q => q.ev === p.ev) };
    }); });
  } };
})();`;

// all: every voice's cursor events, then the drag axis.
function check(t, all) {
  const fails = [], parts = all.slice(0, -1), drag = all[all.length - 1];
  all.forEach((E, v) => {
    const who = E === drag ? 'the drag axis' : `voice ${v + 1}`;
    for (let i = 1; i < E.length; i++) {
      const a = E[i - 1], b = E[i];
      if (a.line !== b.line || a.x === null || b.x === null || b.again) continue;
      if (b.x < a.x - 0.5) fails.push(`${t.id}: ${who} steps back ${Math.round(a.x - b.x)} px on line ${b.line} at ${b.ms} ms (${a.x} → ${b.x})`);
    }
  });
  // Dragging moves the first voice's cursor: the axis is its events, where it stands.
  // (The axis is grouped by line, so a repeat's second time round comes in among its line's events: matched by time.)
  const first = new Map(parts[0].filter(p => p.x !== null).map(p => [p.ms, p]));
  if (first.size !== drag.length || drag.some(q => !first.has(q.ms) || Math.abs(first.get(q.ms).x - q.x) > 0.5)) fails.push(`${t.id}: the drag axis (${drag.length} events) is not where voice 1's cursor stands (${first.length} events)`);
  if (t.together && parts.length > 1) for (let v = 1; v < parts.length; v++) for (const p of parts[v]) {
    const q = p.ev >= 0 && parts[0].find(r => r.ev === p.ev);
    if (q && Math.abs(q.x - p.x) > 0.5) fails.push(`${t.id}: voice ${v + 1}'s cursor stands ${Math.round(Math.abs(q.x - p.x))} px from voice 1's at ${p.ms} ms though they start together`);
  }
  return fails;
}

async function main() {
  const tunes = [...FIXTURES];
  if (flag('--set')) for (const f of ['course/set.json', 'course/rhythm-set.json']) {
    const j = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
    for (const t of j.tunes || []) if (t.abc) tunes.push({ id: t.id, abc: t.abc });
  }
  for (const f of after('--abc')) tunes.push({ id: path.basename(f), abc: fs.readFileSync(f, 'utf8') });
  const chrome = CHROMES.find(p => fs.existsSync(p)); if (!chrome) throw new Error('No Chrome found: set CHROME=/path/to/chrome');
  const port = 8890 + Math.floor(Math.random() * 100), pageFile = opt('--page') || 'index.html';
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'gcs-cursor-'));
  const browser = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--window-size=1280,900', '--no-first-run', '--no-default-browser-check', 'about:blank'], { stdio: 'ignore' });
  const stop = () => { try { browser.kill(); } catch (e) {} try { server.kill(); } catch (e) {} try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) {} };
  process.on('exit', stop); process.on('SIGINT', () => { stop(); process.exit(130); });
  try {
    for (let i = 0; i < 100; i++) { try { if ((await get(`http://127.0.0.1:${port}/${pageFile}`)).status === 200) break; } catch (e) {} await sleep(100); }
    let dport = null; for (let i = 0; i < 100 && !dport; i++) { try { dport = fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]; } catch (e) { await sleep(100); } }
    if (!dport) throw new Error('Chrome did not open its DevTools port');
    const page = JSON.parse((await get(`http://127.0.0.1:${dport}/json/list`)).body).find(t => t.type === 'page');
    const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let seq = 0; const waiting = new Map();
    ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
    const cdp = (method, params = {}) => new Promise(res => { const id = ++seq; waiting.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
    const evaluate = async (expression, awaitPromise = false) => { const r = await cdp('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }); if (r.result && r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 600)); return r.result && r.result.result && r.result.result.value; };
    await cdp('Page.navigate', { url: `http://127.0.0.1:${port}/${pageFile}#lesson` });
    for (let i = 0; i < 300; i++) { if (await evaluate('document.readyState === "complete" && !!window.GCS && !!window.ABCJS').catch(() => false)) break; await sleep(100); }
    await evaluate(PAGE);
    const fails = [], dump = {};
    for (const t of tunes) {
      const parts = await evaluate(`CursorLab.read(${JSON.stringify(t.abc)})`, true);
      dump[t.id] = parts;
      const f = check(t, parts); fails.push(...f);
      const nv = parts.length - 1; process.stdout.write(`${f.length ? "FAIL" : "ok  "} ${t.id} (${nv} voice${nv > 1 ? "s" : ""}, ${parts.slice(0, -1).reduce((a, E) => a + E.length, 0)} events)\n`);
    }
    ws.close();
    if (opt('--dump')) fs.writeFileSync(opt('--dump'), JSON.stringify(dump, null, 1));
    if (fails.length) { console.error(fails.join('\n')); process.exitCode = 1; }
    else console.log(`cursor columns: ${tunes.length} tunes, every voice's cursor moves forward along each line`);
  } finally { stop(); }
}
main().catch(err => { console.error(err.stack || err); process.exit(1); });
