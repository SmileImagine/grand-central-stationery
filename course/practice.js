/*
  Grand Central Stationery: the practice core.

  What the Practice Board and the main page's piece view share, so the two
  never drift apart:

    setup      the instructional setup a link carries (the piece, the level,
               the mode, the phrase, the tempo, the instrument, the teacher's
               phrase cuts), encoded and read back; nothing private rides in it.
    pieces     the board's levels and the plain-language facts about a piece:
               its range, length, instruments it fits and what it teaches.
    phrases    the tune cut into phrases (the teacher's cuts, a %%phrases line,
               the sections and source lines, else four-bar groups), and one
               phrase written out as a tune of its own, so the page's renderer,
               Player, Game mode and instrument view play it unchanged.
    progress   local practice history: runs, steps, tempi, assistance. It
               counts what the page saw (the music played to the end, a note
               stepped), never how well it was played.
    assess     a teacher's assessment record (pass, needs more practice, not
               assessed, a note, the tempo and the help given), kept in the
               board's own store.
    stepper    step/wait practice: the next note waits for the learner.
    listen     advisory pitch reading (McLeod's method, as in the Play Along
               lab), a stability gate, and an alignment of what was heard with
               what was written, every flag carrying its confidence.

  Works in Node (module.exports) and in a page (window.GCSPractice). Like the
  analyzer it never loads abcjs itself: the functions that parse take it.
*/
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.GCSPractice = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_BPM = 80;              // the main page's tempo for a tune with no Q: line
  const INSTRUMENTS = { recorder: 'Recorder', uke: 'Ukulele', piano: 'Piano', wh: '2-5 Keys', off: 'No instrument' };
  const MODES = { teach: 'Teach', practice: 'Practice', assess: 'Assess' };
  /* Each way in is a few steps, in order. Two people use the piece view:
       a student practises alone (Practice), with the app listening if they like, ending in a play-through;
       a teacher teaches the class (Teach, on the projector, so the class sees the same listen, learn, put together),
       where nothing can listen to thirty players at once and nobody plays in perfect time: the class hears it (and
       the new idea in it), studies each section at its own pace (alone or in pairs) with a small fingering diagram
       at every note, then loops sections that grow, getting faster, and puts the whole together;
       or assesses one student (Assess): the end of a student's practice, seen from the teacher's side, with marks. */
  const STEPS = {
    teach: ['Listen', 'Learn the sections', 'Put it together'],                      // step 2: 2a Study them, 2b Loop them
    practice: ['Listen', 'Learn the sections', 'Put it together', 'Play it through'], // step 2: 2a Note by note, 2b Loop in time
    assess: ['Hear it', 'The attempt', 'Decide'],
  };
  // How step 2 is done (the link's by=), in order: Teach studies each section, then loops them together; Practice goes note by note, then loops in time.
  const HOW = { teach: ['study', 'together'], practice: ['note', 'time'] };
  const SHOWS = { melody: 'Melody', chords: 'Chords', both: 'Both' };
  /* Loop together: sections that grow. Each new loop alone, then joined to all before it, until the whole piece:
     for four loops 1, 2, 1–2, 3, 1–3, 4, 1–4. Pairs of 0-based loop indexes, first and last. */
  function ladder(n) {
    if (n < 2) return [[0, 0]];
    const out = [[0, 0]];
    for (let k = 1; k < n; k++) out.push([k, k], [0, k]);
    return out;
  }
  const clampInt = (v, lo, hi) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null; };

  /* ---------------- setup: what a link carries ----------------
     Only these keys are written or read. A student's name, progress, marks
     and notes are not setup, so no link can carry them. */
  const SETUP_KEYS = ['tune', 'level', 'mode', 'step', 'loop', 'by', 'bpm', 'inst', 'show', 'tr', 'cuts'];
  const OLD_KEYS = ['phrase', 'view'];   // the first piece view's (11 November 2026), still read
  function cleanSetup(s = {}) {
    const out = {};
    if (typeof s.tune === 'string' && /^[a-z0-9][a-z0-9-]{0,120}$/.test(s.tune)) out.tune = s.tune;
    const level = parseInt(s.level, 10); if (level >= 1 && level <= 6) out.level = level;
    // The first piece view's modes and keys: step (note by note) and slow were Practice's two ways; phrase is now loop, view=whole step 3.
    let mode = s.mode, step = parseInt(s.step, 10), by = s.by, loop = parseInt(s.loop !== undefined ? s.loop : s.phrase, 10);
    if (mode === 'step') { mode = 'practice'; by = 'note'; if (!step) step = 2; }
    if (mode === 'slow') { mode = 'practice'; by = 'time'; if (!step) step = 2; }
    if (s.view === 'whole' && !step && mode !== 'assess') step = 3;
    if (MODES[mode]) out.mode = mode;
    if (step >= 1 && step <= 4) out.step = step;   // (the first version's Teach steps 3-4 read as 3)
    if (loop >= 1) out.loop = Math.min(99, loop);
    const to = parseInt(s.to !== undefined ? s.to : String(s.loop || '').split('-')[1], 10);   // a span of loops: loop=1-3
    if (out.loop && to > out.loop) out.to = Math.min(99, to);
    if (['note', 'time', 'study', 'together'].includes(by)) out.by = by;
    const bpm = clampInt(s.bpm, 20, 300); if (bpm !== null && s.bpm !== undefined && s.bpm !== '') out.bpm = bpm;
    if (INSTRUMENTS[s.inst]) out.inst = s.inst;
    if (SHOWS[s.show]) out.show = s.show;
    const tr = clampInt(s.tr, -12, 12); if (tr) out.tr = tr;
    const cuts = normalCuts(s.cuts); if (cuts.length) out.cuts = cuts;
    return out;
  }
  // Teacher's cuts: the written bar numbers (1 up) where a phrase begins.
  function normalCuts(cuts) {
    const list = Array.isArray(cuts) ? cuts : typeof cuts === 'string' ? cuts.split(/[.,\s]+/) : [];
    return [...new Set(list.map(n => parseInt(n, 10)).filter(n => n >= 1 && n < 1000))].sort((a, b) => a - b);   // 1 alone: the teacher wants one phrase
  }
  function encodeSetup(s) {
    const c = cleanSetup(s), parts = [];
    for (const k of SETUP_KEYS) if (c[k] !== undefined) parts.push(`${k}=${k === 'cuts' ? c.cuts.join('.') : k === 'loop' && c.to ? `${c.loop}-${c.to}` : encodeURIComponent(String(c[k]))}`);
    return parts.join('&');
  }
  function decodeSetup(str) {
    const q = String(str || '').replace(/^[#?]/, ''), raw = {};
    for (const part of q.split('&')) {
      const i = part.indexOf('='); if (i < 1) continue;
      const k = part.slice(0, i); if (!SETUP_KEYS.includes(k) && !OLD_KEYS.includes(k)) continue;
      try { raw[k] = decodeURIComponent(part.slice(i + 1)); } catch (e) {}
    }
    return cleanSetup(raw);
  }
  // A link to the piece view: relative to the page that makes it (the board is in course/, the main page at the root).
  const pieceHref = (setup, fromCourse) => (fromCourse ? '../index.html' : 'index.html') + '#' + encodeSetup(setup);
  // The board's own state: which entry (teach, practice, assess), which level, which piece is open.
  const BOARD_DO = ['teach', 'practice', 'assess'];
  function encodeBoard(b = {}) {
    const p = [];
    if (BOARD_DO.includes(b.do)) p.push('do=' + b.do);
    const l = clampInt(b.level, 1, 6); if (l) p.push('level=' + l);
    if (b.tune && /^[a-z0-9][a-z0-9-]{0,120}$/.test(b.tune)) p.push('tune=' + b.tune);
    return p.join('&');
  }
  function decodeBoard(str) {
    const q = String(str || '').replace(/^[#?]/, ''), out = {};
    for (const part of q.split('&')) {
      const [k, v] = part.split('=');
      if (k === 'do' && BOARD_DO.includes(v)) out.do = v;
      if (k === 'level' && clampInt(v, 1, 6)) out.level = clampInt(v, 1, 6);
      if (k === 'tune' && v && /^[a-z0-9][a-z0-9-]{0,120}$/.test(v)) out.tune = v;
    }
    return out;
  }

  /* ---------------- pieces ---------------- */
  const gradeOf = t => (t.ontario && t.ontario.grade) || 1;
  function tunesAt(set, { level = null, grade = 0, q = '' } = {}) {
    const words = String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
    return (set.tunes || []).filter(t => (!level || t.level === level) && (!grade || gradeOf(t) <= grade) &&
      words.every(w => `${t.title} ${t.origin || ''} ${t.composer || ''} ${t.rhythm || ''}`.toLowerCase().includes(w)));
  }
  function levelsOf(set, opts = {}) {
    const out = [];
    for (let l = 1; l <= 6; l++) out.push({ level: l, count: tunesAt(set, { ...opts, level: l }).length, words: (set.levels && set.levels[l]) || [] });
    return out;
  }
  // The skill tags in words (the board's chips and a piece's learning goal).
  const DEGREES = new Set(['do', 'di', 're', 'ri', 'mi', 'fa', 'fi', 'so', 'si', 'la', 'te', 'ti']);
  function skillWords(tag) {
    const [k, v] = String(tag).split(':');
    if (k === 'degree') return DEGREES.has(v) ? `the note ${v}` : v;
    if (k === 'dur') return ({ '1': 'one-beat notes', '2': 'two-beat notes', '3': 'three-beat notes', '4': 'four-beat notes', '1/2': 'half beats', '1/4': 'quarter beats', '3/2': 'dotted beats', '3/4': 'dotted half beats', '1/3': 'thirds of a beat', '2/3': 'two-thirds of a beat', '1/6': 'sixths of a beat' })[v] || `${v}-beat notes`;
    if (k === 'leap') return v === 'over-octave' ? 'leaps over an octave' : `leaps of a ${v}`;
    if (k === 'range') return ({ '6th': 'a range of a 6th', octave: 'a range of an octave', 'over-octave': 'a range over an octave' })[v] || tag;
    if (k === 'metre') return `${v} time`;
    if (k === 'syncopation') return 'syncopation';
    if (k === 'key') return null;
    return ({ tie: 'ties', 'tie-over-bar': 'ties over the bar', pickup: 'a pickup', rest: 'rests', 'rest-off-beat': 'rests off the beat', repeat: 'repeats', endings: 'first and second endings', triplet: 'triplets', 'triplet-in-compound': 'triplets', tuplet: 'tuplets', accidentals: 'sharps and flats', 'grace-notes': 'grace notes', 'double-stops': 'two notes at once', 'metre-change': 'a change of metre', 'key-change': 'a change of key' })[k] || tag;
  }
  function learningGoal(t, set) {
    const intro = (t.introduces || []).map(skillWords).filter(Boolean);
    if (intro.length) return `New here: ${intro.slice(0, 3).join(', ')}.`;
    const words = (set && set.levels && set.levels[t.level]) || [];
    return words.length ? `Practises level ${t.level}: ${words.slice(0, 2).join(', ')}.` : `Practises level ${t.level}.`;
  }
  const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const midiName = m => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const INTERVALS = ['unison', '2nd', '2nd', '3rd', '3rd', '4th', '4th', '5th', '6th', '6th', '7th', '7th', 'octave'];
  const spanWords = s => s === 12 ? 'an octave' : s <= 12 ? `a ${INTERVALS[s]}` : s <= 14 ? 'just over an octave' : `${(s / 12).toFixed(1)} octaves`;
  /* The classroom instruments, as written notes. The recorder sounds an octave above what it reads, so its written
     range is low C to the D two octaves up; a first-year class keeps to low C to the D above (the page's one-octave span).
     The ukulele reads at pitch on standard tuning. Voices: the conservative unison range the course reports use. */
  const FITS = [
    { id: 'voice', name: 'Voices', low: 60, high: 74 },
    { id: 'recorder1', inst: 'recorder', name: 'Recorder (first octave)', low: 60, high: 74 },
    { id: 'recorder', inst: 'recorder', name: 'Recorder', low: 60, high: 86 },
    { id: 'uke', inst: 'uke', name: 'Ukulele', low: 60, high: 81 },
    { id: 'bells', name: 'One-octave bells', low: 60, high: 72 },
  ];
  // The transposition a class instrument needs for a piece (0 as written), or null when none within an octave fits.
  function transposeFor(fits, inst) {
    const mine = (fits || []).filter(f => f.inst === inst && f.fits);
    if (!mine.length) return null;
    return mine.sort((a, b) => Math.abs(a.tr) - Math.abs(b.tr) || (a.id === 'recorder1' ? -1 : 1))[0].tr;
  }
  function fitFor(low, high, f) {
    if (low === null || high === null) return null;
    if (high - low > f.high - f.low) return { ...f, fits: false, tr: null };
    const lo = f.low - low, hi = f.high - high;
    const tr = lo <= 0 && hi >= 0 ? 0 : Math.abs(lo) < Math.abs(hi) ? lo : hi;
    return Math.abs(tr) > 12 ? { ...f, fits: false, tr: null } : { ...f, fits: true, tr };
  }
  // A piece's card facts; analyze is GCSAnalyze (course/analyze.js) when the range is wanted.
  function summarize(t, { ABCJS = null, analyze = null, set = null } = {}) {
    let low = null, high = null;
    if (analyze && ABCJS) { try { const a = analyze.analyzeAbc(t.abc, ABCJS)[0]; if (a && a.features) { low = a.features.lowMidi; high = a.features.highMidi; } } catch (e) {} }
    const info = ABCJS ? barsOf(t.abc, ABCJS) : null;
    const bpm = writtenBpm(t.abc, ABCJS);
    const seconds = info ? Math.round(info.playedBeats * 60 / bpm) : null;
    const fits = FITS.map(f => fitFor(low, high, f)).filter(Boolean);
    return {
      low, high, range: low === null ? '' : `${midiName(low)}–${midiName(high)} (${spanWords(high - low)})`,
      bars: info ? info.bars.filter(b => !b.short).length : t.bars, seconds, bpm,
      length: seconds === null ? `${t.bars} bars` : `${t.bars} bars, about ${seconds < 60 ? `${Math.max(5, Math.round(seconds / 5) * 5)} seconds` : `${Math.round(seconds / 30) / 2} minutes`}`,
      fits, goal: learningGoal(t, set),
    };
  }
  // The written tempo in beats per minute: the Q: line, else the page's default.
  function writtenBpm(abc, ABCJS) {
    const q = String(abc).match(/^Q:\s*(.+)$/m);
    if (!q) return DEFAULT_BPM;
    if (ABCJS) { try { const b = ABCJS.parseOnly(abc)[0].getBpm(); if (b > 0) return b; } catch (e) {} }
    const m = q[1].match(/=\s*(\d+)/) || q[1].match(/^(\d+)/); return m ? +m[1] : DEFAULT_BPM;
  }

  /* ---------------- bars ----------------
     The written bars of the first voice, read from abcjs's own parse: where each
     bar's music starts and ends in the text, its length, how it opens (a repeat,
     an ending, a part label) and how it closes (a double bar, a repeat, the end
     of a source line). */
  const REPEAT_OPEN = new Set(['bar_left_repeat', 'bar_dbl_repeat']);
  const REPEAT_CLOSE = new Set(['bar_right_repeat', 'bar_dbl_repeat']);
  function barsOf(abc, ABCJS) {
    const text = String(abc);
    const tune = ABCJS.parseOnly(text)[0];
    const barLen = (tune.getBarLength && tune.getBarLength()) || 1, beatLen = (tune.getBeatLength && tune.getBeatLength()) || 0.25;
    const bars = [];
    let cur = null, pending = { repeat: false, ending: null, part: null, after: null }, endingNow = null;
    const open = () => {
      if (pending.ending) endingNow = pending.ending;
      cur = { notes: [], els: [], dur: 0, start: null, after: pending.after, ending: endingNow, open: { repeat: pending.repeat, ending: pending.ending, part: pending.part }, close: null };
      pending = { repeat: false, ending: null, part: null, after: null };
    };
    // An ending runs from its bracket until abcjs closes it (endEnding), or a repeat, double or final bar does.
    const finish = (endChar, closeStart, type, endEnding) => {
      if (!cur || !cur.els.length) return false;
      cur.end = endChar; cur.closeStart = closeStart;
      cur.close = { type: type || 'none', repeat: REPEAT_CLOSE.has(type), double: type === 'bar_thin_thin' || type === 'bar_thick_thin', final: type === 'bar_thin_thick' };
      if (endEnding || cur.close.repeat || cur.close.double || cur.close.final) endingNow = null;
      bars.push(cur); cur = null; return true;
    };
    for (const line of tune.lines || []) {
      if (!line.staff || !line.staff[0] || !line.staff[0].voices || !line.staff[0].voices[0]) continue;
      for (const el of line.staff[0].voices[0]) {
        if (el.el_type === 'part') { pending.part = el.title; continue; }
        if (el.el_type === 'note') {
          if (!cur) open();
          if (cur.start === null) cur.start = el.startChar;
          cur.els.push(el);
          if (!el.rest || el.rest.type !== 'spacer') cur.dur += (el.duration || 0) * (el.tripletMultiplier || 1);
          if (!el.rest) cur.notes.push(el);
          continue;
        }
        if (el.el_type === 'bar') {
          const closed = finish(el.endChar, el.startChar, el.type, el.endEnding);
          if (!closed && el.endEnding) endingNow = null;
          if (!closed && cur && !cur.els.length) cur = null;
          if (REPEAT_OPEN.has(el.type)) pending.repeat = true;
          if (el.startEnding) pending.ending = String(el.startEnding);
          pending.after = el.endChar;
        }
      }
    }
    if (cur && cur.els.length) { const last = cur.els[cur.els.length - 1]; finish(last.endChar, last.endChar, 'none'); }
    // Where each source line ends (a line ending in \ continues), and which bars are short (pickups, the bar before one).
    bars.forEach((b, i) => {
      b.n = i + 1;
      const next = bars[i + 1];
      const gap = next ? text.slice(b.end, next.start) : '';
      const lineText = text.slice(text.lastIndexOf('\n', b.end - 1) + 1, (text.indexOf('\n', b.end) + 1 || text.length + 1) - 1);
      b.lineEnd = !next || (gap.includes('\n') && !/\\\s*$/.test(lineText));
      b.short = b.dur < barLen * 0.74;
      b.breath = b.notes.some(n => (n.decoration || []).some(d => d === 'breath' || d === 'fermata'));
      b.chord = null;
      for (const n of b.els) for (const c of n.chord || []) if (!c.position || c.position === 'default') b.chord = c.name;
      b.firstChord = (b.els[0] && (b.els[0].chord || []).find(c => !c.position || c.position === 'default') || {}).name || null;
    });
    // The beats as played: a repeated section twice (a first ending only the first time, a second only the second).
    let playedBeats = 0, sectStart = 0;
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      if (b.open.repeat) sectStart = i;
      playedBeats += b.dur / beatLen;
      if (b.close.repeat) {
        for (let j = sectStart; j <= i; j++) if (!bars[j].open.ending && !inEnding(bars, j)) playedBeats += bars[j].dur / beatLen;
        sectStart = i + 1;
      }
    }
    return { tune, text, bars, barLen, beatLen, playedBeats };
  }
  // Whether bar i belongs to a first or second ending (from its opening until a repeat or double bar closes it).
  const inEnding = (bars, i) => (bars[i] && bars[i].ending) || null;

  /* ---------------- phrases ----------------
     In order of authority:
       1. the teacher's cuts (a link's cuts=, or saved on this computer);
       2. a %%phrases line in the tune: the bar numbers where phrases begin;
       3. the tune's own structure: part labels, double bars and repeats make
          sections; a breath mark or fermata ends a phrase; and when the source
          lines are all two to eight bars long, each line is a phrase;
       4. otherwise four-bar groups inside each section, a group of one or two
          left over joining the one before. A pickup bar belongs to the phrase it
          leads into and is not counted. Endings are never cut from the bars
          they end. A piece of four bars or fewer stays whole.
     The source is reported so the page can say how sure it is. */
  const GROUP = 4;
  function phrasesOf(abc, ABCJS, { cuts = null } = {}) {
    const info = barsOf(abc, ABCJS), bars = info.bars, N = bars.length;
    const mk = (starts, source) => {
      const s = [...new Set(starts.filter(x => x >= 0 && x < N))].sort((a, b) => a - b);
      if (s[0] !== 0) s.unshift(0);
      const phrases = s.map((from, i) => ({ index: i, from, to: i + 1 < s.length ? s[i + 1] : N }));
      for (const p of phrases) { p.first = p.from + 1; p.last = p.to; p.label = labelFor(bars, p); }
      return { info, bars, phrases, source, note: SOURCE_NOTE[source] };
    };
    if (!N) return { info, bars, phrases: [], source: 'empty', note: '' };
    const teacher = normalCuts(cuts).filter(n => n <= N);
    if (cuts && teacher.length) return mk(teacher.map(n => n - 1), 'teacher');
    const marked = String(abc).match(/^%%phrases\s+([\d\s,.]+)$/m);
    if (marked) { const m = normalCuts(marked[1]).filter(n => n <= N); if (m.length) return mk(m.map(n => n - 1), 'marked'); }
    const barsWorth = (a, z) => { let d = 0; for (let i = a; i < z; i++) d += bars[i].dur; return d / info.barLen; };
    if (barsWorth(0, N) <= GROUP + 0.5) return mk([0], 'whole');
    // Never cut at the start of an ending or inside one.
    const glued = i => !!(bars[i] && bars[i].ending && (bars[i].open.ending || (bars[i - 1] && bars[i - 1].ending)));
    // Sections: a part label or repeat opens one; a repeat, double or final bar closes one.
    const sectionStarts = [0];
    for (let i = 1; i < N; i++) {
      const prev = bars[i - 1], b = bars[i];
      if (glued(i)) continue;
      if (b.open.part || b.open.repeat || prev.close.repeat || prev.close.double || prev.close.final) sectionStarts.push(i);
    }
    const sections = sectionStarts.map((s, k) => [s, k + 1 < sectionStarts.length ? sectionStarts[k + 1] : N]);
    // Source lines are phrases when there are several and each holds two to six bars' worth.
    let lineCount = 0, linesOk = true, run = 0;
    for (let i = 0; i < N; i++) { run += bars[i].dur / info.barLen; if (bars[i].lineEnd) { lineCount++; if (run < 1.75 || run > 6.5) linesOk = false; run = 0; } }
    const byLines = linesOk && lineCount > 1;
    let source = byLines ? 'lines' : sections.length > 1 ? 'sections' : 'groups';
    const starts = [];
    for (const [a, z] of sections) {
      starts.push(a);
      const breaths = [];
      for (let i = a; i < z - 1; i++) if (bars[i].breath && !glued(i + 1)) breaths.push(i + 1);
      if (breaths.length) { starts.push(...breaths); source = 'marked'; continue; }
      if (byLines) { for (let i = a; i < z - 1; i++) if (bars[i].lineEnd && !glued(i + 1)) starts.push(i + 1); continue; }
      // Groups of about four bars by length, so a pickup or a short bar never throws the count: the section is cut
      // into n equal lengths and each cut moves to the nearest barline that is not inside an ending.
      const worth = barsWorth(a, z);
      const n = worth <= GROUP + 2 ? 1 : Math.max(1, Math.round((worth - 0.5) / GROUP));
      const at = []; let acc = 0; for (let i = a; i < z; i++) { acc += bars[i].dur / info.barLen; at.push([i + 1, acc]); }
      for (let g = 1; g < n; g++) {
        const target = worth * g / n;
        let best = null;
        for (const [i, d] of at) if (i < z && !glued(i) && (best === null || Math.abs(d - target) < Math.abs(best[1] - target) - 1e-9)) best = [i, d];
        if (best && !starts.includes(best[0])) starts.push(best[0]);
      }
    }
    return mk(starts, source);
  }
  const SOURCE_NOTE = {
    teacher: 'Sections as you set them.',
    marked: 'Sections from the phrase marks in the music.',
    sections: 'Sections follow the tune’s parts and repeats, then groups of about four bars inside them: a guess you can change.',
    lines: 'Sections follow the lines the tune was written in.',
    groups: 'Sections are groups of about four bars: a guess you can change.',
    whole: 'A short piece: one section.',
    empty: '',
  };
  function labelFor(bars, p) {
    let part = null; for (let i = p.from; i >= 0; i--) if (bars[i].open.part) { part = bars[i].open.part; break; }
    return part ? `Part ${part}` : '';
  }

  /* One phrase as a tune of its own: the header with the key, metre, unit and
     tempo in force where it starts; its bars' music with the barlines written
     afresh (a repeat kept whole when the phrase holds its end, so its endings
     play as written); the chord in force at its first note; and its verses'
     words for its notes. The %%round and %%band lines belong to the whole tune. */
  const isMusic = l => l.trim() && !/^\s*%/.test(l) && !/^\s*[A-Za-z+]:/.test(l);
  function phraseAbc(abc, ABCJS, p, found = null) {
    const { info, bars } = found || phrasesOf(abc, ABCJS);
    const text = info.text, lines = text.split('\n');
    const B = bars.slice(p.from, p.to); if (!B.length) return text;
    // The header: the lines before the first music line; then the fields changed in the body before the phrase.
    const head = [];
    let k = 0, pos = 0;
    for (; k < lines.length; k++) { if (isMusic(lines[k])) break; pos += lines[k].length + 1; if (/^\s*[WwP]:|^%%(round|band)\b|^%%phrases\b/.test(lines[k]) || !lines[k].trim()) continue; head.push(lines[k]); }
    const setField = (f, v) => { const i = head.findIndex(l => l.startsWith(f + ':')); const line = `${f}:${v}`; if (i < 0) head.splice(Math.max(0, head.findIndex(l => l.startsWith('K:'))), 0, line); else head[i] = line; };
    const before = text.slice(pos, B[0].start);
    for (const m of before.matchAll(/(?:^|\n)\s*([KMLQ]):([^\n%]*)|\[([KMLQ]):([^\]]*)\]/g)) { const f = m[1] || m[3], v = (m[2] !== undefined ? m[2] : m[4]).trim(); if (f === 'K') { const i = head.findIndex(l => l.startsWith('K:')); if (i >= 0) head.splice(i, 1); head.push('K:' + v); } else setField(f, v); }
    if (!head.some(l => l.startsWith('K:'))) head.push('K:C');
    const kIdx = head.findIndex(l => l.startsWith('K:')); head.push(...head.splice(kIdx, 1));   // K: last
    // The music: each bar's text between its barlines, with barlines of our own.
    const keep = B.some(b => b.open.ending) && B.some(b => b.close.repeat);   // endings play as written: the phrase's own repeat
    const bodyOf = b => {
      let s = text.slice(b.after !== null && b.after !== undefined && b.after <= b.start ? b.after : b.start, b.closeStart);
      s = s.split('\n').map((l, i) => (i > 0 && !isMusic(l)) ? null : l.replace(/\\\s*$/, '')).filter(l => l !== null).join(' ');
      return s.replace(/^\s*\[?\d[\d,-]*(?=\s|["!A-Ga-gz^_=(\[{.~HLMOPSTuv])/, '').trim();
    };
    let out = '';
    B.forEach((b, i) => {
      let open = '';
      if (keep && b.open.repeat && i > 0) open = '|:';
      if (keep && i === 0) open = '|:';
      if (keep && b.open.ending) open += (open ? ' ' : '') + '[' + b.open.ending + ' ';
      let body = bodyOf(b);
      if (i === 0) { const ch = chordBefore(bars, p.from); if (ch && !b.firstChord) body = `"${ch}"` + body; }
      out += open + body;
      const last = i === B.length - 1;
      out += keep && b.close.repeat ? (B[i + 1] && B[i + 1].open.repeat ? ' ::' : ' :|') : last ? ' |]' : b.close.double ? ' ||' : ' |';
      if (!last) out += b.lineEnd ? '\n' : ' ';
    });
    // The words: every verse that has any in the phrase; a tied-on note takes none, a note with no syllable a *.
    const verses = [];
    const notes = B.flatMap(b => b.notes);
    const maxV = Math.max(0, ...notes.map(n => (n.lyric || []).length));
    for (let v = 0; v < maxV; v++) {
      if (!notes.some(n => n.lyric && n.lyric[v] && n.lyric[v].syllable)) continue;
      // A syllable ending _ is held over the next note; each further note it holds takes another _.
      let w = '', tiedOn = false, held = 0;
      for (const n of notes) {
        const tieIn = tiedOn; tiedOn = (n.pitches || []).some(x => x.startTie);
        if (tieIn && (n.pitches || []).some(x => x.endTie)) continue;
        const l = n.lyric && n.lyric[v];
        if (!l || !l.syllable) { if (held === 1) held = 2; else w += held ? '_ ' : '* '; continue; }
        const syl = l.syllable.replace(/\s+/g, '~').replace(/[-_*|]/g, m => '\\' + m);
        held = l.divider === '_' ? 1 : 0;
        w += syl + (l.divider === '-' ? '-' : l.divider === '_' ? '_ ' : ' ');
      }
      verses.push('w: ' + w.trim());
    }
    return [...head, out, ...verses].join('\n') + '\n';
  }
  /* Several spans of a tune written out one after another as a tune of their own (the form demonstration's openings
     of each part, when the whole piece will not fit on the screen): the first span's header; each span's music on a line
     of its own, closed by a double bar (the last by a final bar), with a key, metre or unit that differs from the first
     written inline. The words only when every span has the same verses, so no syllable lands on another span's notes.
     Returns the text and where each span's bars are in it (0-based, end exclusive). */
  function spansAbc(abc, ABCJS, spans, found = null) {
    const f = found || phrasesOf(abc, ABCJS);
    const parts = spans.map(sp => {
      const lines = phraseAbc(abc, ABCJS, sp, f).trimEnd().split('\n'), k = lines.findIndex(isMusic);
      return { head: lines.slice(0, k), music: lines.slice(k).filter(isMusic).join(' '), words: lines.slice(k).filter(l => /^w:/.test(l)) };
    });
    const field = (head, x) => (head.find(l => l.startsWith(x + ':')) || '').slice(2).trim();
    const sameWords = parts.every(p => p.words.length === parts[0].words.length);
    const body = [];
    let at = 0;
    const where = spans.map((sp, i) => {
      const p = parts[i];
      const inline = i ? ['L', 'M', 'K'].filter(x => field(p.head, x) !== field(parts[0].head, x) && field(p.head, x)).map(x => `[${x}:${field(p.head, x)}]`).join('') : '';
      body.push(inline + (i < spans.length - 1 ? p.music.replace(/\|\]\s*$/, '||') : p.music));
      if (sameWords) body.push(...p.words);
      const span = { from: at, to: at + (sp.to - sp.from) }; at = span.to;
      return span;
    });
    return { abc: [...parts[0].head, ...body].join('\n') + '\n', where };
  }
  /* The idea a piece brings in, heard in it: for each concept, the first window of one bar, else two (a leap across
     the barline, a change of metre), whose own analysis has it. The concepts: what the piece introduces at its
     place in the course, else what it has that is worth pointing out (a tie, a pickup, a rest off the beat...). */
  const NOTABLE = /^(tie|tie-over-bar|pickup|rest-off-beat|repeat|endings|triplet|triplet-in-compound|tuplet|accidentals|grace-notes|syncopation|metre-change|key-change|leap:(5th|6th|7th|octave|over-octave))\b/;
  function conceptsOf(t) { const intro = (t.introduces || []).filter(x => skillWords(x)); return intro.length ? intro : (t.skills || []).filter(x => NOTABLE.test(x) && skillWords(x)).slice(0, 3); }
  function exampleOf(t, ABCJS, analyze, tag, found = null) {
    const f = found || phrasesOf(t.abc, ABCJS), N = f.bars.length;
    const has = (from, to) => { try { const r = analyze.analyzeAbc(phraseAbc(t.abc, ABCJS, { from, to }, f), ABCJS)[0]; return !!(r && r.features && (r.features.skills || []).includes(tag)); } catch (e) { return false; } };
    for (const w of [1, 2]) for (let a = 0; a + w <= N; a++) if (has(a, a + w)) return { tag, words: skillWords(tag), from: a, to: a + w, first: a + 1, last: a + w };
    return null;
  }
  /* One idea from each element of music, heard in the piece (course/concepts.json, written by course/concepts.js): a choice
     for each element the piece shows, in the curriculum's order, ready for the Listen step. n is the piece's bar count,
     so an entry that has gone stale never points past the end. */
  const ELEMENT_NAMES = { duration: 'Duration', pitch: 'Pitch', dynamics: 'Dynamics', timbre: 'Timbre', texture: 'Texture and harmony', form: 'Form' };
  function conceptChoices(entry, n = Infinity) {
    if (!entry) return [];
    return Object.keys(ELEMENT_NAMES).map(el => [el, entry[el]])
      .filter(([, x]) => x && !x.absent && Array.isArray(x.bars) && x.bars[0] >= 1 && x.bars[0] <= x.bars[1] && x.bars[1] <= n)
      .map(([el, x]) => ({ el, element: ELEMENT_NAMES[el], tag: x.concept, words: x.name, about: x.words, reason: x.reason, term: x.term, grade: x.grade,
        isNew: !!x.new, throughout: !!x.throughout, from: x.bars[0] - 1, to: x.bars[1], first: x.bars[0], last: x.bars[1],
        ...(el === 'form' ? formParts(x.parts, n) : {}) }))
      .map(c => c.parts ? { ...c, words: c.parts.map(p => p.letter).join(' ') } : c);
  }
  /* A form's parts, for its demonstration: each part's letter, its bars and the opening to play (0-based, end
     exclusive, as phraseAbc takes them). Parts that do not run end to end over the piece, or an opening outside its
     part, mean the data is stale: no parts, and the choice plays its bars as any other. */
  function formParts(parts, n = Infinity) {
    if (!Array.isArray(parts) || parts.length < 2) return {};
    const out = parts.map(p => ({ letter: String(p.letter), first: p.bars[0], last: p.bars[1], from: p.bars[0] - 1, to: p.bars[1], play: { from: p.play[0] - 1, to: p.play[1] } }));
    const ok = out.every((p, i) => p.first === (i ? out[i - 1].last + 1 : 1) && p.last >= p.first && p.play.from === p.from && p.play.to > p.play.from && p.play.to <= p.to) && (n === Infinity || out[out.length - 1].last === n);
    return ok ? { parts: out } : {};
  }
  /* What a form's parts say, in words for the class: which bars are each letter, and what a primed letter means.
     "A: bars 1–4 and 9–12 · B: bars 5–8". */
  function formWords(parts) {
    const span = p => p.first === p.last ? `${p.first}` : `${p.first}–${p.last}`;
    const groups = [];
    for (const p of parts) { const g = groups.find(x => x.letter === p.letter); if (g) g.spans.push(span(p)); else groups.push({ letter: p.letter, spans: [span(p)] }); }
    const list = groups.map(g => `${g.letter}: bar${g.spans.length > 1 || /–/.test(g.spans[0]) ? 's' : ''} ${g.spans.length > 1 ? g.spans.slice(0, -1).join(', ') + ' and ' + g.spans[g.spans.length - 1] : g.spans[0]}`).join(' · ');
    const primed = [...new Set(parts.filter(p => /[′″‴]/.test(p.letter)).map(p => p.letter[0]))];
    return list + (primed.length ? `; ${primed.map(l => `${l}′ begins like ${l} and ends differently`).join('; ')}` : '');
  }
  function chordBefore(bars, from) { for (let i = from - 1; i >= 0; i--) if (bars[i].chord) return bars[i].chord; return null; }

  /* ---------------- tempo ----------------
     Slow practice starts a little over half speed, in steps of five, and goes up five at a time. */
  const roundTo5 = n => Math.round(n / 5) * 5;
  const slowStart = written => Math.max(40, Math.min(written, roundTo5(written * 0.6)));
  const nudgeTempo = (bpm, dir, written) => Math.max(30, Math.min(Math.max(written * 1.25, 60), roundTo5(bpm) + 5 * Math.sign(dir || 1)));
  const tempoShare = (bpm, written) => written > 0 ? Math.round(100 * bpm / written) : null;
  // Faster each time round: five more a time, up to the written tempo and no further.
  const nextLap = (bpm, written) => Math.min(Math.max(bpm, written), nudgeTempo(bpm, 1, written));

  /* ---------------- progress: what a learner did on this computer ----------------
     { v: 1, tunes: { id: { title, runs, slowRuns, stepRuns, steps, heard, bestBpm, written, phrases: { n: runs }, last, log: [...] } } }
     A run is the music playing to its end; a step run is stepping to the last note. Neither says the playing was right:
     the summary says what was done, and listening only adds what the microphone heard, marked as a guess. */
  const PROGRESS_KEY = 'gcs-practice-v1';
  const emptyProgress = () => ({ v: 1, tunes: {} });
  function readProgress(storage) { try { const p = JSON.parse(storage.getItem(PROGRESS_KEY) || 'null'); if (p && p.v === 1 && p.tunes) return p; } catch (e) {} return emptyProgress(); }
  function writeProgress(storage, p) { try { storage.setItem(PROGRESS_KEY, JSON.stringify(p)); return true; } catch (e) { return false; } }
  const today = () => new Date().toISOString().slice(0, 10);
  function recordPractice(store, ev) {
    const p = store && store.tunes ? store : emptyProgress();
    if (!ev || !ev.id) return p;
    const e = p.tunes[ev.id] || (p.tunes[ev.id] = { title: ev.title || ev.id, runs: 0, slowRuns: 0, stepRuns: 0, steps: 0, heard: 0, wholeRuns: 0, bestBpm: 0, written: ev.written || 0, phrases: {}, phraseBpm: {}, last: '', log: [] });
    e.phraseBpm = e.phraseBpm || {};
    if (ev.title) e.title = ev.title;
    if (ev.written) e.written = ev.written;
    const date = ev.date || today();
    e.last = date;
    if (ev.kind === 'run') {
      e.runs++; if (ev.whole) e.wholeRuns++;
      if (ev.bpm && e.written && ev.bpm < e.written * 0.9) e.slowRuns++;
      if (ev.bpm > e.bestBpm && (ev.whole || ev.phrases === 1)) e.bestBpm = ev.bpm;
      if (!ev.whole && ev.phrase) { e.phrases[ev.phrase] = (e.phrases[ev.phrase] || 0) + 1; if (ev.bpm > (e.phraseBpm[ev.phrase] || 0)) e.phraseBpm[ev.phrase] = ev.bpm; }
    } else if (ev.kind === 'steps') {
      e.stepRuns++; e.steps += ev.steps || 0; e.heard += ev.heard || 0;
      if (!ev.whole && ev.phrase) e.phrases[ev.phrase] = (e.phrases[ev.phrase] || 0) + 1;
    } else return p;
    const prev = e.log[e.log.length - 1];
    const same = prev && prev.d === date && prev.k === ev.kind && prev.ph === (ev.whole ? 0 : ev.phrase || 0) && prev.bpm === (ev.bpm || 0);
    if (same) prev.n++; else e.log.push({ d: date, k: ev.kind, ph: ev.whole ? 0 : ev.phrase || 0, bpm: ev.bpm || 0, n: 1 });
    if (e.log.length > 60) e.log.splice(0, e.log.length - 60);
    return p;
  }
  // Where a learner stands on a piece, in words: the assistance they practise with and the tempo they have reached.
  // phrase: the phrase on screen (1 up), whose own best tempo the ladder shows; omitted, the whole piece's.
  function progressOf(store, id, phraseCount = 1, phrase = null) {
    const e = store && store.tunes && store.tunes[id];
    if (!e) return { started: false, stage: 'new', label: 'Not started', detail: '' };
    const share = e.bestBpm && e.written ? tempoShare(e.bestBpm, e.written) : null;
    const phrasesDone = Object.keys(e.phrases).length;
    let stage = 'stepping', label = 'Learning the notes';
    if (e.runs) { stage = 'slow'; label = 'Slow practice'; }
    if (e.wholeRuns && share !== null && share >= 90) { stage = 'tempo'; label = 'Up to speed'; }
    const bits = [];
    if (e.stepRuns) bits.push(`stepped through ${e.stepRuns} time${e.stepRuns === 1 ? '' : 's'}`);
    if (e.runs) bits.push(`played ${e.runs} time${e.runs === 1 ? '' : 's'}`);
    if (phraseCount > 1 && phrasesDone) bits.push(`${Math.min(phrasesDone, phraseCount)} of ${phraseCount} sections tried`);
    if (e.bestBpm) bits.push(`whole piece up to ${e.bestBpm} BPM${share !== null ? ` (${share}% of full speed)` : ''}`);
    if (e.steps && e.heard) bits.push(`microphone heard ${e.heard} of ${e.steps} stepped notes (a guess)`);
    const best = phrase ? ((e.phraseBpm || {})[phrase] || 0) : e.bestBpm;
    return { started: true, stage, label, detail: bits.join(' · '), share, last: e.last, entry: e, ladderBpm: best, ladderShare: best && e.written ? tempoShare(best, e.written) : 0, ladderOf: phrase ? `section ${phrase}` : 'the whole piece' };
  }

  /* ---------------- assessment: the teacher decides ----------------
     Kept in the board's store (gcs-course-v1) under tests[student]: the board's
     earlier 1-4 marks stay readable beside these. */
  const RESULTS = { pass: 'Pass', practice: 'Needs more practice', na: 'Not assessed' };
  const ASSISTS = { none: 'On their own', along: 'With the recording', slow: 'Slowed down', step: 'Step by step' };
  function makeAssessment(a = {}) {
    if (!a.student || !String(a.student).trim()) throw new Error('an assessment needs a student');
    if (!a.id) throw new Error('an assessment needs a piece');
    if (!RESULTS[a.result]) throw new Error(`result must be one of ${Object.keys(RESULTS).join(', ')}`);
    const rec = { date: a.date || today(), id: a.id, title: a.title || a.id, level: clampInt(a.level, 1, 6) || null, result: a.result,
      note: String(a.note || '').trim().slice(0, 500), bpm: clampInt(a.bpm, 20, 400) || null, written: clampInt(a.written, 20, 400) || null,
      assist: ASSISTS[a.assist] ? a.assist : 'none', phrase: clampInt(a.phrase, 1, 99) || null };
    const mark = clampInt(a.mark, 1, 4); if (mark && a.mark !== '' && a.mark !== null && a.mark !== undefined) rec.mark = mark;   // optional: the achievement chart's four levels, as the first board kept
    if (Array.isArray(a.flags) && a.flags.length) rec.flags = a.flags.slice(0, 40).map(f => ({ kind: f.kind, at: f.at, expected: f.expected, heard: f.heard, confidence: f.confidence, kept: f.kept !== false }));
    if (a.listened) rec.listened = { notes: a.listened.notes || 0, matched: a.listened.matched || 0, reliability: a.listened.reliability || 'low' };
    return rec;
  }
  // The board's state after the record: the test is kept; a pass passes the piece; needs-more-practice puts it back to practising.
  function applyAssessment(state, student, rec) {
    const s = state; s.tests = s.tests || {}; s.progress = s.progress || {};
    (s.tests[student] = s.tests[student] || []).push(rec);
    const m = s.progress[rec.id] || (s.progress[rec.id] = {});
    if (rec.result === 'pass') m[student] = { state: 'passed', date: rec.date };
    else if (rec.result === 'practice' && !(m[student] && m[student].state === 'passed')) m[student] = { state: 'practising', date: rec.date };
    if (!Object.keys(m).length) delete s.progress[rec.id];
    return s;
  }
  const resultWords = t => t.result ? RESULTS[t.result] : t.mark ? `Level ${t.mark}` : '';

  /* ---------------- step/wait ----------------
     events: the sounding notes in order ({ ms, midis }); rests are passed over.
     The learner moves on with Next (or the space bar); with listening on, a
     steady matching pitch moves on too. A pitch an octave away counts as the
     note (a recorder sounds an octave above what it reads), and says so. */
  class Stepper {
    constructor(events) { this.events = (events || []).filter(e => e && e.midis && e.midis.length); this.i = 0; this.heard = 0; this.done = false; }
    get current() { return this.events[this.i] || null; }
    get count() { return this.events.length; }
    next(byEar = false) { if (this.done) return null; if (byEar) this.heard++; if (this.i < this.events.length - 1) { this.i++; return this.current; } this.done = true; return null; }
    back() { this.done = false; if (this.i > 0) this.i--; return this.current; }
    reset() { this.i = 0; this.heard = 0; this.done = false; return this.current; }
    hear(midi, clarity) {
      const cur = this.current; if (!cur || this.done || midi === null || midi === undefined) return { verdict: 'none' };
      const j = judgeNote(cur.midis, midi, clarity);
      if (j.verdict === 'match' || j.verdict === 'octave') { this.next(true); return { ...j, advanced: true }; }
      return j;
    }
  }

  /* ---------------- listening (advisory) ---------------- */
  // McLeod's normalised square difference: { freq, clarity } or null. buf: time-domain floats. (As in lab/Play Along v1.html.)
  function mpm(buf, sr, minF = 60, maxF = 2000) {
    const N = buf.length, maxTau = Math.min(N - 1, Math.floor(sr / minF)), minTau = Math.max(2, Math.floor(sr / maxF));
    const nsdf = new Float32Array(maxTau + 1);
    for (let tau = minTau; tau <= maxTau; tau++) {
      let acf = 0, m = 0;
      for (let i = 0; i + tau < N; i++) { const a = buf[i], b = buf[i + tau]; acf += a * b; m += a * a + b * b; }
      nsdf[tau] = m ? 2 * acf / m : 0;
    }
    const peaks = []; let tau = minTau;
    while (tau <= maxTau && nsdf[tau] > 0) tau++;
    while (tau <= maxTau) {
      while (tau <= maxTau && nsdf[tau] <= 0) tau++;
      let best = -1, bestV = -Infinity;
      while (tau <= maxTau && nsdf[tau] > 0) { if (nsdf[tau] > bestV) { bestV = nsdf[tau]; best = tau; } tau++; }
      if (best > 0) peaks.push(best);
    }
    if (!peaks.length) return null;
    const top = Math.max(...peaks.map(p => nsdf[p])), thr = top * 0.9;
    const t0 = peaks.find(p => nsdf[p] >= thr);
    const a = nsdf[t0 - 1] || 0, b = nsdf[t0], c = nsdf[t0 + 1] || 0, den = a - 2 * b + c;
    const shift = den ? 0.5 * (a - c) / den : 0;
    return { freq: sr / (t0 + shift), clarity: b };
  }
  const freqToMidi = f => 69 + 12 * Math.log2(f / 440);
  // A pitch becomes a note once it has held within half a semitone for `hold` frames; it is let go after `drop` quiet frames.
  class NoteGate {
    constructor(hold = 3, drop = 4) { this.hold = hold; this.drop = drop; this.cand = null; this.n = 0; this.note = null; this.empty = 0; this.fresh = false; }
    push(midi) {
      this.fresh = false;
      if (midi === null || midi === undefined) { this.empty++; if (this.empty >= this.drop) { this.note = null; this.cand = null; this.n = 0; } return this.note; }
      this.empty = 0;
      const r = Math.round(midi);
      if (this.cand === r) this.n++; else { this.cand = r; this.n = 1; }
      if (this.n >= this.hold && this.note !== r) { this.note = r; this.fresh = true; }
      return this.note;
    }
  }
  /* How a heard pitch compares with the note(s) written. clarity is the detector's (0..1); below 0.85 nothing is claimed.
     confidence: 'high' for a clear pitch within 40 cents, 'medium' within half a semitone or an octave away, 'low' otherwise. */
  function judgeNote(expected, midi, clarity = 1) {
    const want = (Array.isArray(expected) ? expected : [expected]).filter(m => m !== null && m !== undefined);
    if (!want.length || midi === null || midi === undefined || !(clarity >= 0.85)) return { verdict: 'none', confidence: 'low' };
    let best = null;
    for (const w of want) { const d = midi - w; if (!best || Math.abs(d) < Math.abs(best)) best = d; }
    const cents = Math.abs(best) * 100;
    if (cents <= 50) return { verdict: 'match', confidence: cents <= 40 && clarity >= 0.92 ? 'high' : 'medium', cents: Math.round(best * 100) };
    for (const w of want) { const d = midi - w, oct = Math.round(d / 12); if (oct && Math.abs(d - 12 * oct) <= 0.5) return { verdict: 'octave', confidence: 'medium', octaves: oct }; }
    return { verdict: 'other', confidence: clarity >= 0.92 ? 'medium' : 'low', semitones: Math.round(best) };
  }
  /* Heard notes against written ones, by edit distance: a written note heard (or heard an octave away), heard as another
     note, not heard, or an extra note. Then the timing of the matched notes against the written rhythm, scaled to the
     player's own tempo: a gap much longer than written is a hesitation, an interval far from its written share a rhythm
     question. Every flag carries a confidence, and the whole a reliability, because a room, an octave, two instruments
     at once and the delay of a microphone all fool a pitch reader. The teacher decides. */
  function alignAttempt(expected, heard, { noise = 0 } = {}) {
    const E = (expected || []).filter(e => e && e.midis && e.midis.length), H = (heard || []).filter(h => h && h.midi !== null && h.midi !== undefined);
    const n = E.length, m = H.length;
    const cost = (e, h) => { const j = judgeNote(e.midis, h.midi, h.clarity === undefined ? 1 : h.clarity); return j.verdict === 'match' ? 0 : j.verdict === 'octave' ? 0.3 : 1; };
    const D = Array.from({ length: n + 1 }, (_, i) => { const r = new Float64Array(m + 1); r[0] = i; return r; });
    for (let j = 0; j <= m; j++) D[0][j] = j;
    for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) D[i][j] = Math.min(D[i - 1][j - 1] + cost(E[i - 1], H[j - 1]), D[i - 1][j] + 1, D[i][j - 1] + 0.8);
    const pairs = [];
    let i = n, j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && Math.abs(D[i][j] - (D[i - 1][j - 1] + cost(E[i - 1], H[j - 1]))) < 1e-9) { pairs.push([i - 1, j - 1]); i--; j--; }
      else if (i > 0 && Math.abs(D[i][j] - (D[i - 1][j] + 1)) < 1e-9) { pairs.push([i - 1, null]); i--; }
      else { pairs.push([null, j - 1]); j--; }
    }
    pairs.reverse();
    const flags = []; let matched = 0;
    const conf = h => (h.clarity === undefined ? 1 : h.clarity) >= 0.93 && noise < 0.3 ? 'medium' : 'low';   // never 'high': a pitch reader is never sure what a class heard
    const matches = [];
    for (const [a, b] of pairs) {
      if (a !== null && b !== null) {
        const j2 = judgeNote(E[a].midis, H[b].midi, H[b].clarity === undefined ? 1 : H[b].clarity);
        if (j2.verdict === 'match') { matched++; matches.push([a, b]); }
        else if (j2.verdict === 'octave') { matched++; matches.push([a, b]); flags.push({ kind: 'octave', at: a, expected: E[a].midis[0], heard: H[b].midi, confidence: 'low', words: 'heard an octave away (often the microphone, not the player)' }); }
        else flags.push({ kind: 'wrong', at: a, expected: E[a].midis[0], heard: H[b].midi, confidence: conf(H[b]), words: `heard ${midiName(Math.round(H[b].midi))} for ${midiName(E[a].midis[0])}` });
      } else if (a !== null) flags.push({ kind: 'missed', at: a, expected: E[a].midis[0], heard: null, confidence: 'low', words: `${midiName(E[a].midis[0])} not heard` });
      else flags.push({ kind: 'extra', at: null, expected: null, heard: H[b].midi, confidence: 'low', words: `an extra ${midiName(Math.round(H[b].midi))}` });
    }
    // Timing: the player's own tempo is the median ratio of heard to written intervals.
    const ratios = [];
    for (let k = 1; k < matches.length; k++) { const [a0, b0] = matches[k - 1], [a1, b1] = matches[k]; const w = E[a1].ms - E[a0].ms, h = H[b1].ms - H[b0].ms; if (w > 0 && h > 0) ratios.push({ k, r: h / w, w, h, at: a1 }); }
    const sorted = ratios.map(x => x.r).sort((x, y) => x - y), med = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 1;
    for (const x of ratios) {
      const r = x.r / med;
      if (r > 2.2 && x.h - x.w * med > 600) flags.push({ kind: 'hesitation', at: x.at, expected: null, heard: null, confidence: ratios.length >= 6 ? 'medium' : 'low', words: `a pause before note ${x.at + 1}` });
      else if (r > 1.6 || r < 0.55) flags.push({ kind: 'rhythm', at: x.at, expected: null, heard: null, confidence: 'low', words: `note ${x.at + 1} came ${r > 1 ? 'late' : 'early'} for the written rhythm` });
    }
    flags.sort((a, b) => (a.at === null ? 1e9 : a.at) - (b.at === null ? 1e9 : b.at));
    const reliability = !m ? 'none' : noise >= 0.3 || m < n * 0.5 || m > n * 2 ? 'low' : 'medium';
    return { flags, matched, expected: n, heard: m, tempoRatio: med, reliability, summary: !m ? 'Nothing was heard clearly enough to compare.' : `${matched} of ${n} written notes heard (${reliability} reliability). Check each flag by ear.` };
  }

  return {
    DEFAULT_BPM, INSTRUMENTS, MODES, STEPS, HOW, SHOWS, SETUP_KEYS, ladder, conceptsOf, exampleOf, conceptChoices, formParts, formWords, spansAbc, RESULTS, ASSISTS, PROGRESS_KEY, FITS,
    cleanSetup, encodeSetup, decodeSetup, normalCuts, pieceHref, encodeBoard, decodeBoard,
    tunesAt, levelsOf, skillWords, learningGoal, summarize, writtenBpm, midiName, fitFor,
    barsOf, phrasesOf, phraseAbc, inEnding, transposeFor,
    slowStart, nudgeTempo, tempoShare, nextLap,
    emptyProgress, readProgress, writeProgress, recordPractice, progressOf,
    makeAssessment, applyAssessment, resultWords,
    Stepper, mpm, freqToMidi, NoteGate, judgeNote, alignAttempt,
  };
});
