/* Measuring the Band: what it plays (the notes) and how it sounds (rendered audio).

   Pure functions, no page and no browser, so the same code runs in Node (test/band-metrics.test.js) and in the page
   (test/band-lab.js, loaded by test/band-report.js). The note metrics read one capture of a tune in one style:

     { notes: [{ part, ms, midi, vel, dur }],   the first time round, every part (dur in seconds, 0 for a drum)
       rounds: [[...notes]],                    every time round, for the arc
       bars: [{ s, e, beats, pickup }],         the bars as played, in ms
       segs: [{ ms, pcs, root }],               the chord in force from each time
       compound }                               whether the beat divides in three

   Each metric is a number with a direction and, where a sensible bound is known, a guardrail (GUARDS). The bounds are
   first guesses written down so they can be argued with: change a bound when listening says it is wrong.

   The audio metrics read Float32 sample arrays: loudness after ITU-R BS.1770 (K-weighting, 400 ms blocks, the -70 LUFS
   and -10 LU gates), the melody's prominence over the band, how much of the melody's own spectrum the band covers,
   the octave-band balance, the low-mid build-up, and the stereo image. */
(function (root) {
  'use strict';
  const PC = m => ((m % 12) + 12) % 12;
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  const sd = a => { if (a.length < 2) return NaN; const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) * (x - m)))); };
  const corr = (a, b) => { if (a.length < 3) return NaN; const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return da && db ? n / Math.sqrt(da * db) : NaN; };
  const round = (x, d = 3) => Number.isFinite(x) ? Math.round(x * 10 ** d) / 10 ** d : null;

  // Low interval limits: the lowest pitch (MIDI) at which the lower note of each interval (in semitones) still sounds
  // clear rather than muddy, the arranger's rule of thumb (a minor second from E3, a third from C3, a fifth from Bb1).
  const LIL = { 1: 52, 2: 51, 3: 48, 4: 46, 5: 46, 6: 47, 7: 34, 8: 43, 9: 41, 10: 41, 11: 41 };

  // The beat grid: the bar a time falls in, its beat length, and how strong the time is (1 the downbeat, .75 a beat,
  // .5 the half beat, .25 anything finer).
  function grid(bars, compound) {
    const real = bars.slice().sort((a, b) => a.s - b.s);
    let i = 0;
    const at = t => { while (i > 0 && t < real[i].s - 1) i--; while (i + 1 < real.length && t >= real[i + 1].s - 1) i++; const b = real[i]; return b && t >= b.s - 1 && t < b.e + 1 ? b : null; };
    const place = t => {
      const b = at(t); if (!b) return null;
      // A time counts as on a position within 25 ms (or 4% of a beat, if more), so a player's looseness keeps its place.
      const beat = (b.e - b.s) / Math.max(1, b.beats), q = (t - b.s) / beat, f = q - Math.floor(q), tol = Math.max(0.04, 25 / beat), near = x => Math.abs(f - x) < tol || Math.abs(f - x - 1) < tol || Math.abs(f - x + 1) < tol;
      const strength = q < tol || q > b.beats - tol ? 1 : near(0) ? 0.75 : (compound ? near(1 / 3) || near(2 / 3) : near(0.5)) ? 0.5 : 0.25;
      return { bar: b, beat, q, strength };
    };
    return { at, place, reset: () => { i = 0; } };
  }

  // Chord hits: the notes of one chord struck together (a strum spreads them over 70 ms at most).
  function hitsOf(chords) {
    const hits = [];
    for (const n of chords.slice().sort((a, b) => a.ms - b.ms)) {
      const h = hits[hits.length - 1];
      if (h && n.ms - h.ms < 70 && !h.midis.includes(n.midi)) { h.midis.push(n.midi); h.vel = Math.max(h.vel, n.vel); h.end = Math.max(h.end, n.end); }
      else hits.push({ ms: n.ms, midis: [n.midi], vel: n.vel, end: n.end });
    }
    for (const h of hits) h.midis.sort((a, b) => a - b);
    return hits;
  }

  function noteMetrics(cap) {
    const withEnd = n => ({ ...n, end: n.ms + Math.max(0.03, n.dur || 0.08) * 1000 });
    const notes = cap.notes.map(withEnd).sort((a, b) => a.ms - b.ms);
    const mel = notes.filter(n => n.part === 'melody'), chords = notes.filter(n => n.part === 'chords' && !n.pad), pads = notes.filter(n => n.pad), bass = notes.filter(n => n.part === 'bass'), drums = notes.filter(n => n.part === 'drums');
    const pitched = notes.filter(n => n.part === 'chords' || n.part === 'bass');
    const g = grid(cap.bars.filter(b => !b.pickup), cap.compound);
    const segs = (cap.segs || []).slice().sort((a, b) => a.ms - b.ms);
    const chordAt = t => { let c = null; for (const s of segs) { if (s.ms <= t + 1) c = s; else break; } return c; };
    const out = {};
    const total = Math.max(...notes.map(n => n.end), 1);

    // ---- harmony and register, sampled every 20 ms while the melody sounds ----
    let melT = 0, rubT = 0, b9T = 0, aboveT = 0, crowdT = 0, j = 0, k = 0;
    const active = [];
    for (let t = 0; t < total; t += 20) {
      while (k < pitched.length && pitched[k].ms <= t) active.push(pitched[k++]);
      for (let q = active.length - 1; q >= 0; q--) if (active[q].end <= t) active.splice(q, 1);
      while (j + 1 < mel.length && mel[j + 1].ms <= t) j++;
      const m = mel[j]; if (!m || m.ms > t || m.end <= t) continue;
      melT++;
      let rub = false, b9 = false, above = false, crowd = false;
      for (const n of active) {
        const d = PC(m.midi - n.midi);
        if (d === 1 || d === 11) rub = true;
        if (d === 1) b9 = true;
        if (n.part === 'chords' && n.midi >= m.midi) above = true;
        if (n.part === 'chords' && n.midi < m.midi && n.midi >= m.midi - 2) crowd = true;
      }
      rubT += rub; b9T += b9; aboveT += above; crowdT += crowd;
    }
    out.rub = melT ? rubT / melT : NaN;              // share of melody time with a band note a semitone away (any octave)
    out.flatNinth = melT ? b9T / melT : NaN;         // ...with the melody a semitone above a band note: the harsh one
    out.chordsAbove = melT ? aboveT / melT : NaN;    // share of melody time with a chord note at or above it
    out.crowding = melT ? crowdT / melT : NaN;       // ...with a chord note just under it (within a tone)

    // The melody's strong-beat notes in the band's chord, and a flat ninth struck against them.
    let strong = 0, fit = 0, strongB9 = 0;
    for (const m of mel) {
      const p = g.place(m.ms); if (!p || p.strength < 0.75) continue;
      const c = chordAt(m.ms); if (!c) continue;
      strong++; if (c.pcs.includes(PC(m.midi))) fit++;
      if (pitched.some(n => n.ms <= m.ms + 15 && n.end > m.ms + 15 && PC(m.midi - n.midi) === 1)) strongB9++;
    }
    out.chordFit = strong ? fit / strong : NaN;
    out.strongFlatNinth = strong ? strongB9 / strong : NaN;

    // ---- voicing ----
    const hits = hitsOf(chords);
    let moves = [], tops = [], lil = 0, lilHits = 0, centre = [];
    let prev = null;
    // Mud: every chord and held pad (with the bass under it) against the low interval limits.
    for (const h of [...hits, ...hitsOf(pads)]) {
      if (h.midis.length < 2) continue;
      lilHits++;
      const under = bass.filter(n => n.ms <= h.ms + 30 && n.end > h.ms + 30).map(n => n.midi);
      const set = [...new Set([...under, ...h.midis])].sort((a, b) => a - b);
      let bad = false; for (let i = 0; i + 1 < set.length; i++) { const iv = set[i + 1] - set[i]; if (iv < 12 && LIL[iv] && set[i] < LIL[iv]) bad = true; }
      lil += bad;
    }
    // Voice leading: the comping's full chords (three notes or more), not its single notes or the pad.
    for (const h of hits) {
      if (h.midis.length < 3) continue;
      centre.push(mean(h.midis));
      if (prev && prev.midis.join() !== h.midis.join()) {
        tops.push(Math.abs(h.midis[h.midis.length - 1] - prev.midis[prev.midis.length - 1]));
        moves.push(mean(h.midis.map(m => Math.min(...prev.midis.map(p => Math.abs(p - m))))));
      }
      prev = h;
    }
    out.mud = lilHits ? lil / lilHits : NaN;          // share of chords and pads (with the bass under them) breaking a low interval limit
    out.topMove = mean(tops);                         // semitones the top voice moves at a change of voicing
    out.voiceMove = mean(moves);                      // ...each voice, on average
    out.chordCentre = mean(centre);                   // MIDI: where the chords sit

    // ---- bass ----
    let downs = 0, roots = 0; const leaps = [];
    bass.forEach((n, i) => {
      const p = g.place(n.ms); if (i) leaps.push(Math.abs(n.midi - bass[i - 1].midi));
      if (!p || p.strength < 1) return; const c = chordAt(n.ms + 5); if (!c) return;
      downs++; if (PC(n.midi) === PC(c.root)) roots++;
    });
    out.bassRoots = downs ? roots / downs : NaN;      // share of downbeat bass notes on the chord's root
    out.bassLeap = mean(leaps);                       // semitones between bass notes

    // ---- time and touch ----
    // Each onset's distance from the nearest step of the grid (sixteenths, or the eighths of a compound beat, or a swung
    // or triplet eighth), with the part's own lean taken out: how loose the playing is, in ms.
    // Each position in the beat keeps its own average lean (a swing's late off-beat is a style, not looseness).
    const offset = t => { const p = g.place(t); if (!p) return null; const steps = cap.compound ? [0, 1 / 6, 1 / 3, 1 / 2, 2 / 3, 5 / 6, 1] : [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1]; const f = p.q - Math.floor(p.q); let best = Infinity, at = 0; for (const s of steps) if (Math.abs(f - s) < Math.abs(best)) { best = f - s; at = s % 1; } return { at: Math.round(at * 12), ms: best * p.beat }; };
    const looseness = ns => { const by = new Map(); for (const n of ns) { const o = offset(n.ms); if (!o) continue; if (!by.has(o.at)) by.set(o.at, []); by.get(o.at).push(o.ms); } const res = []; for (const a of by.values()) { const m = mean(a); for (const x of a) res.push(x - m); } return sd(res); };
    out.timingDrums = looseness(drums);
    out.timingBass = looseness(bass);
    out.timingChords = looseness(hits);
    // Whether the strength follows the beat (a correlation of velocity with the beat's strength) and how much it varies.
    const accent = ns => { const v = [], s = []; for (const n of ns) { const p = g.place(n.ms); if (p) { v.push(n.vel); s.push(p.strength); } } return corr(v, s); };
    out.accentBass = accent(bass);
    out.accentChords = accent(hits);
    out.velSpreadDrums = mean(drums.map(n => n.vel)) ? sd(drums.map(n => n.vel)) / mean(drums.map(n => n.vel)) : NaN;

    // ---- listening ----
    // The band's own onsets (bass and chord hits) landing with the melody's, and the holes it answers: where the melody
    // waits two beats or more, whether the bass or chords play in the part after its first beat.
    const bandOnsets = [...bass.map(n => n.ms), ...hits.map(h => h.ms)].sort((a, b) => a - b);
    const melOn = mel.map(n => n.ms);
    out.together = bandOnsets.length ? bandOnsets.filter(t => melOn.some(m => Math.abs(m - t) < 40)).length / bandOnsets.length : NaN;
    // In each hole, the band's onsets a beat after the melody's last note up to its next, against the band's onsets a
    // beat over the whole tune: above 1, the band plays more where the melody leaves room.
    let holeOn = 0, holeBeats = 0, lift = [], perBeat = [];
    for (let i = 0; i + 1 < mel.length; i++) {
      const p = g.place(mel[i].ms); if (!p) continue;
      const gap = mel[i + 1].ms - mel[i].ms; if (gap < 2 * p.beat - 1) continue;
      const a = mel[i].ms + p.beat * 0.9, b = mel[i + 1].ms - 10;
      holeOn += bandOnsets.filter(t => t > a && t < b).length; holeBeats += (b - a) / p.beat;
      lift.push(drums.filter(n => n.ms >= mel[i + 1].ms - p.beat - 10 && n.ms < mel[i + 1].ms - 10).length);
    }
    for (const b of cap.bars.filter(b => !b.pickup)) perBeat.push(drums.filter(n => n.ms >= b.s - 10 && n.ms < b.e - 10).length / Math.max(1, b.beats));
    const allBeats = cap.bars.filter(b => !b.pickup).reduce((x, b) => x + b.beats, 0) || 1;
    out.answered = holeBeats ? (holeOn / holeBeats) / (bandOnsets.length / allBeats) : NaN;   // the band's activity in the melody's holes against its average
    out.fillLift = mean(perBeat) ? mean(lift) / mean(perBeat) : NaN;   // drum hits in the beat before a phrase, against an average beat

    // ---- repetition and variety, bar by bar ----
    const sig = (ns, b, withPitch) => { const beat = (b.e - b.s) / Math.max(1, b.beats), step = beat / (cap.compound ? 6 : 4); return new Set(ns.filter(n => n.ms >= b.s - 10 && n.ms < b.e - 10).map(n => Math.round((n.ms - b.s) / step) + (withPitch ? ':' + n.midi : ''))); };
    const jac = (a, b) => { if (!a.size && !b.size) return 1; let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i); };
    const bars = cap.bars.filter(b => !b.pickup);
    for (const [name, ns, wp] of [['Drums', drums, true], ['Bass', bass, false], ['Chords', hits, false]]) {
      const S = bars.map(b => sig(ns, b, wp)), J = []; for (let i = 1; i < S.length; i++) J.push(jac(S[i - 1], S[i]));
      out['repeat' + name] = mean(J);                                            // 1: every bar the same rhythm as the last
      out['variety' + name] = S.length ? new Set(S.map(s => [...s].sort().join())).size / S.length : NaN;   // distinct bar rhythms per bar
    }
    // ---- density ----
    const beats = bars.reduce((a, b) => a + b.beats, 0) || 1;
    out.densityDrums = drums.length / beats; out.densityBass = bass.length / beats; out.densityChords = hits.length / beats; out.densityMelody = mel.length / beats;

    // ---- the arc over the times round: the band's weight (the sum of its velocities a beat) in each ----
    if (cap.rounds && cap.rounds.length > 1) {
      const w = cap.rounds.map(r => r.filter(n => n.part !== 'melody').reduce((a, n) => a + n.vel, 0) / beats);
      out.arcRange = Math.max(...w) / Math.max(1e-9, Math.min(...w));   // the fullest time round against the lightest
      out.arcPeak = w.indexOf(Math.max(...w)) / (w.length - 1);          // where the peak falls, 0 first to 1 last
      out.arcSettle = w[w.length - 1] / Math.max(...w);                  // the last time round against the peak
    }
    for (const key of Object.keys(out)) out[key] = round(out[key]);
    return out;
  }

  // Guardrails: [metric, lowest, highest, why]. null: no bound that side. Bounds are a first guess to be argued with.
  const GUARDS = [
    ['flatNinth', null, 0.05, 'a flat ninth against the tune is the clash players avoid', 'drone'],
    ['strongFlatNinth', null, 0.03, 'never on a strong beat', 'drone'],
    ['chordFit', 0.7, null, 'the tune’s strong beats should mostly be in the chord', 'drone'],
    ['chordsAbove', null, 0.15, 'the comping keeps under the tune'],
    ['mud', null, 0.1, 'chords and bass keep to the low interval limits'],
    ['topMove', null, 4, 'the top voice moves by step or small leap'],
    ['bassRoots', 0.7, null, 'the bass states the root on the downbeat'],
    ['timingDrums', 1.5, 12, 'a drummer is neither a sequencer nor sloppy (ms)'],
    ['timingBass', 1.5, 15, 'the bass, a little looser (ms)'],
    ['timingChords', 1.5, 18, 'the comping, a little looser again (ms)'],
    ['accentBass', 0.1, null, 'the bass leans on the beat', 'drone'],
    ['answered', 1.05, null, 'the band plays more where the melody leaves room', 'drone'],
    ['repeatDrums', null, 0.97, 'the drums vary from bar to bar', 'loop'],
  ];
  // Audio guardrails, in the same form.
  const AUDIO_GUARDS = [
    ['lufs', -20, -12, 'loud enough for a classroom speaker, with room to breathe (LUFS)'],
    ['peak', null, -1, 'no clipping (dBFS)'],
    ['prominence', 2, 9, 'the melody stands above the band, but the band is still heard (LU)'],
    ['masked', null, 0.35, 'the band leaves the melody’s strongest frequencies mostly to it'],
    ['bandLowMid', null, 0.45, 'the band builds up little between 200 and 500 Hz'],
    ['width', 0.15, null, 'some stereo image'],
  ];
  // The styles a guard does not apply to: a drone holds the tonic against the raga's every note (its flat second too),
  // and a loop style repeats its bar on purpose.
  const EXEMPT = { drone: ['drone', 'minyo', 'persian', 'korean'], loop: ['drone', 'minyo', 'persian', 'korean', 'house', 'reggaeton', 'trap', 'samba', 'mento', 'afrobeats'] };
  function check(values, guards, style) {
    const fails = [];
    for (const [k, lo, hi, why, ex] of guards) { if (ex && style && EXEMPT[ex].includes(style)) continue; const v = values[k]; if (v === null || v === undefined || !Number.isFinite(v)) continue; if ((lo !== null && v < lo) || (hi !== null && v > hi)) fails.push({ metric: k, value: v, lo, hi, why }); }
    return fails;
  }

  // ---- audio ----
  // A biquad over a signal (direct form I).
  function biquad(x, b0, b1, b2, a1, a2) { const y = new Float64Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; }
  // K-weighting at any sample rate (libebur128's coefficients): a high shelf of +4 dB from 1.7 kHz, then a high pass at 38 Hz.
  function kWeight(x, sr) {
    let K = Math.tan(Math.PI * 1681.974450955533 / sr), Q = 0.7071752369554196, Vh = Math.pow(10, 3.999843853973347 / 20), Vb = Math.pow(Vh, 0.4996667741545416), a0 = 1 + K / Q + K * K;
    const s1 = biquad(x, (Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0);
    K = Math.tan(Math.PI * 38.13547087602444 / sr); Q = 0.5003270373238773; a0 = 1 + K / Q + K * K;
    return biquad(s1, 1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0);
  }
  // Integrated loudness (LUFS) of one or more channels: 400 ms blocks every 100 ms, gated at -70 LUFS, then 10 LU under the mean.
  function lufs(channels, sr) {
    const z = channels.map(c => kWeight(c, sr)), n = z[0].length, block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr), L = [];
    for (let s = 0; s + block <= n; s += hop) { let e = 0; for (const c of z) { let a = 0; for (let i = s; i < s + block; i++) a += c[i] * c[i]; e += a / block; } L.push(e); }
    const loud = e => -0.691 + 10 * Math.log10(e);
    const abs = L.filter(e => loud(e) > -70); if (!abs.length) return -Infinity;
    const rel = loud(mean(abs)) - 10, kept = abs.filter(e => loud(e) > rel);
    return loud(mean(kept));
  }
  const peakDb = channels => 20 * Math.log10(Math.max(1e-9, ...channels.map(c => { let p = 0; for (let i = 0; i < c.length; i++) p = Math.max(p, Math.abs(c[i])); return p; })));
  // An in-place radix-2 FFT.
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
    for (let len = 2; len <= n; len <<= 1) { const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let j = 0; j < len / 2; j++) { const a = i + j, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr; re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  }
  // Power spectra of Hann-windowed frames of a mono signal: [{ power: Float64Array(N/2), rms }].
  function frames(x, N = 4096, hop = 2048) {
    const out = [], w = new Float64Array(N); for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    for (let s = 0; s + N <= x.length; s += hop) { const re = new Float64Array(N), im = new Float64Array(N); let r = 0; for (let i = 0; i < N; i++) { re[i] = x[s + i] * w[i]; r += x[s + i] * x[s + i]; } fft(re, im); const p = new Float64Array(N / 2); for (let i = 0; i < N / 2; i++) p[i] = re[i] * re[i] + im[i] * im[i]; out.push({ power: p, rms: Math.sqrt(r / N) }); }
    return out;
  }
  // Third-octave bands from 50 Hz to 12.5 kHz: each band's bin range.
  const THIRDS = []; for (let k = -13; k <= 11; k++) THIRDS.push(1000 * Math.pow(2, k / 3));
  const bandsOf = (p, sr, N) => THIRDS.map(fc => { const lo = Math.max(1, Math.floor(fc / Math.pow(2, 1 / 6) * N / sr)), hi = Math.min(p.length - 1, Math.ceil(fc * Math.pow(2, 1 / 6) * N / sr)); let e = 0; for (let i = lo; i <= hi; i++) e += p[i]; return e; });
  const monoOf = (L, R) => { const m = new Float32Array(L.length); for (let i = 0; i < L.length; i++) m[i] = (L[i] + R[i]) / 2; return m; };

  // The audio metrics of a render: the full mix, and the melody and the band rendered alone through the same chain.
  function audioMetrics({ mix, melody, band, sr }) {
    const out = {}, N = 4096;
    out.lufs = lufs([mix.L, mix.R], sr);
    out.peak = peakDb([mix.L, mix.R]);
    out.crest = out.peak - 10 * Math.log10(mean(Array.from(mix.L, v => v * v)) || 1e-12);
    if (melody && band) {
      out.melodyLufs = lufs([melody.L, melody.R], sr); out.bandLufs = lufs([band.L, band.R], sr);
      out.prominence = out.melodyLufs - out.bandLufs;
      // Masking: in each frame where the melody sounds, its three strongest third-octave bands, and how often the band is as loud there.
      const fm = frames(monoOf(melody.L, melody.R), N), fb = frames(monoOf(band.L, band.R), N);
      let n = 0, covered = 0;
      for (let i = 0; i < Math.min(fm.length, fb.length); i++) {
        if (fm[i].rms < 0.003) continue;
        const bm = bandsOf(fm[i].power, sr, N), bb = bandsOf(fb[i].power, sr, N), top = bm.map((e, k) => [e, k]).sort((a, b) => b[0] - a[0]).slice(0, 3);
        for (const [e, kk] of top) { n++; if (bb[kk] >= e) covered++; }
      }
      out.masked = n ? covered / n : NaN;
      const fbAvg = new Float64Array(N / 2); for (const f of fb) for (let i = 0; i < fbAvg.length; i++) fbAvg[i] += f.power[i];
      let lm = 0, tot = 0; for (let i = 1; i < fbAvg.length; i++) { const hz = i * sr / N; if (hz >= 20 && hz <= 16000) tot += fbAvg[i]; if (hz >= 200 && hz <= 500) lm += fbAvg[i]; }
      out.bandLowMid = tot ? lm / tot : NaN;                    // the band alone: its share between 200 and 500 Hz
    }
    // The long-term spectrum of the mix in octave bands (63 Hz to 8 kHz), its slope in dB an octave, the low-mid share and the centroid.
    const fx = frames(monoOf(mix.L, mix.R), N), avg = new Float64Array(N / 2);
    for (const f of fx) for (let i = 0; i < avg.length; i++) avg[i] += f.power[i] / fx.length;
    const octs = [63, 125, 250, 500, 1000, 2000, 4000, 8000], energy = (lo, hi) => { let e = 0; for (let i = Math.max(1, Math.floor(lo * N / sr)); i <= Math.min(avg.length - 1, Math.ceil(hi * N / sr)); i++) e += avg[i]; return e; };
    const db = octs.map(fc => 10 * Math.log10(energy(fc / Math.SQRT2, fc * Math.SQRT2) + 1e-20));
    out.octaves = db.map(v => round(v - db[4], 1));            // each octave against 1 kHz
    const xs = octs.map((_, i) => i), mx = mean(xs), my = mean(db); let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (db[i] - my); den += (x - mx) ** 2; });
    out.tilt = num / den;                                       // dB an octave across 63 Hz to 8 kHz
    const all = energy(20, 16000);
    out.lowMid = energy(200, 500) / all;                        // share of the energy between 200 and 500 Hz
    out.sub = energy(20, 60) / all;                             // ...below 60 Hz
    let c = 0, t = 0; for (let i = 1; i < avg.length; i++) { c += i * sr / N * avg[i]; t += avg[i]; } out.centroid = c / t;
    // Stereo: the side signal against the mid (0 mono), and the correlation of the two channels.
    let ms = 0, ss = 0; for (let i = 0; i < mix.L.length; i++) { const m = (mix.L[i] + mix.R[i]) / 2, s = (mix.L[i] - mix.R[i]) / 2; ms += m * m; ss += s * s; }
    out.width = ms ? Math.sqrt(ss / ms) : 0;
    out.correlation = corr(Array.from(mix.L.subarray(0, 200000)), Array.from(mix.R.subarray(0, 200000)));
    for (const key of Object.keys(out)) if (!Array.isArray(out[key])) out[key] = round(out[key]);
    return out;
  }

  const api = { noteMetrics, audioMetrics, check, GUARDS, AUDIO_GUARDS, lufs, kWeight, peakDb, hitsOf, grid, LIL, fft };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.BandMetrics = api;
})(typeof self !== 'undefined' ? self : this);
