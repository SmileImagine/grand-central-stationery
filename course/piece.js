/*
  The piece view: one tune from the practice board, opened in the main page
  (index.html#tune=<id>&...). Two people use it, each in steps.

    A student practising alone (mode=practice; a shared link opens this):
      1 Listen              the whole piece at full speed with the band, and the new idea in it.
      2 Learn the sections  one section on repeat, slow and a little faster each time round
                            (In time), or Note by note, with the app listening if they like.
      3 Put it together     the whole piece on repeat, slow to full speed, with the band.
      4 Play it through     the band plays the accompaniment (with faint guide tones if wanted) and
                            the student the tune; the app can listen and say what it heard, as a guess;
                            then Ready to show my teacher.

    A teacher, on the projector, so the class sees the same listen, learn, put together:
      Teach   1 Listen              as above, for the class.
              2 Learn the sections  Study: one section, uncluttered, a small fingering diagram at every
                                    note, for the class to work through at its own pace or in pairs; then
                                    Loop together: sections that grow (1, 2, 1–2, 3, 1–3 ...) on repeat,
                                    slow to faster. A class never plays in perfect time and nothing listens.
              3 Put it together     the whole piece, slow to full speed, with the band.
      Assess  1 Hear it · 2 The attempt · 3 Decide: a student's play-through from the teacher's side, with
              the flags to check by ear and the marks.

  Each step has one main button, Play or Pause, and sets what is on screen, whether it repeats, its
  tempo and how much the band plays (rich to listen and put together, plain and the same each time
  round for sections, the accompaniment without the tune for a play-through or an attempt). The page's own cell does the work: its
  renderer, the Player on its one AudioContext clock, Game mode and the instrument view; a section is
  written out as a tune of its own (course/practice.js). The address carries the setup and nothing
  private; practice history stays in this browser (gcs-practice-v1), assessments in the board's store.
*/
(function () {
  'use strict';
  const P = window.GCSPractice, G = window.GCS, hook = G && G.piece;
  if (!P || !hook) return;
  const LEVEL_COLOR = { 1: '#69b944', 2: '#e0b800', 3: '#f39322', 4: '#e72829', 5: '#087fca', 6: '#79569f' };
  const CUTS_KEY = 'gcs-phrase-cuts', COURSE_KEY = 'gcs-course-v1', FOLD_KEY = 'gcs-piece-folded', FASTER_KEY = 'gcs-piece-faster';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const ss = { get(k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } }, set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} } };
  const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // What each step is: what is on screen, whether it repeats, its first tempo, how much the band plays.
  const KINDS = { teach: ['listen', 'sections', 'whole'], practice: ['listen', 'sections', 'whole', 'through'], assess: ['hear', 'attempt', 'decide'] };
  /* The band each step plays with. rich: to listen and put together. plain: the same chorus every time round, for learning
     sections. perform: a play-through or an attempt, the accompaniment without the tune: the drums, the bass a little
     forward, the chords quieter, and the melody silent, or faint (guide tones) to support a student who needs it. */
  const BAND = { rich: { i: 65, c: 65, plain: false }, plain: { i: 25, c: 10, plain: true }, perform: { i: 45, c: 25, plain: true, mix: { chords: 45, bass: 85 } } };
  const GUIDE_LEVEL = 18;   // faint: under the accompaniment, enough to check a note by

  let setup = P.decodeSetup(location.hash);
  let set = null, tune = null, found = null, en = null, written = P.DEFAULT_BPM;
  let mode = 'practice', step = 1, idx = 0, rung = 0, how = 'study', listenOn = false, example = null, concepts = [], conceptData = null;
  let tempo = {}, bpm = null;
  let faster = ls.get(FASTER_KEY) !== '0';
  let stepper = null, listening = null, attempt = null, flagsShown = [], who = ss.get('gcs-assess-student');
  const student = () => ss.get('gcs-course-student');
  const kind = () => KINDS[mode][step - 1];
  const teacher = () => mode !== 'practice';
  // What step 2 is doing just now: studying, looping together (Teach), in time or note by note (Practice).
  const sub = () => kind() !== 'sections' ? null : how;
  // Whether the music repeats: each step's own choice (looping and putting together repeat), until the clock's repeat toggle changes it.
  const repeatsByDefault = () => ['together', 'time'].includes(sub()) || kind() === 'whole';
  let loopOn = null;
  const repeats = () => !example && (loopOn === null ? repeatsByDefault() : loopOn);
  const bandFor = () => example ? 'rich' : kind() === 'sections' ? 'plain' : ['through', 'attempt'].includes(kind()) ? 'perform' : 'rich';
  // Guide tones: on for a student's play-through (they can turn them off), off for an assessment (the teacher can turn them on).
  const guide = { practice: true, assess: false };

  /* ---------------- the bar across the top ---------------- */
  const bar = document.createElement('header');
  bar.className = 'piecebar'; bar.setAttribute('aria-label', 'Piece');
  bar.innerHTML = `
    <div class="pb-row pb-top">
      <button type="button" class="pb-fold" aria-expanded="true" aria-controls="pb-steps pb-tools" title="Fold the bar away, or open it again (F)" aria-label="Fold the bar"><span aria-hidden="true"></span></button>
      <a class="pb-back" href="course/board.html">← Board</a>
      <div class="pb-title"><span class="tape" aria-hidden="true"></span><b class="pb-name">Loading the piece…</b><button type="button" class="pb-share"></button><small class="pb-facts"></small></div>
      <div class="pb-modes" role="tablist" aria-label="Teacher"></div>
      <label class="pb-inst" title="The instrument shown with the music">Instrument <select>${Object.entries(P.INSTRUMENTS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <button type="button" class="pb-gear quiet" aria-label="Ukulele setup" title="Ukulele setup: C or D tuning, high or low G (kept on this computer)" hidden>⚙</button>
      <label class="pb-show" title="What a piano, the 2-5 Keys or a ukulele shows: the tune's notes, its chords, or both">Shows <select>${Object.entries(P.SHOWS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
    </div>
    <ol class="pb-row pb-steps" id="pb-steps" aria-label="Steps"></ol>
    <div class="pb-row pb-tools" id="pb-tools"></div>`;
  document.body.prepend(bar);
  const $ = s => bar.querySelector(s);
  const tools = $('.pb-tools');
  new ResizeObserver(() => document.documentElement.style.setProperty('--pb-h', bar.offsetHeight + 'px')).observe(bar);
  const setFold = on => { document.body.classList.toggle('pb-folded', on); $('.pb-fold').setAttribute('aria-expanded', String(!on)); $('.pb-fold').setAttribute('aria-label', on ? 'Open the bar' : 'Fold the bar'); ls.set(FOLD_KEY, on ? '1' : '0'); };
  setFold(ls.get(FOLD_KEY) === '1');

  let toastTimer;
  function say(text, action, fn) {
    let t = document.getElementById('pb-toast');
    if (!t) { t = document.createElement('div'); t.id = 'pb-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = esc(text) + (action ? ` <button type="button">${esc(action)}</button>` : '');
    if (action) t.querySelector('button').onclick = () => { t.classList.remove('on'); fn(); };
    t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), action ? 6000 : 2600);
  }

  /* ---------------- loading ---------------- */
  const abcjsReady = new Promise(r => { if (window.ABCJS) r(); else document.getElementById('abcjs').addEventListener('load', r, { once: true }); });
  function loadSet() {
    return fetch('course/set.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(() => new Promise((res, rej) => { if (window.GCS_SETS) return res(window.GCS_SETS.tunes); const sc = document.createElement('script'); sc.src = 'course/sets.js'; sc.onload = () => window.GCS_SETS ? res(window.GCS_SETS.tunes) : rej(new Error('no sets')); sc.onerror = rej; document.head.appendChild(sc); }));
  }
  // One idea from each element of music in each piece (course/concepts.js); without it, the analyzer's own guess.
  const loadConcepts = () => fetch('course/concepts.json').then(r => r.ok ? r.json() : null).catch(() => null);
  Promise.all([loadSet(), abcjsReady, loadConcepts()]).then(([s, , c]) => { set = s; conceptData = c; start(); }).catch(err => {
    $('.pb-name').textContent = 'The board’s tunes could not be loaded';
    $('.pb-facts').textContent = location.protocol === 'file:' ? 'Opened from disk: run node course/build-sets.js, or serve the folder.' : String(err.message || err);
  });

  function start() {
    tune = set.tunes.find(t => t.id === setup.tune);
    if (!tune) {
      $('.pb-name').textContent = 'This piece is not on the board';
      $('.pb-facts').textContent = 'It may have been renamed or taken out of the set. Go back to the board to choose another.';
      bar.classList.add('missing'); return;
    }
    document.title = `${tune.title} – Practice`;
    written = P.writtenBpm(tune.abc, window.ABCJS);
    const sum = P.summarize(tune, { ABCJS: window.ABCJS, analyze: window.GCSAnalyze || null, set });
    $('.pb-name').textContent = tune.title;
    $('.tape').style.background = LEVEL_COLOR[tune.level];
    $('.pb-facts').textContent = [`Level ${tune.level}`, tune.metre, sum.length, tune.origin || tune.composer].filter(Boolean).join(' · ');
    refind();
    // What to hear in it: one idea from each element of music, with the bars that show it (course/concepts.json); failing
    // that, the new idea, with the bars where the analyzer first finds it (those with none to show are left out).
    const mine = conceptData && conceptData.tunes && conceptData.tunes[tune.id];
    concepts = mine ? P.conceptChoices(mine, found.bars.length)
      : window.GCSAnalyze ? P.conceptsOf(tune).map(c => P.exampleOf(tune, window.ABCJS, window.GCSAnalyze, c, found)).filter(Boolean).slice(0, 3) : [];
    mode = setup.mode || 'practice';
    step = Math.min(setup.step || 1, KINDS[mode].length);
    how = P.HOW[mode] ? (P.HOW[mode].includes(setup.by) ? setup.by : P.HOW[mode][0]) : 'study';
    idx = Math.max(0, Math.min(sections() - 1, (setup.loop || 1) - 1));
    if (setup.to) { const L = P.ladder(sections()), r = L.findIndex(([a, b]) => a === idx && b === setup.to - 1); if (r >= 0) rung = r; }
    resetTempi();
    if (setup.bpm) tempo[step] = setup.bpm;
    bpm = tempo[step];
    let inst = setup.inst || ls.get('gcs-last-inst') || 'recorder'; if (!P.INSTRUMENTS[inst]) inst = 'recorder';
    $('.pb-inst select').value = inst;
    $('.pb-show select').value = setup.show || 'melody';
    en = hook.show({ text: textNow(), inst, tr: setup.tr || 0, show: $('.pb-show select').value });
    makeClock(); makePullTab();
    wireEngine();
    setMode(mode, step);
    requestAnimationFrame(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  }
  function refind() {
    let cuts = setup.cuts;
    if (!cuts) { try { cuts = (JSON.parse(ls.get(CUTS_KEY) || '{}') || {})[tune.id] || null; } catch (e) { cuts = null; } }
    found = P.phrasesOf(tune.abc, window.ABCJS, { cuts });
    found.cuts = cuts && cuts.length ? cuts : null;
  }
  const sections = () => found.phrases.length;
  // Each step's first tempo: full speed to listen and to be assessed, a little over half speed to learn and put together.
  function resetTempi() { tempo = {}; KINDS[mode].forEach((k, i) => { tempo[i + 1] = ['sections', 'whole'].includes(k) ? P.slowStart(written) : written; }); }
  // What is on screen: the example of a new idea, one section, a span of sections (Loop together), or the whole piece.
  function shownBars() {
    if (example) return { from: example.from, to: example.to };
    const n = sections(); if (n < 2 || kind() !== 'sections') return null;
    if (sub() === 'together') { const L = P.ladder(n), r = L[Math.min(rung, L.length - 1)]; return r[0] === 0 && r[1] === n - 1 ? null : { from: found.phrases[r[0]].from, to: found.phrases[r[1]].to, span: r }; }
    return { from: found.phrases[idx].from, to: found.phrases[idx].to, span: [idx, idx] };
  }
  function textNow() {
    const p = shownBars();
    let abc = p ? P.phraseAbc(tune.abc, window.ABCJS, p, found) : tune.abc;
    // Studying a section, room under each line of music for the diagrams.
    if (sub() === 'study' && !example) abc = /^X:.*$/m.test(abc) ? abc.replace(/^(X:.*)$/m, '$1\n%%staffsep 150') : '%%staffsep 150\n' + abc;
    return abc;
  }

  /* ---------------- the engine: text, band, tempo, runs ---------------- */
  function redraw() {
    if (!en) return;
    stopAll();
    const b = BAND[bandFor()];
    en.band.i = b.i; en.band.c = b.c; en.plainBand = b.plain;
    applyMix();
    document.body.dataset.pieceKind = sub() === 'study' && !example ? 'study' : kind();
    en.fitWhole = !!shownBars() || sections() < 2;
    en.repeatSigns = repeats();   // the score shows the repeat it plays
    // Studying, a section of more than eight notes takes two lines, so each note's diagram has room to be read.
    const shownNotes = (() => { const p = shownBars(); return (p ? found.bars.slice(p.from, p.to) : found.bars).reduce((n, b) => n + b.notes.length, 0); })();
    const shownBarCount = (() => { const p = shownBars(); return p ? p.to - p.from : found.bars.length; })();
    const split = sub() === 'study' && !example && shownNotes > 8 && shownBarCount > 1;
    en.fitFrom = split ? 2 : 1; en.barsPerLine = split ? Math.ceil(shownBarCount / 2) : 0;
    en.entry.value = textNow();
    en.render();
    if (en.player) en.player.gains();
    afterRender();
  }
  function afterRender() {
    if (!en) return;
    if (en.original && Math.abs(en.bpm() - bpm) > 0.5) { en.warp = bpm / en.writtenBpm(); en.retime(); }
    if (sub() === 'note') buildStepper(); else stepper = null;
    clearFlags();
    paint(); syncUrl();
    requestAnimationFrame(drawStudy);
  }
  // The mixer for the step: a play-through's accompaniment, with the melody silent or faint; else the band as balanced.
  function applyMix() {
    if (!en) return;
    const b = BAND[bandFor()];
    if (b.mix) { en.band.mix = { ...b.mix, ...(guide[mode] ? { melody: GUIDE_LEVEL } : {}) }; if (guide[mode]) delete en.band.mute; else en.band.mute = ['melody']; }
    else { delete en.band.mix; delete en.band.mute; }
    if (en.player) en.player.gains();
  }
  function setBpm(v) {
    bpm = Math.max(30, Math.min(300, Math.round(v)));
    if (!example) tempo[step] = bpm;
    if (en && en.original) { en.warp = bpm / en.writtenBpm(); en.retime(); }
    paint(); syncUrl();
  }
  function stopAll() { if (en && en.player) { if (en.player.running) en.togglePlay(); en.toTop(); } stopListening(); }
  // The step's one button: play from the top (or on from a pause), or pause.
  async function playPause() {
    if (!en) return;
    if (stepper) { stepNext(false); return; }
    const p = en.player, k = kind();
    if (!p.running) {
      p.setLoop(repeats());
      const lp = en.body.querySelector('.transport .loop'); if (lp) lp.setAttribute('aria-pressed', String(p.loop));
      if (!example && LISTEN_LAB && ((k === 'through' && listenOn) || k === 'attempt')) {
        if (!(p.pos > 0)) { attempt = null; flagsShown = []; clearMarks(); if (panel) openPanel(); }
        if (!listening) await startListening('attempt');
      }
    } else if (listening && listening.kind === 'attempt') { stopListening(); }
    en.togglePlay();
    paintPlaying();
  }
  // A run is the music playing from its start to its end (each time round when repeating). It says the music
  // played, not that it was played well. Faster each time round lifts the tempo at each turn.
  let run = { top: false, cycle: 0, was: false };
  function wireEngine() {
    // The page redraws the score when its box changes size; the diagrams and the note by note place follow.
    const render = en.render.bind(en);
    en.render = (...a) => { render(...a); requestAnimationFrame(() => { drawStudy(); if (stepper && en.tl && !en.player.running) showStep(false); }); };
    const finished = en.onFinished.bind(en);
    en.onFinished = () => {
      finished(); if (run.top && !example) lapDone(1); run = { top: false, cycle: 0, was: false }; paintPlaying();
      const k = kind();
      if (listening && listening.kind === 'attempt') judge(stopListening());
      else if (k === 'through' && !example) openPanel();
      if (k === 'listen' && !example) say(concepts.length ? `That was the whole piece. Hear ${concepts[0].element ? 'one idea at a time' : 'the new idea'} in it, or go on.` : 'That was the whole piece. Next: learn it a section at a time.', 'Next step', () => goStep(2));
    };
    setInterval(() => {
      const p = en && en.player; if (!p) return;
      if (p.running && !run.was) run = { top: p.position() <= 60, cycle: Math.max(0, Math.floor(p.position() / (p.total || 1))), was: true };
      if (!p.running) run.was = false;
      else if (p.loop && p.total > 0) { const c = Math.floor(p.position() / p.total); if (c > run.cycle) { if (run.top) lapDone(c - run.cycle); run.cycle = c; run.top = true; } }
      paintPlaying();
    }, 200);
  }
  function lapDone(n) {
    const k = kind();
    if (mode === 'practice' && k !== 'listen') {
      let store = P.readProgress(localStorage);
      const s = shownBars();
      for (let i = 0; i < n; i++) store = P.recordPractice(store, { id: tune.id, title: tune.title, kind: 'run', bpm, written, whole: !s, phrase: idx + 1, phrases: sections() });
      P.writeProgress(localStorage, store);
    }
    if (faster && repeats() && en.player.running && bpm < written) {
      const was = bpm; setBpm(P.nextLap(bpm, written));
      if (bpm >= written && was < written) {
        if (k === 'whole') say('Full speed: the whole piece with the band.');
        else if (sub() === 'together') say('Full speed. Add the next section?', 'Next', () => goRung(rung + 1));
        else say('Full speed on this section. On to the next?', 'Next section', () => goSection(idx + 1));
      }
    }
    paintProgress();
  }

  /* ---------------- the clock: play, pause and tempo, in the music ----------------
     The grand clock (course/clock.js) stands where the score's tempo mark was, so it stays in view when the bar
     is folded: tap it to play or pause, drag it (or its number) up or down for the tempo. Its label is the step's
     own words (Listen to the whole piece, Loop it...). Note by note and deciding have nothing to play: it steps aside. */
  let clock = null, clockHost = null, clockRaf = 0;
  function makeClock() {
    if (!window.GCSClock || !en) return;
    clockHost = document.createElement('div'); clockHost.className = 'pb-clock';
    en.body.appendChild(clockHost);
    clock = window.GCSClock.create(clockHost, { bpm, min: 30, max: 200, written, label: '', labelAt: 'none', repeat: repeats(),
      onToggle: () => playPause(), onBpm: v => setBpm(v), onReset: () => resetPlay(), onRepeat: on => setRepeat(on) });
  }
  const clockLabel = () => { const k = kind(); return example ? `Hear ${example.words}` : ({ listen: 'Listen to the whole piece', whole: 'Play the whole piece', through: 'Play it through', hear: 'Hear the whole piece', attempt: 'Start the attempt' })[k] || (sub() === 'study' ? 'Hear this section' : 'Loop it'); };
  function paintClock() {
    if (!clock) return;
    const off = sub() === 'note' || kind() === 'decide';
    clockHost.hidden = off;
    const beats = en && en.tl ? en.tl.countBeats : 4, p = en && en.player, playing = !!(p && p.running);
    clock.set({ bpm, written, label: clockLabel(), beats, playing, repeat: repeats(), canReset: !!(p && !playing && p.pos > 0) });
  }
  // Back to the start, from a pause.
  function resetPlay() { if (!en) return; if (en.player.running) en.togglePlay(); en.toTop(); wasPlaying = null; paintPlaying(); paintClock(); }
  // Repeat on or off: the music (from the next time round when playing) and the repeat signs in the score.
  function setRepeat(on) {
    loopOn = !!on;
    if (!en) return;
    en.player.setLoop(repeats());
    en.repeatSigns = repeats();
    if (en.player.running) en.pending = true; else en.render();
    paintClock(); syncUrl();
  }
  // While the music plays the hand sweeps once a bar: how far the playhead is through the bar it is in (the count-in's hand waits at twelve).
  function clockTick() {
    clockRaf = 0;
    if (!clock || !en || !en.player.running || !en.tl) return;
    const t = en.now(), bars = en.tl.bars || [], b = bars.find(x => t >= x.start && t < x.end);
    clock.set({ turn: b ? Math.max(0, Math.min(1, (t - b.start) / Math.max(1, b.end - b.start))) : 0 });
    clockRaf = requestAnimationFrame(clockTick);
  }

  /* ---------------- modes and steps ---------------- */
  function setMode(m, s = 1) {
    if (m !== mode) { stopAll(); mode = m; resetTempi(); how = P.HOW[m] ? P.HOW[m][0] : how; }
    bar.classList.toggle('teacher', teacher());
    $('.pb-modes').innerHTML = teacher() ? ['teach', 'assess'].map(x => `<button type="button" role="tab" data-mode="${x}" aria-selected="${x === m}" class="${x === m ? 'on' : ''}">${P.MODES[x]}</button>`).join('') : '';
    $('.pb-modes').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode, 1); }));
    // A small link button: Practice and a link sign for a teacher (the students' link), the sign alone for a student.
    // Share: an icon; its dialog offers the link (a teacher's is the students' practice link), the ABC and Strudel.
    $('.pb-share').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8"/></svg>`;
    $('.pb-share').setAttribute('aria-label', 'Share');
    $('.pb-share').title = teacher() ? 'Share: the practice link for students, the ABC, or Strudel' : 'Share: a link to this, the ABC, or Strudel';
    document.body.dataset.pieceMode = m;
    $('.pb-back').href = 'course/board.html#' + P.encodeBoard({ level: tune.level, tune: tune.id, do: m });
    goStep(s, true);
  }
  function goStep(s, force) {
    s = Math.max(1, Math.min(KINDS[mode].length, s));
    if (s === step && !force) return;
    stopAll();
    step = s; bpm = tempo[step] || written; example = null; loopOn = null;
    renderSteps(); renderTools();
    if (['through', 'attempt', 'decide'].includes(kind())) openPanel(); else closePanel();
    redraw();
  }
  /* The steps across the bar. Step 2 holds its two ways in its own bubble: Teach studies the sections, then loops
     them (1, 2a, 2b, 3); Practice goes note by note, then loops in time. Tapping a half goes there. */
  const STEP2 = { teach: [['study', 'Study the sections', 'Study'], ['together', 'Loop them', 'Loop']], practice: [['note', 'Note by note', 'Notes'], ['time', 'Loop in time', 'Loop']] };
  function renderSteps() {
    $('.pb-steps').innerHTML = P.STEPS[mode].map((n, i) => {
      const halves = i === 1 && STEP2[mode];
      if (!halves) return `<li><button type="button" data-step="${i + 1}" ${step === i + 1 ? 'aria-current="step"' : ''}><b>${i + 1}</b> <span class="st">${esc(n)}</span></button></li>`;
      return `<li class="pb-step2${step === 2 ? ' on' : ''}" role="group" aria-label="${esc(n)}"><b aria-hidden="true">2</b>${halves.map(([v, l, sh], j) => `<button type="button" data-step="2" data-how="${v}" ${step === 2 && how === v ? 'aria-current="step"' : ''} aria-label="${esc(l)}"><span class="half">${'ab'[j]}</span> <span class="st">${esc(l)}</span><span class="sh">${esc(sh)}</span></button>`).join('')}</li>`;
    }).join('');
    $('.pb-steps').querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => {
      const h = b.dataset.how;
      if (h && (h !== how || step !== 2)) { how = h; if (step === 2) { stopAll(); renderSteps(); renderTools(); redraw(); return; } }
      goStep(+b.dataset.step);
    }));
  }
  // The tempo, small: the number between − and +, its share of full speed in the tooltip.
  const tempoCtl = () => `<div class="pb-tempo" role="group" aria-label="Tempo">
      <button type="button" class="pb-slower" aria-label="Slower" title="Five beats a minute slower (−)">−</button>
      <span class="pb-bpm"><output class="pb-bpmv">${bpm}</output> <small>BPM</small></span>
      <button type="button" class="pb-faster" aria-label="Faster" title="Five beats a minute faster (+). The notes keep their pitch.">+</button></div>`;
  const fasterCtl = () => `<label class="chk" title="Each time round, five beats a minute faster, up to full speed"><input type="checkbox" class="pb-fasterlap"${faster ? ' checked' : ''}> Faster each time</label>`;
  const playBtn = label => `<button type="button" class="big play" data-act="play" title="Play or pause (space)"><span class="ic" aria-hidden="true">▶</span> <span class="lbl">${esc(label)}</span></button>`;
  // Moving between sections: arrows that point the way, not play buttons; the pencil sets where the sections fall.
  const sectionNav = (cuts = true) => sections() > 1 || cuts ? `<div class="pb-loopnav" role="group" aria-label="Section">
      ${sections() > 1 ? `<button type="button" class="pb-prev" aria-label="Previous" title="Previous (←)">←</button>
      <span class="pb-where" aria-live="polite"></span>
      <button type="button" class="pb-next" aria-label="Next" title="Next (→)">→</button>` : ''}
      ${cuts ? `<button type="button" class="pb-cuts quiet" aria-label="Set up sections" title="Set up sections: choose which bars make each one">✎</button>` : ''}</div>` : '';
  const guideCtl = () => `<label class="chk" title="The tune, faint under the accompaniment, to support a student who needs it and build confidence."><input type="checkbox" class="pb-guide"${guide[mode] ? ' checked' : ''}> Faint guide tones</label>`;
  // What to hear: the whole piece, or one idea in it (its bars shown and played): one for each element of music the
  // piece shows, or failing that the new idea. A toggle, like the others.
  const barsWord = c => c.first === c.last ? `bar ${c.first}` : `bars ${c.first}–${c.last}`;
  const conceptTitle = c => c.element ? `${c.element}${c.isNew ? ', new in this piece' : ''}: ${c.about}, in ${barsWord(c)}${c.throughout ? ' (heard all through)' : ''}` : `New in this piece: ${c.words}, in ${barsWord(c)}`;
  const conceptCtl = () => !concepts.length ? '' : `<div class="seg pb-concepts" role="radiogroup" aria-label="What to hear">
      <button type="button" role="radio" data-c="-1" aria-checked="${!example}">The whole piece</button>${concepts.map((c, i) => `<button type="button" role="radio" data-c="${i}" aria-checked="${example === c}" title="${esc(conceptTitle(c))}">${esc(c.words)}</button>`).join('')}</div>`;
  const exampleHint = c => c.element ? `${c.element}, ${barsWord(c)}: ${c.reason}` : `New in this piece, in ${barsWord(c)}.`;
  // Listening is not ready (Safari will not, and a voice is read poorly): only with the lab switch on this computer.
  const LISTEN_LAB = ls.get('gcs-listening-lab') === '1';
  function renderTools() {
    const k = kind();
    let h = '';
    if (k === 'listen') h = `${conceptCtl()}${example ? `<span class="pb-hint">${esc(exampleHint(example))}</span>` : ''}`;
    else if (k === 'sections' && mode === 'teach') h = how === 'study'
      ? `${sectionNav()}`
      : `${sectionNav(false)}${fasterCtl()}`;
    else if (k === 'sections') h = how === 'time'
      ? `${sectionNav()}${fasterCtl()}`
      : `<button type="button" class="big go" data-act="next" title="Next note (space)">Next note</button>
        <button type="button" class="big" data-act="back" title="The note before (Backspace)">Back</button>
        <button type="button" class="big" data-act="hear" title="Hear this note (H)"><span aria-hidden="true">🔊</span> Hear it</button>
        <span class="pb-step" aria-live="polite"></span>${sectionNav()}
        <label class="chk" title="Play each note as it comes up"><input type="checkbox" class="pb-sound" checked> Sound each note</label>
        ${LISTEN_LAB ? `<button type="button" class="big toggle mic" data-act="mic" aria-pressed="false" title="Listen through the microphone (a test): a steady, matching note moves on by itself. Next note always works."><span aria-hidden="true">🎤</span> Listen to me</button>` : ''}`;
    else if (k === 'whole') h = `${fasterCtl()}`;
    else if (k === 'through') h = `${guideCtl()}
        ${LISTEN_LAB ? `<button type="button" class="big toggle mic" data-act="listenon" aria-pressed="${listenOn}" title="The app listens while you play and says what it heard (a test; a guess at best)."><span aria-hidden="true">🎤</span> Listen to me</button>` : ''}`;
    else if (k === 'hear') {
      const st = courseState();
      h = `<label class="pb-who">Student ${st.roster.length ? `<select class="pa-who"><option value="">Choose…</option>${st.roster.map(n => `<option${n === who ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : `<input class="pa-who" placeholder="Name" value="${esc(who)}">`}</label>
`;
    }
    else if (k === 'attempt') h = `${guideCtl()}`;
    else h = `<span class="pb-hint">Decide in the panel, then save.</span>`;
    h += mode === 'practice' && ['sections', 'whole', 'through'].includes(k) ? `<div class="pb-progress" aria-live="polite"></div>` : '';
    tools.innerHTML = h; wasPlaying = null;
    tools.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
    loopOn = null;
    tools.querySelectorAll('.pb-concepts [data-c]').forEach(b => b.addEventListener('click', () => { const c = +b.dataset.c < 0 ? null : concepts[+b.dataset.c]; if (c !== example) showExample(c); }));
    const q = s => tools.querySelector(s);
    if (q('.pb-prev')) { q('.pb-prev').addEventListener('click', () => sub() === 'together' ? goRung(rung - 1) : goSection(idx - 1)); q('.pb-next').addEventListener('click', () => sub() === 'together' ? goRung(rung + 1) : goSection(idx + 1)); }
    if (q('.pb-slower')) { q('.pb-slower').addEventListener('click', () => setBpm(P.nudgeTempo(bpm, -1, written))); q('.pb-faster').addEventListener('click', () => setBpm(P.nudgeTempo(bpm, 1, written))); }
    if (q('.pb-fasterlap')) q('.pb-fasterlap').addEventListener('change', e => { faster = e.target.checked; ls.set(FASTER_KEY, faster ? '1' : '0'); });
    if (q('.pb-cuts')) q('.pb-cuts').addEventListener('click', editCuts);
    if (q('.pb-guide')) q('.pb-guide').addEventListener('change', e => { guide[mode] = e.target.checked; applyMix(); });
    const w = q('.pa-who'); if (w) w.addEventListener('change', () => { who = w.value.trim(); ss.set('gcs-assess-student', who); });
    paint();
  }
  // The example of a new idea: its bars on screen, played once at full speed with the band; null returns to the piece.
  function showExample(c) {
    stopAll();
    example = c; bpm = c ? written : tempo[step];
    renderTools(); redraw();
    if (c) playPause();
  }
  function act(a) {
    if (a === 'play') playPause();
    else if (a === 'next') stepNext(false);
    else if (a === 'back') { if (stepper) { stepper.back(); showStep(true); } }
    else if (a === 'hear') { if (stepper && stepper.current) soundStep(); }
    else if (a === 'mic') { if (listening) stopListening(); else startListening('step'); }
    else if (a === 'listenon') { listenOn = !listenOn; tools.querySelector('[data-act="listenon"]').setAttribute('aria-pressed', String(listenOn)); }
  }

  /* ---------------- studying a section: a diagram at every note ---------------- */
  let studyBox = null;
  function drawStudy() {
    if (studyBox) { studyBox.remove(); studyBox = null; }
    if (!en || sub() !== 'study' || example || !en.tl || en.inst === 'off') return;
    const score = en.scoreEl, svg = en.paper.querySelector('svg'); if (!svg) return;
    const sr = score.getBoundingClientRect();
    studyBox = document.createElement('div'); studyBox.className = 'pb-study'; studyBox.setAttribute('aria-hidden', 'true');
    score.appendChild(studyBox);
    const evs = en.tl.events.filter(e => e.midis && e.midis.length && e.groups && e.groups.length);
    // Each line of music: its lowest point, and the top of the next; the diagrams stand in the room between.
    const lineBox = L => { let top = Infinity, bottom = -Infinity; for (const el of svg.querySelectorAll(`.abcjs-l${L}`)) { const r = el.getBoundingClientRect(); if (!r.height) continue; top = Math.min(top, r.top); bottom = Math.max(bottom, r.bottom); } return { top, bottom }; };
    const lines = [...new Set(evs.map(e => e.line))].sort((a, b) => a - b), boxes = {};
    for (const L of lines) boxes[L] = lineBox(L);
    const rotate = en.inst === 'recorder' || en.inst === 'uke';
    let bottom = 0;
    for (const L of lines) {
      const on = evs.filter(e => e.line === L), xs = on.map(e => { const r = e.groups[0].getBoundingClientRect(); return r.left + r.width / 2 - sr.left; });
      // Under the last line, room enough to read a diagram even if the class scrolls to it (a short screen).
      const below = boxes[L].bottom - sr.top + score.scrollTop + 4, room = boxes[L + 1] ? boxes[L + 1].top - sr.top + score.scrollTop - below - 6 : Math.max(sr.height + score.scrollTop - below - 6, 190);
      const gap = xs.length > 1 ? Math.min(...xs.slice(1).map((x, i) => x - xs[i])) : 120;
      if (room < 28 || !(gap > 8)) continue;
      on.forEach((e, i) => {
        const host = document.createElement('div'); host.className = 'pb-mini inst ' + en.inst + (rotate ? ' rot' : '');
        studyBox.appendChild(host);
        const v = hook.mini(host, en, e.midis);
        const vb = v.svg.viewBox.baseVal, ratio = vb && vb.width ? vb.height / vb.width : 0.3;
        let w, h;
        if (rotate) { h = Math.min(room, 200); w = h * ratio; if (w > gap * 0.92) { w = gap * 0.92; h = w / ratio; } }
        else { w = Math.min(gap * 0.92, 160); h = w * ratio; if (h > room) { h = room; w = h / ratio; } }
        bottom = Math.max(bottom, below + h);
        host.style.cssText = `left:${(xs[i] - w / 2).toFixed(1)}px; top:${below.toFixed(1)}px; width:${w.toFixed(1)}px; height:${h.toFixed(1)}px; --bw:${w.toFixed(1)}px; --bh:${h.toFixed(1)}px; --mw:${(rotate ? h : w).toFixed(1)}px; --mh:${(rotate ? w : h).toFixed(1)}px`;
      });
    }
    studyBox.style.height = `${Math.ceil(bottom + 8)}px`;   // the box reaches the lowest diagram, so a short screen scrolls to it
  }

  /* ---------------- note by note ---------------- */
  function buildStepper() {
    if (!en || !en.tl) { stepper = null; return; }
    stepper = new P.Stepper(en.tl.events.map(e => ({ ms: e.ms, midis: e.midis })));
    showStep(false);
  }
  function showStep(sound) {
    if (!stepper || !en) return;
    const ev = stepper.current; if (!ev) return;
    const p = en.player; if (p.running) en.togglePlay();
    p.pos = ev.ms + 1; en.idle = false; en.k = null; en.leadIn = false; en.paint();
    const el = tools.querySelector('.pb-step');
    if (el) el.textContent = `Note ${stepper.i + 1} of ${stepper.count}`;
    const snd = tools.querySelector('.pb-sound');
    if (sound && snd && snd.checked) soundStep();
  }
  let quietUntil = 0;
  function soundStep() {
    const ev = stepper && stepper.current; if (!ev) return;
    const dur = Math.min(1.2, Math.max(0.35, 60 / bpm));
    quietUntil = performance.now() + dur * 1000 + 350;   // the microphone ignores the page's own note
    for (const m of ev.midis) hook.note(en, m, dur);
  }
  function stepNext(byEar) {
    if (!stepper) return;
    const was = stepper.done;
    stepper.next(byEar);
    if (stepper.done && !was) {
      if (mode === 'practice') {
        let store = P.readProgress(localStorage);
        store = P.recordPractice(store, { id: tune.id, title: tune.title, kind: 'steps', steps: stepper.count, heard: stepper.heard, whole: !shownBars(), phrase: idx + 1, written });
        P.writeProgress(localStorage, store); paintProgress();
      }
      celebrate();
      say(`All ${stepper.count} notes. Now loop it in time, slowly?`, 'Loop in time', () => { how = 'time'; renderTools(); redraw(); playPause(); });
      stepper.reset(); showStep(false);
      return;
    }
    showStep(true);
  }
  function celebrate() { if (reduceMotion || !en) return; en.body.classList.remove('done'); void en.body.offsetWidth; en.body.classList.add('done'); }

  /* ---------------- listening (advisory; one player, never a class) ---------------- */
  async function startListening(lkind) {
    const ctx = hook.ctx();
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('This browser cannot use a microphone here.'); return false; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { say(location.protocol === 'file:' ? 'A page opened from disk cannot use the microphone: serve the folder or use the published page.' : 'The microphone was not allowed.'); return false; }
    // Below the tune's range is the band's bass, not the player: a high-pass a little over an octave under the lowest
    // written note (room for a voice an octave down), and the pitch reader looks no lower.
    const lows = en && en.tl ? en.tl.events.flatMap(e => e.midis || []) : [], floorHz = lows.length ? 440 * Math.pow(2, (Math.min(...lows) - 14 - 69) / 12) : 60;
    const src = ctx.createMediaStreamSource(stream), hp = ctx.createBiquadFilter(), an = ctx.createAnalyser();
    hp.type = 'highpass'; hp.frequency.value = Math.max(50, floorHz * 0.9); hp.Q.value = 0.7; an.fftSize = 2048; src.connect(hp); hp.connect(an);
    const buf = new Float32Array(an.fftSize), gate = new P.NoteGate(3, 4);
    listening = { stream, src, an, kind: lkind, raf: 0, t0: performance.now(), notes: [], quiet: 0, loud: 0, frames: 0 };
    const btn = tools.querySelector('[data-act="mic"]'); if (btn) btn.setAttribute('aria-pressed', 'true');
    const tick = () => {
      if (!listening) return;
      listening.raf = requestAnimationFrame(tick);
      an.getFloatTimeDomainData(buf);
      let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / buf.length);
      listening.frames++;
      const now = performance.now();
      if (rms < 0.01 || now < quietUntil) { gate.push(null); listening.quiet++; return; }
      const p = P.mpm(buf, ctx.sampleRate, Math.max(50, floorHz));
      const midi = p && p.clarity > 0.85 ? P.freqToMidi(p.freq) : null;
      if (midi === null) listening.loud++;
      gate.push(midi);
      if (!gate.fresh) return;
      const heard = { midi: gate.note, clarity: p ? p.clarity : 0, ms: now - listening.t0 };
      if (listening.kind === 'step' && stepper && stepper.current) {
        const j = P.judgeNote(stepper.current.midis, midi, heard.clarity);
        if (j.verdict === 'match' || j.verdict === 'octave') { stepNext(true); if (j.verdict === 'octave') say('Heard an octave away: counted as the note (a recorder sounds an octave above what it reads).'); }
        else if (j.verdict === 'other') { const el = tools.querySelector('.pb-step'); if (el) el.textContent = `Note ${stepper.i + 1} of ${stepper.count}: heard something else (a guess)`; }
      }
      else if (listening.kind === 'attempt') listening.notes.push(heard);
    };
    tick();
    if (lkind === 'step') say('Listening. Play the note shown; a steady match moves on. Next note always works.');
    return true;
  }
  function stopListening() {
    const l = listening; if (!l) return null;
    listening = null; cancelAnimationFrame(l.raf);
    try { l.src.disconnect(); } catch (e) {}
    for (const t of l.stream.getTracks()) t.stop();
    const btn = tools.querySelector('[data-act="mic"]'); if (btn) btn.setAttribute('aria-pressed', 'false');
    return l;
  }
  function judge(l) {
    if (!l || !en || !en.tl) return;
    const expected = en.tl.events.filter(e => e.midis && e.midis.length).map(e => ({ ms: e.ms, midis: e.midis }));
    // Guide tones from the speakers reach the microphone too: the listening is called less sure.
    const r = P.alignAttempt(expected, l.notes, { noise: Math.max(l.frames ? l.loud / l.frames : 0, guide[mode] ? 0.35 : 0) });
    attempt = { notes: r.heard, matched: r.matched, reliability: r.reliability, summary: r.summary };
    flagsShown = r.flags.map(f => ({ ...f, kept: true }));
    openPanel();
    if (mode === 'assess') say('Check the flags by ear, then decide.', 'Decide', () => goStep(3));
  }

  /* ---------------- the panel: the play-through's feedback, the assessment ---------------- */
  let panel = null;
  function courseState() { try { const s = JSON.parse(ls.get(COURSE_KEY) || 'null'); if (s && Array.isArray(s.roster)) return { roster: s.roster, progress: s.progress || {}, levels: s.levels || {}, tests: s.tests || {} }; } catch (e) {} return { roster: [], progress: {}, levels: {}, tests: {} }; }
  function openPanel() {
    if (!panel) { panel = document.createElement('aside'); panel.className = 'pb-assess'; document.body.appendChild(panel); }
    const k = kind(), me = student();
    panel.setAttribute('aria-label', mode === 'assess' ? 'Assessment' : 'Your play-through');
    if (mode === 'practice') {
      const st = courseState(), ready = !!(me && st.progress[tune.id] && st.progress[tune.id][me] && st.progress[tune.id][me].state === 'ready');
      panel.innerHTML = `<h2>Your play-through</h2>
        <div class="pa-flags">${attempt ? '' : `<p class="muted">${!LISTEN_LAB ? 'The band plays the accompaniment; you play the tune. Play it for someone, and when it goes well, tell your teacher.' : listenOn ? 'Press Play it through: the app listens while you play, then says what it heard.' : 'Turn on Listen to me and the app says what it heard. Or play it for someone.'}</p>`}</div>
        ${me ? `<div class="pa-row pa-save"><button type="button" class="pa-ready primary">${ready ? 'Ready to show ✓' : 'Ready to show my teacher'}</button></div><p class="muted small">${esc(me)}: your teacher sees this on the board.</p>` : ''}`;
      if (attempt) showFlags(false);
      const rb = panel.querySelector('.pa-ready');
      if (rb) rb.addEventListener('click', () => { const s2 = courseState(); const m = s2.progress[tune.id] || (s2.progress[tune.id] = {}); m[me] = { state: 'ready', date: new Date().toISOString().slice(0, 10) }; ls.set(COURSE_KEY, JSON.stringify(s2)); rb.textContent = 'Ready to show ✓'; say('Your teacher will see you are ready.'); });
      return;
    }
    const st = courseState();
    panel.innerHTML = `
      <h2>${esc(who || 'The student')}</h2>
      <div class="pa-flags">${attempt ? '' : k === 'attempt' ? `<p class="muted">Start the attempt: the band plays the accompaniment and the student plays the tune${LISTEN_LAB ? '; anything that sounded wrong is listed here to check by ear' : '. Listen, then decide'}.</p>` : '<p class="muted">Your ears decide.</p>'}</div>
      ${k === 'decide' ? `
      ${!who ? `<label class="pa-row">Student ${st.roster.length ? `<select class="pa-who"><option value="">Choose…</option>${st.roster.map(n => `<option>${esc(n)}</option>`).join('')}</select>` : '<input class="pa-who" placeholder="Name">'}</label>` : ''}
      <fieldset class="pa-result"><legend>Result</legend>
        ${Object.entries(P.RESULTS).map(([x, v]) => `<label class="pa-res pa-${x}"><input type="radio" name="pa-res" value="${x}"> ${esc(v)}</label>`).join('')}
      </fieldset>
      <label class="pa-row" title="Optional: the Ontario achievement chart's four levels, for report cards">Achievement level <select class="pa-mark"><option value="">—</option><option value="1">1 limited</option><option value="2">2 some</option><option value="3">3 considerable</option><option value="4">4 high degree</option></select></label>
      <div class="pa-row pa-two">
        <label>Tempo <input type="number" class="pa-bpm" min="20" max="400" value="${tempo[2] || bpm}"> <small>BPM of ${written}</small></label>
        <label>Help <select class="pa-assist">${Object.entries(P.ASSISTS).map(([x, v]) => `<option value="${x}">${esc(v)}</option>`).join('')}</select></label>
      </div>
      <label class="pa-row pa-notewrap">Note <textarea class="pa-note" rows="2" maxlength="500" placeholder="What went well; what to practise next"></textarea></label>
      <div class="pa-row pa-save"><button type="button" class="pa-go primary">Save</button></div>
      <p class="muted small">Saved in this browser with the board’s class records. Not in any link.</p>` : ''}`;
    if (attempt) showFlags(true);
    const q = s => panel.querySelector(s);
    if (!q('.pa-go')) return;
    q('.pa-go').addEventListener('click', () => {
      const w = q('.pa-who'); const name = (w ? w.value : who || '').trim(), res = (panel.querySelector('input[name="pa-res"]:checked') || {}).value;
      if (!name) { say('Choose the student first.'); if (w) w.focus(); else goStep(1); return; }
      if (!res) { say('Choose a result: pass, needs more practice, or not assessed.'); return; }
      let rec;
      try { rec = P.makeAssessment({ student: name, id: tune.id, title: tune.title, level: tune.level, result: res, mark: q('.pa-mark').value, note: q('.pa-note').value, bpm: +q('.pa-bpm').value, written, assist: q('.pa-assist').value, flags: flagsShown, listened: attempt }); }
      catch (e) { say(e.message); return; }
      const st2 = courseState();
      if (!st2.roster.includes(name)) st2.roster.push(name);
      P.applyAssessment(st2, name, rec);
      ls.set(COURSE_KEY, JSON.stringify(st2));
      ss.set('gcs-assess-student', name);
      say(`${name}: ${P.RESULTS[res]} saved.`, 'Back to the board', () => { location.href = $('.pb-back').href; });
      attempt = null; flagsShown = []; who = '';
      goStep(1, true);
    });
  }
  function closePanel() { if (panel) { panel.remove(); panel = null; } if (mode !== 'assess') { attempt = null; flagsShown = []; clearMarks(); } }
  function showFlags(forTeacher) {
    const box = panel && panel.querySelector('.pa-flags'); if (!box || !attempt) return;
    const intro = forTeacher ? esc(attempt.summary) : `The app heard ${attempt.matched} of the ${en.tl.events.filter(e => e.midis && e.midis.length).length} notes as written. It is a guess: tap a note below to see where it is, and listen for yourself.`;
    box.innerHTML = `<p class="muted">${intro}${attempt.reliability !== 'medium' ? ' The room, an echo or two instruments at once can fool it.' : ''}</p>` +
      (flagsShown.length ? `<ul>${flagsShown.map((f, i) => `<li class="pa-flag k-${f.kind}"><button type="button" class="pa-show" data-i="${i}" ${f.at === null ? 'disabled' : ''}>${esc(f.words)}</button><small>${f.confidence === 'medium' ? 'likely' : 'unsure'}</small>${forTeacher ? `<label><input type="checkbox" data-i="${i}"${f.kept ? ' checked' : ''}> keep</label>` : ''}</li>`).join('')}</ul>` : (attempt.notes ? `<p>${forTeacher ? 'Nothing flagged. Listen for yourself.' : 'Nothing sounded wrong to the app.'}</p>` : ''));
    box.querySelectorAll('.pa-show').forEach(b => b.addEventListener('click', () => { const f = flagsShown[+b.dataset.i], ev = en.tl.events.filter(e => e.midis && e.midis.length)[f.at]; if (ev) { en.player.pos = ev.ms + 1; en.idle = false; en.k = null; en.paint(); } }));
    box.querySelectorAll('input[type="checkbox"]').forEach(c => c.addEventListener('change', () => { flagsShown[+c.dataset.i].kept = c.checked; markFlags(); }));
    markFlags();
  }
  function markFlags() {
    clearMarks();
    if (!en || !en.tl) return;
    const evs = en.tl.events.filter(e => e.midis && e.midis.length);
    for (const f of flagsShown) if (f.kept && f.at !== null && evs[f.at]) for (const g of evs[f.at].groups || []) g.classList.add('pb-flagged', 'pb-' + f.kind);
  }
  function clearMarks() { if (en && en.paper) for (const g of en.paper.querySelectorAll('.pb-flagged')) g.classList.remove('pb-flagged', 'pb-wrong', 'pb-missed', 'pb-octave', 'pb-hesitation', 'pb-rhythm'); }
  function clearFlags() { if (attempt) { markFlags(); return; } flagsShown = []; clearMarks(); }

  /* ---------------- sections ---------------- */
  function goSection(i) {
    if (!found || sections() < 2) return;
    const n = Math.max(0, Math.min(sections() - 1, i));
    if (n === idx) return;
    idx = n; tempo[step] = P.slowStart(written); bpm = tempo[step];
    redraw();
  }
  function goRung(r) {
    const L = P.ladder(sections()), n = Math.max(0, Math.min(L.length - 1, r));
    if (n === rung) return;
    rung = n; tempo[step] = P.slowStart(written); bpm = tempo[step];   // a bigger section starts slow again
    redraw();
  }
  let cutsDlg = null;
  function editCuts() {
    if (!cutsDlg) { cutsDlg = document.createElement('dialog'); cutsDlg.className = 'pb-cutsdlg'; document.body.appendChild(cutsDlg); }
    const bars = found.bars;
    const starts = new Set(found.phrases.map(p => p.from + 1));
    const word = b => { const n = b.notes.find(x => x.lyric && x.lyric[0] && x.lyric[0].syllable); return n ? n.lyric[0].syllable : ''; };
    cutsDlg.innerHTML = `<h2>Set up the sections</h2>
      <p>A section is the few bars learned on repeat before going on. Tap a bar to start a new section there; tap it again to join it to the section before. ${esc(found.note || '')}</p>
      <div class="pb-barchips">${bars.map(b => `<button type="button" data-n="${b.n}" aria-pressed="${starts.has(b.n)}" ${b.n === 1 ? 'disabled' : ''} aria-label="Bar ${b.n}${starts.has(b.n) ? ', a section starts here' : ''}">${b.n}${word(b) ? `<small>${esc(word(b))}</small>` : ''}</button>`).join('')}</div>
      <p class="pb-cutsum"></p>
      <div class="row"><button type="button" class="auto quiet">Automatic</button><button type="button" class="one quiet">The whole piece as one section</button><span class="pb-spacer"></span><button type="button" class="cancel quiet">Cancel</button><button type="button" class="done primary">Done</button></div>`;
    const sum = () => { const s = [...starts].sort((a, b) => a - b); cutsDlg.querySelector('.pb-cutsum').textContent = `${s.length} section${s.length === 1 ? '' : 's'}: ` + s.map((a, i) => `bars ${a}–${i + 1 < s.length ? s[i + 1] - 1 : bars.length}`).join(' · '); };
    sum();
    cutsDlg.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => { const n = +b.dataset.n; if (starts.has(n)) starts.delete(n); else starts.add(n); b.setAttribute('aria-pressed', String(starts.has(n))); sum(); }));
    cutsDlg.querySelector('.auto').onclick = () => saveCuts(null);
    cutsDlg.querySelector('.one').onclick = () => saveCuts([1]);
    cutsDlg.querySelector('.cancel').onclick = () => cutsDlg.close();
    cutsDlg.querySelector('.done').onclick = () => saveCuts([...starts].sort((a, b) => a - b));
    cutsDlg.showModal();
  }
  function saveCuts(cuts) {
    let all = {}; try { all = JSON.parse(ls.get(CUTS_KEY) || '{}') || {}; } catch (e) {}
    if (cuts) all[tune.id] = cuts; else delete all[tune.id];
    ls.set(CUTS_KEY, JSON.stringify(all));
    setup.cuts = cuts || undefined;
    refind();
    idx = Math.min(idx, sections() - 1); rung = Math.min(rung, P.ladder(sections()).length - 1);
    cutsDlg.close(); renderTools(); redraw();
    say(cuts ? 'Sections saved on this computer and in the link.' : 'Back to the automatic sections.');
  }

  /* ---------------- painting the bar, the address ---------------- */
  function paint() {
    if (!found) return;
    const n = sections(), where = tools.querySelector('.pb-where');
    if (where) {
      if (sub() === 'together') {
        const L = P.ladder(n), r = L[rung], a = found.phrases[r[0]], b = found.phrases[r[1]];
        where.innerHTML = `${r[0] === r[1] ? `Section ${r[0] + 1}` : r[0] === 0 && r[1] === n - 1 ? 'All of it' : `Sections ${r[0] + 1}–${r[1] + 1}`}<span class="lg"> · bars ${a.first}–${b.last} · ${rung + 1} of ${L.length}</span>`;
        tools.querySelector('.pb-prev').disabled = rung === 0; tools.querySelector('.pb-next').disabled = rung === L.length - 1;
      } else {
        const a = found.phrases[idx];
        where.innerHTML = `<span class="lg">Section </span>${idx + 1} of ${n}<span class="lg"> · bars ${a.first}–${a.last}${a.label ? ` · ${esc(a.label)}` : ''}</span>`;
        tools.querySelector('.pb-prev').disabled = idx === 0; tools.querySelector('.pb-next').disabled = idx === n - 1;
      }
      where.setAttribute('aria-label', where.textContent);
    }
    const v = tools.querySelector('.pb-bpmv'); if (v) v.textContent = String(bpm);
    const tg = tools.querySelector('.pb-tempo'); if (tg) { const share = P.tempoShare(bpm, written); tg.title = share >= 100 ? 'Full speed' : `${share}% of full speed`; }
    for (const b of bar.querySelectorAll('.pb-steps button')) b.classList.toggle('done', +b.dataset.step < step);
    for (const b of bar.querySelectorAll('.pb-step2')) b.classList.toggle('done', step > 2);
    $('.pb-show').hidden = !['piano', 'wh', 'uke'].includes($('.pb-inst select').value);
    $('.pb-gear').hidden = $('.pb-inst select').value !== 'uke' || !(G.ukeSetup && G.ukeSetup.open);
    wasPlaying = null; paintPlaying(); paintProgress(); paintClock();
  }
  // The main button says what it will do: Play, or Pause while the music plays.
  let wasPlaying = null;
  function paintPlaying() {
    const on = !!(en && en.player && en.player.running);
    if (on === wasPlaying) return;
    wasPlaying = on;
    if (clock) { clock.set({ playing: on, canReset: !on && en.player.pos > 0 }); if (on && !clockRaf) clockRaf = requestAnimationFrame(clockTick); if (!on && !(en.player.pos > 0)) clock.set({ turn: 0 }); }
    for (const b of tools.querySelectorAll('[data-act="play"]')) {
      b.classList.toggle('playing', on);
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('.ic').textContent = on ? '⏸' : '▶';
      if (!b.dataset.label) b.dataset.label = b.querySelector('.lbl').textContent;
      b.querySelector('.lbl').textContent = on ? (listening && listening.kind === 'attempt' ? 'Stop' : 'Pause') : b.dataset.label;
    }
  }
  function paintProgress() {
    const el = tools.querySelector('.pb-progress'); if (!el || !tune) return;
    const one = shownBars();
    const pr = P.progressOf(P.readProgress(localStorage), tune.id, sections(), one ? idx + 1 : null);
    const rungs = [60, 70, 80, 90, 100].map(s => `<span class="rung${pr.ladderShare >= s ? ' on' : ''}" title="${s}% of full speed">${s}%</span>`).join('');
    el.innerHTML = pr.started ? `<span class="ladder" role="img" aria-label="Fastest on ${esc(pr.ladderOf)}: ${pr.ladderShare || 0}% of full speed">${rungs}</span><small>${esc(pr.ladderOf)}${pr.detail ? ' · ' + esc(pr.detail) : ''}. Counted on this computer.</small>` : `<small>Your practice is counted on this computer: run-throughs and the tempo you reach.</small>`;
  }
  function syncUrl() {
    if (!tune) return;
    const s = kind() === 'sections' ? shownBars() : null, sp = s && s.span, k = kind();
    const out = { tune: tune.id, level: tune.level, mode, step: step > 1 ? step : undefined, loop: sp ? sp[0] + 1 : undefined, to: sp && sp[1] > sp[0] ? sp[1] + 1 : undefined,
      by: k === 'sections' && P.HOW[mode] && how !== P.HOW[mode][0] ? how : undefined,
      bpm: example ? undefined : bpm !== (['sections', 'whole'].includes(k) ? P.slowStart(written) : written) ? bpm : undefined,
      inst: $('.pb-inst select').value, show: $('.pb-show').hidden ? undefined : $('.pb-show select').value, tr: en && en.transpose ? en.transpose : undefined, cuts: found.cuts || undefined };
    setup = P.cleanSetup(out);
    history.replaceState(null, '', location.pathname + location.search + '#' + P.encodeSetup(setup));
  }

  /* ---------------- controls ---------------- */
  $('.pb-fold').addEventListener('click', () => setFold(!document.body.classList.contains('pb-folded')));
  // The ukulele's setup (tuning, high or low G) is the page's, shared with the lesson page; a change redraws the music and its diagrams.
  $('.pb-gear').addEventListener('click', () => { if (G.ukeSetup) G.ukeSetup.open(); });
  if (G.ukeSetup && G.ukeSetup.onChange) G.ukeSetup.onChange(() => { if (en) afterRender(); });
  const choose = (cls, v) => { const sel = en && en.body.querySelector(`.${cls} select`); if (sel) { sel.value = v; sel.dispatchEvent(new Event('change')); } };
  $('.pb-inst select').addEventListener('change', e => { const v = e.target.value; ls.set('gcs-last-inst', v); choose('instpick', v); choose('showpick', $('.pb-show select').value); afterRender(); });
  $('.pb-show select').addEventListener('change', e => { choose('showpick', e.target.value); afterRender(); });
  /* The full player (the Melody, Band and Mixer drawers) waits behind a small pull tab at the foot of the music, in the
     clock's brass and opal: tap it and the drawers slide up; the tab rides on their top edge and turns its chevron down. */
  let pullTab = null;
  function makePullTab() {
    if (!en || pullTab) return;
    pullTab = document.createElement('button'); pullTab.type = 'button'; pullTab.className = 'pb-pull'; pullTab.setAttribute('aria-expanded', 'false');
    pullTab.setAttribute('aria-label', 'The full player: the ABC, the band and the mixer'); pullTab.title = 'The full player: the ABC, the band, the mixer, note names and transposition';
    pullTab.innerHTML = '<svg viewBox="0 0 24 12" aria-hidden="true"><path d="M5 9l7-6 7 6"/></svg>';
    en.body.appendChild(pullTab);
    const dock = en.body.querySelector('.strip.dock');
    new ResizeObserver(() => en.body.style.setProperty('--dock-h', (document.body.classList.contains('pb-advanced') && dock ? dock.offsetHeight : 0) + 'px')).observe(dock);
    pullTab.addEventListener('click', () => {
      const on = !document.body.classList.contains('pb-advanced');
      document.body.classList.toggle('pb-advanced', on); pullTab.setAttribute('aria-expanded', String(on));
      en.showDrawer(on ? 'melody' : null);
      requestAnimationFrame(() => en.body.style.setProperty('--dock-h', (on && dock ? dock.offsetHeight : 0) + 'px'));
    });
  }
  $('.pb-share').addEventListener('click', openShare);
  let shareDlg = null;
  function openShare() {
    if (!tune) return;
    if (!shareDlg) { shareDlg = document.createElement('dialog'); shareDlg.className = 'pb-cutsdlg pb-sharedlg'; document.body.appendChild(shareDlg); }
    // A teacher's link is for students: the piece to practise, with the teacher's sections, instrument and key; never names, progress or marks.
    const s = teacher() ? { tune: setup.tune, level: setup.level, mode: 'practice', inst: setup.inst, show: setup.show, tr: setup.tr, cuts: setup.cuts } : { ...setup };
    const url = location.href.split('#')[0] + '#' + P.encodeSetup(s);
    let strudel = ''; try { strudel = hook.strudel ? hook.strudel(en, tune.abc) : ''; } catch (e) {}
    const items = [
      ['link', teacher() ? 'Practice link for students' : 'Link to this', teacher() ? 'Opens this piece to practise, with your sections, instrument and key.' : 'Opens this piece just as it is now.', url],
      ['abc', 'ABC', 'The whole tune as text, for the lesson page or any ABC program.', tune.abc],
      ...(strudel ? [['strudel', 'Strudel', 'The tune and its band as Strudel code, to play or remix at strudel.cc.', strudel]] : []),
    ];
    shareDlg.innerHTML = `<h2>Share ${esc(tune.title)}</h2>
      <div class="pb-sharelist">${items.map(([k, name, about]) => `<button type="button" data-k="${k}"><b>${esc(name)}</b><small>${esc(about)}</small><span class="done" aria-live="polite"></span></button>`).join('')}</div>
      <textarea class="pb-sharetext" readonly hidden aria-label="Copy this"></textarea>
      <div class="row"><span class="pb-spacer"></span><button type="button" class="close primary">Done</button></div>`;
    shareDlg.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', async () => {
      const text = items.find(x => x[0] === b.dataset.k)[3];
      shareDlg.querySelectorAll('.done').forEach(d => { d.textContent = ''; });
      try { await navigator.clipboard.writeText(text); b.querySelector('.done').textContent = 'Copied'; }
      catch (e) { const ta = shareDlg.querySelector('.pb-sharetext'); ta.hidden = false; ta.value = text; ta.focus(); ta.select(); }   // no clipboard here: select it to copy by hand
    }));
    shareDlg.querySelector('.close').onclick = () => shareDlg.close();
    shareDlg.showModal();
  }
  // A new address typed or pasted into this tab (the page writes its own with replaceState, which fires no hashchange).
  window.addEventListener('hashchange', () => location.reload());
  // Keys: one set for the whole view, before the page's own (which present a cell, not a piece).
  window.addEventListener('keydown', e => {
    if (!tune || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.matches && e.target.matches('textarea, input, select, [contenteditable]')) return;
    if (document.querySelector('dialog[open]')) return;
    const k = e.key; let done = true;
    if ((k === ' ' || k === 'Enter') && e.target && e.target.closest && e.target.closest('button, a, [role="tab"], [role="radio"]')) return;   // a focused control keeps its own keys
    if (k === ' ' || k === 'Enter') { if (kind() !== 'decide') playPause(); }
    else if (k === 'ArrowRight' && tools.querySelector('.pb-next')) tools.querySelector('.pb-next').click();
    else if (k === 'ArrowLeft' && tools.querySelector('.pb-prev')) tools.querySelector('.pb-prev').click();
    else if (k === 'PageDown') goStep(step + 1);
    else if (k === 'PageUp') goStep(step - 1);
    else if (/^[1-4]$/.test(k)) goStep(+k);
    else if (k === 'Backspace' && stepper) act('back');
    else if ((k === 'h' || k === 'H') && stepper) act('hear');
    else if (k === 'f' || k === 'F') $('.pb-fold').click();
    else if ((k === '+' || k === '=') && clock && !clockHost.hidden) setBpm(P.nudgeTempo(bpm, 1, written));
    else if ((k === '-' || k === '_') && clock && !clockHost.hidden) setBpm(P.nudgeTempo(bpm, -1, written));
    else done = false;
    if (done) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
})();
