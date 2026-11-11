#!/usr/bin/env node
/*
  Grand Central Stationery: one idea from each element of music, heard in the piece itself.

  For every published tune and every element of music the Ontario curriculum names (duration, pitch, dynamics and
  other expressive controls, timbre, texture/harmony, form: the same six in every grade's Fundamental Concepts box,
  with tempo inside duration), one concept the tune shows: the curriculum's words for it, plain words for children,
  the bars that show it, and why. An element the music does not show (no dynamics written, no instrument named) is
  marked absent rather than guessed.

  How the bars are found. Each concept has a test that is run on the bars themselves: the bars are written out as a
  tune of their own (practice.js phraseAbc, as the piece view plays them) and analysed afresh (analyze.js). The
  example is a span that passes the test while no shorter span inside it does, so it holds just the bars that show the
  idea, and two bars only when the idea crosses the barline (Twinkle's leap of a 5th is bar 1; Rain, Rain's leap of a
  4th, from the end of bar 3 to the start of bar 4, is bars 3-4). Among such spans the clearest wins (the longest
  notes around a leap, the textbook syn-co-pa cell), then the earliest. Form is read from the tune's sections and
  phrases instead, and a few ideas belong to the whole piece (a metre, a drone): those name the bar where the idea
  is most exposed and say it is heard throughout.

  Which concept, when a tune shows several: what the tune brings into the course (its "introduces" tags), else the
  first the tune shows in each element's list below, which runs from the most particular idea to the most general.
  A small table of choices (CHOICES) records where a person's ear chose otherwise, with the reason; the tests still
  run on those bars.

  Bars are counted as the piece view counts them: every written bar from 1, a pickup bar included.

    node course/concepts.js                 writes course/concepts.json and course/concepts.md
    node course/concepts.js --check         fails if either is stale, or any example no longer shows its idea

  Works in Node. buildConcepts(set, ABCJS) and verify() are exported for the tests.
*/
'use strict';

const fs = require('fs');
const path = require('path');
const A = require('./analyze.js');
const P = require('./practice.js');

const ELEMENTS = [
  { id: 'duration', name: 'duration', words: 'long and short sounds: beat, rhythm, metre and tempo' },
  { id: 'pitch', name: 'pitch', words: 'high and low sounds: the notes, the steps and leaps between them, the scale' },
  { id: 'dynamics', name: 'dynamics and other expressive controls', words: 'loud and soft, smooth and detached, and the marks that ask for them' },
  { id: 'timbre', name: 'timbre', words: 'tone colour: what makes one instrument or voice sound different from another' },
  { id: 'texture', name: 'texture/harmony', words: 'how many sounds at once: a tune alone, a tune with chords, parts together' },
  { id: 'form', name: 'form', words: 'how the music is built: phrases, sections, and what repeats or returns' },
];

/* ---------------- words ---------------- */
const SOLFA = A.SOLFA;
const INTERVAL = ['unison', 'minor 2nd', 'major 2nd', 'minor 3rd', 'major 3rd', 'perfect 4th', 'tritone', 'perfect 5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th', 'octave'];
const intervalName = s => s <= 12 ? INTERVAL[s] : s === 24 ? 'two octaves' : `an octave and a ${INTERVAL[s - 12]}`;
const article = w => /^(a |an |two )/.test(w) ? w : (/^[aeiou]/.test(w) || /^(8|11|18)/.test(w) ? 'an ' : 'a ') + w;
const near = (a, b) => Math.abs(a - b) < 1e-6;
const ROMAN = { 1: 'I', 4: 'IV', 5: 'V' };

/* ---------------- a tune, read once ---------------- */
function readTune(t, ABCJS) {
  const found = P.phrasesOf(t.abc, ABCJS);
  const whole = A.analyzeAbc(t.abc, ABCJS)[0];
  const bars = found.bars;
  // The first verse's syllables, bar by bar, for the reasons ("on 'Twin-kle, twin-kle'").
  const sylls = bars.map(b => b.notes.map(n => (n.lyric && n.lyric[0]) || null));
  const style = (/^%%style\s+(\S+)/m.exec(t.abc) || [])[1] || null;
  // Words are quoted only when the verse fits the notes: every syllable written is placed, and a note left without one
  // is only ever a held note (_). Otherwise the words drift from the notes, and quoting them would mislead.
  const verse = [...t.abc.matchAll(/^w:(.*)$/mg)].map(m => m[1]).join(' ') || null;   // a verse may run over several w: lines
  const written = verse ? verse.trim().split(/[\s-]+/).filter(x => x && !/^[_*]+$/.test(x)).length : 0;
  const placed = sylls.flat().filter(l => l && l.syllable).length;
  const holds = verse ? (verse.match(/_/g) || []).length : 0;
  const unsung = sylls.flat().filter(l => !l || !l.syllable).length;
  const lyricsFit = !!verse && placed === written && unsung <= holds;
  const cache = new Map();
  const win = (from, to) => {
    const k = from + '-' + to;
    if (!cache.has(k)) {
      let r = null;
      try { r = A.analyzeAbc(P.phraseAbc(t.abc, ABCJS, { from, to }, found), ABCJS)[0]; } catch (e) { r = null; }
      const f = r && r.features && r.features.noteCount ? r.features : null;
      cache.set(k, { from, to, f, notes: f ? f.notes : [], rests: f ? f.rests : [] });
    }
    return cache.get(k);
  };
  const f = whole.features;
  const dos = f.notes.filter(n => n.rel === 0).map(n => n.midi);
  return { t, ABCJS, found, bars, sylls, style, win, f, N: bars.length, lowDo: dos.length ? Math.min(...dos) : null, lyricsFit };
}
// The words sung in bars from..to-1, with their hyphens: "Twin-kle, twin-kle".
// A word cut by the span's edge is marked with an ellipsis: "…ty eyes".
function wordsIn(T, from, to) {
  if (!T.lyricsFit) return '';
  const sung = i => (T.sylls[i] || []).filter(l => l && l.syllable);
  let s = '', before = null;
  for (let i = from - 1; i >= 0 && !before; i--) { const x = sung(i); if (x.length) before = x[x.length - 1]; }
  if (before && before.divider === '-') s = '…';
  let last = null;
  for (let i = from; i < to; i++) for (const l of sung(i)) { s += l.syllable + (l.divider === '-' ? '-' : ' '); last = l; }
  if (!last) return '';
  return s.replace(/-$/, '…').trim();
}
const onWords = (T, from, to) => { const w = wordsIn(T, from, to); return w ? ` (on “${w.replace(/[,.;:!?]+(…?)$/, '$1')}”)` : ''; };
const barsWord = (from, to) => to - from === 1 ? `bar ${from + 1}` : `bars ${from + 1}–${to}`;
// A note's name in sol-fa, with low or high when it lies outside the octave from the tune's lowest do.
function solfa(T, n) {
  if (n.rel === null || n.rel === undefined) return 'a note';
  const name = SOLFA[n.rel];
  if (T.lowDo === null) return name;
  if (n.midi < T.lowDo) return 'low ' + name;
  if (n.midi >= T.lowDo + 12) return 'high ' + name;
  return name;
}

