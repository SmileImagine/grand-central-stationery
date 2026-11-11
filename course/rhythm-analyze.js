/*
  Grand Central Stationery: rhythm difficulty analyzer.

  Reads a drum pattern written the way the Rhythm and Dance lab writes it,

      meter: 4/4
      kick:  x... x... x... x...
      snare: .... x... .... x...
      hat:   x.x. x.x. x.x. x.x.

  (one line per part, the steps of a bar sharing it equally, x hit, X accent,
  o soft, . rest, | between bars) and describes it three ways, as analyze.js
  does for tunes:

    features  numbers measured from the hits: finest subdivision, off-beat and
              syncopated hits, parts and how far they move together, density,
              metre, bars, tempo.
    skills    tags naming what a player must be able to do ("div:1/4",
              "sync", "parts:3", "metre:6/8", "poly").
    grade     a rung per dimension of the lattice below, an overall level
              (1 to 6) and a score for ordering within a level.

  Importers turn two free corpora into this text: fromGrooveSteps(json) reads
  the GrooveSteps grids (CC0) and fromMidi(bytes, meta) reads a Groove MIDI
  Dataset performance (CC BY 4.0, Magenta), quantising each bar to the grid
  that fits it best and keeping the bar the drummer played most.

  Works in Node (module.exports) and in a page (window.GCSRhythm).
*/
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.GCSRhythm = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PARTS = ['kick', 'snare', 'rim', 'hat', 'open', 'tom', 'low', 'crash', 'ride', 'clap', 'wood', 'bell', 'clave', 'shaker', 'stomp', 'pat', 'snap', 'click', 'drum'];
  const EPS = 1e-6;

  /* ---------- text ---------- */
  function parse(text) {
    const r = { meter: [4, 4], rows: [], problems: [], title: '', meta: {} };
    text.split('\n').forEach((raw, li) => {
      const line = raw.replace(/\/\/.*$/, '').trim(); if (!line) return;
      const m = line.match(/^([a-z][a-z0-9 _-]*?)\s*:\s*(.*)$/i);
      if (!m) { r.problems.push(`Line ${li + 1}: wants "name: steps".`); return; }
      const name = m[1].trim().toLowerCase(), body = m[2].trim();
      if (name === 'meter') { const mm = body.match(/^(\d+)\s*\/\s*(\d+)$/); if (mm) r.meter = [+mm[1], +mm[2]]; else r.problems.push(`Line ${li + 1}: meter wants 4/4 or 3/4.`); return; }
      if (name === 'title') { r.title = body; return; }
      if (['bpm', 'tempo', 'style', 'source', 'licence', 'license', 'id', 'origin', 'difficulty', 'note', 'round'].includes(name)) { r.meta[name === 'tempo' ? 'bpm' : name] = body; return; }
      const bars = body.split('|').map(b => b.replace(/\s+/g, '')).filter(b => b.length);
      if (!bars.length) { r.problems.push(`Line ${li + 1}: ${name} has no steps.`); return; }
      const bad = bars.join('').replace(/[xXo.\-]/g, ''); if (bad) r.problems.push(`Line ${li + 1}: ${name} has "${bad[0]}"; steps are x X o and . only.`);
      r.rows.push({ name, bars: bars.map(b => [...b].map(c => c === 'x' ? 1 : c === 'X' ? 1.25 : c === 'o' ? .5 : 0)) });
    });
    r.beats = r.meter[1] === 8 && r.meter[0] % 3 === 0 ? r.meter[0] / 3 : r.meter[0];   // 6/8 has two beats
    r.compound = r.meter[1] === 8 && r.meter[0] % 3 === 0;
    r.bars = Math.max(1, ...r.rows.map(x => x.bars.length));
    r.bpm = r.meta.bpm ? parseFloat(r.meta.bpm) : null;
    return r;
  }
  function toText(p) {
    const lines = [];
    if (p.title) lines.push(`title: ${p.title}`);
    lines.push(`meter: ${p.meter[0]}/${p.meter[1]}`);
    for (const k of Object.keys(p.meta || {})) lines.push(`${k}: ${p.meta[k]}`);
    const width = Math.max(5, ...p.rows.map(r => r.name.length + 1));
    for (const row of p.rows) {
      const bars = row.bars.map(steps => { const per = steps.length / p.beats; return steps.map((v, i) => (i && per >= 2 && Number.isInteger(per) && i % per === 0 ? ' ' : '') + (v > 1 ? 'X' : v >= 1 ? 'x' : v > 0 ? 'o' : '.')).join(''); });
      lines.push(`${(row.name + ':').padEnd(width)} ${bars.join(' | ')}`);
    }
    return lines.join('\n');
  }

  /* ---------- features ---------- */
  // Metric weight of a position in the bar, in 24ths of a beat: beat 1 strongest, then the other beats, halves, triplets, quarters.
  function weight(q, beats) {
    const f = ((q % 24) + 24) % 24, beat = Math.floor(q / 24);
    if (f === 0) return beat === 0 ? 4 : (beats === 4 && beat === 2) ? 3.5 : 3;
    if (f === 12) return 2;
    if (f === 8 || f === 16) return 1.5;
    if (f === 6 || f === 18) return 1;
    return .5;
  }
  function levelOf(frac) {
    if (frac < EPS) return 1;
    if (Math.abs(frac - .5) < EPS) return 2;
    if (Math.abs(frac - .25) < EPS || Math.abs(frac - .75) < EPS) return 4;
    if (Math.abs(frac - 1 / 3) < EPS || Math.abs(frac - 2 / 3) < EPS) return 3;
    if ([1, 5].some(k => Math.abs(frac - k / 6) < EPS)) return 6;
    return 8;
  }
  function features(p) {
    const beats = p.beats, f = { parts: p.rows.length, bars: p.bars, beats, metre: `${p.meter[0]}/${p.meter[1]}`, compound: p.compound, bpm: p.bpm, hits: 0 };
    const levels = { 1: 0, 2: 0, 3: 0, 4: 0, 6: 0, 8: 0 }, partLevels = [];
    const onsets = [];   // [part, bar, pos(beats), vel, steps]
    p.rows.forEach((row, ri) => {
      let finest = 1;
      for (let bi = 0; bi < p.bars; bi++) {
        const steps = row.bars[bi % row.bars.length], per = steps.length / beats;
        steps.forEach((v, si) => {
          if (!v) return;
          const pos = si / per, lv = levelOf(pos - Math.floor(pos));
          levels[lv]++; finest = Math.max(finest, lv === 8 ? 8 : lv); f.hits++;
          onsets.push({ part: ri, bar: bi, pos, vel: v, steps: steps.length });
        });
      }
      partLevels.push(finest);
    });
    f.offbeatFraction = f.hits ? (f.hits - levels[1]) / f.hits : 0;
    f.quarterFraction = f.hits ? levels[4] / f.hits : 0;
    f.tripletFraction = f.hits ? (levels[3] + levels[6]) / f.hits : 0;
    f.oddFraction = f.hits ? levels[8] / f.hits : 0;
    f.finest = Math.max(1, ...partLevels);
    f.partsFine = partLevels.filter(l => l >= 4 || l === 3).length;   // parts that move in quarter beats or triplets
    // syncopation: a hit on a weak position whose next stronger position in the same part is silent
    let sync = 0;
    const byPart = p.rows.map(() => new Set());
    const Q = beats * 24;
    onsets.forEach(o => byPart[o.part].add(o.bar + ':' + Math.round(o.pos * 24)));
    onsets.forEach(o => {
      const q0 = Math.round(o.pos * 24), w = weight(q0, beats); if (w >= 3) return;
      // walk forward to the next position with a higher weight
      for (let k = 1; k <= 24; k++) {
        const q = q0 + k, bar = o.bar + Math.floor(q / Q), inBar = ((q % Q) + Q) % Q;
        if (weight(inBar, beats) > w) { if (!byPart[o.part].has((bar % p.bars) + ':' + inBar)) sync++; break; }
      }
    });
    f.syncopation = f.hits ? sync / f.hits : 0;
    const lowParts = p.rows.map((r, i) => /kick|low|stomp|tom|drum/.test(r.name) ? i : -1).filter(i => i >= 0);
    f.downbeatRest = p.bars > 0 && !onsets.some(o => o.pos < EPS && (lowParts.length ? lowParts.includes(o.part) : true));
    // coincidence: hits that sound together with another part's hit
    const all = new Map(); onsets.forEach(o => { const k = o.bar + ':' + Math.round(o.pos * 24); all.set(k, (all.get(k) || 0) + 1); });
    f.coincidence = f.hits && f.parts > 1 ? onsets.filter(o => all.get(o.bar + ':' + Math.round(o.pos * 24)) > 1).length / f.hits : 1;
    // polyrhythm: two parts whose grids do not nest
    f.polyrhythm = false;
    for (let a = 0; a < p.rows.length; a++) for (let b = a + 1; b < p.rows.length; b++) { const na = p.rows[a].bars[0].length, nb = p.rows[b].bars[0].length; if (na % nb && nb % na && p.rows[a].bars[0].filter(Boolean).length > 1 && p.rows[b].bars[0].filter(Boolean).length > 1) f.polyrhythm = true; }
    f.density = f.hits / (beats * p.bars);
    f.accents = onsets.filter(o => o.vel > 1).length;
    f.dynamics = onsets.some(o => o.vel > 1) || onsets.some(o => o.vel < 1 && o.vel > 0);
    return f;
  }

  /* ---------- the lattice ---------- */
  const LATTICE = {
    division: { label: 'Subdivision', rungs: [
      { name: 'beats only', test: f => f.offbeatFraction === 0 },
      { name: 'half beats', test: f => f.finest <= 2 },
      { name: 'triplets, or quarter beats in one part', test: f => (f.finest === 3 && f.partsFine <= 1) || (f.finest === 4 && f.partsFine <= 1 && f.quarterFraction <= .5) },
      { name: 'quarter beats or triplets throughout', test: f => f.finest <= 4 && f.oddFraction === 0 },
      { name: 'quarter beats against triplets', test: f => f.oddFraction === 0 },
      { name: 'finer or irregular divisions', test: () => true },
    ] },
    syncopation: { label: 'Syncopation', rungs: [
      { name: 'on the beat', test: f => f.syncopation === 0 && !f.downbeatRest },
      { name: 'a few off-beats', test: f => f.syncopation <= .12 && !f.downbeatRest },
      { name: 'some syncopation', test: f => f.syncopation <= .25 },
      { name: 'syncopated', test: f => f.syncopation <= .4 },
      { name: 'mostly off the beat', test: f => f.syncopation <= .6 },
      { name: 'floating', test: () => true },
    ] },
    parts: { label: 'Parts', rungs: [
      { name: 'one drum', test: f => f.parts <= 1 },
      { name: 'two or three drums on beats and half beats', test: f => f.parts <= 3 && f.finest <= 2 && !f.polyrhythm },
      { name: 'two or three drums, one of them finer', test: f => f.parts <= 3 && f.partsFine <= 1 && !f.polyrhythm },
      { name: 'two or three drums interlocking', test: f => f.parts <= 3 && !f.polyrhythm },
      { name: 'four or more drums', test: f => !f.polyrhythm },
      { name: 'polyrhythm', test: () => true },
    ] },
    metre: { label: 'Metre', rungs: [
      { name: '4/4 or 2/4', test: f => f.metre === '4/4' || f.metre === '2/4' },
      { name: '3/4', test: f => f.metre === '3/4' },
      { name: '6/8 or cut time', test: f => f.metre === '6/8' || f.metre === '2/2' },
      { name: '9/8, 12/8 or 3/8', test: f => ['9/8', '12/8', '3/8'].includes(f.metre) },
      { name: 'irregular metre', test: f => /^(5|7|11)\//.test(f.metre) },
      { name: 'other metre', test: () => true },
    ] },
    length: { label: 'Length', rungs: [
      { name: 'one bar', test: f => f.bars <= 1 },
      { name: 'two bars', test: f => f.bars <= 2 },
      { name: 'four bars', test: f => f.bars <= 4 },
      { name: 'eight bars', test: f => f.bars <= 8 },
      { name: 'sixteen bars', test: f => f.bars <= 16 },
      { name: 'more than sixteen bars', test: () => true },
    ] },
    tempo: { label: 'Tempo', rungs: [
      { name: '65 to 115', test: f => f.bpm == null || (f.bpm >= 65 && f.bpm <= 115) },
      { name: '55 to 135', test: f => f.bpm >= 55 && f.bpm <= 135 },
      { name: '45 to 160', test: f => f.bpm >= 45 && f.bpm <= 160 },
      { name: 'up to 185', test: f => f.bpm >= 40 && f.bpm <= 185 },
      { name: 'up to 220', test: f => f.bpm <= 220 },
      { name: 'very fast or very slow', test: () => true },
    ] },
  };
  function grade(f, options = {}) {
    const ignore = new Set(options.ignore || []);
    const rungs = {}, reasons = {};
    for (const d in LATTICE) { const i = LATTICE[d].rungs.findIndex(r => r.test(f)); rungs[d] = i + 1; reasons[d] = LATTICE[d].rungs[i].name; }
    const counted = Object.keys(LATTICE).filter(d => !ignore.has(d));
    const level = Math.max(1, ...counted.map(d => rungs[d]));
    const score = counted.reduce((s, d) => s + rungs[d], 0) / counted.length + Math.min(1, f.density / 6) * .5;
    return { level, rungs, reasons, score: Math.round(score * 100) / 100, ignored: [...ignore] };
  }
  function skills(f) {
    const s = new Set();
    s.add(`div:${f.finest === 1 ? '1' : f.finest === 2 ? '1/2' : f.finest === 3 ? 'triplet' : f.finest === 4 ? '1/4' : 'fine'}`);
    if (f.syncopation > 0) s.add(f.syncopation > .25 ? 'sync:strong' : 'sync');
    if (f.downbeatRest) s.add('downbeat-rest');
    s.add(`parts:${Math.min(f.parts, 4)}`);
    if (f.parts > 1 && f.coincidence < .5) s.add('independence');
    if (f.polyrhythm) s.add('poly');
    s.add(`metre:${f.metre}`);
    if (f.bars > 1) s.add(`bars:${f.bars <= 2 ? 2 : f.bars <= 4 ? 4 : 8}`);
    if (f.dynamics) s.add('dynamics');
    return [...s].sort();
  }
  /* Ontario alignment: the grade in which The Ontario Curriculum, Grades 1-8: The Arts (2009) first names each
     concept under the element of duration (and under texture, for layered parts). A pattern's grade is the highest
     of the concepts it uses; grades 7 and 8 name no new values ("rhythms encountered in the repertoire"). */
  const ONTARIO = [
    [1, 'quarter and eighth notes, 2/4 and 4/4, a rhythmic ostinato', () => true],
    [2, 'two parts, a line over a steady part (bordun, homophony)', f => f.parts === 2],
    [3, '3/4 metre', f => /^3\/4$/.test(f.metre)],
    [3, 'sixteenth-note patterns', f => f.finest >= 4 && !f.compound],
    [3, 'three parts (rounds, partner songs, canons)', f => f.parts === 3],
    [4, 'syncopation (syn-co-pa)', f => f.syncopation > 0 && f.finest <= 2],
    [4, 'four or more parts (simple polyphony)', f => f.parts >= 4],
    [5, 'dotted and mixed sixteenth cells (tim-ka, tika-ti), syncopated sixteenths', f => f.syncopation > 0 && f.finest >= 4 && !f.compound],
    [5, '6/8 metre (one-and-a two-and-a)', f => f.compound && /^(6|12)\//.test(f.metre)],
    [6, 'triplets', f => f.tripletFraction > 0 && !f.compound],
    [6, '9/8, 5/4 and other compound or irregular metres', f => /^(9\/8|5\/|7\/|11\/|6\/4)/.test(f.metre) || f.oddFraction > 0],
    [6, 'two metres at once (polyrhythm)', f => f.polyrhythm],
    [7, 'rhythms as met in repertoire: sixteenths at speed', f => f.bpm > 150 && f.finest >= 4],
  ];
  function ontario(f) {
    const hit = ONTARIO.filter(([, , test]) => test(f)), grade = Math.max(...hit.map(h => h[0]));
    return { grade, band: `Grade ${grade}`, concepts: hit.filter(h => h[0] === grade).map(h => h[1]), all: hit.map(h => `${h[0]}: ${h[1]}`) };
  }
  function analyze(text, options) {
    const p = typeof text === 'string' ? parse(text) : text;
    const f = features(p);
    return { title: p.title, meta: p.meta, text: typeof text === 'string' ? text : toText(p), features: f, skills: skills(f), grade: grade(f, options), ontario: ontario(f), problems: p.problems };
  }
  // sequence(): order so each pattern brings in as few new skills as possible (the method-book order).
  function sequence(items) {
    const seen = new Set(), rest = items.map((r, i) => ({ r, i })), out = [];
    while (rest.length) {
      let best = 0, bestKey = Infinity;
      rest.forEach((it, k) => { const fresh = it.r.skills.filter(s => !seen.has(s)).length; const key = fresh * 1e6 + it.r.grade.level * 1000 + it.r.grade.score; if (key < bestKey) { bestKey = key; best = k; } });
      const it = rest.splice(best, 1)[0]; const fresh = it.r.skills.filter(s => !seen.has(s)); fresh.forEach(s => seen.add(s));
      out.push({ ...it.r, introduces: fresh });
    }
    return out;
  }

  /* ---------- importers ---------- */
  function fromGrooveSteps(json) {
    const voices = { kick: 'kick', snare: 'snare', hihat: 'hat', openhat: 'open', crash: 'crash', ride: 'ride' };
    return (json.patterns || []).map(pt => {
      const rows = [];
      for (const v in voices) if (Array.isArray(pt[v]) && pt[v].some(Boolean)) rows.push({ name: voices[v], bars: [pt[v].map(b => b ? 1 : 0)] });
      return { title: pt.name, meter: [4, 4], beats: 4, compound: false, bars: 1, bpm: pt.bpm || null, rows, problems: [], meta: { bpm: pt.bpm, source: 'GrooveSteps', licence: 'CC0-1.0', difficulty: pt.difficulty || '', id: pt.id } };
    });
  }

  // A small MIDI reader: note-ons with their tick, note and velocity, and the ticks per quarter note.
  function readMidi(bytes) {
    const d = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let i = 0; const u32 = () => (d[i++] << 24 | d[i++] << 16 | d[i++] << 8 | d[i++]) >>> 0, u16 = () => d[i++] << 8 | d[i++];
    if (String.fromCharCode(...d.slice(0, 4)) !== 'MThd') throw new Error('not a MIDI file');
    i = 4; const hlen = u32(); u16(); const ntracks = u16(), ppq = u16(); i = 8 + hlen;
    const notes = [];
    for (let t = 0; t < ntracks; t++) {
      if (String.fromCharCode(...d.slice(i, i + 4)) !== 'MTrk') break;
      i += 4; const len = u32(), end = i + len; let tick = 0, status = 0;
      while (i < end) {
        let delta = 0, b; do { b = d[i++]; delta = (delta << 7) | (b & 0x7f); } while (b & 0x80); tick += delta;
        let s = d[i]; if (s & 0x80) { status = s; i++; } else s = status;
        if (s === 0xff) { const type = d[i++]; let l = 0; do { b = d[i++]; l = (l << 7) | (b & 0x7f); } while (b & 0x80); i += l; if (type === 0x2f) break; }
        else if (s === 0xf0 || s === 0xf7) { let l = 0; do { b = d[i++]; l = (l << 7) | (b & 0x7f); } while (b & 0x80); i += l; }
        else { const hi = s & 0xf0; if (hi === 0x90) { const n = d[i++], v = d[i++]; if (v > 0) notes.push({ tick, note: n, vel: v }); } else if (hi === 0xc0 || hi === 0xd0) i += 1; else i += 2; }
      }
      i = end;
    }
    return { ppq, notes };
  }
  // The Groove MIDI Dataset's Roland TD-11 mapping, folded onto the lab's parts.
  const GM_PART = { 36: 'kick', 38: 'snare', 40: 'snare', 37: 'rim', 42: 'hat', 44: 'hat', 46: 'open', 26: 'open', 48: 'tom', 50: 'tom', 45: 'tom', 47: 'tom', 43: 'low', 58: 'low', 49: 'crash', 55: 'crash', 57: 'crash', 52: 'crash', 51: 'ride', 59: 'ride', 53: 'bell' };
  // fromMidi(bytes, {meter:[n,d], bpm, title, ...}): quantise each bar to the grid that fits it best and keep the bar the drummer played most often.
  function fromMidi(bytes, meta = {}) {
    const { ppq, notes } = readMidi(bytes);
    const meter = meta.meter || [4, 4], beats = meter[1] === 8 && meter[0] % 3 === 0 ? meter[0] / 3 : meter[0], compound = meter[1] === 8 && meter[0] % 3 === 0;
    const barTicks = ppq * 4 * meter[0] / meter[1];
    const grids = compound ? [beats * 3, beats * 6] : [beats * 2, beats * 4, beats * 3, beats * 6];
    const hits = notes.filter(n => GM_PART[n.note]).map(n => ({ bar: Math.floor(n.tick / barTicks), t: (n.tick % barTicks) / barTicks, part: GM_PART[n.note], vel: n.vel }));
    if (!hits.length) return null;
    // the grid: the coarsest that places the hits well
    let grid = grids[0], bestErr = Infinity;
    for (const g of grids) { const err = hits.reduce((s, h) => { const x = h.t * g; return s + Math.abs(x - Math.round(x)); }, 0) / hits.length + .04 * Math.log2(g); if (err < bestErr) { bestErr = err; grid = g; } }
    const nbars = Math.max(...hits.map(h => h.bar)) + 1, bars = [];
    for (let b = 0; b < nbars; b++) bars.push({});
    hits.forEach(h => { let s = Math.round(h.t * grid), b = h.bar; if (s >= grid) { s = 0; b++; } if (b >= nbars) return; const row = bars[b][h.part] || (bars[b][h.part] = new Array(grid).fill(0)); row[s] = Math.max(row[s], h.vel >= 100 ? 1.25 : h.vel >= 55 ? 1 : .5); });
    const key = bar => Object.keys(bar).sort().map(k => k + ':' + bar[k].map(v => v ? (v > 1 ? 'X' : v >= 1 ? 'x' : 'o') : '.').join('')).join('|');
    const counts = new Map(); bars.forEach((bar, i) => { if (i === 0 || i === nbars - 1 || !Object.keys(bar).length) return; const k = key(bar); counts.set(k, (counts.get(k) || 0) + 1); });
    if (!counts.size) return null;
    let bestKey = null, n = 0; for (const [k, c] of counts) if (c > n) { n = c; bestKey = k; }
    const rows = bestKey.split('|').map(s => { const [name, steps] = s.split(':'); return { name, bars: [[...steps].map(c => c === 'X' ? 1.25 : c === 'x' ? 1 : c === 'o' ? .5 : 0)] }; });
    const order = PARTS.reduce((o, p, i) => (o[p] = i, o), {}); rows.sort((a, b) => order[a.name] - order[b.name]);
    return { title: meta.title || '', meter, beats, compound, bars: 1, bpm: meta.bpm || null, rows, problems: [], meta: { bpm: meta.bpm, style: meta.style, source: meta.source || 'Groove MIDI Dataset', licence: meta.licence || 'CC BY 4.0', id: meta.id || '' }, played: n, of: nbars };
  }

  return { parse, toText, features, LATTICE, grade, skills, analyze, sequence, fromGrooveSteps, fromMidi, readMidi, PARTS, ontario, ONTARIO };
});
