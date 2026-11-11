#!/usr/bin/env node
'use strict';
// The practice core (course/practice.js): share links and what they may carry, the board's levels and pieces,
// phrases (found, marked, set by a teacher) and each phrase written out as a tune of its own, slow tempo, step/wait,
// local practice history, assessments, and the advisory listener. The piece view (course/piece.js) and the board
// (course/board.html) call these; the Player's own looping and retiming are checked in the browser (docs/PRACTICE-BOARD-2026-11-11.md).

const path = require('path');
const ABCJS = require('../vendor/abcjs-basic-min.js');
const Analyze = require('../course/analyze.js');
const P = require('../course/practice.js');
const set = require('../course/set.json');

let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };
const eq = (a, b, message) => assert(JSON.stringify(a) === JSON.stringify(b), `${message}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const tune = id => { const t = set.tunes.find(x => x.id === id); if (!t) throw new Error(`no tune ${id} in the set`); return t; };
const spans = f => f.phrases.map(p => `${p.first}-${p.last}`).join(' ');
// The written notes of a parse (pitch, accidental, length, first verse's syllable): what a phrase must keep exactly.
const notesOf = abc => { const t = ABCJS.parseOnly(abc)[0], out = []; for (const l of t.lines) { if (!l.staff) continue; for (const e of l.staff[0].voices[0]) if (e.el_type === 'note' && !e.rest) out.push(`${(e.pitches || []).map(p => p.pitch + (p.accidental || '')).join(',')}/${e.duration}/${(e.lyric || []).map(x => x.syllable).join('|')}`); } return out; };
const barNotes = bars => bars.flatMap(b => b.notes.map(e => `${(e.pitches || []).map(p => p.pitch + (p.accidental || '')).join(',')}/${e.duration}/${(e.lyric || []).map(x => x.syllable).join('|')}`));
const warningsOf = abc => (ABCJS.parseOnly(abc)[0].warnings || []).map(w => w.replace(/Line:\d+:\d+:/, '').replace(/:.*$/, ''));

/* ---------------- links ---------------- */
{
  const s = { tune: 'first-tunes-3-twinkle-twinkle-little-star', level: 3, mode: 'practice', step: 2, loop: 2, by: 'note', bpm: 60, inst: 'recorder', tr: -2, cuts: [1, 5, 9] };
  const enc = P.encodeSetup(s);
  eq(enc, 'tune=first-tunes-3-twinkle-twinkle-little-star&level=3&mode=practice&step=2&loop=2&by=note&bpm=60&inst=recorder&tr=-2&cuts=1.5.9', 'a setup encodes in a fixed, readable order');
  eq(P.decodeSetup('#' + enc), s, 'a setup reads back from its own link');
  eq(P.encodeSetup(P.decodeSetup(enc)), enc, 'encoding is stable');
  eq(P.decodeSetup('?bpm=1000&loop=0&step=7&by=ear&mode=dance&inst=kazoo&tr=40&tune=Bad Id'), { bpm: 300, tr: 12 }, 'out-of-range and unknown values are clamped or dropped');
  // Links from the first piece view still open where they meant: note by note and slow practice were Practice's two ways in, a phrase is a loop, the whole piece step 3.
  eq(P.decodeSetup('tune=x-1&mode=step&phrase=3'), { tune: 'x-1', mode: 'practice', step: 2, loop: 3, by: 'note' }, 'an old step-by-step link');
  eq(P.decodeSetup('tune=x-1&mode=slow&bpm=50'), { tune: 'x-1', mode: 'practice', step: 2, by: 'time', bpm: 50 }, 'an old slow-practice link: looping in time');
  eq(P.decodeSetup('tune=x-1&mode=teach&view=whole'), { tune: 'x-1', mode: 'teach', step: 3 }, 'an old whole-piece link');
  // Two people: a teacher on the projector (Teach, Assess) and a student alone (Practice). The class sees listen, learn, put together.
  eq(P.STEPS.teach, ['Listen', 'Learn the sections', 'Put it together'], 'Teach: listen, learn the sections, put it together');
  eq(P.STEPS.practice, [...P.STEPS.teach, 'Play it through'], 'Practice: the same, then a play-through');
  eq(P.STEPS.assess, ['Hear it', 'The attempt', 'Decide'], 'Assess: hear it, the attempt, decide');
  eq(P.HOW, { teach: ['study', 'together'], practice: ['note', 'time'] }, 'learning the sections, in order: the class studies, then loops them; a student goes note by note, then loops in time');
  // Loop together: sections that grow until it is all of it, and the span in the address.
  eq(P.ladder(4).map(([a, b]) => a === b ? `${a + 1}` : `${a + 1}-${b + 1}`), ['1', '2', '1-2', '3', '1-3', '4', '1-4'], 'each section, then joined to the ones before');
  eq([P.ladder(1), P.ladder(2)], [[[0, 0]], [[0, 0], [1, 1], [0, 1]]], 'one section, or two');
  eq(P.encodeSetup({ tune: 'x-1', mode: 'teach', step: 2, loop: 1, to: 3, by: 'together', show: 'melody' }), 'tune=x-1&mode=teach&step=2&loop=1-3&by=together&show=melody', 'a span of sections in the address');
  eq(P.decodeSetup('tune=x-1&loop=2-4&show=chords'), { tune: 'x-1', loop: 2, to: 4, show: 'chords' }, 'and read back');
  eq(P.decodeSetup('tune=x-1&loop=3-2&show=tab&by=dance'), { tune: 'x-1', loop: 3 }, 'a backwards span, an unknown show or way is dropped');
  // Private data never rides in a link, whichever way it is offered.
  const leaky = { tune: 'x-1', student: 'Ada', name: 'Ada', note: 'shaky', result: 'pass', mark: 4, progress: { runs: 3 }, roster: ['Ada'] };
  const out = P.encodeSetup(leaky);
  eq(out, 'tune=x-1', 'names, notes, results, marks and progress are not setup');
  assert(!/Ada|shaky|pass|runs/.test(out), 'nothing private in an encoded link');
  eq(P.decodeSetup('tune=x-1&student=Ada&note=shaky&result=pass'), { tune: 'x-1' }, 'a link carrying private keys is read without them');
  eq(P.SETUP_KEYS, ['tune', 'level', 'mode', 'step', 'loop', 'by', 'bpm', 'inst', 'show', 'tr', 'cuts'], 'the setup keys are the instructional ones');
  eq(P.pieceHref({ tune: 'x-1', mode: 'teach' }, true), '../index.html#tune=x-1&mode=teach', 'the board links into the main page');
  eq(P.decodeBoard(P.encodeBoard({ do: 'assess', level: 4, tune: 'morris-7-highland-mary', student: 'Ada' })), { do: 'assess', level: 4, tune: 'morris-7-highland-mary' }, 'the board address keeps the way in, level and piece, never a name');
}

/* ---------------- levels and pieces ---------------- */
{
  const levels = P.levelsOf(set);
  eq(levels.map(l => l.level), [1, 2, 3, 4, 5, 6], 'six levels');
  eq(levels.reduce((n, l) => n + l.count, 0), set.tunes.length, 'every tune is at one level');
  for (const l of levels) assert(P.tunesAt(set, { level: l.level }).every(t => t.level === l.level), `level ${l.level} holds only its own tunes`);
  const g2 = P.tunesAt(set, { grade: 2 });
  assert(g2.length > 0 && g2.every(t => ((t.ontario && t.ontario.grade) || 1) <= 2), 'the grade filter keeps tunes at or under the grade');
  eq(P.tunesAt(set, { q: 'twinkle' }).map(t => t.id), ['first-tunes-3-twinkle-twinkle-little-star'], 'a search finds a title');
  eq(P.tunesAt(set, { q: 'india garhwal', level: 5 }).length, 3, 'a search of origin words, within a level');
  // Workshop and review-queue pieces are not in the published set the board reads.
  assert(!set.tunes.some(t => /sketch|withheld/i.test(t.id + t.title)), 'no workshop sketches on the board');
  const sum = P.summarize(tune('beginner-songs-1-rain-rain-go-away'), { ABCJS, analyze: Analyze, set });
  eq([sum.low, sum.high, sum.bars], [64, 69, 4], 'a short song: its range and bars');
  assert(/E4–A4 \(a 4th\)/.test(sum.range), `the range in words: ${sum.range}`);
  assert(/about 5 seconds/.test(sum.length), `its length in words: ${sum.length}`);
  eq(sum.goal, 'New here: leaps of a 4th.', 'its learning goal names what it brings in');
  assert(sum.fits.find(f => f.id === 'recorder1').fits && sum.fits.find(f => f.id === 'uke').fits, 'it fits a first-octave recorder and the ukulele');
  // A tune that needs moving for the recorder: Frère Jacques goes down to G3, under the recorder's low C.
  const fj = P.summarize(tune('beginner-songs-13-fr-re-jacques'), { ABCJS, analyze: Analyze, set });
  eq([fj.range, P.transposeFor(fj.fits, 'recorder'), P.transposeFor(fj.fits, 'uke')], ['G3–A4 (just over an octave)', 5, 5], 'Frère Jacques: up a fourth for the recorder and the ukulele');
  eq(P.transposeFor(P.summarize(tune('first-tunes-3-twinkle-twinkle-little-star'), { ABCJS, analyze: Analyze, set }).fits, 'recorder'), 0, 'Twinkle fits the recorder as written');
  // The Garhwali song written in the bass clef is out of reach within an octave's transposition, and says so.
  const low = P.summarize(tune('hindostan-folk-5-chhaila'), { ABCJS, analyze: Analyze, set });
  eq([low.fits.find(f => f.id === 'recorder').fits, P.transposeFor(low.fits, 'recorder')], [false, null], 'a bass-clef song does not fit the recorder');
  eq(P.summarize(tune('waltzes-11-daisy-daisy'), { ABCJS, analyze: Analyze, set }).range, 'A4–A5 (an octave)', 'an octave in words');
  const daisy = P.summarize(tune('waltzes-11-daisy-daisy'), { ABCJS, analyze: Analyze, set });
  assert(daisy.seconds > 33 * 3 * 60 / 80, 'a repeated tune is longer than its written bars');
}

/* ---------------- phrases ---------------- */
{
  // A very short song stays whole.
  const rain = P.phrasesOf(tune('beginner-songs-1-rain-rain-go-away').abc, ABCJS);
  eq([rain.source, spans(rain)], ['whole', '1-4'], 'a four-bar song is one phrase');
  // No structure written: groups of four bars, a guess the page says it is.
  const tw = P.phrasesOf(tune('first-tunes-3-twinkle-twinkle-little-star').abc, ABCJS);
  eq([tw.source, spans(tw)], ['groups', '1-4 5-8 9-12'], 'twelve bars on one line: three four-bar phrases');
  assert(/guess/.test(tw.note), 'a guessed phrasing says so');
  // Explicit parts and source lines; a pickup leads into its phrase.
  const hm = P.phrasesOf(tune('morris-7-highland-mary').abc, ABCJS);
  eq(spans(hm), '1-5 6-9 10-14 15-18', 'Highland Mary: its lines, each section with its pickup');
  eq(hm.phrases.map(p => p.label), ['Part A', 'Part A', 'Part B', 'Part B'], 'the part labels name the phrases');
  assert(hm.bars[0].short && hm.bars[9].short, 'the pickups are short bars');
  // A long repeated waltz with uneven bars: equal lengths by duration, not bar counts.
  const daisy = P.phrasesOf(tune('waltzes-11-daisy-daisy').abc, ABCJS);
  eq(spans(daisy), '1-5 6-9 10-13 14-17 18-21 22-25 26-29 30-33', 'Daisy Daisy: eight phrases of about four bars, the pickup with the first');
  // An odd metre.
  eq(spans(P.phrasesOf(tune('hindostan-folk-5-chhaila').abc, ABCJS)), '1-5 6-9', 'a 5/8 song in two phrases');
  // Compound metre, and endings that are never cut from the bars they end.
  const jig = 'X:1\nT:Jig\nM:6/8\nL:1/8\nK:G\n|:GAB c2A|BGB d2B|GAB c2A|BAG A3|\nGAB c2A|BGB d2B|c2A BGE|[1 DEF G3:|[2 DEF G2D||\n';
  const jf = P.phrasesOf(jig, ABCJS);
  eq(spans(jf), '1-4 5-9', '6/8 in two phrases; both endings stay with the phrase they end');
  eq([jf.bars[7].ending, jf.bars[8].ending], ['1', '2'], 'the endings are read');
  // A tune's own marks: a %%phrases line, and breath marks.
  eq(spans(P.phrasesOf('X:1\nM:4/4\nL:1/4\n%%phrases 1 3 7\nK:C\nC D E F|G A B c|c B A G|F E D C|C D E F|G A B c|c B A G|F E D C|]\n', ABCJS)), '1-2 3-6 7-8', 'a %%phrases line sets the phrases');
  const br = P.phrasesOf('X:1\nM:4/4\nL:1/4\nK:C\nC D E F|G A B !breath!c|c B A G|F E D C|C D E F|G A B !breath!c|c B A G|F E D C|]\n', ABCJS);
  eq([br.source, spans(br)], ['marked', '1-2 3-6 7-8'], 'breath marks end phrases');
  // The teacher's cuts win, and one phrase when asked.
  eq(spans(P.phrasesOf(tune('first-tunes-3-twinkle-twinkle-little-star').abc, ABCJS, { cuts: [1, 3, 5, 7, 9, 11] })), '1-2 3-4 5-6 7-8 9-10 11-12', 'a teacher cuts Twinkle into two-bar phrases');
  eq(P.phrasesOf(tune('first-tunes-3-twinkle-twinkle-little-star').abc, ABCJS, { cuts: '5.9' }).source, 'teacher', 'cuts from a link are the teacher\'s');
  eq(spans(P.phrasesOf(tune('first-tunes-3-twinkle-twinkle-little-star').abc, ABCJS, { cuts: [1] })), '1-12', 'cuts of 1 alone: one phrase');
  eq(spans(P.phrasesOf(tune('first-tunes-3-twinkle-twinkle-little-star').abc, ABCJS, { cuts: [40] })), '1-4 5-8 9-12', 'cuts past the end are ignored');
  eq(P.normalCuts('9,5 5 x 0'), [5, 9], 'cuts are numbers, sorted, once each');
}

/* ---------------- a phrase as a tune of its own ---------------- */
{
  // Every phrase of every published tune: the same notes, lengths and words as those bars of the whole, and no new warnings.
  let phrases = 0;
  for (const t of set.tunes) {
    const f = P.phrasesOf(t.abc, ABCJS), had = new Set(warningsOf(t.abc));
    for (const p of f.phrases) {
      const abc = P.phraseAbc(t.abc, ABCJS, p, f);
      const got = notesOf(abc), want = barNotes(f.bars.slice(p.from, p.to));
      const keep = f.bars.slice(p.from, p.to).some(b => b.open.ending) && f.bars.slice(p.from, p.to).some(b => b.close.repeat);
      if (!keep) eq(got, want, `${t.id} bars ${p.first}-${p.last}: the phrase's notes and words`);
      const fresh = warningsOf(abc).filter(w => !had.has(w));
      assert(!fresh.length, `${t.id} bars ${p.first}-${p.last}: new warnings ${fresh.join('; ')}`);
      assert(!/^%%(round|band|phrases)/m.test(abc) && !/^P:/m.test(abc), `${t.id}: a phrase carries no round, band, phrase or part lines`);
      phrases++;
    }
  }
  assert(phrases > 100, `every phrase checked (${phrases})`);
  // The chord in force carries into a phrase that starts without one; the key and metre in force head it.
  const mid = 'X:1\nT:Change\nM:4/4\nL:1/4\nK:C\n"F"C D E F|G A B c|c B A G|F E D C|\nK:G\nM:3/4\n"D"G A B|c B A|"G"G F E|D E F|]\n';
  const mf = P.phrasesOf(mid, ABCJS, { cuts: [1, 2, 6] });
  const p2 = P.phraseAbc(mid, ABCJS, mf.phrases[1], mf);
  assert(/^"F"G A B c/m.test(p2), 'the chord in force starts a phrase that has none');
  const p3 = P.phraseAbc(mid, ABCJS, mf.phrases[2], mf);
  assert(/^M:3\/4$/m.test(p3) && /^K:G$/m.test(p3) && !/^K:C$/m.test(p3), 'a phrase after a key and metre change is headed by them');
  eq(p3.trim().split('\n').pop(), '"D"c B A | "G"G F E | D E F |]', 'its bars, with barlines of its own, and the chord in force');
  // Repeats: kept when the phrase holds its endings (they play as written), dropped otherwise.
  const jig = 'X:1\nT:Jig\nM:6/8\nL:1/8\nK:G\n|:GAB c2A|BGB d2B|GAB c2A|BAG A3|\nGAB c2A|BGB d2B|c2A BGE|[1 DEF G3:|[2 DEF G2D||\n';
  const jf = P.phrasesOf(jig, ABCJS);
  const a = P.phraseAbc(jig, ABCJS, jf.phrases[0], jf), b = P.phraseAbc(jig, ABCJS, jf.phrases[1], jf);
  assert(!/[:]\||\|:/.test(a.split('\n').pop() + a), 'the first phrase plays once: no repeat signs');
  assert(/^\|:/m.test(b) && /\[1 /.test(b) && /:\|/.test(b) && /\[2 /.test(b), `the second phrase keeps its repeat and both endings: ${b.split('\n').slice(-2).join(' ')}`);
  const bt = ABCJS.parseOnly(b)[0], bars = [];
  for (const l of bt.lines) if (l.staff) for (const e of l.staff[0].voices[0]) if (e.el_type === 'bar') bars.push(e.type);
  assert(bars.includes('bar_right_repeat'), 'abcjs reads the kept repeat, so the Player plays both endings');
  // A round's line belongs to the whole tune: the whole keeps it, a phrase does not.
  const round = 'X:1\nT:Round\nM:4/4\nL:1/4\n%%round 2 bars\nK:C\nC D E C|C D E C|E F G2|E F G2|]\n';
  assert(/%%round/.test(round) && !/%%round/.test(P.phraseAbc(round, ABCJS, P.phrasesOf(round, ABCJS, { cuts: [1, 3] }).phrases[1])), 'a phrase leaves the %%round line to the whole tune');
  // Words held over notes (_) stay on their notes.
  const chh = tune('hindostan-folk-5-chhaila'), cf = P.phrasesOf(chh.abc, ABCJS);
  eq(notesOf(P.phraseAbc(chh.abc, ABCJS, cf.phrases[0], cf)), barNotes(cf.bars.slice(0, cf.phrases[0].to)), 'held syllables keep their notes');
}

/* ---------------- the new idea, heard in the piece ---------------- */
{
  const ex = (id, tag) => P.exampleOf(tune(id), ABCJS, Analyze, tag);
  eq(P.conceptsOf(tune('beginner-songs-1-rain-rain-go-away')), ['leap:4th'], 'what a piece introduces');
  eq(P.conceptsOf(tune('first-tunes-3-twinkle-twinkle-little-star')), ['leap:5th'], 'else what it has worth pointing out');
  const tw = ex('first-tunes-3-twinkle-twinkle-little-star', 'leap:5th');
  eq([tw.first, tw.last], [1, 1], 'one bar when one bar shows it: Twinkle leaps a 5th in bar 1');
  const r = ex('beginner-songs-1-rain-rain-go-away', 'leap:4th');
  eq([r.first, r.last, r.words], [3, 4, 'leaps of a 4th'], 'Rain, Rain: its leap of a 4th is in bars 3-4');
  const ab = P.phraseAbc(tune('beginner-songs-1-rain-rain-go-away').abc, ABCJS, r);
  assert(Analyze.analyzeAbc(ab, ABCJS)[0].features.skills.includes('leap:4th'), 'and those bars, on their own, have it');
  eq([ex('hindostan-4-desh', 'degree:fi').first, ex('hindostan-folk-5-chhaila', 'grace-notes').first, ex('original-pentatonic-8-evening-bells', 'dur:4').first], [2, 8, 4], 'the note fi, a grace note, a four-beat note: where each is first heard');
  eq(ex('hindostan-folk-1-o-give-me-those-pretty-eyes', 'metre-change').last - ex('hindostan-folk-1-o-give-me-those-pretty-eyes', 'metre-change').first, 1, 'a change of metre: heard across two bars');
  eq([ex('beginner-songs-10-lightly-row', 'leap:5th').first, ex('beginner-songs-10-lightly-row', 'leap:5th').last], [7, 8], 'a leap across the barline: the two bars it spans');
  eq(ex('reelsa-c-15-astley-s-ride', 'repeat'), null, 'a repeat cannot be shown by an excerpt: no example');
  let shown = 0; for (const t of set.tunes) for (const c of P.conceptsOf(t)) { const e = P.exampleOf(t, ABCJS, Analyze, c); if (e) { shown++; assert(e.last - e.first <= 1 && e.last >= e.first && e.first >= 1 && e.last <= P.barsOf(t.abc, ABCJS).bars.length, `${t.id} ${c}: one or two bars inside the piece`); } }
  assert(shown >= 30, `examples found across the set (${shown})`);
}

/* ---------------- tempo ---------------- */
{
  eq([P.slowStart(80), P.slowStart(120), P.slowStart(50)], [50, 70, 40], 'slow practice starts a little over half speed, never under 40');
  eq([P.nudgeTempo(50, 1, 80), P.nudgeTempo(52, 1, 80), P.nudgeTempo(50, -1, 80), P.nudgeTempo(100, 1, 80)], [55, 55, 45, 100], 'five beats a minute at a time, capped a quarter over the written tempo');
  eq([P.tempoShare(60, 80), P.tempoShare(80, 80)], [75, 100], 'tempo as a share of full speed');
  // Faster each time round: from slow to full speed in fives, then it stays.
  const laps = [50]; while (laps[laps.length - 1] < 80 && laps.length < 20) laps.push(P.nextLap(laps[laps.length - 1], 80));
  eq(laps, [50, 55, 60, 65, 70, 75, 80], 'each time round five faster, up to the written tempo');
  eq([P.nextLap(80, 80), P.nextLap(78, 80), P.nextLap(90, 80)], [80, 80, 90], 'never past full speed, and never slower than it was');
  eq([P.writtenBpm('X:1\nQ:1/4=120\nK:C\nC|', ABCJS), P.writtenBpm('X:1\nK:C\nC|', ABCJS)], [120, 80], 'the written tempo, or the page\'s 80');
  // A phrase written out keeps the tune's Q: line (so the page's tempo ratio holds) and nothing in it changes pitch with tempo.
  const t = tune('hindostan-folk-5-chhaila'), f = P.phrasesOf(t.abc, ABCJS);
  assert(/^Q:1\/8=160$/m.test(P.phraseAbc(t.abc, ABCJS, f.phrases[1], f)), 'a phrase keeps the written tempo');
}

/* ---------------- step/wait ---------------- */
{
  const s = new P.Stepper([{ ms: 0, midis: [60] }, { ms: 500, midis: [] }, { ms: 750, midis: [62] }, { ms: 1000, midis: [64, 67] }]);
  eq([s.count, s.current.midis], [3, [60]], 'rests are passed over');
  s.next(); eq(s.current.midis, [62], 'Next moves on');
  s.back(); eq(s.current.midis, [60], 'Back moves back');
  eq(s.hear(61.9, 0.95).verdict, 'other', 'a different note does not move on');
  eq(s.current.midis, [60], 'still waiting');
  const r = s.hear(60.1, 0.95); assert(r.advanced && r.verdict === 'match', 'a matching note moves on');
  const o = s.hear(74, 0.95); assert(o.advanced && o.verdict === 'octave', 'an octave away counts (a recorder sounds an octave up)');
  eq(s.hear(64, 0.6).verdict, 'none', 'an unclear pitch is no evidence');
  assert(!s.done && s.current.midis.join() === '64,67', 'the last event: a chord');
  s.hear(67, 0.95); assert(s.done && s.heard === 3, 'any note of a chord counts; done at the end, three heard');
  eq(s.next(), null, 'nothing after the end');
  s.reset(); assert(!s.done && s.i === 0 && s.heard === 0, 'reset starts over');
}

/* ---------------- progress on this computer ---------------- */
{
  const mem = new Map(), storage = { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)) };
  eq(P.readProgress(storage), { v: 1, tunes: {} }, 'nothing yet');
  let p = P.readProgress(storage);
  p = P.recordPractice(p, { id: 'tw', title: 'Twinkle', kind: 'steps', steps: 14, heard: 9, phrase: 1, written: 80, date: '2026-11-10' });
  for (let i = 0; i < 3; i++) p = P.recordPractice(p, { id: 'tw', kind: 'run', bpm: 50, written: 80, phrase: 1, phrases: 3, date: '2026-11-10' });
  p = P.recordPractice(p, { id: 'tw', kind: 'run', bpm: 60, written: 80, phrase: 2, phrases: 3, date: '2026-11-11' });
  P.writeProgress(storage, p);
  const back = P.readProgress(storage), e = back.tunes.tw;
  eq([e.stepRuns, e.steps, e.heard, e.runs, e.slowRuns, e.wholeRuns, e.bestBpm], [1, 14, 9, 4, 4, 0, 0], 'steps and runs persist; phrase runs are not the whole piece');
  eq(e.phraseBpm, { 1: 50, 2: 60 }, 'each phrase keeps its best tempo');
  eq(e.log, [{ d: '2026-11-10', k: 'steps', ph: 1, bpm: 0, n: 1 }, { d: '2026-11-10', k: 'run', ph: 1, bpm: 50, n: 3 }, { d: '2026-11-11', k: 'run', ph: 2, bpm: 60, n: 1 }], 'the log folds repeats of the same thing on the same day');
  let pr = P.progressOf(back, 'tw', 3, 2);
  eq([pr.stage, pr.label, pr.ladderShare, pr.ladderOf], ['slow', 'Slow practice', 75, 'section 2'], 'slow practice, with section 2 at 75% of full speed');
  assert(/stepped through 1 time · played 4 times · 2 of 3 sections tried/.test(pr.detail), `what was done, in words: ${pr.detail}`);
  assert(/a guess/.test(pr.detail), 'what the microphone heard is called a guess');
  p = P.recordPractice(back, { id: 'tw', kind: 'run', bpm: 76, written: 80, whole: true });
  pr = P.progressOf(p, 'tw', 3);
  eq([pr.stage, pr.entry.bestBpm, pr.share], ['tempo', 76, 95], 'the whole piece near full speed: up to speed');
  assert(!/score|accura|correct|%\s*right/i.test(JSON.stringify(p) + pr.detail + pr.label), 'progress claims no score or accuracy');
  eq(P.progressOf(p, 'nope').stage, 'new', 'a piece not practised');
  eq(P.recordPractice(p, { id: 'tw', kind: 'bogus' }).tunes.tw.runs, 5, 'an unknown kind records nothing');
  const broken = { getItem: () => '{not json', setItem: () => { throw new Error('full'); } };
  eq(P.readProgress(broken), { v: 1, tunes: {} }, 'unreadable storage starts fresh');
  eq(P.writeProgress(broken, p), false, 'a full store says it could not save');
  assert(P.PROGRESS_KEY !== 'gcs-course-v1', 'practice history and class records are separate stores');
}

