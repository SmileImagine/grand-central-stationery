/*
  Grand Central Stationery: dance difficulty analyzer.

  Two kinds of dance text are graded on a six-level lattice, as analyze.js
  grades tunes and rhythm-analyze.js grades drum patterns.

  1. Steps in the lab's step language:

        meter: 4/4
        feet: Ls rc Rs lc | Ls rc Rs lc
        arms: o  c  o  c  | o  c  o  c

     analyzeSteps(text) measures the directions used, touches, crossings,
     hops and jumps, moves per beat, how often the arms change and whether
     they change with the feet, the metre and the length, and grades them.

  2. Dances described in prose, from public-domain folk-dance books
     (Elizabeth Burchenal's collections, 1909 to 1922). readBook(text, meta)
     cuts an OCR'd book into dances by its index, keeps each dance's
     description, and analyzeProse(dance) measures the step vocabulary
     (walk, skip, slide, polka, schottische, mazurka...), the figures
     ("Meas. 1-8" references), the formation (ring, couples, longways,
     quadrille), the length in measures, the tempo marking and how much the
     dancers interact (partner, opposite couple, progression). The book's own
     classified index (dances for very small children, for larger boys and
     girls, for adults) is read too, so the grades can be checked against the
     author's judgement: calibrate(dances).

  Works in Node (module.exports) and in a page (window.GCSDance).
*/
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.GCSDance = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function gradeWith(lattice, f, options = {}) {
    const ignore = new Set(options.ignore || []), rungs = {}, reasons = {};
    for (const d in lattice) { if (!lattice[d].rungs) continue; const i = lattice[d].rungs.findIndex(r => r.test(f)); rungs[d] = i + 1; reasons[d] = lattice[d].rungs[i].name; }
    const counted = Object.keys(rungs).filter(d => !ignore.has(d));
    const score = counted.reduce((s, d) => s + rungs[d], 0) / counted.length;
    // The level is the highest rung, unless the lattice grades by the mean: a
    // dance never sits at the top of every dimension at once, so the mean of six
    // dimensions seldom passes 4, and it is stretched so that a mean of 4 is level 6.
    const level = lattice.levelBy === 'mean' ? Math.max(1, Math.min(6, Math.round(1 + (score - 1) * 5 / 3))) : Math.max(1, ...counted.map(d => rungs[d]));
    return { level, rungs, reasons, score: Math.round(score * 100) / 100, ignored: [...ignore] };
  }
  function sequence(items) {
    const seen = new Set(), rest = items.map(r => ({ r })), out = [];
    while (rest.length) {
      let best = 0, bestKey = Infinity;
      rest.forEach((it, k) => { const fresh = it.r.skills.filter(s => !seen.has(s)).length, key = fresh * 1e6 + it.r.grade.level * 1000 + it.r.grade.score; if (key < bestKey) { bestKey = key; best = k; } });
      const it = rest.splice(best, 1)[0], fresh = it.r.skills.filter(s => !seen.has(s)); fresh.forEach(s => seen.add(s));
      out.push({ ...it.r, introduces: fresh });
    }
    return out;
  }

  /* ================= 1. the step language ================= */
  function parseSteps(text) {
    const d = { meter: [4, 4], feet: [], arms: [], level: [], lean: [], turn: [], hips: [], shoulders: [], problems: [], title: '', meta: {} };
    text.split('\n').forEach((raw, li) => {
      const line = raw.replace(/\/\/.*$/, '').trim(); if (!line) return;
      const m = line.match(/^([a-z]+)\s*:\s*(.*)$/i); if (!m) { d.problems.push(`Line ${li + 1}: wants meter:, feet: or arms:.`); return; }
      const key = m[1].toLowerCase(), body = m[2].trim();
      if (key === 'meter') { const mm = body.match(/^(\d+)\s*\/\s*(\d+)$/); if (mm) d.meter = [+mm[1], +mm[2]]; else d.problems.push(`Line ${li + 1}: meter wants 4/4 or 3/4.`); return; }
      if (key === 'title') { d.title = body; return; }
      if (!['feet', 'arms', 'level', 'lean', 'turn', 'hips', 'shoulders'].includes(key)) { d.meta[key === 'tempo' ? 'bpm' : key] = body; return; }
      const bars = body.split('|').map(b => b.trim().split(/\s+/).filter(Boolean)).filter(b => b.length);
      bars.forEach((toks, bi) => { if (toks.length !== d.meter[0]) d.problems.push(`Line ${li + 1}, bar ${bi + 1}: ${toks.length} beats in ${d.meter[0]}/${d.meter[1]}.`); });
      d[key] = bars;
    });
    d.beats = d.meter[0]; d.bars = Math.max(1, d.feet.length, d.arms.length, d.level.length, d.lean.length, d.turn.length, d.hips.length, d.shoulders.length); d.bpm = d.meta.bpm ? parseFloat(d.meta.bpm) : null;
    return d;
  }
  function stepFeatures(d) {
    const f = { metre: `${d.meter[0]}/${d.meter[1]}`, beats: d.beats, bars: d.bars, bpm: d.bpm, moves: 0, holds: 0, touches: 0, across: 0, hops: 0, jumps: 0, kicks: 0, dirs: new Set(), subBeats: 0, triple: 0, sameFootTwice: 0, armChanges: 0, armsApart: 0, armKinds: new Set(), problems: d.problems.length };
    let lastFoot = null, lastArm = null;
    for (let bi = 0; bi < d.bars; bi++) for (let b = 0; b < d.beats; b++) {
      const ft = d.feet.length ? (d.feet[bi % d.feet.length] || [])[b] || '.' : '.', at = d.arms.length ? (d.arms[bi % d.arms.length] || [])[b] || '.' : '.';
      const subs = ft.split('-'); if (subs.length === 2) f.subBeats++; if (subs.length >= 3) f.triple++;
      let footMoved = false;
      for (const raw of subs) {
        const tok = raw.replace(/[!~_^@=]+$/, ''); if (raw !== tok) f.efforts = (f.efforts || 0) + 1;   // effort marks shape the movement, not the step
        if (tok === '.') { f.holds++; continue; }
        f.moves++; footMoved = true; let m;
        if ((m = tok.match(/^([LRlr])([fbsxzcp]?)$/))) { const F = m[1].toUpperCase(), dir = m[2] || 'p'; f.dirs.add(dir); if (m[1] !== F) f.touches++; if (dir === 'x' || dir === 'z') f.across++; if (m[1] === F) { if (lastFoot === F) f.sameFootTwice++; lastFoot = F; } }
        else if (/^J/.test(tok)) { f.jumps++; lastFoot = null; }
        else if (tok === 'H') f.hops++;
        else if (/^K/.test(tok)) f.kicks++;
      }
      if (at !== '.') { f.armKinds.add(at); if (lastArm !== null && at !== lastArm) { f.armChanges++; if (!footMoved) f.armsApart++; } lastArm = at; }
    }
    const totalBeats = d.bars * d.beats;
    f.movesPerBeat = f.moves / totalBeats; f.subBeatFraction = (f.subBeats + f.triple) / totalBeats; f.armChangeRate = f.armChanges / totalBeats;
    f.dirs = [...f.dirs]; f.armKinds = [...f.armKinds];
    // does the second half mirror the first (left for right)?
    const mirror = t => t.replace(/[LRlr]/g, c => ({ L: 'R', R: 'L', l: 'r', r: 'l' }[c]));
    f.mirrored = d.feet.length >= 2 && d.feet.length % 2 === 0 && d.feet.slice(0, d.feet.length / 2).every((bar, i) => mirror(bar.join(' ')) === d.feet[i + d.feet.length / 2].join(' '));
    f.distinctBars = new Set(d.feet.map(b => b.join(' '))).size;
    f.shape = d.level.length > 0 || d.lean.length > 0; f.efforts = f.efforts || 0;
    f.turns = d.turn.flat().filter(t => /^[lr]+$/.test(t)).reduce((n, t) => n + t.length, 0); f.hips = d.hips.flat().some(t => /^[lrfb]$/.test(t)); f.shoulders = d.shoulders.flat().some(t => /^[lru]$/.test(t));
    return f;
  }
  const STEP_LATTICE = {
    feet: { label: 'Feet', rungs: [
      { name: 'steps in place', test: f => f.dirs.every(x => x === 'p') && !f.touches && !f.hops && !f.jumps && !f.kicks },
      { name: 'side steps and closes', test: f => f.dirs.every(x => 'psc'.includes(x)) && !f.touches && !f.hops && !f.jumps && !f.kicks },
      { name: 'forward and back', test: f => !f.across && !f.touches && !f.hops && !f.jumps && !f.kicks },
      { name: 'touches and jumps', test: f => !f.across && !f.hops && !f.kicks },
      { name: 'hops and kicks (on one foot)', test: f => !f.across },
      { name: 'steps across (grapevine)', test: () => true },
    ] },
    pace: { label: 'Pace', rungs: [
      { name: 'a move every beat or slower', test: f => f.subBeatFraction === 0 && f.holds === 0 },
      { name: 'moves and holds', test: f => f.subBeatFraction === 0 },
      { name: 'two moves in one beat of the bar', test: f => f.triple === 0 && f.subBeats <= f.bars },
      { name: 'two moves in a beat, often', test: f => f.triple === 0 },
      { name: 'three moves in a beat', test: f => f.subBeatFraction <= .5 },
      { name: 'quick throughout', test: () => true },
    ] },
    arms: { label: 'Arms', rungs: [
      { name: 'arms still', test: f => f.armChanges === 0 },
      { name: 'arms change once a bar', test: f => f.armChangeRate <= 1 / f.beats + 1e-9 },
      { name: 'two arm positions, every other beat', test: f => f.armKinds.length <= 2 && f.armChangeRate <= .5 + 1e-9 },
      { name: 'two arm positions, every beat', test: f => f.armKinds.length <= 2 },
      { name: 'three arm positions', test: f => f.armKinds.length <= 3 },
      { name: 'many arm positions', test: () => true },
    ] },
    metre: { label: 'Metre', rungs: [
      { name: '4/4 or 2/4', test: f => f.metre === '4/4' || f.metre === '2/4' },
      { name: '3/4', test: f => f.metre === '3/4' },
      { name: '6/8', test: f => f.metre === '6/8' },
      { name: '12/8 or 9/8', test: f => f.metre === '12/8' || f.metre === '9/8' },
      { name: 'irregular metre', test: f => /^(5|7)\//.test(f.metre) },
      { name: 'other metre', test: () => true },
    ] },
    length: { label: 'Length', rungs: [
      { name: 'one bar', test: f => f.distinctBars <= 1 },
      { name: 'two bars, the second mirroring the first', test: f => f.bars <= 2 && f.mirrored },
      { name: 'two bars', test: f => f.bars <= 2 },
      { name: 'four bars', test: f => f.bars <= 4 },
      { name: 'eight bars', test: f => f.bars <= 8 },
      { name: 'more than eight bars', test: () => true },
    ] },
    tempo: { label: 'Tempo', rungs: [
      { name: '80 to 115', test: f => f.bpm == null || (f.bpm >= 80 && f.bpm <= 115) },
      { name: '70 to 125', test: f => f.bpm >= 70 && f.bpm <= 125 },
      { name: '60 to 140', test: f => f.bpm >= 60 && f.bpm <= 140 },
      { name: 'up to 160', test: f => f.bpm >= 50 && f.bpm <= 160 },
      { name: 'up to 180', test: f => f.bpm <= 180 },
      { name: 'very fast or very slow', test: () => true },
    ] },
  };
  function stepSkills(f) {
    const s = new Set();
    f.dirs.forEach(dir => s.add(`dir:${{ p: 'place', s: 'side', c: 'close', f: 'forward', b: 'back', x: 'across', z: 'across behind' }[dir]}`));
    if (f.touches) s.add('touch'); if (f.hops) s.add('hop'); if (f.jumps) s.add('jump'); if (f.kicks) s.add('kick');
    if (f.subBeats) s.add('two-in-a-beat'); if (f.triple) s.add('three-in-a-beat'); if (f.holds) s.add('hold');
    f.armKinds.forEach(a => s.add(`arms:${{ u: 'up', o: 'out', d: 'down', c: 'clap', h: 'hips' }[a] || a}`));
    if (f.armsApart) s.add('arms-apart');
    s.add(`metre:${f.metre}`); if (f.bars > 1) s.add(`bars:${f.bars <= 2 ? 2 : f.bars <= 4 ? 4 : 8}`);
    if (f.efforts) s.add('effort'); if (f.shape) s.add('shape'); if (f.turns) s.add(f.turns >= 2 ? 'turn:half' : 'turn:quarter'); if (f.hips) s.add('hips'); if (f.shoulders) s.add('shoulders');
    return [...s].sort();
  }
  function analyzeSteps(text, options) {
    const d = typeof text === 'string' ? parseSteps(text) : text, f = stepFeatures(d);
    return { kind: 'steps', title: d.title, meta: d.meta, text: typeof text === 'string' ? text : '', features: f, skills: stepSkills(f), grade: gradeWith(STEP_LATTICE, f, options), problems: d.problems };
  }

  /* ================= 2. dances described in prose ================= */
  const STOP = new Set(['the', 'a', 'an', 'of', 'on', 'in', 'to', 'and', 'from']);
  const words = s => s.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(w => w && !STOP.has(w));
  function sameTitle(a, b) { const A = new Set(words(a)), B = new Set(words(b)); if (!A.size || !B.size) return false; let n = 0; A.forEach(w => { if (B.has(w)) n++; }); return n / Math.max(A.size, B.size) >= .6; }
  const clean = s => s.replace(/\s+/g, ' ').trim();

  // The step vocabulary, with a weight for how much a step asks.
  const STEP_WORDS = [
    [1, /\b(walk(?:ing|s)?|step(?:s|ping)?|run(?:ning|s)?|skip(?:ping|s)?|clap(?:ping|s)?|stamp(?:ing|s)?|bow(?:s|ing)?|court?es(?:y|ies)|curts(?:e?y|ies)|nod(?:s|ding)?|march(?:ing)?|sing(?:ing)?)\b/g],
    [2, /\b(slid(?:e|es|ing)|gallop(?:s|ing)?|hop(?:s|ping)?|jump(?:s|ing)?|step-hop|swing(?:s|ing)?|promenad(?:e|es|ing)|balanc(?:e|es|ing)|kneel(?:s|ing)?|kick(?:s|ing)?|stamp(?:s|ing)? and clap)\b/g],
    [3, /\b(polka|schottische|two-step|waltz(?:ing)?|heel[- ]and[- ]toe|pivot(?:s|ing)?|buzz(?:ing)? step|sashay|do-si-do|dos-a-dos|right and left|ladies'? chain|grand right and left|allemande|chass[eé]|cast off|hornpipe step|country-dance step)\b/g],
    [4, /\b(mazurka|pas de basque|hambo|cut(?:ting)? step|bleking|leap(?:s|ing)?|pirouette|spring(?:s|ing)? step|cross(?:es|ing)? step|tyrolienne|varsouvienne|jig step|squat(?:s|ting)?)\b/g],
  ];
  function readBook(text, meta = {}) {
    const lines = text.split('\n').map(clean);
    const find = re => lines.findIndex(l => re.test(l));
    const idxStart = find(/^(GENERAL|ALPHABETICAL)\s+INDEX/), clsStart = find(/^CLASSIFIED\s+INDEX/), bodyStart = lines.findIndex((l, i) => i > clsStart && /^(FOREWORD|PREFACE|INTRODUCTION)$/.test(l));
    const body0 = bodyStart > 0 ? bodyStart : clsStart + 60;
    // index titles: the leading words of each entry, before a parenthesis or a page number
    const titles = [];
    for (let i = idxStart + 1; i < (clsStart > 0 ? clsStart : body0); i++) {
      const l = lines[i]; if (!l || /INDEX|^TITLE|^PAGE/.test(l)) continue;
      const m = l.match(/^([A-Z][A-Za-z'’\-]+(?:,? [A-Za-z'’\-]+){0,6}?)\s*(?:[\(\{]|\s\d|$)/); if (!m) continue;
      const t = m[1].replace(/,\s*(The|On the|A)$/i, '').trim(); if (t.length < 4 || /^(All of|Dances)/.test(t)) continue;
      if (!titles.some(x => sameTitle(x, t))) titles.push(t);
    }
    // the classified index: blocks headed by the age they suit
    const classes = {};
    if (clsStart > 0) {
      let cls = 0;
      for (let i = clsStart + 1; i < body0; i++) {
        const l = lines[i]; if (!l) continue;
        if (/SMALL CHILDREN|YOUNG(?:ER)? CHILDREN|PRIMARY/.test(l)) { cls = 1; continue; }
        if (/LARGER|OLDER|VIGOROUS|GRAMMAR|INTERMEDIATE/.test(l)) { cls = 2; continue; }
        if (/ADULTS|ADVANCED|SOCIAL RECREATION/.test(l)) { cls = 3; continue; }
        if (!cls) continue;
        for (const m of l.matchAll(/([A-Z][A-Za-z'’\-]+(?: [A-Za-z'’\-]+){0,4}?)\s*(?:\([^)]*\))?\s*[.\s]*(?:\d+|li|i|yr|ii)\b/g)) { const t = m[1].trim(); if (t.length < 4 || /^(TITLE|PAGE|All)/.test(t)) continue; const key = titles.find(x => sameTitle(x, t)) || t; if (!classes[key] || cls < classes[key]) classes[key] = cls; }
      }
    }
    // headings in the body: an all-capitals line that is one of the titles
    const heads = [];
    for (let i = body0; i < lines.length; i++) {
      const l = lines[i]; if (!/^[A-Z][A-Z'’ ,\-\(\)]{3,}$/.test(l) || /INDEX|FORMATION|THE DANCE|THE STEPS?|THE FIGURES|CHORUS$|VERSE|REFRAIN|PART [A-D]|^[A-D]$/.test(l)) continue;
      const t = titles.find(x => sameTitle(x, l.replace(/\(.*?\)/g, ''))); if (t) heads.push({ i, title: t });
    }
    const dances = [];
    heads.forEach((h, k) => {
      if (k && heads[k - 1].title === h.title) { dances[dances.length - 1].end = k + 1 < heads.length ? heads[k + 1].i : lines.length; return; }   // a title printed twice (over the music, then over the text)
      dances.push({ title: h.title, start: h.i, end: k + 1 < heads.length ? heads[k + 1].i : lines.length });
    });
    return dances.map(d => {
      const seg = lines.slice(d.start, d.end), text = seg.filter(l => l && /[a-z]{3}/.test(l) && !/^[^a-zA-Z]*$/.test(l)).join('\n');
      const from = text.match(/\(From ([^)]+)\)/), tempo = seg.join(' ').match(/(J\.?|0\^|♩\.?)\s*=\s*(\d{2,3})/);
      const cls = classes[d.title] || 0;
      return { title: d.title, country: from ? from[1] : '', tempo: tempo ? +tempo[2] : null, dotted: tempo ? /\./.test(tempo[1]) : false, text, bookClass: cls, book: meta.title || '', year: meta.year || '', source: meta.source || '', licence: meta.licence || 'public domain' };
    });
  }
  function proseFeatures(d) {
    const t = d.text.replace(/-\n/g, '').replace(/\n/g, ' ');
    const f = { measures: 0, figures: 0, parts: 0, stepWeight: 0, vocabulary: [], formation: 0, interaction: 0, tempo: d.tempo, dotted: d.dotted, words: t.split(/\s+/).length };
    for (const m of t.matchAll(/(?:M[ce]as|\\leas|Mcas|Meas)\.?\s*(\d{1,2})(?:\s*-\s*(\d{1,2}))?/g)) { f.figures++; f.measures = Math.max(f.measures, +(m[2] || m[1])); }
    f.parts = new Set([...t.matchAll(/(?:^|\s)([A-D])\.\s*\(/g)].map(m => m[1])).size;
    const stem = w => { if (/^(sw|s|spr|r)ing$/.test(w)) return w; w = w.replace(/ies$/, 'y').replace(/^courtes.*/, 'courtesy').replace(/^balanc.*/, 'balance'); w = w.replace(/([a-z]{3,})(ing|es|s)$/, '$1'); return w.replace(/([^aeiou])\1$/, '$1'); };
    for (const [w, re] of STEP_WORDS) { const hits = new Set([...t.toLowerCase().matchAll(re)].map(m => stem(m[1]))); if (hits.size) { f.stepWeight = Math.max(f.stepWeight, w); f.vocabulary.push(...hits); } }
    const low = t.toLowerCase(), fm = low.match(/formation[:.]?\s*([\s\S]{0,400}?)(?:the dance|the steps?|steps:|$)/), form = fm ? fm[1] : low;
    f.formation = /\bquadrille\b|\bsquare\b|sets? of (two|three|four) couples|three couples|head couples/.test(form) ? 5 : /longways|two lines|opposite line|in lines|contra|in a line|double circle|two circles/.test(form) ? 4 : /progress|new partner|next couple|new couple/.test(low) ? 3 : /couples?|partner/.test(form) ? 2 : 1;
    f.interaction = /grand right and left|new partner|progress|next couple|new couple/.test(low) ? 4 : /opposite couple|opposite (man|woman|lady|gentleman|partner|dancer)|other couple|\bcorner\b/.test(low) ? 3 : /partner/.test(low) ? 2 : /join hands|ring|circle/.test(low) ? 1 : 0;
    f.sung = /sing|song|words/.test(low);
    return f;
  }
  const PROSE_LATTICE = {
    levelBy: 'mean',   // see gradeWith: the highest rung bunched the book dances at levels 5 and 6
    steps: { label: 'Steps', rungs: [
      { name: 'walking, skipping, clapping', test: f => f.stepWeight <= 1 && f.vocabulary.length <= 3 },
      { name: 'walking steps with several actions', test: f => f.stepWeight <= 1 },
      { name: 'sliding, hopping, turning', test: f => f.stepWeight <= 2 && f.vocabulary.length <= 5 },
      { name: 'several such steps', test: f => f.stepWeight <= 2 },
      { name: 'polka, schottische, waltz or country-dance figures', test: f => f.stepWeight <= 3 },
      { name: 'mazurka, pas de basque, leaps', test: () => true },
    ] },
    figures: { label: 'Figures', rungs: [
      { name: 'one or two', test: f => f.figures <= 2 },
      { name: 'up to four', test: f => f.figures <= 4 },
      { name: 'up to six', test: f => f.figures <= 6 },
      { name: 'up to nine', test: f => f.figures <= 9 },
      { name: 'up to twelve', test: f => f.figures <= 12 },
      { name: 'more than twelve', test: () => true },
    ] },
    formation: { label: 'Formation', rungs: [
      { name: 'a ring, or free', test: f => f.formation <= 1 },
      { name: 'couples', test: f => f.formation <= 2 },
      { name: 'couples changing partners', test: f => f.formation <= 3 },
      { name: 'longways, in lines', test: f => f.formation <= 4 },
      { name: 'sets of couples, quadrille', test: f => f.formation <= 5 },
      { name: 'other', test: () => true },
    ] },
    length: { label: 'Length', rungs: [
      { name: 'up to 8 measures', test: f => f.measures <= 8 },
      { name: 'up to 16', test: f => f.measures <= 16 },
      { name: 'up to 24', test: f => f.measures <= 24 },
      { name: 'up to 32', test: f => f.measures <= 32 },
      { name: 'up to 48', test: f => f.measures <= 48 },
      { name: 'more than 48', test: () => true },
    ] },
    interaction: { label: 'Interaction', rungs: [
      { name: 'on your own', test: f => f.interaction === 0 },
      { name: 'hands in a ring', test: f => f.interaction <= 1 },
      { name: 'with a partner', test: f => f.interaction <= 2 },
      { name: 'with another couple', test: f => f.interaction <= 3 },
      { name: 'changing partners', test: f => f.interaction <= 4 },
      { name: 'other', test: () => true },
    ] },
    tempo: { label: 'Tempo', rungs: [
      { name: 'up to 104', test: f => f.tempo == null || f.tempo <= 104 },
      { name: 'up to 116', test: f => f.tempo <= 116 },
      { name: 'up to 128', test: f => f.tempo <= 128 },
      { name: 'up to 144', test: f => f.tempo <= 144 },
      { name: 'up to 160', test: f => f.tempo <= 160 },
      { name: 'faster', test: () => true },
    ] },
  };
  function proseSkills(f) {
    const s = new Set(f.vocabulary.map(v => `step:${v}`));
    s.add(`formation:${['free', 'ring', 'couples', 'changing', 'longways', 'sets'][f.formation] || 'other'}`);
    if (f.interaction >= 3) s.add('other-couple'); if (f.interaction >= 4) s.add('progression');
    if (f.measures > 16) s.add('long'); if (f.sung) s.add('sung');
    return [...s].sort();
  }
  function analyzeProse(d, options) {
    const f = proseFeatures(d);
    return { kind: 'prose', title: d.title, meta: { country: d.country, book: d.book, year: d.year, source: d.source, licence: d.licence, bookClass: d.bookClass }, text: d.text, features: f, skills: proseSkills(f), grade: gradeWith(PROSE_LATTICE, f, options), problems: [] };
  }
  // How the grades line up with the book's own classes (1 small children, 2 larger boys and girls, 3 adults).
  function calibrate(items) {
    const rows = items.filter(it => it.meta && it.meta.bookClass), table = { 1: [], 2: [], 3: [] };
    rows.forEach(it => table[it.meta.bookClass].push(it.grade.level));
    const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
    // rank correlation between class and level
    const n = rows.length; let concord = 0, discord = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const dc = rows[i].meta.bookClass - rows[j].meta.bookClass, dl = rows[i].grade.level - rows[j].grade.level; if (dc * dl > 0) concord++; else if (dc * dl < 0) discord++; }
    return { counts: { 1: table[1].length, 2: table[2].length, 3: table[3].length }, meanLevel: { 1: mean(table[1]), 2: mean(table[2]), 3: mean(table[3]) }, kendall: concord + discord ? (concord - discord) / (concord + discord) : null, table };
  }

  return { parseSteps, stepFeatures, STEP_LATTICE, analyzeSteps, readBook, proseFeatures, PROSE_LATTICE, analyzeProse, calibrate, sequence, gradeWith };
});
