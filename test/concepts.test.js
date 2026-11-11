#!/usr/bin/env node
'use strict';
// One idea from each element of music in each piece (course/concepts.js, course/concepts.json). Every example is
// re-read from its own bars by the generator's check; here a sample is re-read independently, straight from the
// analyzer, so a change to the generator's tests cannot quietly move what the bars hold.

const fs = require('fs');
const path = require('path');
const ABCJS = require('../vendor/abcjs-basic-min.js');
const Analyze = require('../course/analyze.js');
const P = require('../course/practice.js');
const C = require('../course/concepts.js');

const root = path.resolve(__dirname, '..');
const set = JSON.parse(fs.readFileSync(path.join(root, 'course', 'set.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(root, 'course', 'concepts.json'), 'utf8'));
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };
const eq = (a, b, message) => assert(JSON.stringify(a) === JSON.stringify(b), `${message}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
const tune = id => { const t = set.tunes.find(x => x.id === id); if (!t) throw new Error(`no tune ${id} in the set`); return t; };
const entry = (id, el) => data.tunes[id][el];
// The bars first..last (1 up) written out as a tune and analysed afresh.
const bars = (id, first, last) => Analyze.analyzeAbc(P.phraseAbc(tune(id).abc, ABCJS, { from: first - 1, to: last }), ABCJS)[0].features;
const at = (id, el) => { const x = entry(id, el); return bars(id, x.bars[0], x.bars[1]); };
const has = (f, tag) => (f.skills || []).includes(tag);

/* ---------------- the file is current and every example still shows its idea ---------------- */
{
  const built = C.buildConcepts(set, ABCJS);
  assert(JSON.stringify(built, null, 1) + '\n' === fs.readFileSync(path.join(root, 'course', 'concepts.json'), 'utf8'), 'course/concepts.json is stale: run make concepts');
  assert(C.renderMarkdown(built, set) === fs.readFileSync(path.join(root, 'course', 'concepts.md'), 'utf8'), 'course/concepts.md is stale: run make concepts');
  const problems = C.verify(data, set, ABCJS);
  assert(!problems.length, problems.join('\n'));
}

/* ---------------- the curriculum's elements, every piece, every element ---------------- */
{
  eq(data.elements.map(e => e.name), ['duration', 'pitch', 'dynamics and other expressive controls', 'timbre', 'texture/harmony', 'form'], 'the six elements of music the Fundamental Concepts boxes name, in their order');
  eq(Object.keys(data.tunes).sort(), set.tunes.map(t => t.id).sort(), 'every published piece, and only those');
  for (const t of set.tunes) for (const e of data.elements) {
    const x = entry(t.id, e.id);
    assert(x && (x.absent ? typeof x.reason === 'string' && x.reason.length > 10 : x.term && x.words && x.name && x.reason && x.grade >= 1 && x.grade <= 8), `${t.id} ${e.id}: a concept with its words, or absent with a reason`);
    if (!x.absent) assert(x.bars[0] >= 1 && x.bars[1] >= x.bars[0] && x.bars[1] <= P.barsOf(t.abc, ABCJS).bars.length, `${t.id} ${e.id}: bars inside the piece`);
  }
  // Duration, pitch and form are in every piece; dynamics and timbre only where the music writes them.
  for (const t of set.tunes) for (const el of ['duration', 'pitch', 'form']) assert(!entry(t.id, el).absent, `${t.id}: every piece shows ${el}`);
  for (const t of set.tunes) {
    const f = Analyze.analyzeAbc(t.abc, ABCJS)[0].features;
    const marked = f.decorations.length > 0 || f.slurs > 0 || f.graceNotes > 0;
    assert(!!entry(t.id, 'dynamics').absent === !marked, `${t.id}: dynamics are tagged exactly when the music marks them`);
    assert(!!entry(t.id, 'timbre').absent === !/^%%style\s+drone/m.test(t.abc), `${t.id}: timbre only when the music names its sound`);
    assert(!!entry(t.id, 'texture').absent === !(f.chordSymbols > 0 || /^%%style\s+drone|^%%round/m.test(t.abc) || f.voices > 1), `${t.id}: texture only when chords, a drone or parts are written`);
  }
}

/* ---------------- a sample, re-read straight from the analyzer ---------------- */
{
  // Twinkle's leap of a 5th is bar 1 alone, not bars 1-2.
  eq(entry('first-tunes-3-twinkle-twinkle-little-star', 'pitch').bars, [1, 1], 'Twinkle: the leap is in bar 1');
  eq(at('first-tunes-3-twinkle-twinkle-little-star', 'pitch').maxLeap, 7, 'Twinkle bar 1: do up to so, a 5th');
  // Rain, Rain's leap of a 4th crosses the barline: bars 3-4, and neither bar alone has it.
  eq(entry('beginner-songs-1-rain-rain-go-away', 'pitch').bars, [3, 4], 'Rain, Rain: the leap crosses from bar 3 to bar 4');
  eq(at('beginner-songs-1-rain-rain-go-away', 'pitch').maxLeap, 5, 'Rain, Rain bars 3-4: mi up to la, a 4th');
  assert(bars('beginner-songs-1-rain-rain-go-away', 3, 3).maxLeap < 5 && bars('beginner-songs-1-rain-rain-go-away', 4, 4).maxLeap < 5, 'Rain, Rain: neither bar alone has the 4th');
  // Durations, as the analyzer names them.
  assert(has(at('original-pentatonic-8-evening-bells', 'duration'), 'dur:4'), 'Evening Bells: the whole note it introduces');
  assert(has(at('hindostan-2-malkos', 'duration'), 'dur:1/4'), 'Malkos: the sixteenths it introduces');
  assert(at('reelsd-g-32-sweet-ellen', 'duration').syncopations > 0, 'Sweet Ellen: syncopation in its bar');
  assert(at('reelsa-c-28-billy-in-the-lowground', 'duration').tripletCount > 0, 'Billy In The Lowground: a triplet in its bar');
  const eyes = 'hindostan-folk-1-o-give-me-those-pretty-eyes';
  eq(entry(eyes, 'duration').bars, [2, 3], 'O give me those pretty eyes: the change of metre, across one barline');
  assert(has(at(eyes, 'duration'), 'metre-change') && !has(bars(eyes, 2, 2), 'metre-change') && !has(bars(eyes, 3, 3), 'metre-change'), 'the change of metre needs both bars');
  // Pitch.
  assert(has(at('hindostan-4-desh', 'pitch'), 'accidentals'), 'Desh: the natural and flat seventh');
  eq(new Set(Analyze.analyzeAbc(P.phraseAbc(tune('original-pentatonic-2-crows-on-the-fence').abc, ABCJS, { from: 2, to: 4 }), ABCJS)[0].features.degrees).size, 5, 'Crows on the Fence bars 3-4: all five pentatonic notes');
  assert(at('beginner-songs-13-fr-re-jacques', 'pitch').belowDo > 0, 'Frère Jacques: the bells ring below do');
  // Dynamics, texture.
  assert(at('reelsd-g-12-the-donegall', 'dynamics').slurs > 0, 'The Donegall: the slur');
  assert(has(at('hindostan-folk-5-chhaila', 'dynamics'), 'grace-notes'), 'Chhaila: the grace note');
  const mary = at('morris-7-highland-mary', 'texture').chordDegrees;
  assert(['I', 'IV', 'V'].every(d => mary.includes(d)), 'Highland Mary: chords on I, IV and V');
  const evening = at('original-pentatonic-8-evening-bells', 'texture').chordDegrees;
  assert(evening.includes('I') && evening.includes('V'), 'Evening Bells: V to I');
  // Form: Twinkle's A comes back at bar 9 (bars 9-12 are bars 1-4), and the example is the seam, bars 8-9.
  const tw = P.barsOf(tune('first-tunes-3-twinkle-twinkle-little-star').abc, ABCJS).bars, key = b => b.notes.map(n => n.pitches.map(p => p.pitch).join() + '/' + n.duration).join(' ');
  assert([0, 1, 2, 3].every(i => key(tw[i]) === key(tw[8 + i])), 'Twinkle: bars 9-12 repeat bars 1-4');
  eq(entry('first-tunes-3-twinkle-twinkle-little-star', 'form').bars, [8, 9], 'Twinkle: the return of A, at the seam');
  eq(entry('beginner-songs-10-lightly-row', 'form').concept, 'aaba', 'Lightly Row: A A B A');
  // Reasons quote the words only where the verse fits the notes.
  assert(/on “Rain, rain, go a-way”/.test(entry('beginner-songs-1-rain-rain-go-away', 'form').reason), 'Rain, Rain: the phrase quotes its words');
  assert(!/on “/.test(entry('beginner-songs-11-skip-to-my-lou', 'pitch').reason), 'Skip to My Lou: its verse does not fit its notes, so no words are quoted');
}

/* ---------------- the Listen step's choices ---------------- */
{
  const tw = P.conceptChoices(data.tunes['first-tunes-3-twinkle-twinkle-little-star'], 12);
  eq(tw.map(c => c.el), ['duration', 'pitch', 'form'], 'Twinkle: one choice per element it shows, in the curriculum’s order');
  eq([tw[1].from, tw[1].to, tw[1].first, tw[1].last, tw[1].words], [0, 1, 1, 1, 'a leap of a perfect 5th'], 'a choice carries its bars as the piece view plays them');
  eq(P.conceptChoices(data.tunes['first-tunes-3-twinkle-twinkle-little-star'], 5).map(c => c.el), ['duration', 'pitch'], 'a choice past the end of the piece is left out');
  eq(P.conceptChoices(null), [], 'no data, no choices');
  eq(P.conceptChoices(data.tunes['hindostan-folk-5-chhaila']).length, 6, 'Chhaila shows all six elements');
}

console.log(`Concept checks passed (${checks} checks; ${set.tunes.length} pieces).`);
