/* The grand clock (course/clock.js, styled by course/clock.css): the piece view's one play and tempo control, the
   information-booth clock of the concourse grown from the notation dock's small one. A plain script, no modules and
   no dependencies: it defines window.GCSClock.

     const clock = GCSClock.create(host, {
       bpm: 80, min: 30, max: 200,
       written: 80,                  // the piece's own tempo: the tempo reads as "full speed" or a share of it
       beats: 4,                     // beats in a bar: a tick on the face for each, lit as the hand passes
       label: 'Listen to the whole piece',   // the step's words ('' for none); a click on them plays too
       labelAt: 'under',             // where the words show: 'under' the clock (small), 'beside' it, or 'none' (aria-label only)
       onToggle() {},                // play or pause pressed (click, tap, Space or Enter)
       onBpm(v, info) {},            // the user changed the tempo: v an integer, info.source 'drag' | 'key' | 'wheel' | 'reset'
       repeat: false,                // the repeat toggle round the face; it is drawn only when repeat or onRepeat is given
       onRepeat(on) {},              // repeat toggled by the user: on is the new state
       onReset() {},                 // "back to the start" pressed; the button shows only while canReset is true
     });
     clock.set({ playing, bpm, label, turn, written, beats, min, max, labelAt, repeat, canReset });   // any subset; turn 0..1 through the bar, every frame
     clock.get();                    // the state as the clock holds it
     clock.el;                       // the root element, .gcs-clock
     clock.destroy();

   The face is the play button. Dragging it up or down (or the tempo beside it) changes the tempo in fives, landing
   on multiples of five; with Shift held, in ones. A press that moves less than a few pixels is a tap and plays; one
   that moves further is a drag and does not. The arrow keys do the same (5, Shift 1) on either, the wheel too, and a
   double click on the tempo returns it to full speed. While the tempo changes, a sign under the clock shows it large
   and a lamp-coloured ring round the rim shows how much of full speed it is.

   Round the face, the repeat toggle: a start-repeat sign at nine o'clock, an end-repeat sign at three, an arrow over
   the top from left to right and one under the bottom from right to left, a loop drawn round the clock. Faint when
   off, in the step's colour (or ink) when on. It is a button of its own behind the face: a tap anywhere on the loop
   toggles it, a tap on the face plays, and a press there never starts a tempo drag.
   Back to the start: a small round button at the right-hand end of the plate, shown only while the host says the
   music is paused partway (canReset). At the end, so nothing moves under the pointer when it comes and goes.

   It is drawn to float over the top-left of the score, in place of abcjs's tempo mark, on a plate of its own so it
   reads over the page's gradient and the music. Its size is the face's diameter: --clock-size on the host (or any
   ancestor), 64px when unset; everything else scales from it. */