/* ---------------- assessments ---------------- */
{
  const rec = P.makeAssessment({ student: 'Ada', id: 'tw', title: 'Twinkle', level: 3, result: 'practice', note: '  Steady beat; bar 6 rushed.  ', bpm: 64, written: 80, assist: 'slow', phrase: 2, date: '2026-11-11',
    flags: [{ kind: 'wrong', at: 5, expected: 67, heard: 69, confidence: 'medium', kept: true }, { kind: 'octave', at: 7, expected: 60, heard: 72, confidence: 'low', kept: false }], listened: { notes: 13, matched: 12, reliability: 'medium' }, mark: '2' });
  eq([rec.result, rec.note, rec.bpm, rec.assist, rec.phrase, rec.mark], ['practice', 'Steady beat; bar 6 rushed.', 64, 'slow', 2, 2], 'a record keeps the decision, the note, the tempo, the help and an optional achievement level');
  eq(rec.flags.map(f => f.kept), [true, false], 'the teacher\'s keep or dismiss stays with each flag');
  assert(!('student' in rec), 'the record is kept under the student, not inside it');
  for (const [bad, why] of [[{ id: 'tw', result: 'pass' }, 'no student'], [{ student: 'Ada', result: 'pass' }, 'no piece'], [{ student: 'Ada', id: 'tw', result: 'great' }, 'a result outside the three']]) {
    let threw = false; try { P.makeAssessment(bad); } catch (e) { threw = true; } assert(threw, `an assessment with ${why} is refused`);
  }
  eq(P.makeAssessment({ student: 'B', id: 'tw', result: 'na', note: 'x'.repeat(900) }).note.length, 500, 'a note is kept short');
  eq(Object.keys(P.RESULTS), ['pass', 'practice', 'na'], 'pass, needs more practice, not assessed');
  let st = { roster: ['Ada'], progress: {}, levels: {}, tests: {} };
  st = P.applyAssessment(st, 'Ada', rec);
  eq(st.progress.tw.Ada.state, 'practising', 'needs more practice: practising');
  st = P.applyAssessment(st, 'Ada', P.makeAssessment({ student: 'Ada', id: 'tw', result: 'pass', date: '2026-11-12' }));
  eq(st.progress.tw.Ada, { state: 'passed', date: '2026-11-12' }, 'a pass passes the piece');
  st = P.applyAssessment(st, 'Ada', P.makeAssessment({ student: 'Ada', id: 'tw', result: 'practice' }));
  eq(st.progress.tw.Ada.state, 'passed', 'a later needs-more-practice never takes a pass away');
  st = P.applyAssessment(st, 'Ada', P.makeAssessment({ student: 'Ada', id: 'other', result: 'na' }));
  assert(!st.progress.other, 'not assessed changes no state');
  eq(st.tests.Ada.length, 4, 'every assessment is kept');
  eq([P.resultWords({ result: 'pass' }), P.resultWords({ mark: 3 })], ['Pass', 'Level 3'], 'old 1-4 marks still read');
  // An assessment and a link never meet.
  assert(!P.encodeSetup({ tune: 'tw', ...rec }).includes('Steady'), 'an assessment cannot leak into a link');
}

