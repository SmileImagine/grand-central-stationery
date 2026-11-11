/*
  The piece view: one tune from the practice board, opened in the main page
  (index.html#tune=<id>&...). Each way in is three steps, in the order a lesson
  goes:

    Teach, Practice  1 Listen            the whole piece once, at full speed, with the band.
                     2 Learn the loops   one loop at a time on repeat, from slow to faster
                                         (each time round a little faster, or note by note).
                     3 Put it together   the whole piece on repeat, from slow to faster,
                                         up to full speed with the band.
                     Practice keeps a history on this computer; Teach does not.
    Assess           1 Hear it           the student, and the piece played for them.
                     2 The attempt       optional listening, whose flags only suggest.
                     3 Decide            pass, needs more practice or not assessed, with a note.

  Each step has one main button, Play or Pause; repeating and speeding up
  belong to the step, not to extra buttons. The page's own cell does the work:
  its renderer, the Player on its one AudioContext clock, Game mode and the
  instrument view; a loop is written out as a tune of its own (course/practice.js).
  The address carries the setup and nothing private; practice history stays in
  this browser (gcs-practice-v1), assessments in the board's store (gcs-course-v1).
*/
(function () {
  'use strict';
  const P = window.GCSPractice, G = window.GCS, hook = G && G.piece;
  if (!P || !hook) return;
  const LEVEL_COLOR = { 1: '#69b944', 2: '#e0b800', 3: '#f39322', 4: '#e72829', 5: '#087fca', 6: '#79569f' };
  const CUTS_KEY = 'gcs-phrase-cuts', COURSE_KEY = 'gcs-course-v1', FOLD_KEY = 'gcs-piece-folded', FASTER_KEY = 'gcs-piece-faster';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let setup = P.decodeSetup(location.hash);
  let set = null, tune = null, found = null, en = null, written = P.DEFAULT_BPM;
  let mode = 'teach', step = 1, idx = 0, byNote = false;
  let tempo = { 1: null, 2: null, 3: null }, bpm = null;    // each step keeps its own tempo while the page is open
  let faster = ls.get(FASTER_KEY) !== '0';                  // faster each time round (on unless turned off here)
  let stepper = null, listening = null, attempt = null, flagsShown = [], who = '';
  try { who = sessionStorage.getItem('gcs-assess-student') || ''; } catch (e) {}

  /* ---------------- the bar across the top ---------------- */
  const bar = document.createElement('header');
  bar.className = 'piecebar'; bar.setAttribute('aria-label', 'Piece');
  bar.innerHTML = `
    <div class="pb-row pb-top">
      <button type="button" class="pb-fold" aria-expanded="true" aria-controls="pb-steps pb-tools" title="Fold the bar away, or open it again (F)" aria-label="Fold the bar"><span aria-hidden="true"></span></button>
      <a class="pb-back" href="course/board.html">← Board</a>
      <div class="pb-title"><span class="tape" aria-hidden="true"></span><b class="pb-name">Loading the piece…</b><small class="pb-facts"></small></div>
      <div class="pb-modes" role="tablist" aria-label="What to do">
        <button type="button" role="tab" data-mode="teach">Teach</button>
        <button type="button" role="tab" data-mode="practice">Practice</button>
        <button type="button" role="tab" data-mode="assess">Assess</button>
      </div>
      <label class="pb-inst" title="The instrument shown under the music">Instrument <select>${Object.entries(P.INSTRUMENTS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      <button type="button" class="pb-share" title="Copy a link that opens this piece at this step, loop, tempo and instrument (never names, progress or marks)">Copy link</button>
      <button type="button" class="pb-more" aria-expanded="false" title="The full player: the ABC, the band, the mixer, note names and transposition">More</button>
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
  Promise.all([loadSet(), abcjsReady]).then(([s]) => { set = s; start(); }).catch(err => {
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
    mode = setup.mode || 'teach';
    step = setup.step || 1;
    byNote = setup.by === 'note';
    idx = Math.max(0, Math.min(found.phrases.length - 1, (setup.loop || 1) - 1));
    tempo = { 1: written, 2: P.slowStart(written), 3: P.slowStart(written) };
    if (mode === 'assess') tempo[1] = tempo[2] = tempo[3] = written;
    if (setup.bpm) tempo[step] = setup.bpm;
    bpm = tempo[step];
    $('.pb-back').href = 'course/board.html#' + P.encodeBoard({ level: tune.level, tune: tune.id, do: mode });
    let inst = setup.inst || ls.get('gcs-last-inst') || 'recorder'; if (!P.INSTRUMENTS[inst]) inst = 'recorder';
    $('.pb-inst select').value = inst;
    en = hook.show({ text: textNow(), inst, tr: setup.tr || 0 });
    en.fitWhole = fitWhole(); en.render();
    requestAnimationFrame(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    wireEngine();
    setMode(mode, step);
  }
  function refind() {
    let cuts = setup.cuts;
    if (!cuts) { try { cuts = (JSON.parse(ls.get(CUTS_KEY) || '{}') || {})[tune.id] || null; } catch (e) { cuts = null; } }
    found = P.phrasesOf(tune.abc, window.ABCJS, { cuts });
    found.cuts = cuts && cuts.length ? cuts : null;
  }
  const loops = () => found.phrases.length;
  const onLoop = () => mode !== 'assess' && step === 2 && loops() > 1;      // a loop on screen, else the whole piece
  const loop = () => found.phrases[idx];
  const textNow = () => onLoop() ? P.phraseAbc(tune.abc, window.ABCJS, loop(), found) : tune.abc;
  // A loop (or a short piece) is drawn as large as it fits whole; a long piece keeps Game mode's two systems at a time.
  const fitWhole = () => onLoop() || loops() < 2;

  /* ---------------- the engine: text, tempo, runs ---------------- */
  let shown = '';
  function redraw() {
    if (!en) return;
    stopAll();
    const text = textNow();
    en.fitWhole = fitWhole();
    if (text !== shown || en.entry.value !== text) { en.entry.value = text; en.render(); }
    shown = text;
    afterRender();
  }
  // After a render the tempo is this step's (the cell keeps a ratio to the written tempo; a loop has the same).
  function afterRender() {
    if (!en) return;
    if (en.original && Math.abs(en.bpm() - bpm) > 0.5) { en.warp = bpm / en.writtenBpm(); en.retime(); }
    if (byNote && step === 2 && mode !== 'assess') buildStepper(); else stepper = null;
    clearFlags();
    paint(); syncUrl();
  }
  function setBpm(v) {
    bpm = Math.max(30, Math.min(300, Math.round(v)));
    tempo[step] = bpm;
    if (en && en.original) { en.warp = bpm / en.writtenBpm(); en.retime(); }
    paint(); syncUrl();
  }
  function stopAll() { if (en && en.player) { if (en.player.running) en.togglePlay(); en.toTop(); } stopListening(); }
  // The step's one button: play from the top (or on from a pause), or pause.
  function playPause() {
    if (!en) return;
    if (stepper) { stepNext(false); return; }
    const p = en.player;
    if (!p.running) { p.setLoop(step !== 1); const lp = en.body.querySelector('.transport .loop'); if (lp) lp.setAttribute('aria-pressed', String(p.loop)); }
    en.togglePlay();
    paintPlaying();
  }
  // A run is the music playing from its start to its end (each time round when repeating). It says the music
  // played, not that it was played well. Faster each time round lifts the tempo at each turn.
  let run = { top: false, cycle: 0, was: false };
  function wireEngine() {
    // The page redraws the score when its box changes size (folding the bar, More, turning a tablet); note by note, the
    // cursor and the instrument go back to the note the learner is on.
    const render = en.render.bind(en);
    en.render = (...a) => { render(...a); if (stepper && en.tl && !en.player.running) requestAnimationFrame(() => showStep(false)); };
    const finished = en.onFinished.bind(en);
    en.onFinished = () => { finished(); if (run.top) lapDone(1); run = { top: false, cycle: 0, was: false }; paintPlaying(); if (step === 1 && mode !== 'assess') say('That was the whole piece. Next: learn it a loop at a time.', 'Learn the loops', () => goStep(2)); };
    setInterval(() => {
      const p = en && en.player; if (!p) return;
      if (p.running && !run.was) run = { top: p.position() <= 60, cycle: Math.max(0, Math.floor(p.position() / (p.total || 1))), was: true };
      if (!p.running) run.was = false;
      else if (p.loop && p.total > 0) { const c = Math.floor(p.position() / p.total); if (c > run.cycle) { if (run.top) lapDone(c - run.cycle); run.cycle = c; run.top = true; } }
      paintPlaying();
    }, 200);
  }
  function lapDone(n) {
    if (mode === 'practice') {
      let store = P.readProgress(localStorage);
      for (let i = 0; i < n; i++) store = P.recordPractice(store, { id: tune.id, title: tune.title, kind: 'run', bpm, written, whole: !onLoop(), phrase: idx + 1, phrases: loops() });
      P.writeProgress(localStorage, store);
    }
    if (faster && step !== 1 && mode !== 'assess' && en.player.running && bpm < written) {
      const was = bpm; setBpm(P.nextLap(bpm, written));
      if (bpm >= written && was < written) say(step === 3 ? 'Full speed: the whole piece with the band.' : 'Full speed on this loop. Next loop, or put it together?', step === 3 ? null : 'Next loop', () => goLoop(idx + 1));
    }
    paintProgress();
  }

  /* ---------------- modes and steps ---------------- */
  function setMode(m, s = 1) {
    if (m !== mode || !$('.pb-steps').children.length) stopAll();
    mode = m;
    for (const b of bar.querySelectorAll('.pb-modes button')) { const on = b.dataset.mode === m; b.setAttribute('aria-selected', String(on)); b.classList.toggle('on', on); }
    document.body.dataset.pieceMode = m;
    $('.pb-back').href = 'course/board.html#' + P.encodeBoard({ level: tune.level, tune: tune.id, do: m });
    if (m === 'assess') tempo = { 1: written, 2: written, 3: written };
    else if (tempo[2] === written && tempo[3] === written) tempo = { 1: written, 2: P.slowStart(written), 3: P.slowStart(written) };
    goStep(s, true);
  }
  function goStep(s, force) {
    s = Math.max(1, Math.min(3, s));
    if (s === step && !force) return;
    stopAll();
    step = s; bpm = tempo[step] || written;
    renderSteps(); renderTools();
    if (mode === 'assess' && step >= 2) openAssess(); else closeAssess();
    redraw();
  }
  function renderSteps() {
    const names = P.STEPS[mode];
    $('.pb-steps').innerHTML = names.map((n, i) => `<li><button type="button" data-step="${i + 1}" ${step === i + 1 ? 'aria-current="step"' : ''}><b>${i + 1}</b> <span class="st">${esc(n)}</span></button></li>`).join('');
    $('.pb-steps').querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.step)));
  }
  const nextBtn = (label, to) => `<button type="button" class="pb-nextstep" data-to="${to}" title="The next step (Page Down)">Next: ${esc(label)} →</button>`;
  const tempoCtl = () => `<div class="pb-tempo" role="group" aria-label="Tempo">
      <button type="button" class="pb-slower" aria-label="Slower" title="Five beats a minute slower (−)">−</button>
      <span class="pb-bpm"><output class="pb-bpmv">${bpm}</output> <small>BPM</small></span>
      <button type="button" class="pb-faster" aria-label="Faster" title="Five beats a minute faster (+). The notes keep their pitch.">+</button>
      <small class="pb-share-of"></small></div>`;
  const fasterCtl = () => `<label class="chk" title="Each time round, five beats a minute faster, up to full speed"><input type="checkbox" class="pb-fasterlap"${faster ? ' checked' : ''}> Faster each time round</label>`;
  const playBtn = label => `<button type="button" class="big play" data-act="play" title="Play or pause (space)"><span class="ic" aria-hidden="true">▶</span> <span class="lbl">${esc(label)}</span></button>`;
  function renderTools() {
    let h = '';
    if (mode !== 'assess' && step === 1) {
      h = `${playBtn('Listen to the whole piece')}<span class="pb-hint">At full speed, with the band: hear how it goes before learning it.</span>${nextBtn('learn the loops', 2)}`;
    } else if (mode !== 'assess' && step === 2) {
      const many = loops() > 1;
      h = `${many ? `<div class="pb-loopnav" role="group" aria-label="Loop">
            <button type="button" class="pb-prev" aria-label="Previous loop" title="Previous loop (←)">◀</button>
            <span class="pb-where" aria-live="polite"></span>
            <button type="button" class="pb-next" aria-label="Next loop" title="Next loop (→)">▶</button></div>` : ''}
        <div class="seg" role="radiogroup" aria-label="How">
          <button type="button" role="radio" data-by="play" aria-checked="${!byNote}">Play it</button>
          <button type="button" role="radio" data-by="note" aria-checked="${byNote}">Note by note</button></div>`;
      if (!byNote) h += `${playBtn(many ? 'Play the loop' : 'Play')}${tempoCtl()}${fasterCtl()}`;
      else h += `<button type="button" class="big" data-act="back" title="The note before (Backspace)">◀ Back</button>
        <button type="button" class="big" data-act="hear" title="Hear this note (H)"><span aria-hidden="true">🔊</span> Hear it</button>
        <button type="button" class="big go" data-act="next" title="Next note (space)">Next note ▶</button>
        <span class="pb-step" aria-live="polite"></span>
        <label class="chk" title="Play each note as it comes up"><input type="checkbox" class="pb-sound" checked> Sound each note</label>
        <button type="button" class="big toggle mic" data-act="mic" aria-pressed="false" title="Listen through the microphone: a steady, matching note moves on by itself. Noise, other players and echoes can fool it; Next note always works."><span aria-hidden="true">🎤</span> Listen to me</button>`;
      h += `<button type="button" class="pb-cuts quiet" title="Choose which bars make each loop">Set up loops…</button>${nextBtn('put it together', 3)}`;
    } else if (mode !== 'assess') {
      h = `${playBtn('Play the whole piece')}${tempoCtl()}${fasterCtl()}<span class="pb-hint">From slow to full speed; the band plays along.</span>`;
    } else if (step === 1) {
      const st = courseState();
      h = `<label class="pb-who">Student ${st.roster.length ? `<select class="pa-who"><option value="">Choose…</option>${st.roster.map(n => `<option${n === who ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : `<input class="pa-who" placeholder="Name" value="${esc(who)}">`}</label>
        ${playBtn('Hear the whole piece')}${nextBtn('the attempt', 2)}`;
    } else if (step === 2) {
      h = `<button type="button" class="big toggle mic" data-act="attempt" aria-pressed="false" title="Listen to the student through the microphone, then compare with the music: a suggestion to check by ear, never a mark"><span aria-hidden="true">🎤</span> <span class="lbl">Listen to the attempt</span></button>
        <span class="pb-hint">Optional. Or listen in the room and go on.</span>${nextBtn('decide', 3)}`;
    } else {
      h = `<span class="pb-hint">Decide in the panel, then save. The microphone only suggested; the result is yours.</span>`;
    }
    h += mode === 'practice' && step >= 2 ? `<div class="pb-progress" aria-live="polite"></div>` : '';
    tools.innerHTML = h; wasPlaying = null;
    tools.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
    tools.querySelectorAll('[data-by]').forEach(b => b.addEventListener('click', () => { byNote = b.dataset.by === 'note'; stopAll(); renderTools(); afterRender(); }));
    tools.querySelectorAll('.pb-nextstep').forEach(b => b.addEventListener('click', () => goStep(+b.dataset.to)));
    const q = s => tools.querySelector(s);
    if (q('.pb-prev')) { q('.pb-prev').addEventListener('click', () => goLoop(idx - 1)); q('.pb-next').addEventListener('click', () => goLoop(idx + 1)); }
    if (q('.pb-slower')) { q('.pb-slower').addEventListener('click', () => setBpm(P.nudgeTempo(bpm, -1, written))); q('.pb-faster').addEventListener('click', () => setBpm(P.nudgeTempo(bpm, 1, written))); }
    if (q('.pb-fasterlap')) q('.pb-fasterlap').addEventListener('change', e => { faster = e.target.checked; ls.set(FASTER_KEY, faster ? '1' : '0'); });
    if (q('.pb-cuts')) q('.pb-cuts').addEventListener('click', editCuts);
    const w = q('.pa-who'); if (w) w.addEventListener('change', () => { who = w.value.trim(); try { sessionStorage.setItem('gcs-assess-student', who); } catch (e) {} });
    paint();
  }
  function act(a) {
    if (a === 'play') playPause();
    else if (a === 'next') stepNext(false);
    else if (a === 'back') { if (stepper) { stepper.back(); showStep(true); } }
    else if (a === 'hear') { if (stepper && stepper.current) soundStep(); }
    else if (a === 'mic') { if (listening) stopListening(); else startListening('step'); }
    else if (a === 'attempt') attemptToggle();
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
        store = P.recordPractice(store, { id: tune.id, title: tune.title, kind: 'steps', steps: stepper.count, heard: stepper.heard, whole: !onLoop(), phrase: idx + 1, written });
        P.writeProgress(localStorage, store); paintProgress();
      }
      celebrate();
      say(`All ${stepper.count} notes. Now play it, slowly, on repeat?`, 'Play it', () => { byNote = false; renderTools(); afterRender(); playPause(); });
      stepper.reset(); showStep(false);
      return;
    }
    showStep(true);
  }
  function celebrate() { if (reduceMotion || !en) return; en.body.classList.remove('done'); void en.body.offsetWidth; en.body.classList.add('done'); }

  /* ---------------- listening (advisory) ---------------- */
  async function startListening(kind) {
    const ctx = hook.ctx();
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('This browser cannot use a microphone here.'); return false; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { say(location.protocol === 'file:' ? 'A page opened from disk cannot use the microphone: serve the folder or use the published page.' : 'The microphone was not allowed.'); return false; }
    const src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(); an.fftSize = 2048; src.connect(an);
    const buf = new Float32Array(an.fftSize), gate = new P.NoteGate(3, 4);
    listening = { stream, src, an, kind, raf: 0, t0: performance.now(), notes: [], quiet: 0, loud: 0, frames: 0 };
    const btn = tools.querySelector('[data-act="mic"]'); if (btn) btn.setAttribute('aria-pressed', 'true');
    const tick = () => {
      if (!listening) return;
      listening.raf = requestAnimationFrame(tick);
      an.getFloatTimeDomainData(buf);
      let rms = 0; for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]; rms = Math.sqrt(rms / buf.length);
      listening.frames++;
      const now = performance.now();
      if (rms < 0.01 || now < quietUntil) { gate.push(null); listening.quiet++; return; }
      const p = P.mpm(buf, ctx.sampleRate);
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
      else if (listening.kind === 'attempt') { listening.notes.push(heard); const c = tools.querySelector('.pb-hint'); if (c) c.textContent = `Listening: ${listening.notes.length} notes heard.`; }
    };
    tick();
    if (kind === 'step') say('Listening. Play the note shown; a steady match moves on. Next note always works.');
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
  async function attemptToggle() {
    const b = tools.querySelector('[data-act="attempt"]');
    if (listening) { const l = stopListening(); b.setAttribute('aria-pressed', 'false'); b.querySelector('.lbl').textContent = 'Listen again'; judge(l); return; }
    if (en.player.running) en.togglePlay();
    clearFlags();
    if (await startListening('attempt')) { b.setAttribute('aria-pressed', 'true'); b.querySelector('.lbl').textContent = 'Stop listening'; const c = tools.querySelector('.pb-hint'); if (c) c.textContent = 'Listening: the student plays now.'; }
  }

  /* ---------------- assess: the panel for the attempt and the decision ---------------- */
  let panel = null;
  function courseState() { try { const s = JSON.parse(ls.get(COURSE_KEY) || 'null'); if (s && Array.isArray(s.roster)) return { roster: s.roster, progress: s.progress || {}, levels: s.levels || {}, tests: s.tests || {} }; } catch (e) {} return { roster: [], progress: {}, levels: {}, tests: {} }; }
  function openAssess() {
    if (!panel) { panel = document.createElement('aside'); panel.className = 'pb-assess'; panel.setAttribute('aria-label', 'Assessment'); document.body.appendChild(panel); }
    const st = courseState();
    panel.innerHTML = `
      <h2>${esc(who || 'The student')}</h2>
      <div class="pa-flags">${attempt ? '' : step === 2 ? '<p class="muted">Press Listen to the attempt, let the student play, then Stop: anything that sounded wrong is listed here to check by ear.</p>' : '<p class="muted">No attempt listened to: your ears decide.</p>'}</div>
      ${step === 3 ? `
      ${!who ? `<label class="pa-row">Student ${st.roster.length ? `<select class="pa-who"><option value="">Choose…</option>${st.roster.map(n => `<option>${esc(n)}</option>`).join('')}</select>` : '<input class="pa-who" placeholder="Name">'}</label>` : ''}
      <fieldset class="pa-result"><legend>Result</legend>
        ${Object.entries(P.RESULTS).map(([k, v]) => `<label class="pa-res pa-${k}"><input type="radio" name="pa-res" value="${k}"> ${esc(v)}</label>`).join('')}
      </fieldset>
      <label class="pa-row" title="Optional: the Ontario achievement chart's four levels, for report cards">Achievement level <select class="pa-mark"><option value="">—</option><option value="1">1 limited</option><option value="2">2 some</option><option value="3">3 considerable</option><option value="4">4 high degree</option></select></label>
      <div class="pa-row pa-two">
        <label>Tempo <input type="number" class="pa-bpm" min="20" max="400" value="${bpm}"> <small>BPM of ${written}</small></label>
        <label>Help <select class="pa-assist">${Object.entries(P.ASSISTS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      </div>
      <label class="pa-row pa-notewrap">Note <textarea class="pa-note" rows="2" maxlength="500" placeholder="What went well; what to practise next"></textarea></label>
      <div class="pa-row pa-save"><button type="button" class="pa-go primary">Save</button></div>
      <p class="muted small">Saved in this browser with the board’s class records. Not in any link.</p>` : ''}`;
    if (attempt) showFlags();
    const q = s => panel.querySelector(s);
    if (!q('.pa-go')) return;
    q('.pa-go').addEventListener('click', () => {
      const w = q('.pa-who'); const student = (w ? w.value : who || '').trim(), res = (panel.querySelector('input[name="pa-res"]:checked') || {}).value;
      if (!student) { say('Choose the student first.'); if (w) w.focus(); else goStep(1); return; }
      if (!res) { say('Choose a result: pass, needs more practice, or not assessed.'); return; }
      let rec;
      try { rec = P.makeAssessment({ student, id: tune.id, title: tune.title, level: tune.level, result: res, mark: q('.pa-mark').value, note: q('.pa-note').value, bpm: +q('.pa-bpm').value, written, assist: q('.pa-assist').value, flags: flagsShown, listened: attempt }); }
      catch (e) { say(e.message); return; }
      const st2 = courseState();
      if (!st2.roster.includes(student)) st2.roster.push(student);
      P.applyAssessment(st2, student, rec);
      ls.set(COURSE_KEY, JSON.stringify(st2));
      try { sessionStorage.setItem('gcs-assess-student', student); } catch (e) {}
      say(`${student}: ${P.RESULTS[res]} saved.`, 'Back to the board', () => { location.href = $('.pb-back').href; });
      attempt = null; flagsShown = [];
      goStep(1, true);
    });
  }
  function closeAssess() { if (panel) { panel.remove(); panel = null; } if (mode !== 'assess') { clearFlags(); attempt = null; } }
  function judge(l) {
    if (!l || !en || !en.tl) return;
    const expected = en.tl.events.filter(e => e.midis && e.midis.length).map(e => ({ ms: e.ms, midis: e.midis }));
    const r = P.alignAttempt(expected, l.notes, { noise: l.frames ? l.loud / l.frames : 0 });
    attempt = { notes: r.heard, matched: r.matched, reliability: r.reliability, summary: r.summary };
    flagsShown = r.flags.map(f => ({ ...f, kept: true }));
    const c = tools.querySelector('.pb-hint'); if (c) c.textContent = 'Check the flags in the panel, then go on to decide.';
    openAssess();
  }
  function showFlags() {
    const box = panel && panel.querySelector('.pa-flags'); if (!box || !attempt) return;
    box.innerHTML = `<p class="muted">${esc(attempt.summary)}${attempt.reliability !== 'medium' ? ' The room, an echo or two instruments at once can fool it.' : ''}</p>` +
      (flagsShown.length ? `<ul>${flagsShown.map((f, i) => `<li class="pa-flag k-${f.kind}"><button type="button" class="pa-show" data-i="${i}" ${f.at === null ? 'disabled' : ''}>${esc(f.words)}</button><small>${f.confidence === 'medium' ? 'likely' : 'unsure'}</small><label><input type="checkbox" data-i="${i}"${f.kept ? ' checked' : ''}> keep</label></li>`).join('')}</ul>` : (attempt.notes ? '<p>Nothing flagged. Listen for yourself.</p>' : ''));
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
  function clearFlags() { if (mode === 'assess' && attempt) { markFlags(); return; } flagsShown = []; clearMarks(); }

  /* ---------------- loops ---------------- */
  function goLoop(i) {
    if (!found || loops() < 2) return;
    const n = Math.max(0, Math.min(loops() - 1, i));
    if (n === idx && onLoop()) return;
    idx = n;
    if (mode === 'assess' || step !== 2) { step = 2; renderSteps(); renderTools(); }
    redraw();
  }
  let cutsDlg = null;
  function editCuts() {
    if (!cutsDlg) { cutsDlg = document.createElement('dialog'); cutsDlg.className = 'pb-cutsdlg'; document.body.appendChild(cutsDlg); }
    const bars = found.bars;
    const starts = new Set(found.phrases.map(p => p.from + 1));
    const word = b => { const n = b.notes.find(x => x.lyric && x.lyric[0] && x.lyric[0].syllable); return n ? n.lyric[0].syllable : ''; };
    cutsDlg.innerHTML = `<h2>Set up the practice loops</h2>
      <p>Each loop is a few bars the class learns on repeat before going on. Tap a bar to start a new loop there; tap it again to join it to the loop before. ${esc(found.note || '')}</p>
      <div class="pb-barchips">${bars.map(b => `<button type="button" data-n="${b.n}" aria-pressed="${starts.has(b.n)}" ${b.n === 1 ? 'disabled' : ''} aria-label="Bar ${b.n}${starts.has(b.n) ? ', a loop starts here' : ''}">${b.n}${word(b) ? `<small>${esc(word(b))}</small>` : ''}</button>`).join('')}</div>
      <p class="pb-cutsum"></p>
      <div class="row"><button type="button" class="auto quiet">Automatic</button><button type="button" class="one quiet">The whole piece as one loop</button><span class="pb-spacer"></span><button type="button" class="cancel quiet">Cancel</button><button type="button" class="done primary">Done</button></div>`;
    const sum = () => { const s = [...starts].sort((a, b) => a - b); cutsDlg.querySelector('.pb-cutsum').textContent = `${s.length} loop${s.length === 1 ? '' : 's'}: ` + s.map((a, i) => `bars ${a}–${i + 1 < s.length ? s[i + 1] - 1 : bars.length}`).join(' · '); };
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
    idx = Math.min(idx, loops() - 1);
    cutsDlg.close(); renderTools(); redraw();
    say(cuts ? 'Loops saved on this computer and in the link.' : 'Back to the automatic loops.');
  }

  /* ---------------- painting the bar, the address ---------------- */
  function paint() {
    if (!found) return;
    const n = loops(), p = loop();
    const where = tools.querySelector('.pb-where');
    if (where) {
      where.innerHTML = `<span class="lg">Loop </span>${idx + 1} of ${n}<span class="lg"> · bars ${p.first}–${p.last}${p.label ? ` · ${esc(p.label)}` : ''}</span>`;
      where.setAttribute('aria-label', `Loop ${idx + 1} of ${n}, bars ${p.first} to ${p.last}`);
      tools.querySelector('.pb-prev').disabled = idx === 0;
      tools.querySelector('.pb-next').disabled = idx === n - 1;
    }
    const v = tools.querySelector('.pb-bpmv'); if (v) v.textContent = String(bpm);
    const so = tools.querySelector('.pb-share-of'); if (so) { const share = P.tempoShare(bpm, written); so.textContent = share >= 100 ? 'full speed' : `${share}% of full speed`; }
    for (const b of bar.querySelectorAll('.pb-steps button')) b.classList.toggle('done', +b.dataset.step < step);
    paintPlaying(); paintProgress();
  }
  // The main button says what it will do: Play, or Pause while the music plays.
  let wasPlaying = null;
  function paintPlaying() {
    const on = !!(en && en.player && en.player.running);
    if (on === wasPlaying && tools.dataset.painted === String(step)) return;
    wasPlaying = on; tools.dataset.painted = String(step);
    for (const b of tools.querySelectorAll('[data-act="play"]')) {
      b.classList.toggle('playing', on);
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('.ic').textContent = on ? '⏸' : '▶';
      if (!b.dataset.label) b.dataset.label = b.querySelector('.lbl').textContent;
      b.querySelector('.lbl').textContent = on ? 'Pause' : b.dataset.label;
    }
  }
  function paintProgress() {
    const el = tools.querySelector('.pb-progress'); if (!el || !tune) return;
    const pr = P.progressOf(P.readProgress(localStorage), tune.id, loops(), onLoop() ? idx + 1 : null);
    const rungs = [60, 70, 80, 90, 100].map(s => `<span class="rung${pr.ladderShare >= s ? ' on' : ''}" title="${s}% of full speed">${s}%</span>`).join('');
    el.innerHTML = pr.started ? `<span class="ladder" role="img" aria-label="Fastest on ${esc(pr.ladderOf)}: ${pr.ladderShare || 0}% of full speed">${rungs}</span><small>${esc(pr.ladderOf)}${pr.detail ? ' · ' + esc(pr.detail) : ''}. Counted on this computer.</small>` : `<small>Your practice is counted on this computer: run-throughs and the tempo you reach.</small>`;
  }
  function syncUrl() {
    if (!tune) return;
    const s = { tune: tune.id, level: tune.level, mode, step: step > 1 ? step : undefined, loop: onLoop() ? idx + 1 : undefined, by: byNote && step === 2 && mode !== 'assess' ? 'note' : undefined,
      bpm: bpm !== (mode === 'assess' || step === 1 ? written : P.slowStart(written)) ? bpm : undefined, inst: $('.pb-inst select').value, tr: en && en.transpose ? en.transpose : undefined, cuts: found.cuts || undefined };
    setup = P.cleanSetup(s);
    history.replaceState(null, '', location.pathname + location.search + '#' + P.encodeSetup(setup));
  }

  /* ---------------- controls ---------------- */
  for (const b of bar.querySelectorAll('.pb-modes button')) b.addEventListener('click', () => { if (b.dataset.mode !== mode) setMode(b.dataset.mode, 1); });
  $('.pb-fold').addEventListener('click', () => setFold(!document.body.classList.contains('pb-folded')));
  $('.pb-inst select').addEventListener('change', e => {
    const v = e.target.value; ls.set('gcs-last-inst', v);
    const sel = en && en.body.querySelector('.instpick select');
    if (sel) { sel.value = v; sel.dispatchEvent(new Event('change')); }
    afterRender();
  });
  $('.pb-more').addEventListener('click', () => { const on = !document.body.classList.contains('pb-advanced'); document.body.classList.toggle('pb-advanced', on); $('.pb-more').setAttribute('aria-expanded', String(on)); if (en) en.showDrawer(on ? 'melody' : null); });
  $('.pb-share').addEventListener('click', async () => {
    const s = { ...setup }; if (s.mode === 'assess') { s.mode = 'teach'; delete s.step; }
    const url = location.href.split('#')[0] + '#' + P.encodeSetup(s);
    try { await navigator.clipboard.writeText(url); say('Link copied: it opens this piece at this step, loop, tempo and instrument.'); } catch (e) { prompt('Copy this link:', url); }
  });
  // A new address typed or pasted into this tab (the page writes its own with replaceState, which fires no hashchange).
  window.addEventListener('hashchange', () => location.reload());
  // Keys: one set for the whole view, before the page's own (which present a cell, not a piece).
  window.addEventListener('keydown', e => {
    if (!tune || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.matches && e.target.matches('textarea, input, select, [contenteditable]')) return;
    if (document.querySelector('dialog[open]')) return;
    const k = e.key; let done = true;
    if ((k === ' ' || k === 'Enter') && e.target && e.target.closest && e.target.closest('button, a, [role="tab"], [role="radio"]')) return;   // a focused control keeps its own keys
    if (k === ' ' || k === 'Enter') { if (!(mode === 'assess' && step > 1)) playPause(); }   // assessing, the student plays: the space bar starts nothing
    else if (k === 'ArrowRight' && onLoop()) goLoop(idx + 1);
    else if (k === 'ArrowLeft' && onLoop()) goLoop(idx - 1);
    else if (k === 'PageDown') goStep(step + 1);
    else if (k === 'PageUp') goStep(step - 1);
    else if (k === '1' || k === '2' || k === '3') goStep(+k);
    else if (k === 'Backspace' && stepper) act('back');
    else if ((k === 'h' || k === 'H') && stepper) act('hear');
    else if (k === 'f' || k === 'F') $('.pb-fold').click();
    else if ((k === '+' || k === '=') && step > 1) setBpm(P.nudgeTempo(bpm, 1, written));
    else if ((k === '-' || k === '_') && step > 1) setBpm(P.nudgeTempo(bpm, -1, written));
    else done = false;
    if (done) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
})();