(function () {
  'use strict';

  const NS = 'gcs-clock';
  let uid = 0;
  const media = q => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  const reduced = media('(prefers-reduced-motion: reduce)');
  const toInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(v)));

  // k whole steps of `step` from v, landing on multiples of step: 72 up one five is 75, down one is 70.
  function stepFrom(v, k, step) {
    if (!k) return v;
    const t = v + k * step;
    return k > 0 ? Math.floor(t / step) * step : Math.ceil(t / step) * step;
  }

  function faceSvg(id) {
    return `<svg class="${NS}-face" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="${id}-brass" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0" class="${NS}-s-hi"/><stop offset="0.45" class="${NS}-s-mid"/><stop offset="1" class="${NS}-s-lo"/>
        </linearGradient>
        <radialGradient id="${id}-opal" cx="0.5" cy="0.4" r="0.62">
          <stop offset="0" class="${NS}-s-glow"/><stop offset="1" class="${NS}-s-edge"/>
        </radialGradient>
      </defs>
      <circle class="${NS}-bezel" cx="50" cy="50" r="48.5" fill="url(#${id}-brass)"/>
      <circle class="${NS}-ring" cx="50" cy="50" r="45.2" pathLength="100" transform="rotate(-90 50 50)" stroke-dasharray="0 100"/>
      <circle class="${NS}-glass" cx="50" cy="50" r="41" fill="url(#${id}-opal)"/>
      <g class="${NS}-ticks"></g>
      <g class="${NS}-hand"><path class="${NS}-shaft" d="M50 59V17"/><path class="${NS}-tip" d="M50 9.5l4.2 8.5h-8.4z"/></g>
      <circle class="${NS}-hub" cx="50" cy="50" r="4"/>
      <path class="${NS}-playmark" d="M41.5 35.5L65 50 41.5 64.5z"/>
      <path class="${NS}-pausemark" d="M38.5 36h8.5v28h-8.5zM53 36h8.5v28H53z"/>
    </svg>`;
  }

  // The loop round the face, in the face's units (the face is 100 across, centred on 0,0).
  const LOOP = { r: 56, w: 146, h: 117 };
  function loopSvg() {
    const r = LOOP.r, rad = a => (a * Math.PI) / 180;
    const at = (a, rr = r) => [rr * Math.sin(rad(a)), -rr * Math.cos(rad(a))];
    const f = n => n.toFixed(2);
    const arc = (a0, a1) => { const [x0, y0] = at(a0), [x1, y1] = at(a1); return `M${f(x0)} ${f(y0)}A${r} ${r} 0 0 1 ${f(x1)} ${f(y1)}`; };
    const head = a => {   // an arrowhead at angle a, pointing clockwise along the circle
      const [x, y] = at(a), tx = Math.cos(rad(a)), ty = Math.sin(rad(a)), nx = Math.sin(rad(a)), ny = -Math.cos(rad(a));
      const tip = [x + tx * 7, y + ty * 7], b1 = [x - tx * 2 + nx * 6.5, y - ty * 2 + ny * 6.5], b2 = [x - tx * 2 - nx * 6.5, y - ty * 2 - ny * 6.5];
      return `M${f(tip[0])} ${f(tip[1])}L${f(b1[0])} ${f(b1[1])}L${f(b2[0])} ${f(b2[1])}z`;
    };
    // |: at nine o'clock (thick bar outside, thin bar, two dots facing the face) and :| at three, mirrored.
    const sign = side => {
      const m = side < 0 ? -1 : 1, x = v => f(m * v);
      const bar = (a, b) => `M${x(a)} -19L${x(b)} -19L${x(b)} 19L${x(a)} 19z`;
      return `<path d="${bar(72, 65.5)}${bar(62.5, 60.2)}"/><circle cx="${x(55.5)}" cy="-7.5" r="3.3"/><circle cx="${x(55.5)}" cy="7.5" r="3.3"/>`;
    };
    return `<svg class="${NS}-loop" viewBox="${-LOOP.w / 2} ${-LOOP.h / 2} ${LOOP.w} ${LOOP.h}" aria-hidden="true" focusable="false">
      <path class="${NS}-arc" d="${arc(-52, 50)}${arc(128, 230)}"/>
      <path class="${NS}-head" d="${head(50)}${head(230)}"/>
      <g class="${NS}-signs">${sign(-1)}${sign(1)}</g>
    </svg>`;
  }

  function create(host, opts) {
    opts = opts || {};
    const id = `${NS}-${++uid}`;
    const st = {
      min: Number.isFinite(opts.min) ? opts.min : 30,
      max: Number.isFinite(opts.max) ? opts.max : 200,
      written: opts.written > 0 ? opts.written : null,
      beats: opts.beats > 0 ? Math.round(opts.beats) : 4,
      label: opts.label || '',
      playing: !!opts.playing,
      turn: 0,
      bpm: 0,
      repeat: !!opts.repeat,
      canReset: !!opts.canReset,
    };
    const hasRepeat = 'repeat' in opts || typeof opts.onRepeat === 'function';
    st.bpm = toInt(Number.isFinite(opts.bpm) ? opts.bpm : (st.written || 80), st.min, st.max);
    const cb = { onToggle: opts.onToggle, onBpm: opts.onBpm, onRepeat: opts.onRepeat, onReset: opts.onReset };

    const root = document.createElement('div');
    const at = ['under', 'beside', 'none'].includes(opts.labelAt) ? opts.labelAt : 'under';
    root.className = `${NS} ${NS}--label-${at}${hasRepeat ? ' has-repeat' : ''}`;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', 'Play and tempo');
    if (opts.size) root.style.setProperty('--gcs-clock-size', typeof opts.size === 'number' ? opts.size + 'px' : opts.size);
    root.innerHTML = `<div class="${NS}-dial">`
      + `<button type="button" class="${NS}-play" title="Play or pause. Drag up or down to change the tempo.">${faceSvg(id)}</button>`
      + (hasRepeat ? `<button type="button" class="${NS}-repeat" aria-label="Repeat" title="Repeat: go round again at the end">${loopSvg()}</button>` : '')
      + `</div><div class="${NS}-side">`
      + `<div class="${NS}-tempo" role="slider" tabindex="0" aria-label="Tempo" aria-orientation="vertical" title="Tempo: drag up or down, or use the arrow keys. Double-click for full speed.">`
      + `<span class="${NS}-bpm"><b></b><small>BPM</small></span><span class="${NS}-share"></span><span class="${NS}-nudge" aria-hidden="true"></span></div>`
      + `<button type="button" class="${NS}-reset" aria-label="Back to the start" title="Back to the start" hidden>`
      + `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5.5 5.5h3v13h-3zM19 5.5v13L9.5 12z"/></svg></button></div>`
      + `<span class="${NS}-label"></span>`
      + `<div class="${NS}-bubble" aria-hidden="true"><b></b><span>BPM</span><small></small></div>`
      + `<span class="${NS}-sr" aria-live="polite"></span>`;
    const $ = sel => root.querySelector(`.${NS}-${sel}`);
    const btn = $('play'), slider = $('tempo'), labelEl = $('label'), bubble = $('bubble'), live = $('sr');
    const repeatBtn = $('repeat'), resetBtn = $('reset');
    const hand = $('hand'), ticks = $('ticks'), ring = $('ring'), bpmEl = slider.querySelector('b'), shareEl = $('share');
    if (host) host.appendChild(root);

    /* ---- drawing ---- */
    const shareOf = v => (st.written ? Math.round(100 * v / st.written) : null);
    const shareWords = (v, long) => {
      const s = shareOf(v);
      if (s === null) return '';
      if (s === 100) return 'full speed';
      return long ? `${s}% of full speed` : `${s}%`;
    };
    function drawTicks() {
      let h = '';
      for (let i = 0; i < st.beats; i++) {
        const a = (360 * i) / st.beats;
        h += `<line class="${NS}-tick${i ? '' : ' down'}" x1="50" y1="${i ? 12 : 11}" x2="50" y2="${i ? 19 : 21}" transform="rotate(${a.toFixed(2)} 50 50)"/>`;
      }
      ticks.innerHTML = h;
      litBeat = -2;
    }
    function drawTempo() {
      const v = st.bpm, s = shareOf(v), words = shareWords(v, true);
      bpmEl.textContent = String(v);
      shareEl.textContent = s === null ? '' : s === 100 ? 'full speed' : `${s}% speed`;
      root.classList.toggle('is-full', s === 100);
      root.classList.toggle('is-over', s !== null && s > 100);
      root.classList.toggle('no-written', s === null);
      slider.setAttribute('aria-valuemin', String(st.min));
      slider.setAttribute('aria-valuemax', String(st.max));
      slider.setAttribute('aria-valuenow', String(v));
      slider.setAttribute('aria-valuetext', `${v} BPM${words ? ', ' + words : ''}`);
      bubble.querySelector('b').textContent = String(v);
      bubble.querySelector('small').textContent = words;
      // The ring: how much of full speed (a whole turn is full speed), or where in the range with no written tempo.
      const frac = s !== null ? s / 100 : (v - st.min) / Math.max(1, st.max - st.min);
      ring.setAttribute('stroke-dasharray', `${(Math.min(1, Math.max(0, frac)) * 100).toFixed(2)} 100`);
    }
    function drawPlay() {
      root.classList.toggle('is-playing', st.playing);
      const verb = st.playing ? 'Pause' : 'Play';
      btn.setAttribute('aria-label', st.label ? `${verb}: ${st.label}` : verb);
      labelEl.textContent = st.label;
      labelEl.title = st.label;
      root.classList.toggle('no-label', !st.label);
      if (!st.playing) lightBeat(-1);
    }
    function drawRepeat() {
      root.classList.toggle('is-repeat', st.repeat);
      if (repeatBtn) repeatBtn.setAttribute('aria-pressed', String(st.repeat));
    }
    function drawReset() {
      const show = st.canReset && !st.playing;
      if (!show && document.activeElement === resetBtn) btn.focus();   // it leaves: focus goes back to play
      resetBtn.hidden = !show;
      root.classList.toggle('can-reset', show);
    }
    let litBeat = -2;
    function lightBeat(i) {
      if (i === litBeat) return;
      const t = ticks.children;
      if (litBeat >= 0 && t[litBeat]) t[litBeat].classList.remove('on');
      if (i >= 0 && t[i]) t[i].classList.add('on');
      litBeat = i;
    }
    let shownTurn = -1;
    function drawTurn() {
      let t = ((st.turn % 1) + 1) % 1;
      const beat = Math.floor(t * st.beats + 1e-6) % st.beats;
      if (reduced.matches) t = beat / st.beats;   // no sweep: the hand steps from beat to beat
      if (t !== shownTurn) { hand.setAttribute('transform', `rotate(${(t * 360).toFixed(2)} 50 50)`); shownTurn = t; }
      lightBeat(st.playing ? beat : -1);
    }

    /* ---- changing the tempo ---- */
    let adjustTimer = 0;
    function showAdjusting(hold) {
      clearTimeout(adjustTimer);
      root.classList.add('is-adjusting');
      if (!hold) adjustTimer = setTimeout(() => root.classList.remove('is-adjusting'), 1100);
    }
    function commit(v, source) {
      v = toInt(v, st.min, st.max);
      if (v === st.bpm) return false;
      st.bpm = v;
      drawTempo();
      if (cb.onBpm) cb.onBpm(v, { source });
      return true;
    }
    function nudge(dir, fine, source) {
      const changed = commit(stepFrom(st.bpm, dir, fine ? 1 : 5), source);
      showAdjusting(false);
      // Spoken from the play button (the slider says its own value when it has focus).
      if (changed && document.activeElement !== slider) live.textContent = slider.getAttribute('aria-valuetext');
    }

    // Dragging: up is faster. 12 px a step of five; with Shift, 5 px a step of one. Anything that moves less than
    // the slop is a tap. Pointer capture keeps the drag going off the clock, touch-action: none keeps the page still.
    const PX5 = 12, PX1 = 5;
    let drag = null, swallowClickUntil = 0;
    function down(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (drag) return;
      swallowClickUntil = 0;                     // a new press: any drag's click has come and gone
      drag = { id: e.pointerId, el: e.currentTarget, x: e.clientX, y: e.clientY, y0: e.clientY, from: st.bpm, fine: e.shiftKey, moved: false };
      try { drag.el.setPointerCapture(e.pointerId); } catch (_) { /* a synthetic event */ }
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const slop = e.pointerType === 'mouse' ? 4 : 9;
      if (!drag.moved) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < slop) return;
        drag.moved = true;                       // counted from the press: the slop is less than a step
        root.classList.add('is-dragging');
        showAdjusting(true);
      }
      if (e.shiftKey !== drag.fine) { drag.fine = e.shiftKey; drag.from = st.bpm; drag.y0 = e.clientY; }
      const dy = drag.y0 - e.clientY, px = drag.fine ? PX1 : PX5;
      commit(stepFrom(drag.from, Math.trunc(dy / px), drag.fine ? 1 : 5), 'drag');
      e.preventDefault();
    }
    function up(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const moved = drag.moved;
      try { drag.el.releasePointerCapture(e.pointerId); } catch (_) { /* already released */ }
      drag = null;
      if (moved) {
        swallowClickUntil = performance.now() + 450;   // the click a drag ends with is not a tap
        root.classList.remove('is-dragging');
        showAdjusting(false);
      }
    }
    function toggle() { if (cb.onToggle) cb.onToggle(); }
    function click(e) {
      if (e.detail !== 0 && performance.now() < swallowClickUntil) { swallowClickUntil = 0; return; }   // detail 0: a key
      toggle();
    }
    function btnKey(e) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); nudge(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey, 'key'); }
    }
    function sliderKey(e) {
      const k = e.key;
      let handled = true;
      if (k === 'ArrowUp' || k === 'ArrowRight') nudge(1, e.shiftKey, 'key');
      else if (k === 'ArrowDown' || k === 'ArrowLeft') nudge(-1, e.shiftKey, 'key');
      else if (k === 'PageUp') { commit(stepFrom(st.bpm, 2, 5), 'key'); showAdjusting(false); }
      else if (k === 'PageDown') { commit(stepFrom(st.bpm, -2, 5), 'key'); showAdjusting(false); }
      else if (k === 'Home') { commit(st.min, 'key'); showAdjusting(false); }
      else if (k === 'End') { commit(st.max, 'key'); showAdjusting(false); }
      else if (k === ' ' || k === 'Enter') toggle();   // the slider sits beside the play button: the same keys play
      else handled = false;
      if (handled) e.preventDefault();
    }
    function dbl(e) { if (st.written) { e.preventDefault(); commit(st.written, 'reset'); showAdjusting(false); } }
    // The wheel: a step of five a notch (or a trackpad's worth of pixels), one with Shift. Shift turns a mouse wheel
    // sideways on some systems, so deltaX counts too.
    let wheelAcc = 0, wheelAt = 0;
    function wheel(e) {
      e.preventDefault();
      const now = performance.now();
      if (now - wheelAt > 300) wheelAcc = 0;
      wheelAt = now;
      const d = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      wheelAcc += d;
      const unit = 40;
      while (Math.abs(wheelAcc) >= unit) {
        const dir = wheelAcc < 0 ? 1 : -1;      // wheel up (negative) is faster
        wheelAcc += dir * unit;
        nudge(dir, e.shiftKey, 'wheel');
      }
    }

    btn.addEventListener('click', click);
    btn.addEventListener('keydown', btnKey);
    slider.addEventListener('keydown', sliderKey);
    slider.addEventListener('dblclick', dbl);
    labelEl.addEventListener('click', toggle);
    if (repeatBtn) repeatBtn.addEventListener('click', () => { st.repeat = !st.repeat; drawRepeat(); if (cb.onRepeat) cb.onRepeat(st.repeat); });
    resetBtn.addEventListener('click', () => { if (cb.onReset) cb.onReset(); });
    for (const el of [btn, slider]) {
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    }
    root.addEventListener('wheel', wheel, { passive: false });
    const onMotion = () => { shownTurn = -1; drawTurn(); };
    if (reduced.addEventListener) reduced.addEventListener('change', onMotion);

    drawTicks(); drawTempo(); drawPlay(); drawTurn(); drawRepeat(); drawReset();

    return {
      el: root,
      set(p) {
        if (!p) return;
        let tempo = false;
        if (Number.isFinite(p.min)) { st.min = p.min; tempo = true; }
        if (Number.isFinite(p.max)) { st.max = p.max; tempo = true; }
        if ('written' in p) { st.written = p.written > 0 ? p.written : null; tempo = true; }
        if (Number.isFinite(p.bpm) || tempo) { st.bpm = toInt(Number.isFinite(p.bpm) ? p.bpm : st.bpm, st.min, st.max); drawTempo(); }
        if (p.beats > 0 && Math.round(p.beats) !== st.beats) { st.beats = Math.round(p.beats); drawTicks(); shownTurn = -1; }
        if (['under', 'beside', 'none'].includes(p.labelAt)) {
          root.classList.remove(`${NS}--label-under`, `${NS}--label-beside`, `${NS}--label-none`);
          root.classList.add(`${NS}--label-${p.labelAt}`);
        }
        if ('label' in p || 'playing' in p) {
          if ('label' in p) st.label = p.label || '';
          if ('playing' in p) st.playing = !!p.playing;
          drawPlay();
        }
        if ('repeat' in p) { st.repeat = !!p.repeat; drawRepeat(); }
        if ('canReset' in p || 'playing' in p) { if ('canReset' in p) st.canReset = !!p.canReset; drawReset(); }
        if (Number.isFinite(p.turn)) st.turn = p.turn;
        if (Number.isFinite(p.turn) || 'playing' in p || p.beats) drawTurn();
      },
      get() { return { ...st }; },
      focus() { btn.focus(); },
      destroy() {
        clearTimeout(adjustTimer);
        if (reduced.removeEventListener) reduced.removeEventListener('change', onMotion);
        root.remove();
      },
    };
  }

  window.GCSClock = { create, stepFrom, version: 2 };
})();
