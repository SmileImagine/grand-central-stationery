/*
  The piece view: one tune from the practice board, opened in the main page
  (index.html#tune=<id>&...) for three jobs on one player:

    Teach     Listen to the whole piece, present it phrase by phrase at a
              classroom size, play a phrase alone or on repeat, then play the
              whole piece along with the band.
    Practice  Step by step (each note waits for the learner; with listening
              on, a steady matching note moves on too), or slow practice (the
              phrase on repeat, slower, five beats a minute faster at a time).
    Assess    A teacher beside one student: hear the reference, listen to an
              attempt (optional, advisory), look over what was flagged, and
              decide: pass, needs more practice or not assessed, with a note,
              the tempo and the help given.

  The page's own cell does the work: the renderer, the Player on its one
  AudioContext clock, Game mode's two-line score and the instrument view.
  A phrase is written out as a tune of its own (course/practice.js), so all of
  them play it unchanged. The address carries the setup (piece, mode, phrase,
  tempo, instrument, the teacher's phrase cuts) and nothing private; practice
  history stays in this browser (gcs-practice-v1), assessments in the board's
  store (gcs-course-v1).
*/
(function () {
  'use strict';
  const P = window.GCSPractice, G = window.GCS, hook = G && G.piece;
  if (!P || !hook) return;
  const LEVEL_COLOR = { 1: '#69b944', 2: '#e0b800', 3: '#f39322', 4: '#e72829', 5: '#087fca', 6: '#79569f' };
  const CUTS_KEY = 'gcs-phrase-cuts', COURSE_KEY = 'gcs-course-v1';
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let setup = P.decodeSetup(location.hash);
  let set = null, tune = null, found = null, en = null, written = P.DEFAULT_BPM;
  let view = 'phrase', idx = 0, mode = 'teach', how = 'step', bpm = null;
  let stepper = null, listening = null, attempt = null, flagsShown = [];

  /* ---------------- the bar across the top ---------------- */
  const bar = document.createElement('header');
  bar.className = 'piecebar'; bar.setAttribute('aria-label', 'Piece');
  bar.innerHTML = `
    <div class="pb-row pb-top">
      <a class="pb-back" href="course/board.html">← Board</a>
      <div class="pb-title"><span class="tape" aria-hidden="true"></span><b class="pb-name">Loading the piece…</b><small class="pb-facts"></small></div>
      <div class="pb-modes" role="tablist" aria-label="What to do">
        <button type="button" role="tab" data-mode="teach">Teach</button>
        <button type="button" role="tab" data-mode="practice">Practice</button>
        <button type="button" role="tab" data-mode="assess">Assess</button>
      </div>
      <button type="button" class="pb-share" title="Copy a link that opens this piece, phrase, mode, tempo and instrument (never names, progress or marks)">Copy link</button>
      <button type="button" class="pb-more" aria-expanded="false" title="The full player: the ABC, the band, the mixer, note names and transposition">More</button>
    </div>
    <div class="pb-row pb-nav">
      <div class="pb-phrase" role="group" aria-label="Phrase">
        <button type="button" class="pb-prev" aria-label="Previous phrase" title="Previous phrase (←)">◀</button>
        <span class="pb-where" aria-live="polite"></span>
        <button type="button" class="pb-next" aria-label="Next phrase" title="Next phrase (→)">▶</button>
      </div>
      <button type="button" class="pb-whole" aria-pressed="false" title="Show the whole piece, or one phrase at a time (W)">Whole piece</button>
      <button type="button" class="pb-cuts quiet" title="Choose where each phrase begins">Change phrases</button>
      <span class="pb-spacer"></span>
      <div class="pb-tempo" role="group" aria-label="Tempo">
        <button type="button" class="pb-slower" aria-label="Slower" title="Five beats a minute slower (−)">−</button>
        <span class="pb-bpm"><output class="pb-bpmv">80</output> <small>BPM</small></span>
        <button type="button" class="pb-faster" aria-label="Faster" title="Five beats a minute faster (+)">+</button>
        <small class="pb-share-of"></small>
      </div>
      <label class="pb-inst">Instrument <select>${Object.entries(P.INSTRUMENTS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
    </div>
    <div class="pb-row pb-tools"></div>`;
  document.body.prepend(bar);
  const $ = s => bar.querySelector(s);
  const tools = $('.pb-tools');
  new ResizeObserver(() => document.documentElement.style.setProperty('--pb-h', bar.offsetHeight + 'px')).observe(bar);

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
    $('.pb-back').href = 'course/board.html#' + P.encodeBoard({ level: tune.level, tune: tune.id, do: setup.mode === 'assess' ? 'assess' : setup.mode === 'step' || setup.mode === 'slow' ? 'practice' : 'teach' });
    refind();
    mode = setup.mode === 'step' || setup.mode === 'slow' ? 'practice' : setup.mode === 'assess' ? 'assess' : 'teach';
    how = setup.mode === 'slow' ? 'slow' : 'step';
    view = setup.view || (found.phrases.length > 1 ? 'phrase' : 'whole');
    idx = Math.max(0, Math.min(found.phrases.length - 1, (setup.phrase || 1) - 1));
    bpm = setup.bpm || (setup.mode === 'slow' ? P.slowStart(written) : written);
    let inst = setup.inst || ls.get('gcs-last-inst') || 'recorder'; if (!P.INSTRUMENTS[inst]) inst = 'recorder';
    $('.pb-inst select').value = inst;
    en = hook.show({ text: textNow(), inst, tr: setup.tr || 0 });
    en.fitWhole = fitWhole(); en.render();
    afterRender();
    requestAnimationFrame(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    wireEngine();
    if (mode === 'practice' && how === 'slow') en.player.setLoop(true);   // a link straight into slow practice repeats, as the button does
    setMode(mode, true);
    if (setup.mode === 'assess') { /* a link never names the student: the board hands the name over in this tab only */ }
  }
  function refind() {
    let cuts = setup.cuts;
    if (!cuts) { try { cuts = (JSON.parse(ls.get(CUTS_KEY) || '{}') || {})[tune.id] || null; } catch (e) { cuts = null; } }
    found = P.phrasesOf(tune.abc, window.ABCJS, { cuts });
    found.cuts = cuts && cuts.length ? cuts : null;
  }
  const phrase = () => found.phrases[idx];
  const textNow = () => view === 'whole' || found.phrases.length < 2 ? tune.abc : P.phraseAbc(tune.abc, window.ABCJS, phrase(), found);

  /* ---------------- the engine: text, tempo, runs ---------------- */
  // A phrase (or a short piece) is drawn as large as it fits whole; a long piece keeps Game mode's two systems at a time.
  const fitWhole = () => view === 'phrase' || found.phrases.length < 2;
  function redraw() {
    if (!en) return;
    stopAll();
    en.fitWhole = fitWhole();
    en.entry.value = textNow();
    en.render();
    afterRender();
  }
  // After a render the tempo is the one chosen here (the cell keeps a ratio to the written tempo; a phrase has the same).
  function afterRender() {
    if (!en) return;
    if (en.original && Math.abs(en.bpm() - bpm) > 0.5) { en.warp = bpm / en.writtenBpm(); en.retime(); }
    if (stepper) buildStepper();
    clearFlags();
    paintBar(); paintProgress();
    syncUrl();
  }
  function setBpm(v) {
    bpm = Math.max(30, Math.min(300, Math.round(v)));
    if (en && en.original) { en.warp = bpm / en.writtenBpm(); en.retime(); }
    paintBar(); syncUrl();
  }
  function stopAll() { if (en && en.player) { if (en.player.running) en.togglePlay(); en.toTop(); } stopListening(); }
  function play({ loop = null, fromTop = true } = {}) {
    if (!en) return;
    if (loop !== null) { en.player.setLoop(loop); const lp = en.body.querySelector('.transport .loop'); if (lp) lp.setAttribute('aria-pressed', String(en.player.loop)); }
    if (en.player.running) { en.togglePlay(); return; }
    if (fromTop) en.toTop();
    en.togglePlay();
  }
  // A run is the music playing from its start to its end (each time round when repeating). It says the music
  // played, not that it was played well.
  let run = { top: false, cycle: 0, was: false };
  function wireEngine() {
    const finished = en.onFinished.bind(en);
    en.onFinished = () => { finished(); if (run.top) countRun(1); run = { top: false, cycle: 0, was: false }; paintBar(); };
    setInterval(() => {
      const p = en && en.player; if (!p) return;
      if (p.running && !run.was) run = { top: p.position() <= 60, cycle: Math.max(0, Math.floor(p.position() / (p.total || 1))), was: true };
      if (!p.running) { run.was = false; return; }
      if (p.loop && p.total > 0) { const c = Math.floor(p.position() / p.total); if (c > run.cycle) { if (run.top) countRun(c - run.cycle); run.cycle = c; run.top = true; } }
      paintPlaying();
    }, 200);
  }
  function countRun(n) {
    if (mode === 'assess') return;
    let store = P.readProgress(localStorage);
    for (let i = 0; i < n; i++) store = P.recordPractice(store, { id: tune.id, title: tune.title, kind: 'run', bpm, written, whole: view === 'whole' || found.phrases.length < 2, phrase: idx + 1, phrases: found.phrases.length });
    P.writeProgress(localStorage, store);
    paintProgress();
  }

  /* ---------------- modes ---------------- */
  function setMode(m, first) {
    mode = m;
    for (const b of bar.querySelectorAll('.pb-modes button')) { const on = b.dataset.mode === m; b.setAttribute('aria-selected', String(on)); b.classList.toggle('on', on); }
    document.body.dataset.pieceMode = m;
    if (!first) stopAll();
    stepper = null; closeAssess();
    if (m === 'practice' && how === 'step') buildStepper();
    if (m === 'practice' && how === 'slow' && !first) { if (bpm >= written) setBpm(P.slowStart(written)); en.player.setLoop(true); }
    renderTools();
    if (m === 'assess') openAssess();
    paintBar(); syncUrl();
  }
  function renderTools() {
    let h = '';
    if (mode === 'teach') {
      h = `<button type="button" class="big listen" data-act="listen" title="The whole piece from the top (L)"><span aria-hidden="true">\u{1F442}</span> Listen</button>
        <button type="button" class="big phraseplay" data-act="phrase" title="Play what is on screen (space)"><span aria-hidden="true">▶</span> <span class="lbl">Play phrase</span></button>
        <button type="button" class="big toggle" data-act="repeat" aria-pressed="false" title="Repeat what is on screen (R)"><span aria-hidden="true">⟳</span> Repeat</button>
        <button type="button" class="big along" data-act="along" title="The whole piece with the band, from a count-in, to play along with"><span aria-hidden="true">♫</span> Play along</button>`;
    } else if (mode === 'practice') {
      h = `<div class="seg" role="radiogroup" aria-label="How to practise">
          <button type="button" role="radio" data-how="step" aria-checked="${how === 'step'}">Step by step</button>
          <button type="button" role="radio" data-how="slow" aria-checked="${how === 'slow'}">Slow practice</button></div>`;
      if (how === 'step') h += `
        <button type="button" class="big" data-act="back" title="The note before (Backspace)">◀ Back</button>
        <button type="button" class="big" data-act="hear" title="Hear this note (H)"><span aria-hidden="true">\u{1F50A}</span> Hear it</button>
        <button type="button" class="big go" data-act="next" title="Next note (space or Enter)">Next ▶</button>
        <span class="pb-step" aria-live="polite"></span>
        <label class="chk" title="Play each note as it comes up"><input type="checkbox" class="pb-sound" checked> Sound each note</label>
        <button type="button" class="big toggle mic" data-act="mic" aria-pressed="false" title="Listen through the microphone: a steady, matching note moves on by itself. It can be fooled by noise, other players and echoes; Next always works."><span aria-hidden="true">\u{1F3A4}</span> Listen to me</button>`;
      else h += `
        <button type="button" class="big phraseplay" data-act="phrase" title="Play what is on screen (space)"><span aria-hidden="true">▶</span> <span class="lbl">Play</span></button>
        <button type="button" class="big toggle" data-act="repeat" aria-pressed="true" title="Repeat what is on screen (R)"><span aria-hidden="true">⟳</span> Repeat</button>
        <button type="button" class="big" data-act="faster" title="Five beats a minute faster: the notes keep their pitch">Faster →</button>`;
      h += `<div class="pb-progress" aria-live="polite"></div>`;
    } else {
      h = `<span class="pb-assess-note">Assessing: the panel is open. The microphone only suggests; you decide.</span>`;
    }
    tools.innerHTML = h;
    tools.querySelectorAll('[data-how]').forEach(b => b.addEventListener('click', () => { how = b.dataset.how; if (how === 'slow') { if (bpm >= written) setBpm(P.slowStart(written)); en.player.setLoop(true); } else en.player.setLoop(false); setMode('practice'); }));
    tools.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.act)));
    paintBar(); paintProgress();
  }
  function act(a) {
    if (a === 'listen') { if (view !== 'whole' && found.phrases.length > 1) { view = 'whole'; redraw(); } en.player.setLoop(false); play({ fromTop: true }); }
    else if (a === 'phrase') play({ fromTop: !(en.player.pos > 0) });
    else if (a === 'repeat') { en.player.setLoop(!en.player.loop); paintBar(); }
    else if (a === 'along') { if (view !== 'whole' && found.phrases.length > 1) { view = 'whole'; redraw(); } if (en.playMode !== 'all') { en.playMode = 'all'; en.render(); } en.player.setLoop(false); play({ fromTop: true }); }
    else if (a === 'faster') { setBpm(P.nudgeTempo(bpm, 1, written)); say(`${bpm} BPM: ${P.tempoShare(bpm, written)}% of full speed. The notes keep their pitch.`); }
    else if (a === 'next') stepNext(false);
    else if (a === 'back') { if (stepper) { stepper.back(); showStep(true); } }
    else if (a === 'hear') { if (stepper && stepper.current) soundStep(); }
    else if (a === 'mic') { if (listening) stopListening(); else startListening('step'); }
  }

  /* ---------------- step by step ---------------- */
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
    if (el) el.textContent = stepper.done ? 'Done!' : `Note ${stepper.i + 1} of ${stepper.count}`;
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
      let store = P.readProgress(localStorage);
      store = P.recordPractice(store, { id: tune.id, title: tune.title, kind: 'steps', steps: stepper.count, heard: stepper.heard, whole: view === 'whole' || found.phrases.length < 2, phrase: idx + 1, written });
      P.writeProgress(localStorage, store); paintProgress();
      const el = tools.querySelector('.pb-step'); if (el) el.textContent = `Done: ${stepper.count} notes${stepper.heard ? `, ${stepper.heard} heard` : ''}.`;
      celebrate();
      const more = idx < found.phrases.length - 1 && view !== 'whole';
      say(more ? 'Phrase done. Again, or the next phrase?' : 'All the way through. Try it slowly with the music?', more ? 'Next phrase' : 'Slow practice', () => { if (more) goPhrase(idx + 1); else { how = 'slow'; setBpm(P.slowStart(written)); en.player.setLoop(true); setMode('practice'); } });
      stepper.reset(); showStep(false);
      return;
    }
    showStep(true);
  }
  function celebrate() { if (reduceMotion || !en) return; en.body.classList.remove('done'); void en.body.offsetWidth; en.body.classList.add('done'); }

  /* ---------------- listening (advisory) ---------------- */
  async function startListening(kind) {
    const ctx = hook.ctx();
    if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { say('This browser cannot use a microphone here.'); return; }
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } }); }
    catch (e) { say(location.protocol === 'file:' ? 'A page opened from disk cannot use the microphone: serve the folder or use the published page.' : 'The microphone was not allowed.'); return; }
    const src = ctx.createMediaStreamSource(stream), an = ctx.createAnalyser(); an.fftSize = 2048; src.connect(an);
    const buf = new Float32Array(an.fftSize), gate = new P.NoteGate(3, 4);
    listening = { stream, src, an, kind, raf: 0, t0: performance.now(), notes: [], quiet: 0, loud: 0, frames: 0 };
    const btn = bar.querySelector('[data-act="mic"]'); if (btn) btn.setAttribute('aria-pressed', 'true');
    const loop = () => {
      if (!listening) return;
      listening.raf = requestAnimationFrame(loop);
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
        else showHeard(j);
      }
      else if (listening.kind === 'attempt') { listening.notes.push(heard); const c = document.querySelector('.pa-heard'); if (c) c.textContent = `${listening.notes.length} notes heard`; }
    };
    loop();
    if (kind === 'step') say('Listening. Play the note shown; a steady match moves on. Next always works.');
  }
  function showHeard(r) { const el = tools.querySelector('.pb-step'); if (!el || !stepper) return; if (r.verdict === 'other') el.textContent = `Note ${stepper.i + 1} of ${stepper.count}: heard something else (a guess)`; }
  function stopListening() {
    const l = listening; if (!l) return null;
    listening = null; cancelAnimationFrame(l.raf);
    try { l.src.disconnect(); } catch (e) {}
    for (const t of l.stream.getTracks()) t.stop();
    const btn = bar.querySelector('[data-act="mic"]'); if (btn) btn.setAttribute('aria-pressed', 'false');
    return l;
  }

  /* ---------------- assess ---------------- */
  let panel = null;
  function courseState() { try { const s = JSON.parse(ls.get(COURSE_KEY) || 'null'); if (s && Array.isArray(s.roster)) return { roster: s.roster, progress: s.progress || {}, levels: s.levels || {}, tests: s.tests || {} }; } catch (e) {} return { roster: [], progress: {}, levels: {}, tests: {} }; }
  function openAssess() {
    if (panel) panel.remove();
    const st = courseState();
    let who = ''; try { who = sessionStorage.getItem('gcs-assess-student') || ''; } catch (e) {}
    panel = document.createElement('aside');
    panel.className = 'pb-assess'; panel.setAttribute('aria-label', 'Assessment');
    panel.innerHTML = `
      <h2>Assess</h2>
      <label class="pa-row">Student ${st.roster.length ? `<select class="pa-who"><option value="">Choose…</option>${st.roster.map(n => `<option${n === who ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>` : `<input class="pa-who" placeholder="Name" value="${esc(who)}">`}</label>
      <div class="pa-row pa-btns">
        <button type="button" class="pa-ref" title="Play the piece (or phrase) on screen from the top">\u{1F442} Hear it</button>
        <button type="button" class="pa-listen" aria-pressed="false" title="Listen to the student through the microphone, then compare with the music: a suggestion to check by ear, never a mark">\u{1F3A4} Listen to the attempt</button>
      </div>
      <p class="pa-heard muted"></p>
      <div class="pa-flags"></div>
      <fieldset class="pa-result"><legend>Result</legend>
        ${Object.entries(P.RESULTS).map(([k, v]) => `<label class="pa-res pa-${k}"><input type="radio" name="pa-res" value="${k}"> ${esc(v)}</label>`).join('')}
      </fieldset>
      <label class="pa-row" title="Optional: the Ontario achievement chart's four levels, for report cards">Achievement level <select class="pa-mark"><option value="">—</option><option value="1">1 limited</option><option value="2">2 some</option><option value="3">3 considerable</option><option value="4">4 high degree</option></select></label>
      <div class="pa-row pa-two">
        <label>Tempo <input type="number" class="pa-bpm" min="20" max="400" value="${bpm}"> <small>BPM of ${written}</small></label>
        <label>Help <select class="pa-assist">${Object.entries(P.ASSISTS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select></label>
      </div>
      <label class="pa-row pa-notewrap">Note <textarea class="pa-note" rows="2" maxlength="500" placeholder="What went well; what to practise next"></textarea></label>
      <div class="pa-row pa-save"><button type="button" class="pa-cancel quiet">Close</button><button type="button" class="pa-go primary">Save</button></div>
      <p class="muted small">Saved in this browser with the board’s class records. Not in any link.</p>`;
    document.body.appendChild(panel);
    const q = s => panel.querySelector(s);
    q('.pa-assist').value = how === 'step' && mode === 'practice' ? 'step' : bpm < written * 0.9 ? 'slow' : 'none';
    q('.pa-ref').addEventListener('click', () => { en.player.setLoop(false); play({ fromTop: true }); });
    q('.pa-listen').addEventListener('click', async () => {
      const b = q('.pa-listen');
      if (listening) { const l = stopListening(); b.setAttribute('aria-pressed', 'false'); b.textContent = '\u{1F3A4} Listen again'; judge(l); return; }
      if (en.player.running) en.togglePlay();
      clearFlags();
      await startListening('attempt');
      if (listening) { b.setAttribute('aria-pressed', 'true'); b.textContent = '■ Stop listening'; q('.pa-heard').textContent = 'Listening: the student plays now.'; }
    });
    q('.pa-cancel').addEventListener('click', () => setMode('teach'));
    q('.pa-go').addEventListener('click', () => {
      const student = (q('.pa-who').value || '').trim(), res = (panel.querySelector('input[name="pa-res"]:checked') || {}).value;
      if (!student) { say('Choose the student first.'); q('.pa-who').focus(); return; }
      if (!res) { say('Choose a result: pass, needs more practice, or not assessed.'); return; }
      let rec;
      try {
        rec = P.makeAssessment({ student, id: tune.id, title: tune.title, level: tune.level, result: res, mark: q('.pa-mark').value, note: q('.pa-note').value, bpm: +q('.pa-bpm').value, written, assist: q('.pa-assist').value,
          phrase: view === 'whole' || found.phrases.length < 2 ? null : idx + 1, flags: flagsShown, listened: attempt });
      } catch (e) { say(e.message); return; }
      const st2 = courseState();
      if (!st2.roster.includes(student)) st2.roster.push(student);
      P.applyAssessment(st2, student, rec);
      ls.set(COURSE_KEY, JSON.stringify(st2));
      try { sessionStorage.setItem('gcs-assess-student', student); } catch (e) {}
      say(`${student}: ${P.RESULTS[res]} saved.`, 'Back to the board', () => { location.href = $('.pb-back').href; });
      q('.pa-note').value = ''; for (const r of panel.querySelectorAll('input[name="pa-res"]')) r.checked = false;
    });
  }
  function closeAssess() { if (panel) { panel.remove(); panel = null; } clearFlags(); attempt = null; }
  function judge(l) {
    if (!l || !en || !en.tl) return;
    const expected = en.tl.events.filter(e => e.midis && e.midis.length).map(e => ({ ms: e.ms, midis: e.midis }));
    const noise = l.frames ? l.loud / l.frames : 0;
    const r = P.alignAttempt(expected, l.notes, { noise });
    attempt = { notes: r.heard, matched: r.matched, reliability: r.reliability };
    flagsShown = r.flags.map(f => ({ ...f, kept: true }));
    const box = panel && panel.querySelector('.pa-flags'); if (!box) return;
    panel.querySelector('.pa-heard').textContent = r.summary + (r.reliability !== 'medium' ? ' The room, an echo or two instruments at once can fool it.' : '');
    box.innerHTML = flagsShown.length ? `<ul>${flagsShown.map((f, i) => `<li class="pa-flag k-${f.kind}"><button type="button" class="pa-show" data-i="${i}" ${f.at === null ? 'disabled' : ''}>${esc(f.words)}</button><small>${f.confidence === 'medium' ? 'likely' : 'unsure'}</small><label><input type="checkbox" data-i="${i}" checked> keep</label></li>`).join('')}</ul>` : (r.heard ? '<p>Nothing flagged. Listen for yourself.</p>' : '');
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
  function clearFlags() { flagsShown = []; clearMarks(); }

  /* ---------------- phrases ---------------- */
  function goPhrase(i) {
    if (!found || found.phrases.length < 2) return;
    const n = Math.max(0, Math.min(found.phrases.length - 1, i));
    if (n === idx && view === 'phrase') return;
    idx = n; view = 'phrase'; redraw();
  }
  function toggleWhole() { if (found.phrases.length < 2) return; view = view === 'whole' ? 'phrase' : 'whole'; redraw(); }
  let cutsDlg = null;
  function editCuts() {
    if (!cutsDlg) { cutsDlg = document.createElement('dialog'); cutsDlg.className = 'pb-cutsdlg'; document.body.appendChild(cutsDlg); }
    const bars = found.bars;
    const starts = new Set(found.phrases.map(p => p.from + 1));
    const word = b => { const n = b.notes.find(x => x.lyric && x.lyric[0] && x.lyric[0].syllable); return n ? n.lyric[0].syllable : ''; };
    const draw = () => {
      cutsDlg.innerHTML = `<h2>Where each phrase begins</h2>
        <p>Tap a bar to start a phrase there; tap again to join it to the phrase before. ${esc(found.note || '')}</p>
        <div class="pb-barchips">${bars.map(b => `<button type="button" data-n="${b.n}" aria-pressed="${starts.has(b.n)}" ${b.n === 1 ? 'disabled' : ''}>${b.n}${word(b) ? `<small>${esc(word(b))}</small>` : ''}</button>`).join('')}</div>
        <p class="pb-cutsum"></p>
        <div class="row"><button type="button" class="auto quiet">Automatic</button><button type="button" class="one quiet">All one phrase</button><span class="pb-spacer"></span><button type="button" class="done primary">Done</button></div>`;
      const sum = () => { const s = [...starts].sort((a, b) => a - b); cutsDlg.querySelector('.pb-cutsum').textContent = s.map((a, i) => `bars ${a}–${i + 1 < s.length ? s[i + 1] - 1 : bars.length}`).join(' · '); };
      sum();
      cutsDlg.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => { const n = +b.dataset.n; if (starts.has(n)) starts.delete(n); else starts.add(n); b.setAttribute('aria-pressed', String(starts.has(n))); sum(); }));
      cutsDlg.querySelector('.auto').onclick = () => saveCuts(null);
      cutsDlg.querySelector('.one').onclick = () => saveCuts([1]);
      cutsDlg.querySelector('.done').onclick = () => saveCuts([...starts].sort((a, b) => a - b));
    };
    draw(); cutsDlg.showModal();
  }
  function saveCuts(cuts) {
    let all = {}; try { all = JSON.parse(ls.get(CUTS_KEY) || '{}') || {}; } catch (e) {}
    if (cuts) all[tune.id] = cuts; else delete all[tune.id];
    ls.set(CUTS_KEY, JSON.stringify(all));
    setup.cuts = cuts || undefined;
    refind();
    idx = Math.min(idx, found.phrases.length - 1);
    view = found.phrases.length > 1 ? 'phrase' : 'whole';
    cutsDlg.close(); redraw();
    say(cuts ? 'Phrases saved on this computer and in the link.' : 'Back to the automatic phrases.');
  }

  /* ---------------- painting the bar, the address ---------------- */
  function paintBar() {
    if (!found) return;
    const n = found.phrases.length, p = phrase();
    const many = n > 1;
    $('.pb-phrase').hidden = !many;
    $('.pb-whole').hidden = !many;
    $('.pb-whole').setAttribute('aria-pressed', String(view === 'whole'));
    $('.pb-whole').innerHTML = view === 'whole' ? 'Phrase<span class="lg"> by phrase</span>' : 'Whole<span class="lg"> piece</span>';
    $('.pb-where').innerHTML = !many ? '' : view === 'whole' ? `Whole<span class="lg"> piece</span> · ${n} phrases` : `<span class="lg">Phrase </span>${idx + 1} of ${n}<span class="lg"> · bars ${p.first}–${p.last}${p.label ? ` · ${esc(p.label)}` : ''}</span>`;
    $('.pb-where').setAttribute('aria-label', !many ? '' : view === 'whole' ? `Whole piece, ${n} phrases` : `Phrase ${idx + 1} of ${n}, bars ${p.first} to ${p.last}`);
    $('.pb-prev').disabled = view === 'phrase' && idx === 0;
    $('.pb-next').disabled = view === 'phrase' && idx === n - 1;
    $('.pb-bpmv').textContent = String(bpm);
    const share = P.tempoShare(bpm, written);
    $('.pb-share-of').textContent = share === 100 ? 'full speed' : `${share}% of full speed`;
    const lbl = tools.querySelector('.phraseplay .lbl'); if (lbl) lbl.innerHTML = mode === 'practice' ? 'Play' : view === 'whole' || !many ? 'Play<span class="lg"> piece</span>' : 'Play<span class="lg"> phrase</span>';
    const rp = tools.querySelector('[data-act="repeat"]'); if (rp && en) rp.setAttribute('aria-pressed', String(!!en.player.loop));
    paintPlaying();
  }
  function paintPlaying() {
    const on = !!(en && en.player && en.player.running);
    for (const b of tools.querySelectorAll('.phraseplay, .listen, .along')) b.classList.toggle('playing', on && b.classList.contains('phraseplay'));
    const b = tools.querySelector('.phraseplay span[aria-hidden]'); if (b) b.textContent = on ? '⏸' : '▶';
  }
  function paintProgress() {
    const el = tools.querySelector('.pb-progress'); if (!el || !tune) return;
    const one = view === 'whole' || found.phrases.length < 2;
    const pr = P.progressOf(P.readProgress(localStorage), tune.id, found.phrases.length, one ? null : idx + 1);
    const steps = [60, 70, 80, 90, 100].map(s => `<span class="rung${pr.ladderShare >= s ? ' on' : ''}" title="${s}% of full speed">${s}%</span>`).join('');
    el.innerHTML = pr.started ? `<b>${esc(pr.label)}</b> <span class="ladder" role="img" aria-label="Tempo reached on ${esc(pr.ladderOf)}: ${pr.ladderShare || 0}% of full speed">${steps}</span><small>${esc(pr.ladderOf)}${pr.detail ? ' \u00B7 ' + esc(pr.detail) : ''}. Counted on this computer.</small>` : `<small>Your practice of this piece is counted on this computer: run-throughs, steps and the tempo you reach.</small>`;
  }
  function syncUrl() {
    if (!tune) return;
    const s = { tune: tune.id, level: tune.level, mode: mode === 'practice' ? how : mode, phrase: view === 'phrase' && found.phrases.length > 1 ? idx + 1 : undefined, view: view === 'whole' && found.phrases.length > 1 ? 'whole' : undefined,
      bpm: bpm !== written ? bpm : undefined, inst: $('.pb-inst select').value, tr: en && en.transpose ? en.transpose : undefined, cuts: found.cuts || undefined };
    setup = P.cleanSetup(s);
    history.replaceState(null, '', location.pathname + location.search + '#' + P.encodeSetup(setup));
  }

  /* ---------------- controls ---------------- */
  for (const b of bar.querySelectorAll('.pb-modes button')) b.addEventListener('click', () => setMode(b.dataset.mode));
  $('.pb-prev').addEventListener('click', () => view === 'whole' ? (view = 'phrase', redraw()) : goPhrase(idx - 1));
  $('.pb-next').addEventListener('click', () => view === 'whole' ? (view = 'phrase', redraw()) : goPhrase(idx + 1));
  $('.pb-whole').addEventListener('click', toggleWhole);
  $('.pb-cuts').addEventListener('click', editCuts);
  $('.pb-slower').addEventListener('click', () => setBpm(P.nudgeTempo(bpm, -1, written)));
  $('.pb-faster').addEventListener('click', () => setBpm(P.nudgeTempo(bpm, 1, written)));
  $('.pb-inst select').addEventListener('change', e => {
    const v = e.target.value; ls.set('gcs-last-inst', v);
    const sel = en && en.body.querySelector('.instpick select');
    if (sel) { sel.value = v; sel.dispatchEvent(new Event('change')); }
    afterRender();
  });
  $('.pb-more').addEventListener('click', () => { const on = !document.body.classList.contains('pb-advanced'); document.body.classList.toggle('pb-advanced', on); $('.pb-more').setAttribute('aria-expanded', String(on)); if (on && en) en.showDrawer('melody'); });
  $('.pb-share').addEventListener('click', async () => {
    const s = { ...setup }; if (s.mode === 'assess') s.mode = 'teach';
    const url = location.href.split('#')[0] + '#' + P.encodeSetup(s);
    try { await navigator.clipboard.writeText(url); say('Link copied: it opens this piece, phrase, tempo and instrument.'); } catch (e) { prompt('Copy this link:', url); }
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
    if (k === ' ' || k === 'Enter') { if (mode === 'practice' && how === 'step') stepNext(false); else play({ fromTop: !(en.player.pos > 0) }); }
    else if (k === 'ArrowRight' || k === 'PageDown') { if (view === 'whole') { view = 'phrase'; redraw(); } else goPhrase(idx + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { if (view === 'whole') { view = 'phrase'; redraw(); } else goPhrase(idx - 1); }
    else if (k === 'Backspace' && mode === 'practice' && how === 'step') act('back');
    else if (k === 'h' || k === 'H') act('hear');
    else if (k === 'l' || k === 'L') act('listen');
    else if (k === 'r' || k === 'R') act('repeat');
    else if (k === 'w' || k === 'W') toggleWhole();
    else if (k === '+' || k === '=') setBpm(P.nudgeTempo(bpm, 1, written));
    else if (k === '-' || k === '_') setBpm(P.nudgeTempo(bpm, -1, written));
    else if (k === 'Escape') { /* stays in the view: Board is the way out */ }
    else done = false;
    if (done) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
})();
