/* The Band in the lab: loaded into index.html (by test/band-report.js, through Chrome's DevTools protocol, after
   test/band-metrics.js), it plays each tune in each style in a notation cell of its own, captures what the Band
   writes, and renders the first time round offline through the page's own sampler and mix bus: the full mix, the
   melody alone and the band alone, timing the render as a measure of the processor's work.

     BandLab.start({ jobs: [{ id, abc, style }], inst: 'recorder', audio: true, maxMs: 24000 })
     BandLab.state()   { done, at, of, results, error }

   Everything it touches is the page's (GCS.lab: the sampler, the drum map, the styles); it changes nothing but its
   own cell, and puts the sampler back on the page's AudioContext after each render. */
(function () {
  'use strict';
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const NOTE = m => ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const st = { done: false, at: 0, of: 0, results: [], error: null };
  let engine = null;

  async function cell() {
    if (engine) return engine;
    for (let i = 0; i < 200 && !(window.ABCJS && window.GCS); i++) await sleep(50);
    const before = new Set(GCS.engines.keys());
    GCS.addCell('abc');
    for (let i = 0; i < 200; i++) { for (const [id, e] of GCS.engines) if (!before.has(id) && e.entry) { engine = e; return e; } await sleep(50); }
    throw new Error('no notation cell');
  }

  // The tune in the style: rendered, compiled and its samples loaded.
  async function load(e, abc, style, inst) {
    e.inst = inst; e.style = style || 'auto'; e.setBand(''); e.entry.value = abc;
    const old = e.tl;
    e.render();
    for (let i = 0; i < 400; i++) { if (e.tl && e.tl !== old && e.player && e.player.choruses && e.player.cycles && e.player.cycles[0] && !e.pending && !e.busy) break; await sleep(25); if (e.pending && !e.busy) e.render(); }
    if (!e.tl || e.tl === old) throw new Error('the tune did not render');
    await e.player.ready();
  }

  // The melody at the pitch it sounds (the soprano recorder an octave above written), so clashes are counted as heard.
  function capture(e) {
    const p = e.player, bl = e.beatLen(), ch = p.choruses[0] || {};
    const { setOf, sampleOf, takesOf } = GCS.lab, used = new Set();   // the files actually loaded: the set in use, the note it plays from (every take of a kit drum)
    for (const c of p.cycles) for (const n of c) { const f = setOf ? setOf(n.folder, n.midi) : n.folder, takes = takesOf && takesOf(f, n.midi); if (takes) takes.forEach(t => used.add(f + '|' + t)); else used.add(f + '|' + NOTE(sampleOf ? sampleOf(f, n.midi) : n.midi)); }
    return {
      notes: p.cycles[0].map(n => ({ part: n.part, ms: n.ms, midi: n.midi + (n.part === 'melody' && GCS.lab.melodyOctave ? GCS.lab.melodyOctave(e.inst) : 0), vel: n.vel, dur: n.dur, pad: !!(n.from && n.from.tip && / held: /.test(n.from.tip)), answer: !!(n.from && n.from.tip && /^answering/.test(n.from.tip)) })),
      rounds: p.cycles.map(c => c.map(n => ({ part: n.part, vel: n.vel, ms: n.ms, midi: n.midi }))),
      bars: (ch.bars || []).map(b => ({ s: b.s, e: b.e, beats: b.beats, pickup: !!b.pickup })),
      segs: (ch.segs || []).filter(s => s.chord).map(s => ({ ms: s.ms, pcs: s.chord.pcs, root: s.chord.root })),
      compound: Math.abs(bl * 8 / 3 - Math.round(bl * 8 / 3)) < 1e-6,
      fills: p.choruses.map(c => { const fs = []; for (const n of c.notes) if (n.part === 'drums' && n.from && / fill, after /.test(n.from.tip || '') && !fs.some(x => x.f === n.from)) fs.push({ f: n.from, t: n.t }); return fs.map(x => `${Math.round(x.t)}: ${x.f.tip.replace(/^.*\u2192 /, '')}`); }),   // the drummer's fills, each time round
      total: p.total, style: e.styleKey, comp: e.bandPlayer ? e.bandPlayer.comp() : null, used: [...used],
    };
  }

  // The first time round, offline: only the parts asked for, up to maxMs, through the page's bus (compressor, trim,
  // limiter, room, the pump's duck). Returns the channels and the render's wall time.
  async function render(e, parts, maxMs) {
    const { sampler, DRUM } = GCS.lab, p = e.player, sr = 44100;
    const span = Math.min(p.total, maxMs), off = new OfflineAudioContext(2, Math.ceil(sr * (span / 1000 + 1.2)), sr);
    const real = sampler._ctx; sampler._ctx = off; p.bus = null;
    try {
      const bus = p.gains(), pump = (p.style && p.style.pump) || 0;
      for (const n of p.cycles[0]) {
        if (!parts.includes(n.part) || n.ms >= span || n.ms < 0) continue;
        const when = 0.05 + n.ms / 1000;
        if (pump && n.part === 'drums' && n.midi === DRUM.kick) for (const [q, k] of [['bass', 1], ['chords', 0.8], ['chordsHi', 0.8]]) { if (!bus.duck[q]) continue; const g = bus.duck[q].gain; g.setTargetAtTime(1 - pump * k, when, 0.003); g.setTargetAtTime(1, when + 0.03, 0.07); }
        sampler.play(n.folder, n.midi, when, n.dur, n.vel, p.route ? p.route(n, bus) : bus[n.part], n.rel, n.fx);
      }
      const t0 = performance.now(), buf = await off.startRendering(), wall = performance.now() - t0;
      return { L: buf.getChannelData(0), R: buf.getChannelData(1), sr, wall, seconds: buf.duration };
    } finally { sampler._ctx = real; p.bus = null; }
  }

  async function job(j, cfg) {
    const e = await cell();
    await load(e, j.abc, j.style, cfg.inst || 'recorder');
    const cap = capture(e), out = { id: j.id, asked: j.style || 'auto', style: cap.style, comp: cap.comp, used: cap.used, fills: cap.fills, notes: BandMetrics.noteMetrics(cap) };
    if (cfg.keepNotes) out.capture = cap;
    if (cfg.audio) {
      const maxMs = cfg.maxMs || 24000;
      const mix = await render(e, ['melody', 'hetero', 'chords', 'bass', 'drums'], maxMs), melody = await render(e, ['melody'], maxMs), band = await render(e, ['hetero', 'chords', 'bass', 'drums'], maxMs);   // hetero: the heterophony part (melody2), the band's
      out.audio = BandMetrics.audioMetrics({ mix, melody, band, sr: mix.sr });
      out.audio.cpu = Math.round(1000 * band.wall / 1000 / band.seconds) / 1000;   // seconds of rendering a second of the band, offline
    }
    return out;
  }

  // Each voice on its own, the same passage for all: a chord of four notes around middle C every half second for eight
  // seconds (bass voices two octaves down, drums one hit each), rendered offline. Measures what a voice costs the
  // processor (seconds to render a second), how much top end it has (the frequency under which 95% of its energy lies,
  // and the highest third-octave band within 60 dB of its loudest), and how long a note sustains.
  async function voices() {
    const { sampler, SYNTH_VOICES, SYNTH_KITS, DRUM, SAMPLE_SETS } = GCS.lab, sr = 44100, out = [];
    const sets = [['acoustic_grand_piano', 0], ['vcsl_grand_piano', 0], ['acoustic_guitar_nylon', 0], ['electric_piano_1', 0], ['recorder', 12], ['vcsl_soprano_recorder', 12], ['acoustic_bass', -24], ['vsco_double_bass_pizz', -24], ['vsco_violin', 12], ['vsco_trumpet', 0], ['vsco_tuba', -24], ['vsco_glockenspiel', 12], ['vsco_marimba', 0], ['vsco_xylophone', 12], ...Object.keys(SYNTH_VOICES).map(f => [f, /sub|bass/.test(f) ? -24 : 0]), ['percussion', null], ['kit', null], ...Object.keys(SYNTH_KITS).map(f => [f, null])];
    const was = SAMPLE_SETS.use; SAMPLE_SETS.use = false;   // each set by its own name
    try {
    for (const [folder, shift] of sets) {
      const notes = shift === null ? (folder === 'kit' ? [DRUM.snare, DRUM.hatC] : [DRUM.kick, DRUM.snare, DRUM.hatC]) : [60, 64, 67, 71].map(m => m + shift);
      await Promise.all([...notes, 60 + (shift || 0)].map(m => sampler.load(folder, m)));
      const run = async (midis, seconds, dur) => {
        const off = new OfflineAudioContext(2, sr * seconds, sr), real = sampler._ctx; sampler._ctx = off;
        try { for (let t = 0; t + 0.5 <= seconds - 0.5; t += 0.5) for (const m of midis) sampler.play(folder, m, 0.05 + t, dur, 0.6, off.destination, 0.1); const t0 = performance.now(); const buf = await off.startRendering(); return { buf, wall: performance.now() - t0 }; }
        finally { sampler._ctx = real; }
      };
      const busy = await run(notes, 8, 0.45);
      // One long note: its spectrum and how long it sustains (the time it stays within 40 dB of its peak).
      const off = new OfflineAudioContext(1, sr * 6, sr), real = sampler._ctx; sampler._ctx = off;
      let one; try { sampler.play(folder, shift === null ? notes[1] : 60 + shift, 0.01, shift === null ? 0 : 5.5, 0.6, off.destination, 0.1); one = await off.startRendering(); } finally { sampler._ctx = real; }
      const x = one.getChannelData(0), N = 8192, re = new Float64Array(N), im = new Float64Array(N);
      let pk = 0, at = 0; for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > pk) { pk = Math.abs(x[i]); at = i; }
      const start = Math.max(0, Math.min(x.length - N, at)); for (let i = 0; i < N; i++) re[i] = x[start + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
      BandMetrics.fft(re, im); const pw = new Float64Array(N / 2); let tot = 0; for (let i = 1; i < N / 2; i++) { pw[i] = re[i] * re[i] + im[i] * im[i]; tot += pw[i]; }
      let acc = 0, roll = 0; for (let i = 1; i < N / 2; i++) { acc += pw[i]; if (acc >= 0.95 * tot) { roll = i * sr / N; break; } }
      const max = Math.max(...pw); let top = 0; for (let i = 1; i < N / 2; i++) if (pw[i] > max * 1e-6) top = i * sr / N;
      const win = Math.round(sr * 0.05); let first = -1, last = 0; for (let s0 = 0; s0 + win < x.length; s0 += win) { let r = 0; for (let i = s0; i < s0 + win; i++) r = Math.max(r, Math.abs(x[i])); if (r > pk * 0.01) { if (first < 0) first = s0; last = s0 + win; } } const sustain = first < 0 ? 0 : (last - first) / sr;
      out.push({ folder, cpu: Math.round(1000 * busy.wall / 1000 / 8) / 1000, rolloff: Math.round(roll), top: Math.round(top), sustain: Math.round(sustain * 100) / 100, synth: !!(SYNTH_VOICES[folder] || SYNTH_KITS[folder]) });
    }
    } finally { SAMPLE_SETS.use = was; }
    return out;
  }

  // What a thinner sample set costs: each note from G3 to C5 played from its own sample and from its neighbour one and two
  // semitones away, retuned; the log-spectral distance (dB, third-octave bands from 100 Hz to 8 kHz, the first 0.4 s)
  // between them. Keeping every third note retunes by a semitone at most; every fourth, by two.
  async function thinning(folders) {
    const { sampler, SAMPLE_STEP, SAMPLE_SETS } = GCS.lab, sr = 44100, out = [], was = SAMPLE_SETS.use; SAMPLE_SETS.use = false;
    const spectrum = async (folder, midi, from) => {
      SAMPLE_STEP[folder] = 1; await sampler.load(folder, from);
      const off = new OfflineAudioContext(1, sr * 0.5, sr), real = sampler._ctx; sampler._ctx = off;
      let buf; try {
        const b = sampler.buffers.get(folder + '/' + ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'][from % 12] + (Math.floor(from / 12) - 1)); if (!b) return null;
        const src = off.createBufferSource(); src.buffer = b; src.playbackRate.value = Math.pow(2, (midi - from) / 12); src.connect(off.destination); src.start(0); buf = await off.startRendering();
      } finally { sampler._ctx = real; delete SAMPLE_STEP[folder]; }
      const x = buf.getChannelData(0), N = 16384, re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < Math.min(N, x.length); i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
      BandMetrics.fft(re, im); const bands = [];
      for (let k = 0; k < 19; k++) { const fc = 100 * Math.pow(2, k / 3), lo = Math.floor(fc / Math.pow(2, 1 / 6) * N / sr), hi = Math.ceil(fc * Math.pow(2, 1 / 6) * N / sr); let e = 0; for (let i = lo; i <= hi; i++) e += re[i] * re[i] + im[i] * im[i]; bands.push(10 * Math.log10(e + 1e-12)); }
      return bands;
    };
    for (const folder of folders) {
      const row = { folder, d1: [], d2: [] };
      for (let m = 55; m <= 72; m++) {
        const own = await spectrum(folder, m, m); if (!own) continue;
        for (const d of [1, 2]) { const nb = await spectrum(folder, m, m - d); if (!nb) continue; const off = own.map((v, i) => nb[i] - v), mo = off.reduce((a, b) => a + b, 0) / off.length; row['d' + d].push(Math.sqrt(off.reduce((a, v) => a + (v - mo) ** 2, 0) / off.length)); }
      }
      const med = a => { const b = a.slice().sort((x, y) => x - y); return b.length ? Math.round(b[b.length >> 1] * 100) / 100 : null; };
      out.push({ folder, semitone: med(row.d1), tone: med(row.d2) });
    }
    SAMPLE_SETS.use = was;
    return out;
  }

  window.BandLab = {
    voices, thinning,
    start(cfg) {
      Object.assign(st, { done: false, at: 0, of: cfg.jobs.length, results: [], error: null });
      (async () => {
        for (const j of cfg.jobs) {
          try { st.results.push(await job(j, cfg)); } catch (err) { st.results.push({ id: j.id, asked: j.style || 'auto', error: String(err && err.stack || err) }); }
          st.at++;
        }
        st.done = true;
      })().catch(err => { st.error = String(err && err.stack || err); st.done = true; });
      return true;
    },
    state() { return { done: st.done, at: st.at, of: st.of, error: st.error }; },
    results() { return st.results; },
    load, capture, render, cell,
  };
})();
