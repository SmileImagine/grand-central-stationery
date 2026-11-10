/*
  Grand Central Stationery: tune difficulty analyzer.

  Reads tunes that abcjs has parsed (ABCJS.parseOnly) and describes each one
  three ways:

    features  numbers measured from the melody: range, pitch set, leaps,
              durations, syncopation, bars, repetition, metre, key.
    skills    tags naming what a player must already be able to do
              ("degree:fa", "dur:1/2", "leap:5th", "metre:6/8", "tie").
    grade     a rung per dimension of the skill lattice below, an overall
              level (1 to 6, like a climbing gym's colour grades) and a
              continuous score for ordering within a level.

  sequence() orders a set of analyzed tunes so that each one introduces as few
  new skills as possible, the way a method book does, and says which skills
  each tune brings in.

  Works in Node (module.exports) and in a page (window.GCSAnalyze). The module
  does not load abcjs itself: analyzeAbc(text, ABCJS) takes the library, and
  analyzeTune(tune) takes an already parsed tune.

  Pitch is measured as scale degrees relative to the major key of the key
  signature (so a minor tune is read la-based, as the page's Names toggle
  does), which keeps the grade the same under the page's Transpose.
*/
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.GCSAnalyze = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const ACC_SEMI = { sharp: 1, flat: -1, natural: 0, dblsharp: 2, dblflat: -2, quartersharp: 0, quarterflat: 0 };
  // Semitones from the key signature's root up to the tonic of its relative major.
  const MODE_TO_MAJOR = { '': 0, maj: 0, ion: 0, m: 3, min: 3, aeo: 3, dor: 10, phr: 8, lyd: 7, mix: 5, loc: 1 };
  const SOLFA = ['do', 'di', 're', 'ri', 'mi', 'fa', 'fi', 'so', 'si', 'la', 'te', 'ti'];
  const PENTATONIC = new Set([0, 2, 4, 7, 9]);
  const DIATONIC = new Set([0, 2, 4, 5, 7, 9, 11]);
  const INTERVAL_NAME = ['unison', '2nd', '2nd', '3rd', '3rd', '4th', 'tritone', '5th', '6th', '6th', '7th', '7th', 'octave'];
  const EPS = 1e-6;

  /* ---------- the skill lattice ----------
     Each dimension lists its rungs from easiest to hardest. A tune sits on the
     first rung whose test it passes; the tests are written against the
     feature object below. */
  const LATTICE = {
    pitch: {
      label: 'Pitch set',
      rungs: [
        { name: 'three pentatonic notes', test: f => f.chromaticClasses === 0 && f.pentatonicOnly && f.degreeCount <= 3 },
        { name: 'pentatonic', test: f => f.chromaticClasses === 0 && f.pentatonicOnly },
        { name: 'diatonic', test: f => f.chromaticClasses === 0 },
        { name: 'one chromatic note', test: f => f.chromaticClasses === 1 && f.chromaticFraction <= 0.08 },
        { name: 'a few chromatic notes', test: f => f.chromaticClasses <= 3 && f.chromaticFraction <= 0.2 },
        { name: 'freely chromatic', test: () => true },
      ],
    },
    range: {
      label: 'Range',
      rungs: [
        { name: 'within a 4th', test: f => f.rangeSemitones <= 5 },
        { name: 'within a 6th', test: f => f.rangeSemitones <= 9 },
        { name: 'within an octave', test: f => f.rangeSemitones <= 12 },
        { name: 'within an 11th', test: f => f.rangeSemitones <= 17 },
        { name: 'within two octaves', test: f => f.rangeSemitones <= 24 },
        { name: 'more than two octaves', test: () => true },
      ],
    },
    interval: {
      label: 'Leaps',
      rungs: [
        { name: 'up to a 4th (so-mi-la)', test: f => f.maxLeap <= 5 && f.leapFraction <= 0.3 },
        { name: 'up to a 5th', test: f => f.maxLeap <= 7 && f.leapFraction <= 0.4 },
        { name: 'up to a 6th', test: f => f.maxLeap <= 9 && f.leapFraction <= 0.5 },
        { name: 'up to an octave', test: f => f.maxLeap <= 12 && f.leapFraction <= 0.6 },
        { name: 'wide or angular', test: f => f.maxLeap <= 12 || f.leapFraction <= 0.6 },
        { name: 'very angular', test: () => true },
      ],
    },
    rhythm: {
      label: 'Rhythm',
      // rhythmRung is computed from the durations and tags; see rhythmRung().
      rungs: [
        { name: 'beats and half beats', test: f => f.rhythmRung <= 1 },
        { name: 'rests, or the compound beat in three', test: f => f.rhythmRung <= 2 },
        { name: 'dotted figures, ties, rests off the beat', test: f => f.rhythmRung <= 3 },
        { name: 'quarter-beats, triplets, some syncopation', test: f => f.rhythmRung <= 4 },
        { name: 'sustained syncopation or odd note lengths', test: f => f.rhythmRung <= 5 },
        { name: 'finer divisions or irregular tuplets', test: () => true },
      ],
    },
    metre: {
      label: 'Metre',
      rungs: [
        { name: '4/4 or 2/4', test: f => f.metreChanges === 0 && f.metreDen === 4 && (f.metreNum === 4 || f.metreNum === 2) },
        { name: '3/4', test: f => f.metreChanges === 0 && f.metreNum === 3 && f.metreDen === 4 },
        { name: '6/8 or cut time', test: f => f.metreChanges === 0 && ((f.metreNum === 6 && f.metreDen === 8) || (f.metreNum === 2 && f.metreDen === 2)) },
        { name: '9/8, 12/8, 3/8, 3/2', test: f => f.metreChanges === 0 && [[9, 8], [12, 8], [3, 8], [3, 2], [4, 2]].some(([n, d]) => f.metreNum === n && f.metreDen === d) },
        { name: 'irregular metre', test: f => f.metreChanges === 0 },
        { name: 'metre changes', test: () => true },
      ],
    },
    length: {
      label: 'Length',
      rungs: [
        { name: 'up to 8 bars of material', test: f => f.effectiveBars <= 8.5 },
        { name: 'up to 16 bars', test: f => f.effectiveBars <= 16.5 },
        { name: 'up to 24 bars', test: f => f.effectiveBars <= 24.5 },
        { name: 'up to 32 bars', test: f => f.effectiveBars <= 32.5 },
        { name: 'up to 48 bars', test: f => f.effectiveBars <= 48.5 },
        { name: 'more than 48 bars', test: () => true },
      ],
    },
    key: {
      label: 'Key signature',
      rungs: [
        { name: 'up to one sharp or flat', test: f => f.keyAccidentals <= 1 && f.keyChanges === 0 },
        { name: 'two sharps or flats', test: f => f.keyAccidentals <= 2 && f.keyChanges === 0 },
        { name: 'three', test: f => f.keyAccidentals <= 3 && f.keyChanges === 0 },
        { name: 'four', test: f => f.keyAccidentals <= 4 && f.keyChanges === 0 },
        { name: 'five or more', test: f => f.keyChanges === 0 },
        { name: 'key changes', test: () => true },
      ],
    },
  };
  // Weights for the continuous score: what matters most to a beginner.
  const WEIGHTS = { pitch: 1.2, range: 0.8, interval: 1.0, rhythm: 1.4, metre: 0.6, length: 0.9, key: 0.3 };

  /* ---------- helpers ---------- */
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  // A duration in beats as a short fraction string ("1", "1/2", "3/2", "1/3").
  function fraction(x) {
    for (const den of [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48]) {
      const num = Math.round(x * den);
      if (Math.abs(num / den - x) < 1e-4) { const g = gcd(num, den); return den / g === 1 ? String(num / g) : `${num / g}/${den / g}`; }
    }
    return x.toFixed(3);
  }
  const parseFraction = s => { const [a, b] = String(s).split('/'); return b ? +a / +b : +a; };
  function tonicOf(key) {
    if (!key || !key.root || key.root === 'none' || !(key.root in LETTER_PC)) return null;
    const mode = (key.mode || '').toLowerCase().slice(0, 3);
    const shift = MODE_TO_MAJOR[mode] !== undefined ? MODE_TO_MAJOR[mode] : (MODE_TO_MAJOR[key.mode] || 0);
    return ((LETTER_PC[key.root] + (ACC_SEMI[key.acc === '#' ? 'sharp' : key.acc === 'b' ? 'flat' : 'natural'] || 0) + shift) % 12 + 12) % 12;
  }
  // Chord symbols as degrees of the key: I, IV, V, or other. Minor keys read la-based, so the chords on la, re and mi
  // (Am, Dm, E in A minor) count as I, IV and V.
  function chordDegreesOf(names, tonic, key) {
    const out = new Set();
    if (tonic === null) return [...names].length ? ['other'] : [];
    const minor = /^(m|min|minor|aeo|aeolian)$/.test((key && key.mode || '').toLowerCase());
    const home = minor ? { 9: 'I', 2: 'IV', 4: 'V' } : { 0: 'I', 5: 'IV', 7: 'V' };
    for (const name of names) {
      const m = /^([A-G])([#b]?)/.exec(name.trim()); if (!m) continue;
      const pc = ((LETTER_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) - tonic) % 12 + 12) % 12;
      out.add(home[pc] || 'other');
    }
    return [...out];
  }
  function keyAccidentalMap(key) {
    const m = {};
    for (const a of (key && key.accidentals) || []) m[a.note.toUpperCase()] = a.acc;
    return m;
  }
  function beatLength(num, den) {
    // Compound metres (6/8, 9/8, 12/8) beat in dotted units; everything else in the denominator.
    return num % 3 === 0 && num > 3 ? 3 / den : 1 / den;
  }
  function melodyVoice(tune) {
    // The first voice of the first staff, gathered across lines.
    const out = [];
    for (const line of tune.lines) {
      const staff = line.staff && line.staff[0];
      const voice = staff && staff.voices && staff.voices[0];
      if (voice) for (const el of voice) out.push(el);
    }
    return out;
  }
  function countVoices(tune) {
    let n = 0;
    for (const line of tune.lines) for (const staff of line.staff || []) n = Math.max(n, (staff.voices || []).length * (line.staff.length));
    return n || 1;
  }

  /* ---------- feature extraction ---------- */
  function analyzeTune(tune, extra) {
    const meta = tune.metaText || {};
    const key0 = tune.getKeySignature ? tune.getKeySignature() : null;
    const meter0 = tune.getMeterFraction ? tune.getMeterFraction() : { num: 4, den: 4 };
    let key = key0, keyAcc = keyAccidentalMap(key0), tonic = tonicOf(key0);
    let num = +meter0.num || 4, den = +meter0.den || 4, beat = beatLength(num, den), barLen = num / den;
    let barAcc = {}, pos = 0;          // pos: whole notes since the start of the current bar
    let barIndex = 0, barHasNotes = false, barHash = [];
    const bars = [], notes = [], tags = new Set(), warnings = [];
    let keyChanges = 0, metreChanges = 0, repeats = 0, endings = 0, chordSymbols = 0, graceNotes = 0, multiStops = 0, slurs = 0;
    const decorations = new Set(), chordNames = new Set();
    let restCount = 0, restBeats = 0, tieCount = 0, tieOverBar = 0, tripletCount = 0, otherTuplets = 0;
    let pending = null;               // a note waiting for its tied continuation

    const closeBar = () => {
      if (barHasNotes || barHash.length) bars.push(barHash.join(' '));
      barIndex++; barHasNotes = false; barHash = []; barAcc = {}; pos = 0;
    };

    for (const el of melodyVoice(tune)) {
      if (el.el_type === 'bar') {
        if (/repeat/.test(el.type)) repeats++;
        if (el.startEnding) endings++;
        closeBar();
        continue;
      }
      if (el.el_type === 'key') {
        if (tonic !== null && tonicOf(el) !== null && tonicOf(el) !== tonic) keyChanges++;
        key = el; keyAcc = keyAccidentalMap(el); tonic = tonicOf(el);
        continue;
      }
      if (el.el_type === 'meter') {
        const v = el.value && el.value[0];
        if (v && (+v.num !== num || +v.den !== den)) { metreChanges++; num = +v.num; den = +v.den; beat = beatLength(num, den); barLen = num / den; }
        continue;
      }
      if (el.el_type !== 'note') continue;
      const dur = el.duration || 0;
      if (el.startTriplet) { if (el.startTriplet === 3) tripletCount++; else otherTuplets++; }
      if (el.gracenotes) graceNotes += el.gracenotes.length;
      if (el.chord) { chordSymbols += el.chord.length; for (const c of el.chord) if (c.name) chordNames.add(c.name); }
      for (const d of el.decoration || []) decorations.add(d);
      for (const p of el.pitches || []) if (p.startSlur) slurs += p.startSlur.length;
      const onsetBeats = pos / beat, durBeats = dur / beat;

      if (el.rest || !el.pitches || !el.pitches.length) {
        if (el.rest && el.rest.type !== 'spacer' && dur > 0) {
          restCount++; restBeats += durBeats; barHash.push('r' + fraction(durBeats));
          if (Math.abs(onsetBeats - Math.round(onsetBeats)) > EPS) tags.add('rest-off-beat');
          tags.add('rest');
        }
        pos += dur; continue;
      }
      barHasNotes = true;
      if (el.pitches.length > 1) multiStops++;
      // The melody note is the top of any chord.
      let top = null;
      for (const p of el.pitches) {
        const letter = (p.name || '').replace(/[^A-Ga-g]/g, '').toUpperCase();
        if (!(letter in LETTER_PC)) continue;
        const octKey = letter + p.pitch;
        let acc = p.accidental;
        if (acc) barAcc[octKey] = acc; else acc = barAcc[octKey] || keyAcc[letter] || 'natural';
        const midi = 60 + 12 * Math.floor(p.pitch / 7) + LETTER_PC[letter] + (ACC_SEMI[acc] || 0);
        if (!top || midi > top.midi) top = { midi, explicit: !!p.accidental, tie: !!p.startTie, tied: !!p.endTie };
      }
      if (!top) { pos += dur; continue; }
      const rel = tonic === null ? null : ((top.midi - tonic) % 12 + 12) % 12;
      barHash.push((tonic === null ? top.midi : top.midi - tonic) + ':' + fraction(durBeats));

      if (top.tied && pending) {
        // Continuation of a tie: lengthen the previous note instead of starting a new one.
        pending.durBeats += durBeats; pending.endsAt += dur;
        tieCount++;
        if (pending.bar !== barIndex) tieOverBar++;
        if (!top.tie) pending = null;
        pos += dur; continue;
      }
      const note = { midi: top.midi, rel, onsetBeats, durBeats, bar: barIndex, explicit: top.explicit, endsAt: pos + dur, beatAtOnset: beat };
      notes.push(note);
      pending = top.tie ? note : null;
      pos += dur;
    }
    closeBar();

    /* ---- derive features ---- */
    const n = notes.length;
    const f = {
      title: meta.title || '', composer: meta.composer || '', origin: meta.origin || '', rhythm: meta.rhythm || '',
      source: meta.source || '', keyName: key0 ? `${key0.root}${key0.acc || ''}${key0.mode || ''}` : '', tonicPc: tonic,
      metreNum: +meter0.num || 4, metreDen: +meter0.den || 4, metreCompound: beatLength(+meter0.num || 4, +meter0.den || 4) !== 1 / (+meter0.den || 4),
      tempo: tune.getBpm ? tune.getBpm() : null, pickup: !!(tune.getPickupLength && tune.getPickupLength() > EPS),
      noteCount: n, barCount: bars.length, voices: countVoices(tune),
      keyAccidentals: ((key0 && key0.accidentals) || []).filter(a => a.acc !== 'natural').length, keyChanges, metreChanges,
      repeats, endings, chordSymbols, graceNotes, multiStops, restCount, tieCount, tieOverBar, tripletCount, otherTuplets, slurs,
      decorations: [...decorations].sort(), chordDegrees: chordDegreesOf(chordNames, tonic, key0),
      warnings: (tune.warnings || []).length,
    };
    if (extra) Object.assign(f, extra);

    if (n === 0) {
      Object.assign(f, { rangeSemitones: 0, lowMidi: null, highMidi: null, degreeCount: 0, pitchClasses: 0, chromaticClasses: 0, chromaticFraction: 0, pentatonicOnly: true,
        maxLeap: 0, meanInterval: 0, leapFraction: 0, distinctBars: 0, repetition: 0, effectiveBars: 0, totalBeats: 0, notesPerBeat: 0, restFraction: 0, belowDo: 0, keyMode: '',
        syncopations: 0, syncopationFraction: 0, smallestBeatFraction: 1, durations: [], rhythmRung: 1, skills: [], degrees: [], slurs: 0, decorations: [], chordDegrees: [] });
      return f;
    }

    // Pitch
    const midis = notes.map(x => x.midi);
    f.lowMidi = Math.min(...midis); f.highMidi = Math.max(...midis); f.rangeSemitones = f.highMidi - f.lowMidi;
    const pcs = new Set(midis.map(m => ((m % 12) + 12) % 12)); f.pitchClasses = pcs.size;
    const rels = tonic === null ? [] : notes.map(x => x.rel);
    const relSet = new Set(rels);
    f.degreeCount = relSet.size;
    const chromatic = [...relSet].filter(r => !DIATONIC.has(r));
    f.chromaticClasses = tonic === null ? 0 : chromatic.length;
    f.chromaticFraction = tonic === null ? 0 : rels.filter(r => !DIATONIC.has(r)).length / n;
    f.pentatonicOnly = tonic !== null && [...relSet].every(r => PENTATONIC.has(r));
    f.degrees = [...relSet].sort((a, b) => a - b).map(r => SOLFA[r]);
    for (const d of f.degrees) tags.add('degree:' + d);
    const dos = notes.filter(x => x.rel === 0).map(x => x.midi), lowDo = dos.length ? Math.min(...dos) : null;
    f.belowDo = lowDo === null ? 0 : notes.filter(x => x.midi < lowDo).length;   // notes under the lowest do: low so and low la
    f.keyMode = (key0 && key0.mode || '').toLowerCase();

    // Intervals
    let maxLeap = 0, sumAbs = 0, leaps = 0, steps = 0;
    for (let i = 1; i < n; i++) {
      const d = Math.abs(notes[i].midi - notes[i - 1].midi);
      if (d === 0) continue;
      sumAbs += d; steps++; if (d > maxLeap) maxLeap = d; if (d > 4) leaps++;   // a leap is wider than a 3rd
    }
    f.maxLeap = maxLeap; f.meanInterval = steps ? sumAbs / steps : 0; f.leapFraction = steps ? leaps / steps : 0;
    if (maxLeap > 12) tags.add('leap:over-octave'); else if (maxLeap > 2) tags.add('leap:' + INTERVAL_NAME[maxLeap]);
    if (f.rangeSemitones > 12) tags.add('range:over-octave'); else if (f.rangeSemitones > 9) tags.add('range:octave'); else if (f.rangeSemitones > 5) tags.add('range:6th');

    // Rhythm
    const durSet = new Map();
    let syncopations = 0, smallest = Infinity;
    for (const x of notes) {
      const key = fraction(x.durBeats);
      durSet.set(key, (durSet.get(key) || 0) + 1);
      if (x.durBeats < smallest) smallest = x.durBeats;
      const frac = x.onsetBeats - Math.floor(x.onsetBeats + EPS);
      const offBeat = frac > EPS && frac < 1 - EPS;
      const crossesBeat = offBeat && x.onsetBeats + x.durBeats > Math.ceil(x.onsetBeats - EPS) + EPS;
      if (crossesBeat) syncopations++;
    }
    f.durations = [...durSet.keys()].sort((a, b) => parseFraction(a) - parseFraction(b));
    for (const d of f.durations) tags.add('dur:' + d);
    f.smallestBeatFraction = smallest;
    f.syncopations = syncopations; f.syncopationFraction = syncopations / n;
    if (syncopations) tags.add(f.syncopationFraction > 0.1 ? 'syncopation:sustained' : 'syncopation');
    if (tieCount) tags.add(tieOverBar ? 'tie-over-bar' : 'tie');
    if (tripletCount) tags.add(f.metreCompound ? 'triplet-in-compound' : 'triplet');
    if (otherTuplets) tags.add('tuplet');
    if (f.pickup) tags.add('pickup');
    if (repeats) tags.add('repeat');
    if (endings) tags.add('endings');
    if (graceNotes) tags.add('grace-notes');
    if (multiStops) tags.add('double-stops');
    if (f.chromaticClasses) tags.add('accidentals');
    f.rhythmRung = rhythmRung(f, durSet, tags);

    // Length and repetition. A bar heard before costs a quarter of a new one.
    const distinct = new Set(bars.filter(Boolean)); f.distinctBars = distinct.size;
    f.repetition = bars.length ? 1 - distinct.size / bars.length : 0;
    f.effectiveBars = distinct.size + 0.25 * (bars.length - distinct.size);
    f.totalBeats = notes.reduce((s, x) => s + x.durBeats, 0) + restBeats;
    f.notesPerBeat = f.totalBeats ? n / f.totalBeats : 0;
    f.restFraction = f.totalBeats ? restBeats / f.totalBeats : 0;

    // Metre and key tags
    tags.add(`metre:${f.metreNum}/${f.metreDen}`);
    if (metreChanges) tags.add('metre-change');
    if (keyChanges) tags.add('key-change');
    tags.add('key:' + f.keyAccidentals);

    f.skills = [...tags].sort();
    return f;
  }

  // Rhythm rung from what the tune asks of the beat. Beats and half beats
  // (ta and ti-ti) are where every method starts; compound metres divide the
  // beat in three, which is a step of its own, as are rests.
  function rhythmRung(f, durSet, tags) {
    let rung = 1;
    for (const key of durSet.keys()) {
      const d = parseFraction(key);
      const whole = Math.abs(d - Math.round(d)) < 1e-4;
      if (whole) continue;
      if (!f.metreCompound && Math.abs(d - 0.5) < 1e-4) continue;                                        // ti-ti
      if (f.metreCompound && (Math.abs(d - 1 / 3) < 1e-4 || Math.abs(d - 2 / 3) < 1e-4)) { rung = Math.max(rung, 2); continue; }
      // Dotted figures that sit inside the beat pair (1.5 + 0.5, 0.75 + 0.25 in simple; 2/3 + 1/3 in compound).
      if (Math.abs(d - 1.5) < 1e-4 || Math.abs(d - 2.5) < 1e-4 || Math.abs(d - 3.5) < 1e-4) { rung = Math.max(rung, 3); continue; }
      if (Math.abs(d - 0.75) < 1e-4 || Math.abs(d - 0.25) < 1e-4) { rung = Math.max(rung, 4); continue; }
      if (f.metreCompound && (Math.abs(d - 1 / 6) < 1e-4 || Math.abs(d - 0.5) < 1e-4)) { rung = Math.max(rung, 4); continue; }
      if (!f.metreCompound && Math.abs(d - 1 / 3) < 1e-4) { rung = Math.max(rung, 4); continue; }   // triplets
      if (d < 0.25 - 1e-4) { rung = Math.max(rung, 6); continue; }
      rung = Math.max(rung, 5);   // 1.25, 1.75, 2/3 of a beat in simple time and other odd lengths
    }
    if (tags.has('rest')) rung = Math.max(rung, 2);
    if (f.tieCount) rung = Math.max(rung, 3);
    if (tags.has('rest-off-beat')) rung = Math.max(rung, 3);
    if (f.syncopations) rung = Math.max(rung, f.syncopationFraction > 0.1 ? 5 : 4);
    if (f.tripletCount && !f.metreCompound) rung = Math.max(rung, 4);
    if (f.otherTuplets) rung = 6;
    return rung;
  }

  /* ---------- grading ---------- */
  // options.ignore: dimensions left out of the level (the page's Transpose makes
  // 'key' moot, and 'range' matters less on a piano than on a recorder).
  function grade(f, options) {
    const ignore = new Set((options && options.ignore) || []);
    const rungs = {}, reasons = {};
    for (const [dim, spec] of Object.entries(LATTICE)) {
      const i = spec.rungs.findIndex(r => r.test(f));
      rungs[dim] = i + 1; reasons[dim] = spec.rungs[i].name;
    }
    const counted = Object.keys(rungs).filter(d => !ignore.has(d));
    const level = Math.max(1, ...counted.map(d => rungs[d]));
    let score = 0;
    for (const d of counted) score += WEIGHTS[d] * (rungs[d] - 1);
    score += 0.5 * f.notesPerBeat + 0.02 * f.effectiveBars;
    return { level, rungs, reasons, score: Math.round(score * 100) / 100, ignored: [...ignore] };
  }

  /* ---------- Ontario alignment ----------
     The grade in which The Ontario Curriculum, Grades 1-8: The Arts (2009) first names a duration or pitch concept
     the tune uses (course/ontario.md). The grade is a floor: a concept named in grade 3 is taught from then on.
     Each row carries the element it reads, so a dimension ignored in the level (key, when the page transposes)
     can be left out of the grade too. */
  const ONTARIO = [
    ['rhythm', 1, 'quarter and eighth notes, quarter rests, 2/4 and 4/4', () => true],
    ['rhythm', 2, 'half and whole notes', f => !f.metreCompound && f.durations.some(d => [2, 4].includes(parseFraction(d)))],
    ['rhythm', 3, '3/4 metre', f => f.metreNum === 3 && f.metreDen === 4],
    ['rhythm', 3, 'dotted half note', f => !f.metreCompound && f.durations.some(d => parseFraction(d) === 3)],
    ['rhythm', 3, 'sixteenth-note patterns', f => !f.metreCompound && f.smallestBeatFraction <= 0.25 + 1e-4 && f.smallestBeatFraction > 0.2],
    ['rhythm', 4, 'syncopation (syn-co-pa)', f => f.syncopations > 0],
    ['rhythm', 5, 'dotted quarter and eighth (tam-ti), dotted eighth and sixteenth (tim-ka)', f => !f.metreCompound && f.durations.some(d => [1.5, 0.75, 2.5, 3.5].includes(parseFraction(d)))],
    ['rhythm', 5, 'syncopated sixteenths (tika-ti, ti-tika)', f => f.syncopations > 0 && f.smallestBeatFraction <= 0.25 + 1e-4],
    ['rhythm', 5, '6/8 metre (one-and-a two-and-a)', f => f.metreCompound && [6, 12].includes(f.metreNum)],
    ['rhythm', 6, '9/8, 6/4, 5/4 and other compound or irregular metres', f => (f.metreCompound && ![6, 12].includes(f.metreNum)) || (!f.metreCompound && ![2, 3, 4].includes(f.metreNum))],
    ['rhythm', 6, 'triplets', f => (f.tripletCount > 0 && !f.metreCompound) || f.otherTuplets > 0],
    ['rhythm', 6, 'pick-up notes (anacrusis)', f => f.pickup],
    ['rhythm', 7, 'rhythms as met in repertoire: notes shorter than a sixteenth', f => f.smallestBeatFraction < (f.metreCompound ? 1 / 6 : 1 / 4) - 1e-4],
    ['rhythm', 4, 'the fermata', f => f.decorations.includes('fermata')],
    // dynamics and other expressive controls, from the marks in the ABC
    ['dynamics', 1, 'accent; smooth and detached articulation', f => f.decorations.some(d => ['accent', 'staccato', 'tenuto', 'emphasis'].includes(d))],
    ['dynamics', 2, 'crescendo and decrescendo', f => f.decorations.some(d => /^(crescendo|diminuendo)\(/.test(d))],
    ['dynamics', 3, 'the signs for soft and loud (p, f)', f => f.decorations.some(d => ['p', 'f', 'mp', 'mf'].includes(d))],
    ['dynamics', 4, 'sforzando; phrase markings', f => f.decorations.some(d => /^s(f|fz|ffz)$/.test(d))],
    ['dynamics', 6, 'very soft and very loud (pp, ff); slurs', f => f.slurs > 0 || f.decorations.some(d => /^(pp+|ff+)$/.test(d))],
    ['dynamics', 7, 'marcato', f => f.decorations.includes('marcato')],
    // texture and harmony: parts and the chord symbols over the tune
    ['texture', 3, 'two parts (rounds, partner songs, canons)', f => f.voices >= 2],
    ['texture', 5, 'chord progressions using I and V', f => f.chordDegrees.length > 0 && f.chordDegrees.every(d => d === 'I' || d === 'V')],
    ['texture', 6, 'chord progressions using I, IV and V', f => f.chordDegrees.includes('IV') && f.chordDegrees.every(d => d !== 'other')],
    ['texture', 7, 'major and minor triads beyond I, IV and V', f => f.chordDegrees.includes('other')],
    // form, from the repeat signs
    ['form', 4, 'simple repeats', f => f.repeats > 0 && !f.endings],
    ['form', 6, 'first and second endings', f => f.endings > 0],
    // pitch: degrees are read la-based in minor, so a minor tune's low la is the curriculum's low "la"
    ['pitch', 1, 'melodic patterns on mi, so and la', f => f.degrees.length > 0 && f.degrees.every(d => ['mi', 'so', 'la'].includes(d))],
    ['pitch', 2, 'pentatonic patterns (do re mi so la), high do', f => f.pentatonicOnly && !f.degrees.every(d => ['mi', 'so', 'la'].includes(d))],
    ['pitch', 3, 'low so and low la (notes under do)', f => f.pentatonicOnly && f.belowDo > 0],
    ['pitch', 4, 'the major scale (fa and ti), intervals, accidentals', f => f.degrees.length > 0 && !f.pentatonicOnly],
    ['pitch', 4, 'minor tonality', f => /^(m|min|minor|aeo|aeolian)$/.test(f.keyMode)],
    // ledger lines (grade 6) are not read: they depend on the octave the tune was typed in, not on the tune
    ['pitch', 7, 'the blues scale (flat three and flat five in a major key)', f => !f.keyMode && f.degrees.includes('ri') && f.degrees.includes('fi')],
    // key signatures, the dimension the page's Transpose makes moot
    ['key', 4, 'key signatures of up to one sharp or flat', f => f.keyAccidentals === 1],
    ['key', 5, 'key signatures such as D major and G minor (two sharps or flats)', f => f.keyAccidentals === 2],
    ['key', 7, 'keys encountered in the repertoire (three or more sharps or flats)', f => f.keyAccidentals >= 3],
  ];
  function ontario(f, options) {
    const ignore = new Set((options && options.ignore) || []);
    const hit = ONTARIO.filter(([dim, , , test]) => !ignore.has(dim) && test(f)), grade = Math.max(...hit.map(h => h[1]));
    return { grade, band: `Grade ${grade}`, concepts: hit.filter(h => h[1] === grade).map(h => h[2]), all: hit.map(h => `${h[1]}: ${h[2]}`), ignored: [...ignore].filter(d => ONTARIO.some(r => r[0] === d)) };
  }

  /* ---------- sequencing ----------
     Greedy: start from the lowest-scoring tune, then always take the tune
     that brings the fewest skills not yet seen (ties broken by level, then
     score). Returns the tunes in order, each with its new skills. */
  function sequence(reports) {
    const items = reports.map(r => ({ r, tags: new Set((r.features.skills || []).filter(t => !t.startsWith('key:'))) }));
    const seen = new Set(); const out = [];
    const remaining = new Set(items.map((_, i) => i));
    while (remaining.size) {
      let best = -1, bestNew = Infinity, bestKey = Infinity;
      for (const i of remaining) {
        const it = items[i];
        let fresh = 0; for (const t of it.tags) if (!seen.has(t)) fresh++;
        const key = it.r.grade.level * 1000 + it.r.grade.score;
        if (fresh < bestNew || (fresh === bestNew && key < bestKey)) { best = i; bestNew = fresh; bestKey = key; }
      }
      const it = items[best]; remaining.delete(best);
      const introduces = [...it.tags].filter(t => !seen.has(t)).sort();
      for (const t of it.tags) seen.add(t);
      out.push(Object.assign({}, it.r, { introduces }));
    }
    return out;
  }

  /* ---------- convenience ---------- */
  function splitTunes(text) {
    // Each X: field starts a tune; text before the first X: is a file header.
    const parts = text.replace(/\r\n?/g, '\n').split(/\n(?=X:)/);
    const out = [];
    for (const p of parts) if (/^X:/m.test(p)) out.push(p.trim() + '\n');
    return out;
  }
  function analyzeAbc(text, ABCJS, extra, gradeOptions) {
    const out = [];
    const chunks = splitTunes(text);
    for (let i = 0; i < chunks.length; i++) {
      const abc = chunks[i];
      let tune;
      // The page's own directive lines (%%band, %%tuning, %%style, %%round) are not abcjs's: hide them before parsing, as the page does.
      const plain = abc.replace(/^%%?(band|tuning|style|round)\b/mg, m => '%' + ' '.repeat(m.length - 1));
      try { tune = ABCJS.parseOnly(plain)[0]; } catch (err) { out.push({ abc, error: String(err && err.message || err), features: null, grade: null }); continue; }
      if (!tune || !tune.lines) { out.push({ abc, error: 'no tune', features: null, grade: null }); continue; }
      const features = analyzeTune(tune, Object.assign({ index: i }, extra || {}));
      // A %%round line: the one melody sung by 2 to 4 groups, so the class holds that many parts (rounds are grade 3 texture).
      const round = /^%%?round\b(.*)$/m.exec(abc);
      if (round) { const n = parseInt((/(?:^|\s)(?:parts=)?(\d)\b/.exec(round[1]) || [])[1], 10); features.voices = Math.max(features.voices, n >= 2 && n <= 4 ? n : 2); features.round = true; }
      out.push({ abc, features, grade: features.noteCount ? grade(features, gradeOptions) : null, ontario: features.noteCount ? ontario(features, gradeOptions) : null });
    }
    return out;
  }

  return { LATTICE, WEIGHTS, SOLFA, analyzeTune, analyzeAbc, grade, ontario, ONTARIO, sequence, splitTunes, fraction };
});