/* ---------------- the concepts ----------------
   Each: the element, the grade whose Fundamental Concepts box first names it, the curriculum's words, plain words,
   the tag(s) of the tune's "introduces" it answers, a test on a span (w: { f, notes, rests } of the bars analysed on
   their own), the longest span worth trying, a score (higher is clearer), and the reason in words. */
const simple = T => !T.f.metreCompound;
const writtenIs = (n, v) => near(n.written, v);
const CONCEPTS = [
  /* duration */
  { id: 'metre-change', el: 'duration', name: 'three beats, then two', grade: 3, term: 'two and four beats per bar (2/4 metre); three beats per bar (3/4 metre)',
    words: 'the bars change length: three beats, then two', intro: ['metre-change'],
    tune: T => T.f.metreChanges > 0, shows: w => w.f.metreChanges > 0, span: 2,
    reason: (T, w) => `The metre changes at the barline between ${barsWord(w.from, w.to)}: three beats in a bar, then two${onWords(T, w.from, w.to)}.` },
  { id: 'triplet', el: 'duration', name: 'triplets', grade: 6, term: 'triplets', words: 'three notes in the time of two (trip-o-let)', intro: ['triplet', 'triplet-in-compound'],
    tune: T => T.f.tripletCount > 0, shows: w => w.f.tripletCount > 0, span: 2,
    score: (T, w) => w.f.tripletCount,
    reason: (T, w) => `${w.f.tripletCount === 1 ? 'A triplet' : `${w.f.tripletCount} triplets`}: three quick notes squeezed into the time of two${onWords(T, w.from, w.to)}.` },
  { id: 'syncopation', el: 'duration', name: 'syn-co-pa', grade: 4, term: 'syncopation (“ti-ta-ti” or “syn-co-pa”)', words: 'a longer note that starts between the beats (syn-co-pa)', intro: ['syncopation', 'syncopation:sustained'],
    tune: T => T.f.syncopations > 0, shows: w => w.f.syncopations > 0, span: 2,
    score: (T, w) => (synCoPa(w.notes) ? 2 : 0) + Math.min(1, w.f.syncopations / 4),
    reason: (T, w) => synCoPa(w.notes) ? `Short-long-short, syn-co-pa: the long note starts off the beat and holds across it${onWords(T, w.from, w.to)}.` : `A note starts between two beats and holds across the next one, so the accent falls off the beat${onWords(T, w.from, w.to)}.` },
  { id: 'tim-ka', el: 'duration', name: 'tim-ka', grade: 5, term: 'dotted eighth note and sixteenth note (“tim-ka”)', words: 'a long-short pair inside one beat (tim-ka)',
    tune: T => simple(T), shows: w => pairs(w.notes, 3 / 16, 1 / 16), span: 1,
    reason: (T, w) => `A dotted eighth and a sixteenth: long-short, tim-ka${onWords(T, w.from, w.to)}.` },
  { id: 'tam-ti', el: 'duration', name: 'tam-ti', grade: 5, term: 'dotted quarter note followed by an eighth note (“tam-ti”)', words: 'a long note and a short one, together two beats (tam-ti)',
    tune: T => simple(T), shows: w => pairs(w.notes, 3 / 8, 1 / 8), span: 2,
    reason: (T, w) => `A dotted quarter note and an eighth note: tam-ti, long then short${onWords(T, w.from, w.to)}.` },
  { id: 'sixteenths', el: 'duration', name: 'tika-tika', grade: 3, term: 'sixteenth-note patterns', words: 'four quick sounds on one beat (tika-tika)', intro: ['dur:1/4'],
    tune: T => simple(T), shows: w => w.notes.some(n => writtenIs(n, 1 / 16)), span: 1,
    score: (T, w) => w.notes.filter(n => writtenIs(n, 1 / 16)).length,
    reason: (T, w) => `Sixteenth notes, four to a beat: tika-tika${onWords(T, w.from, w.to)}.` },
  { id: 'metre-5', el: 'duration', name: 'five beats in a bar', grade: 6, term: '5/4 metre (here written 5/8)', words: 'five beats in every bar, felt as three and two', intro: ['metre:5/8', 'metre:5/4'],
    tune: T => T.f.metreNum === 5, whole: true, shows: (w, T) => !T.bars[w.from].short, span: 1,
    reason: (T, w) => `Every bar has five beats, grouped long and short (3 + 2 or 2 + 3); ${barsWord(w.from, w.to)} is the first full bar${onWords(T, w.from, w.to)}.` },
  { id: 'dotted-half', el: 'duration', name: 'a three-beat note', grade: 3, term: 'dotted half note', words: 'one sound held for three beats (ta-ah-ah)', intro: ['dur:3'],
    tune: T => simple(T), shows: w => w.notes.some(n => writtenIs(n, 3 / 4)), span: 1,
    reason: (T, w) => `A dotted half note: one sound held for three beats${onWords(T, w.from, w.to)}.` },
  { id: 'pickup', el: 'duration', name: 'the pickup', grade: 6, term: 'pick-up note(s) (anacrusis)', words: 'the tune starts just before the first strong beat', intro: ['pickup'],
    tune: T => T.N > 1 && T.bars[0].short, structural: true, at: T => ({ from: 0, to: 2 }),
    reason: (T, w) => `The first bar is only ${pickupWords(T)} long: the tune starts on an upbeat and lands on the strong first beat of bar 2${onWords(T, 0, 2)}.` },
  { id: 'whole', el: 'duration', name: 'a four-beat note', grade: 2, term: 'whole note (“ta-ah-ah-ah”)', words: 'one sound held for four beats', intro: ['dur:4'],
    tune: T => simple(T), shows: w => w.notes.some(n => writtenIs(n, 1)), span: 1,
    reason: (T, w) => `A whole note: one sound held for four beats${onWords(T, w.from, w.to)}.` },
  { id: 'half', el: 'duration', name: 'a two-beat note', grade: 2, term: 'half note (“ta-ah”)', words: 'one sound held for two beats', intro: ['dur:2'],
    tune: T => simple(T) && T.f.metreDen === 4, shows: w => w.notes.some(n => writtenIs(n, 1 / 2)), span: 1,
    score: (T, w) => w.notes.some(n => writtenIs(n, 1 / 4)) ? 1 : 0,
    reason: (T, w) => `A half note: one sound held for two beats, after notes of one beat${onWords(T, w.from, w.to)}.` },
  { id: 'metre-3', el: 'duration', name: 'three beats in a bar', grade: 3, term: 'three beats per bar (3/4 metre)', words: 'three beats in every bar: strong, weak, weak', intro: ['metre:3/4'],
    tune: T => T.f.metreNum === 3 && T.f.metreDen === 4, whole: true, shows: (w, T) => !T.bars[w.from].short, span: 1,
    reason: (T, w) => `Three beats in every bar, strong-weak-weak; ${barsWord(w.from, w.to)} is the first full bar${onWords(T, w.from, w.to)}.` },
  { id: 'rest', el: 'duration', name: 'a beat of silence', grade: 1, term: 'quarter rest', words: 'a beat of silence', intro: ['rest'],
    tune: T => simple(T), shows: w => w.rests.some(r => writtenIs(r, 1 / 4)), span: 1,
    reason: (T, w) => `A quarter rest: a beat of silence inside the tune${onWords(T, w.from, w.to)}.` },
  { id: 'ti-ti', el: 'duration', name: 'ti-ti and ta', grade: 1, term: 'rhythm versus beat; quarter note (“ta”), eighth notes (“ti-ti”)', words: 'two sounds on one beat (ti-ti) against one sound on a beat (ta)', intro: ['dur:1/2'],
    tune: T => simple(T) && T.f.metreDen === 4, shows: w => w.notes.filter(n => writtenIs(n, 1 / 8)).length >= 2, span: 1,
    score: (T, w) => (w.notes.some(n => writtenIs(n, 1 / 4)) ? 1 : 0),
    reason: (T, w) => `${w.notes.some(n => writtenIs(n, 1 / 4)) ? 'Ti-ti beside ta' : 'Ti-ti on every beat'}: the rhythm moves twice as fast as the beat${onWords(T, w.from, w.to)}.` },

  /* pitch */
  { id: 'accidental', el: 'pitch', name: 'a note outside the key', grade: 4, term: 'accidentals (sharp, flat, natural)', words: 'a note bent a half step away from the scale', intro: ['accidentals'],
    tune: T => T.f.chromaticClasses > 0, shows: w => w.f.chromaticClasses > 0, span: 1,
    score: (T, w) => w.f.chromaticClasses,
    reason: (T, w) => `${accidentalWords(T, w)}${onWords(T, w.from, w.to)}.` },
  { id: 'pentatonic', el: 'pitch', name: 'the pentatonic scale', grade: 2, term: 'melodic patterns using notes of a pentatonic scale (e.g., “do–re–mi–so–la”)', words: 'all five notes of the pentatonic scale: do, re, mi, so, la',
    tune: T => T.f.pentatonicOnly && T.f.degreeCount === 5, shows: w => new Set(w.notes.map(n => n.rel)).size === 5, span: 4,
    reason: (T, w) => `All five notes of the pentatonic scale, do re mi so la, and no others${onWords(T, w.from, w.to)}.` },
  { id: 'leap', el: 'pitch', name: (T, w) => `a leap of ${article(intervalName(T.f.maxLeap))}`, grade: 4, term: 'intervals (unison, step, skip, leap)', words: 'a leap: the tune jumps over the notes between',
    intro: ['leap:5th', 'leap:6th', 'leap:7th', 'leap:octave', 'leap:over-octave'],
    tune: T => T.f.maxLeap >= 7, target: T => T.f.maxLeap, shows: (w, T) => leapOf(w.notes, T.f.maxLeap) !== null, span: 2,
    score: (T, w) => { const p = leapOf(w.notes, T.f.maxLeap); return Math.min(p[0].durBeats, p[1].durBeats); },
    reason: (T, w) => `The widest leap in the tune, ${leapWords(T, leapOf(w.notes, T.f.maxLeap))}${onWords(T, w.from, w.to)}.` },
  { id: 'low-so-la', el: 'pitch', name: (T, w) => [...new Set(w.notes.filter(n => n.midi < T.lowDo && [7, 9].includes(n.rel)).map(n => SOLFA[n.rel]))].sort().reverse().map((x, i) => i ? x : 'low ' + x).join(' and '), grade: 3, term: 'low “so”, low “la”', words: 'the notes below do, where the tune goes lowest',
    tune: T => T.lowDo !== null && T.f.notes.some(n => n.midi < T.lowDo && [7, 9].includes(n.rel)), shows: (w, T) => w.notes.some(n => n.midi < T.lowDo && [7, 9].includes(n.rel)) && w.notes.some(n => n.rel === 0), span: 2,
    score: (T, w) => -Math.min(...w.notes.map(n => n.midi)),
    reason: (T, w) => { const low = w.notes.filter(n => n.midi < T.lowDo && [7, 9].includes(n.rel)); const names = [...new Set(low.map(n => solfa(T, n)))]; return `The tune dips below do to ${names.join(' and ')}${onWords(T, w.from, w.to)}.`; } },
  { id: 'high-do', el: 'pitch', name: 'high do', grade: 2, term: 'high “do”', words: 'do again, eight notes higher',
    tune: T => T.lowDo !== null && T.f.notes.some(n => n.rel === 0 && n.midi >= T.lowDo + 12), shows: (w, T) => w.notes.some(n => n.rel === 0 && n.midi >= T.lowDo + 12), span: 1,
    reason: (T, w) => `The tune reaches high do, an octave above the do it starts from${onWords(T, w.from, w.to)}.` },
  { id: 'fa', el: 'pitch', name: 'fa', grade: 4, term: 'major scale (written with notes or numbers)', words: 'fa: the note between mi and so that the pentatonic scale leaves out', intro: ['degree:fa'],
    introOnly: true, tune: T => T.f.degrees.includes('fa'), shows: w => w.notes.some(n => n.rel === 5), span: 1,
    score: (T, w) => Math.max(...w.notes.filter(n => n.rel === 5).map(n => n.durBeats)),
    reason: (T, w) => `Fa, the fourth note of the major scale, between mi and so${onWords(T, w.from, w.to)}.` },
  { id: 'scale', el: 'pitch', name: 'a scale', grade: 4, term: 'major scale (written with notes or numbers)', words: 'the notes of the scale in a row, step by step',
    tune: T => run(T.f.notes) >= 5, shows: w => run(w.notes) >= 5, span: 2,
    score: (T, w) => run(w.notes),
    reason: (T, w) => `${run(w.notes)} notes in a row, each a step from the last, up or down the scale${onWords(T, w.from, w.to)}.` },
  { id: 'mi-so-la', el: 'pitch', name: (T, w) => [...new Set(w.notes.map(n => SOLFA[n.rel]))].join('–'), grade: 1, term: 'simple melodic patterns using the notes “mi”, “so”, and “la”', words: 'a pattern on so, mi and la', intro: ['degree:la', 'degree:mi', 'degree:so'],
    tune: T => T.f.degrees.every(d => ['mi', 'so', 'la'].includes(d)),
    shows: (w, T) => { const d = new Set(w.notes.map(n => n.rel)); return d.has(4) && d.has(7) && (!T.f.degrees.includes('la') || d.has(9)); }, span: 2,
    reason: (T, w) => `${[...new Set(w.notes.map(n => SOLFA[n.rel]))].join('–')}: the children's-song pattern${onWords(T, w.from, w.to)}.` },
  { id: 'leap-small', el: 'pitch', name: (T, w) => `a leap of ${article(intervalName(T.f.maxLeap))}`, grade: 4, term: 'intervals (unison, step, skip, leap)', words: 'a leap: the tune jumps over the notes between',
    intro: ['leap:4th', 'leap:tritone'],
    tune: T => T.f.maxLeap >= 5 && T.f.maxLeap < 7, target: T => T.f.maxLeap, shows: (w, T) => leapOf(w.notes, T.f.maxLeap) !== null, span: 2,
    score: (T, w) => { const p = leapOf(w.notes, T.f.maxLeap); return Math.min(p[0].durBeats, p[1].durBeats); },
    reason: (T, w) => `The widest leap in the tune, ${leapWords(T, leapOf(w.notes, T.f.maxLeap))}${onWords(T, w.from, w.to)}.` },
  { id: 'skips', el: 'pitch', name: 'skips', grade: 4, term: 'intervals (unison, step, skip, leap)', words: 'skips: the tune climbs or falls a note at a time, missing one between (do, mi, so)',
    tune: T => skipRun(T.f.notes).length >= 3, shows: w => skipRun(w.notes).length >= 3, span: 2,
    reason: (T, w) => `${skipRun(w.notes).map(n => solfa(T, n)).join(', ')}: each note a skip from the last, missing the note between${onWords(T, w.from, w.to)}.` },
  { id: 'steps', el: 'pitch', name: 'steps', grade: 2, term: 'melodic patterns', words: 'notes moving by step, like walking down stairs (mi–re–do)',
    tune: T => run(T.f.notes) >= 3, shows: w => run(w.notes) >= 3, span: 1,
    reason: (T, w) => { const r = runNotes(w.notes); return `${r.map(n => SOLFA[n.rel]).join('–')}: each note a step from the last${onWords(T, w.from, w.to)}.`; } },
  { id: 'contour', el: 'pitch', name: 'up and down', grade: 1, term: 'high and low sounds; melodic contour', words: 'the shape of the tune: up and down',
    tune: () => true, shows: w => w.f.rangeSemitones > 0, span: 1, score: (T, w) => w.f.rangeSemitones,
    reason: (T, w) => `The tune's widest rise and fall inside one bar${onWords(T, w.from, w.to)}.` },

  /* dynamics and other expressive controls: only what is written */
  { id: 'accent', el: 'dynamics', name: 'accents', grade: 1, term: 'a strong sound for a note or beat (accent); smooth and detached articulation', words: 'some notes played stronger, or short and detached',
    tune: T => T.f.decorations.some(d => ['accent', 'staccato', 'tenuto', 'emphasis'].includes(d)), shows: w => w.f.decorations.some(d => ['accent', 'staccato', 'tenuto', 'emphasis'].includes(d)), span: 1,
    reason: (T, w) => `Marked accents or staccato${onWords(T, w.from, w.to)}.` },
  { id: 'hairpin', el: 'dynamics', name: 'louder and softer', grade: 2, term: 'getting louder [crescendo], getting softer [decrescendo/diminuendo]', words: 'getting louder or softer',
    tune: T => T.f.decorations.some(d => /^(crescendo|diminuendo)\(/.test(d)), shows: w => w.f.decorations.some(d => /^(crescendo|diminuendo)\(/.test(d)), span: 2,
    reason: (T, w) => `A hairpin asks for the music to grow or fade${onWords(T, w.from, w.to)}.` },
  { id: 'piano-forte', el: 'dynamics', name: 'soft and loud', grade: 3, term: 'standard symbols for soft (piano – p) and loud (forte – f)', words: 'soft and loud',
    tune: T => T.f.decorations.some(d => ['p', 'f', 'mp', 'mf', 'pp', 'ff'].includes(d)), shows: w => w.f.decorations.some(d => ['p', 'f', 'mp', 'mf', 'pp', 'ff'].includes(d)), span: 1,
    reason: (T, w) => `A written soft or loud sign${onWords(T, w.from, w.to)}.` },
  { id: 'slur', el: 'dynamics', name: 'a slur', grade: 6, term: 'slurs', words: 'notes joined smoothly under a curved line',
    tune: T => T.f.slurs > 0, shows: w => w.f.slurs > 0, span: 1,
    reason: (T, w) => `A slur joins ${w.f.slurs === 1 ? 'two notes' : 'notes'} smoothly, with no gap between them${onWords(T, w.from, w.to)}.` },
  { id: 'grace', el: 'dynamics', name: 'a grace note', grade: 7, term: 'articulation and expression marks encountered in the repertoire (here an ornament, the grace note)', words: 'a grace note: a quick extra note flicked in just before the main one', intro: ['grace-notes'],
    tune: T => T.f.graceNotes > 0, shows: w => w.f.graceNotes > 0, span: 1,
    reason: (T, w) => `A grace note decorates the note it leads into${onWords(T, w.from, w.to)}.` },

  /* timbre: only when the music names its sound */
  { id: 'drone-colour', el: 'timbre', name: 'tanpura and tabla', grade: 8, term: 'tone colours of world music ensembles and instruments (e.g., gamelan, shakuhachi, doumbek, sitar, djembe, ocarina)', words: 'the sound of a Hindustani drone (tanpura) and drum (tabla) under the tune',
    tune: T => T.style === 'drone', whole: true, shows: (w, T) => !T.bars[w.from].short || T.N === 1, span: 1,
    score: (T, w) => exposure(w), structuralScore: true,
    reason: (T, w) => `The tune's %%style drone line asks for a tanpura's drone and a tabla; they are heard throughout, most clearly in ${barsWord(w.from, w.to)}, where the melody ${w.rests.length ? 'rests' : 'holds a long note'}${onWords(T, w.from, w.to)}.` },

  /* texture and harmony: the chord symbols, a written drone, parts */
  { id: 'I-IV-V', el: 'texture', name: 'chords I, IV and V', grade: 6, term: 'chord progressions using I, IV, and V', words: 'three chords: I (home), IV and V (away), and back home',
    tune: T => T.f.chordDegrees.includes('IV') && T.f.chordDegrees.includes('V') && T.f.chordDegrees.includes('I'), shows: w => ['I', 'IV', 'V'].every(d => w.f.chordDegrees.includes(d)), span: 4,
    score: (T, w) => (lastChordDegree(T, w) === 'I' ? 1 : 0) - 0.1 * (w.to - w.from),
    reason: (T, w) => `${chordWords(T, w)}${onWords(T, w.from, w.to)}.` },
  { id: 'I-V', el: 'texture', name: 'chords I and V', grade: 5, term: 'chord progressions using I and V', words: 'two chords: I (home) and V (away, leading home)',
    tune: T => T.f.chordDegrees.includes('V') && T.f.chordDegrees.includes('I'), shows: w => ['I', 'V'].every(d => w.f.chordDegrees.includes(d)), span: 3,
    score: (T, w) => (lastChordDegree(T, w) === 'I' ? 1 : 0),
    reason: (T, w) => `${chordWords(T, w)}${onWords(T, w.from, w.to)}.` },
  { id: 'triads', el: 'texture', name: 'major and minor chords', grade: 7, term: 'major and minor triads', words: 'chords of three notes, some bright (major), some dark (minor)',
    tune: T => T.f.chordDegrees.length > 0, shows: w => w.f.chordDegrees.length > 0, span: 1,
    reason: (T, w) => `${chordWords(T, w)}${onWords(T, w.from, w.to)}.` },
  { id: 'bordun', el: 'texture', name: 'a bordun', grade: 2, term: 'bordun patterns on “do” and “so”', words: 'a bordun: the home note and the note a fifth above held under the tune',
    tune: T => T.style === 'drone', whole: true, shows: (w, T) => !T.bars[w.from].short || T.N === 1, span: 1,
    score: (T, w) => new Set(w.notes.map(n => n.midi)).size,
    reason: (T, w) => `The drone holds the home note and its fifth all through, the way a bordun does; in ${barsWord(w.from, w.to)} the melody moves through ${new Set(w.notes.map(n => n.midi)).size} different notes over it${onWords(T, w.from, w.to)}.` },
  { id: 'round', el: 'texture', name: 'a round', grade: 3, term: 'simple two-part rounds, partner songs, canons', words: 'the same tune sung by groups starting one after another',
    tune: T => !!T.f.round || /^%%round\b/m.test(T.t.abc), structural: true, at: T => firstPhrase(T),
    reason: () => 'The tune is sung as a round (its %%round line): a second group starts it again while the first carries on.' },

  /* form: from the sections and phrases */
  { id: 'aaba', el: 'form', name: 'A A B A', grade: 5, term: 'compositions in four or more sections (e.g., AABA)', words: 'A, A again, something new (B), then A comes back',
    tune: T => formOf(T).letters === 'AABA', structural: true, at: T => seam(T, formOf(T).phrases[3].from),
    reason: (T, w) => `Four phrases, A A B A: ${barsWord(w.from, w.to)} are where B ends and A comes back${onWords(T, w.from, w.to)}.` },
  { id: 'ternary', el: 'form', name: 'A B A', grade: 3, term: 'ternary (ABA) form', words: 'A, something new (B), then A comes back',
    tune: T => formOf(T).letters === 'ABA', structural: true, at: T => seam(T, formOf(T).phrases[2].from),
    reason: (T, w) => `Three parts, A B A: ${barsWord(w.from, w.to)} are where B ends and A comes back${onWords(T, w.from, w.to)}.` },
  { id: 'binary', el: 'form', name: 'A and B', grade: 2, term: 'binary (AB) form', words: 'two different parts, A then B',
    tune: T => formOf(T).b !== null, structural: true, at: T => seam(T, formOf(T).b),
    fits: (T, a, z) => formOf(T).b !== null && formOf(T).sections.concat(formOf(T).phrases).some(s => s.from > 0 && (q => q.from === a && q.to === z)(seam(T, s.from))),
    reason: (T, w) => `${binaryWords(T)}: ${barsWord(w.from, w.to)} are where A ends and B begins${higher(T) ? ', higher' : ''}${onWords(T, w.from, w.to)}.` },
  { id: 'phrase', el: 'form', name: 'a phrase', grade: 1, term: 'phrase', words: 'a phrase: a musical sentence that ends with a breath',
    tune: () => true, structural: true, at: T => firstPhrase(T),
    fits: (T, a, z) => (p => p.from === a && p.to === z)(firstPhrase(T)) || phrasesFor(T).some(p => p.from === a && p.to === z),
    reason: (T, w) => w.from === 0 && w.to === T.N ? `The whole ${T.lyricsFit ? 'song' : 'piece'} is one phrase${onWords(T, w.from, w.to)}.` : `The first phrase${phraseWhy(T, w)}${onWords(T, w.from, w.to)}.` },
];
const BY_ID = Object.fromEntries(CONCEPTS.map(c => [c.id, c]));

/* ---------------- tests on notes ---------------- */
// A note of written length a followed straight away by one of length b.
const pairs = (notes, a, b) => notes.some((n, i) => notes[i + 1] && writtenIs(n, a) && writtenIs(notes[i + 1], b) && near(n.endsAt, notes[i + 1].endsAt - notes[i + 1].written));
// The textbook syncopation: eighth, quarter, eighth, the quarter starting off the beat.
function synCoPa(notes) {
  for (let i = 1; i + 1 < notes.length; i++) {
    const [a, b, c] = [notes[i - 1], notes[i], notes[i + 1]];
    if (writtenIs(a, 1 / 8) && writtenIs(b, 1 / 4) && writtenIs(c, 1 / 8) && Math.abs(b.onsetBeats - Math.floor(b.onsetBeats) - 0.5) < 1e-6) return true;
  }
  return false;
}
// The two neighbouring notes the given number of semitones apart, or null.
function leapOf(notes, semis) {
  for (let i = 1; i < notes.length; i++) if (Math.abs(notes[i].midi - notes[i - 1].midi) === semis) return [notes[i - 1], notes[i]];
  return null;
}
// The longest run of notes moving one way by intervals of lo to hi semitones (a repeated note neither breaks nor counts).
function moveRun(notes, lo, hi) {
  const ns = notes.filter((n, i) => i === 0 || n.midi !== notes[i - 1].midi);
  let best = ns.slice(0, 1), cur = ns.slice(0, 1), dir = 0;
  for (let i = 1; i < ns.length; i++) {
    const d = ns[i].midi - ns[i - 1].midi, s = Math.sign(d), fits = Math.abs(d) >= lo && Math.abs(d) <= hi;
    if (fits && (s === dir || cur.length === 1)) { cur.push(ns[i]); dir = s; }
    else if (fits) { cur = [ns[i - 1], ns[i]]; dir = s; }
    else { cur = [ns[i]]; dir = 0; }
    if (cur.length > best.length) best = cur.slice();
  }
  return best;
}
const runNotes = notes => moveRun(notes, 1, 2), skipRun = notes => moveRun(notes, 3, 4);
const run = notes => runNotes(notes).length;
function leapWords(T, [a, b]) {
  const semis = Math.abs(b.midi - a.midi), dir = b.midi > a.midi ? 'up' : 'down';
  if (semis === 12 && a.rel === b.rel) return `${SOLFA[a.rel]} ${dir} to the ${SOLFA[b.rel]} an octave ${dir === 'up' ? 'higher' : 'lower'}`;
  return `${solfa(T, a)} ${dir} to ${solfa(T, b)}: ${article(intervalName(semis))}`;
}
// How exposed the accompaniment is: the melody's rests and longest note.
const exposure = w => w.rests.reduce((s, r) => s + r.durBeats, 0) * 2 + Math.max(0, ...w.notes.map(n => n.durBeats));
function pickupWords(T) {
  const beats = T.bars[0].dur / T.found.info.beatLen;
  return beats === 1 ? 'one beat' : beats === 0.5 ? 'half a beat' : `${A.fraction(beats)} of a beat`.replace(/^(\d+) of a beat$/, '$1 beats');
}
function accidentalWords(T, w) {
  const out = [];
  for (const n of w.notes) if (n.rel !== null && ![0, 2, 4, 5, 7, 9, 11].includes(n.rel)) out.push(n);
  const names = [...new Set(out.map(n => SOLFA[n.rel]))];
  const ctx = w.notes.filter(n => n.rel !== null && [0, 2, 4, 5, 7, 9, 11].includes(n.rel) && out.some(o => Math.abs(o.midi - n.midi) === 1));
  return `${names.join(' and ')}, ${names.length === 1 ? 'a note' : 'notes'} from outside the key signature` + (ctx.length ? `, a half step from the ${[...new Set(ctx.map(n => SOLFA[n.rel]))].join(' and ')} beside ${names.length === 1 ? 'it' : 'them'}` : '');
}

/* ---------------- chords ---------------- */
function chordsIn(T, w) {
  const out = [];
  const prev = (() => { for (let i = w.from - 1; i >= 0; i--) if (T.bars[i].chord) return T.bars[i].chord; return null; })();
  if (prev && !T.bars[w.from].firstChord) out.push(prev);
  for (let i = w.from; i < w.to; i++) for (const e of T.bars[i].els) for (const c of e.chord || []) if (!c.position || c.position === 'default') if (out[out.length - 1] !== c.name) out.push(c.name);
  return out;
}
function degreeOf(T, name) { const d = A.analyzeAbc(`X:1\nK:${T.t.abc.match(/^K:\s*(\S+)/m)[1]}\n"${name}"C|\n`, T.ABCJS)[0]; return d && d.features && d.features.chordDegrees[0]; }
const lastChordDegree = (T, w) => { const c = chordsIn(T, w); return c.length ? degreeOf(T, c[c.length - 1]) : null; };
function chordWords(T, w) {
  const c = chordsIn(T, w);
  const named = c.map(n => { const d = degreeOf(T, n); return d && d !== 'other' ? `${n} (${d})` : n; });
  const minor = c.filter(n => /^[A-G][#b♯♭]?m(?!aj)/.test(n));
  return `The chords ${named.join(', ')}` + (lastChordDegree(T, w) === 'I' && c.length > 1 ? ', ending back home on I' : '') + (minor.length && !c.every(n => ['I', 'IV', 'V'].includes(degreeOf(T, n))) ? `; ${minor.join(' and ')} ${minor.length === 1 ? 'is a' : 'are'} minor triad${minor.length === 1 ? '' : 's'}` : '');
}

/* ---------------- form ----------------
   Sections: a part label, a repeat or a double bar starts one. Two sections whose first bars differ make A and B
   (binary). A single section is read as phrases (the words' punctuation for a song, else the piece view's phrases),
   each phrase a letter by its notes: a phrase that begins as an earlier one began has that one's letter. */
const barKey = b => b.notes.map(n => `${(n.pitches || []).map(p => p.pitch + (p.accidental || '')).join(',')}/${n.duration}`).join(' ');
function formOf(T) {
  if (T._form) return T._form;
  const bars = T.bars, N = T.N, full = i => bars[i] && !bars[i].short;
  const starts = [0];
  for (let i = 1; i < N; i++) { const p = bars[i - 1], b = bars[i]; if (b.open.part || b.open.repeat || p.close.repeat || p.close.double) starts.push(i); }
  // A section opened by a pickup bar starts at the pickup.
  const sections = starts.map((s, k) => ({ from: s, to: k + 1 < starts.length ? starts[k + 1] : N }));
  const head = s => { const out = []; for (let i = s.from; i < s.to && out.length < 2; i++) if (full(i)) out.push(barKey(bars[i])); return out.join(' | '); };
  let b = null;
  for (let k = 1; k < sections.length; k++) if (head(sections[k]) !== head(sections[0]) && sections[0].to - sections[0].from >= 2) { b = sections[k].from; break; }
  // Phrases and their letters, from the music's own phrases (the words' commas cut finer than the form).
  const phrases = T.found.phrases.map(p => ({ from: p.from, to: p.to }));
  const letters = [], heads = [];
  for (const p of phrases) {
    const h = barKey(bars[p.from]) + ' | ' + (bars[p.from + 1] ? barKey(bars[p.from + 1]) : '');
    let k = heads.indexOf(h); if (k < 0) { heads.push(h); k = heads.length - 1; }
    letters.push(String.fromCharCode(65 + k));
  }
  const evenPhrases = phrases.length >= 3 && phrases.every(p => p.to - p.from >= 3);
  const shape = evenPhrases && sections.length === 1 ? letters.join('') : '';
  // One long section of four-bar phrases on two tunes only (ABAB, AABB) is binary too, B where the first B phrase starts.
  if (sections.length === 1 && shape && N >= 16 && /^A+B[AB]*$/.test(shape) && !/^(ABA|AABA)$/.test(shape) && new Set(letters).size === 2) b = phrases[letters.indexOf('B')].from;
  T._form = { sections, b: sections.length > 1 || b ? b : null, phrases, letters: shape };
  return T._form;
}
// Phrases: for a song, a phrase ends at the bar whose last syllable carries a comma or stop; else the piece view's.
// A phrase of words is at least two bars long and ends at a full stop, semicolon or question mark once it lasts a 4/4
// bar, or at a comma once it lasts two: so "Twin-kle, twin-kle," and "Bounce high," (half phrases) are not phrases.
function phrasesFor(T) {
  const ends = [];
  let len = 0, count = 0;
  for (let i = 0; i < T.N; i++) {
    len += T.bars[i].dur; count++;
    const s = (T.sylls[i] || []).filter(l => l && l.syllable);
    const strong = s.some(l => /[.;:!?]$/.test(l.syllable)), comma = s.some(l => /,$/.test(l.syllable));
    if (count >= 2 && ((strong && len >= 1 - 1e-6) || (comma && len >= 2 - 1e-6))) { ends.push(i + 1); len = 0; count = 0; }
  }
  if (T.lyricsFit && ends.length) {
    if (ends[ends.length - 1] !== T.N) ends.push(T.N);
    return ends.map((e, k) => ({ from: k ? ends[k - 1] : 0, to: e, by: 'words' }));
  }
  return T.found.phrases.map(p => ({ from: p.from, to: p.to, by: T.found.source }));
}
function firstPhrase(T) {
  const ps = phrasesFor(T); let p = ps[0];
  // A pickup bar alone is not a phrase.
  if (p.to - p.from === 1 && T.bars[p.from].short && ps[1]) p = { from: p.from, to: ps[1].to, by: p.by };
  return { from: p.from, to: p.to, by: p.by };
}
function phraseWhy(T, w) {
  const p = firstPhrase(T);
  const ps = phrasesFor(T), next = ps.find(q => q.from === p.to);
  const again = next && next.to - next.from === p.to - p.from && Array.from({ length: p.to - p.from }, (_, k) => barKey(T.bars[p.from + k]) === barKey(T.bars[next.from + k])).every(Boolean);
  return phraseEnd(T, w, p) + (again ? ', then sung again straight away' : '');
}
function phraseEnd(T, w, p) {
  if (p.by === 'words') return ', ending where the words take a breath';
  if (p.by === 'lines') return ', one line of the music as written';
  if (p.by === 'marked') return ', ending at a breath mark';
  if (p.by === 'whole') return '';
  return `, about four bars ending on ${solfa(T, lastNote(T, w))}`;
}
function lastNote(T, w) { const v = T.win(w.from, w.to); return v.notes[v.notes.length - 1]; }
// Where one section ends and the next begins: the last full bar before, any pickup, and the first full bar after.
function seam(T, at) {
  let from = at - 1; while (from > 0 && T.bars[from].short) from--;
  let to = at; while (to < T.N && T.bars[to].short) to++;
  return { from, to: Math.min(T.N, to + 1) };
}
function binaryWords(T) {
  const s = formOf(T).sections;
  const labelled = T.bars.some(b => b.open.part);
  const repeated = s.filter(x => T.bars[x.to - 1].close.repeat).length;
  return `Two parts, A and B${labelled ? ' (the parts the tune labels)' : ''}${repeated === s.length && s.length > 1 ? ', each played twice' : repeated ? ', the first played twice' : ''}`;
}
function higher(T) {
  const fb = formOf(T).b; if (fb === null) return false;
  const a = T.win(0, fb), b = T.win(fb, T.N);
  if (!a.f || !b.f) return false;
  const mean = v => v.notes.reduce((s, n) => s + n.midi, 0) / v.notes.length;
  return mean(b) - mean(a) >= 3;
}

/* ---------------- choosing ---------------- */
// Every span of up to `span` bars that shows the idea while no shorter span inside it does.
function minimalSpans(T, c) {
  const shows = (a, z) => { const w = T.win(a, z); return !!(w.f && c.shows(w, T)); };
  const out = [];
  for (let size = 1; size <= (c.span || 1); size++) for (let a = 0; a + size <= T.N; a++) {
    const z = a + size;
    if (!shows(a, z)) continue;
    if (size > 1 && (shows(a + 1, z) || shows(a, z - 1))) continue;
    out.push(T.win(a, z));
  }
  return out;
}
function bestSpan(T, c) {
  if (c.structural) { const s = c.at(T); return s ? T.win(s.from, s.to) : null; }
  const spans = minimalSpans(T, c);
  if (!spans.length) return null;
  const score = w => (c.score ? c.score(T, w) : 0);
  spans.sort((x, y) => score(y) - score(x) || (x.to - x.from) - (y.to - y.from) || x.from - y.from);
  return spans[0];
}
// The hand choices: { tuneId: { element: { concept, bars: [first, last], why } } }. `why` says what the ear heard.
const SA = 'In a Hindustani composition the first part (the sthayi) keeps low and the second (the antara) climbs towards high Sa.';
const CHOICES = {
  'beginner-songs-12-baa-baa-black-sheep': {
    duration: { concept: 'ti-ti', bars: [2, 2], why: 'Baa, Baa has Twinkle’s tune; its ti-ti (“have you any wool?”) is what sets it apart.' },
  },
  'original-pentatonic-6-clickety-clack': {
    duration: { concept: 'ti-ti', bars: [1, 1], why: 'The title is the rhythm: click-e-ty clack, a train on the rails.' },
  },
  'beginner-songs-13-fr-re-jacques': {
    pitch: { concept: 'low-so-la', bars: [7, 7], why: 'The bells of the last line ring down below do and back.' },
  },
  'hindostan-4-desh': {
    pitch: { concept: 'accidental', bars: [2, 2], why: 'In raga Desh the seventh note is natural on the way up and flat on the way down: this bar has both.' },
    form: { concept: 'binary', bars: [4, 5], why: 'The second part (the antara) begins like the first, then climbs to high Sa.' },
  },
  'hindostan-1-bhup': { form: { concept: 'binary', why: SA } },
  'hindostan-3-bhairavi': { form: { concept: 'binary', why: SA } },
  'hindostan-2-malkos': { form: { concept: 'binary', why: SA } },
};

function conceptFor(T, el) {
  const pinned = CHOICES[T.t.id] && CHOICES[T.t.id][el];
  const list = CONCEPTS.filter(c => c.el === el);
  const pick = (c, w, how) => ({ c, w, how });
  if (pinned) {
    const c = BY_ID[pinned.concept];
    const w = pinned.bars ? T.win(pinned.bars[0] - 1, pinned.bars[1]) : bestSpan(T, c);
    if (!w) throw new Error(`${T.t.id} ${el}: the chosen ${pinned.concept} has no bars`);
    return pick(c, w, 'chosen');
  }
  const intro = T.t.introduces || [];
  for (const c of list) if (c.intro && c.intro.some(x => intro.includes(x)) && c.tune(T)) { const w = bestSpan(T, c); if (w) return pick(c, w, 'introduced'); }
  for (const c of list) if (!c.introOnly && c.tune(T)) { const w = bestSpan(T, c); if (w) return pick(c, w, 'shown'); }
  return null;
}
const ABSENT = {
  dynamics: 'No dynamics, articulation or expression marks are written in this piece.',
  timbre: 'The music names no instrument or tone colour: the timbre is whatever the class plays or sings it on.',
  texture: 'The piece is written as a melody alone, with no chords or other parts (the page’s Band adds its own accompaniment, which is not the piece’s).',
  form: 'The piece is too short to have phrases of its own.',
  duration: 'No rhythm concept could be shown in a bar.',
  pitch: 'No pitch concept could be shown in a bar.',
};
function conceptsOfTune(t, ABCJS) {
  const T = readTune(t, ABCJS);
  const out = { title: t.title };
  for (const e of ELEMENTS) {
    const got = conceptFor(T, e.id);
    if (!got || !got.w) { out[e.id] = { absent: true, reason: ABSENT[e.id] }; continue; }
    const { c, w } = got, pinned = CHOICES[t.id] && CHOICES[t.id][e.id];
    const entry = { concept: c.id, name: typeof c.name === 'function' ? c.name(T, w) : c.name, grade: c.grade, term: c.term, words: c.words, bars: [w.from + 1, w.to] };
    if (c.whole) entry.throughout = true;
    entry.reason = c.reason(T, w) + (pinned && pinned.why ? ` ${pinned.why}` : '');
    if (got.how === 'introduced') entry.new = true;
    out[e.id] = entry;
  }
  return out;
}
function buildConcepts(set, ABCJS) {
  const tunes = {};
  for (const t of set.tunes) tunes[t.id] = conceptsOfTune(t, ABCJS);
  return {
    source: 'The Ontario Curriculum, Grades 1-8: The Arts (2009), Music, Fundamental Concepts for Grades 1 to 8: the elements of music and the grade that first names each concept',
    method: 'Generated by course/concepts.js from course/set.json. Each example is a span of bars that, written out and analysed on its own, shows the concept, while no shorter span inside it does; form is read from the sections and phrases; "throughout" marks an idea heard in every bar, with the bar where it is clearest. Bars count every written bar from 1, a pickup bar included.',
    elements: ELEMENTS,
    tunes,
  };
}

/* ---------------- checking ----------------
   Every example re-read from its bars: a concept with a test still passes on them and on no shorter span inside them,
   a structural one still sits where the tune's structure puts it. Returns the problems found. */
function verify(data, set, ABCJS) {
  const problems = [];
  for (const t of set.tunes) {
    const d = data.tunes[t.id]; if (!d) { problems.push(`${t.id}: missing`); continue; }
    let T = null;
    for (const e of ELEMENTS) {
      const x = d[e.id]; if (!x) { problems.push(`${t.id} ${e.id}: missing`); continue; }
      if (x.absent) continue;
      const c = BY_ID[x.concept]; if (!c) { problems.push(`${t.id} ${e.id}: unknown concept ${x.concept}`); continue; }
      T = T || readTune(t, ABCJS);
      const [a, z] = [x.bars[0] - 1, x.bars[1]];
      if (!(a >= 0 && z <= T.N && z > a)) { problems.push(`${t.id} ${e.id}: bars ${x.bars} out of range`); continue; }
      if (c.structural) { if (!(c.fits ? c.fits(T, a, z) : (s => s && s.from === a && s.to === z)(c.at(T)))) problems.push(`${t.id} ${e.id}: ${c.id} is not at bars ${x.bars}`); continue; }
      const w = T.win(a, z);
      if (!w.f || !c.shows(w, T)) { problems.push(`${t.id} ${e.id}: bars ${x.bars} do not show ${c.id}`); continue; }
      if (!c.whole && z - a > 1 && ((T.win(a + 1, z).f && c.shows(T.win(a + 1, z), T)) || (T.win(a, z - 1).f && c.shows(T.win(a, z - 1), T)))) problems.push(`${t.id} ${e.id}: bars ${x.bars} are more than ${c.id} needs`);
    }
  }
  return problems;
}

/* ---------------- the readable report ---------------- */
function renderMarkdown(data, set) {
  const L = [];
  L.push('# One idea from each element of music, in each piece', '');
  L.push('Generated by `course/concepts.js` from `course/set.json` (do not edit by hand; run `make concepts`). The data is `course/concepts.json`, which the piece view’s Listen step reads.', '');
  L.push('The elements are the six the Ontario curriculum’s Music strand names in every grade’s Fundamental Concepts box: duration (tempo is part of it), pitch, dynamics and other expressive controls, timbre, texture/harmony, and form. For each piece, one concept per element, with the grade that first names it, the bars that show it, and why. “All through” marks an idea heard in every bar; “new” marks the idea the piece brings into the course. A dash is an element the written music does not show. Bars count every written bar from 1, a pickup bar included.', '');
  const counts = Object.fromEntries(ELEMENTS.map(e => [e.id, 0]));
  for (const t of set.tunes) for (const e of ELEMENTS) if (!data.tunes[t.id][e.id].absent) counts[e.id]++;
  L.push(`Shown by the ${set.tunes.length} pieces: ${ELEMENTS.map(e => `${e.name} ${counts[e.id]}`).join(', ')}.`, '');
  for (const t of set.tunes) {
    const d = data.tunes[t.id];
    L.push(`## ${t.title}`, '', '| Element | Concept (grade) | Bars | Why |', '|---|---|---|---|');
    for (const e of ELEMENTS) {
      const x = d[e.id];
      if (x.absent) { L.push(`| ${e.name} | — | | ${x.reason} |`); continue; }
      const bars = x.bars[0] === x.bars[1] ? `${x.bars[0]}` : `${x.bars[0]}–${x.bars[1]}`;
      L.push(`| ${e.name} | ${x.term} (${x.grade})${x.new ? ', new' : ''} | ${bars}${x.throughout ? ', all through' : ''} | ${x.reason.replace(/\|/g, '\\|')} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

module.exports = { ELEMENTS, CONCEPTS, CHOICES, buildConcepts, verify, renderMarkdown, readTune };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const ABCJS = require(path.join(root, 'vendor', 'abcjs-basic-min.js'));
  const set = JSON.parse(fs.readFileSync(path.join(__dirname, 'set.json'), 'utf8'));
  const data = buildConcepts(set, ABCJS);
  const json = JSON.stringify(data, null, 1) + '\n', md = renderMarkdown(data, set);
  const problems = verify(data, set, ABCJS);
  const jsonPath = path.join(__dirname, 'concepts.json'), mdPath = path.join(__dirname, 'concepts.md');
  if (process.argv.includes('--check')) {
    const stale = [];
    if (!fs.existsSync(jsonPath) || fs.readFileSync(jsonPath, 'utf8') !== json) stale.push('course/concepts.json');
    if (!fs.existsSync(mdPath) || fs.readFileSync(mdPath, 'utf8') !== md) stale.push('course/concepts.md');
    if (stale.length) { console.error(`${stale.join(' and ')} ${stale.length === 1 ? 'is' : 'are'} stale: run make concepts`); process.exit(1); }
    if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
    console.log(`Concepts up to date (${set.tunes.length} pieces, ${ELEMENTS.length} elements).`);
  } else {
    if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
    fs.writeFileSync(jsonPath, json); fs.writeFileSync(mdPath, md);
    console.log(`Wrote course/concepts.json and course/concepts.md (${set.tunes.length} pieces).`);
  }
}