/* ---------------- listening: advisory, with its confidence ---------------- */
{
  const sr = 44100, N = 2048;
  const tone = (hz, amp = 0.5, noise = 0) => { const b = new Float32Array(N); let s = 7; for (let i = 0; i < N; i++) { s = (s * 16807) % 2147483647; b[i] = amp * Math.sin(2 * Math.PI * hz * i / sr) + noise * ((s / 2147483647) * 2 - 1); } return b; };
  const a4 = P.mpm(tone(440), sr);
  assert(a4 && Math.abs(P.freqToMidi(a4.freq) - 69) < 0.1 && a4.clarity > 0.95, `a clean A4 reads as A4 (${a4 && a4.freq.toFixed(1)} Hz)`);
  const c5 = P.mpm(tone(523.25, 0.4, 0.05), sr);
  assert(c5 && Math.abs(P.freqToMidi(c5.freq) - 72) < 0.15, 'C5 through a little noise');
  const hiss = P.mpm(tone(440, 0, 0.5), sr);
  assert(!hiss || hiss.clarity < 0.85, 'noise alone claims no pitch');
  const g = new P.NoteGate(3, 4);
  eq([69.1, 69.2, 68.9].map(m => g.push(m)), [null, null, 69], 'a pitch becomes a note once it holds');
  assert(g.fresh, 'and says it is new');
  eq([null, null, null, null].map(m => g.push(m)).pop(), null, 'quiet lets it go');
  eq(P.judgeNote([60], 60.2, 0.95), { verdict: 'match', confidence: 'high', cents: 20 }, 'a clear, close match');
  eq(P.judgeNote([60], 60.45, 0.88).confidence, 'medium', 'a match at the edge is only likely');
  eq(P.judgeNote([60], 72, 0.95).verdict, 'octave', 'an octave away is named as such');
  eq(P.judgeNote([60], 62, 0.8).verdict, 'none', 'an unclear reading is no evidence');
  // Alignment: what was heard against what was written.
  const E = [60, 62, 64, 65, 67, 65, 64, 62].map((m, i) => ({ ms: i * 500, midis: [m] }));
  const heard = (ms, ...skip) => E.map((e, i) => ({ midi: e.midis[0], ms: i * ms, clarity: 0.97 })).filter((_, i) => !skip.includes(i));
  let r = P.alignAttempt(E, heard(600));
  eq([r.flags.length, r.matched, r.reliability], [0, 8, 'medium'], 'a clean attempt at its own tempo: nothing flagged');
  assert(Math.abs(r.tempoRatio - 1.2) < 1e-9, 'the player\'s own tempo is allowed for');
  const wrong = heard(500); wrong[3] = { midi: 66, ms: 1500, clarity: 0.97 };
  r = P.alignAttempt(E, wrong);
  eq(r.flags.map(f => [f.kind, f.at]), [['wrong', 3]], 'a wrong note, at its place');
  assert(/F♯4 for F4/.test(r.flags[0].words), `in words: ${r.flags[0].words}`);
  r = P.alignAttempt(E, heard(500, 5));
  eq(r.flags.map(f => [f.kind, f.at, f.confidence]), [['missed', 5, 'low']], 'a missed note, marked unsure');
  const oct = heard(500); oct[2] = { midi: 76, ms: 1000, clarity: 0.97 };
  r = P.alignAttempt(E, oct);
  eq([r.matched, r.flags.map(f => [f.kind, f.confidence])], [8, [['octave', 'low']]], 'an octave away counts as heard and is flagged as unsure');
  const late = heard(500); for (let i = 4; i < late.length; i++) late[i].ms += 2000;
  r = P.alignAttempt(E, late);
  eq(r.flags.map(f => [f.kind, f.at]), [['hesitation', 4]], 'a long pause before a note is a hesitation');
  r = P.alignAttempt(E, heard(500), { noise: 0.5 });
  eq(r.reliability, 'low', 'a noisy room lowers the reliability');
  r = P.alignAttempt(E, []);
  eq([r.reliability, r.flags.filter(f => f.kind !== 'missed').length], ['none', 0], 'nothing heard: nothing claimed');
  assert(/Nothing was heard/.test(r.summary), 'and it says so');
  const all = [P.alignAttempt(E, wrong), P.alignAttempt(E, oct), P.alignAttempt(E, late)].flatMap(x => x.flags);
  assert(all.every(f => f.confidence !== 'high'), 'no flag is ever certain');
}

console.log(`Practice checks passed (${checks} checks).`);
