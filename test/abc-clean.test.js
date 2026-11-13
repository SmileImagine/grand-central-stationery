#!/usr/bin/env node
'use strict';
// course/abc-clean.js: what a workshop record publishes, and what stays in the workshop.
const assert = require('assert');
const { clean, privatize, publicIssues } = require('../course/abc-clean.js');

const record = `% holding-id: x
% dossier-function: a game
X:1
T:Bingo
C:traditional
O:England
S:Gomme (1894), p. 29
N:HOW READ (2026-11-12): from the MIDI, quantised by a script.
N:UNCERTAIN: bar 3.
N:A ring game: the miller stands in the middle.
M:4/4
L:1/8
K:A
% style folk: conservative guess
%%style folk
(AA EE FF EE | AA BB c2 A2) |]
w: The mil-ler's mill-dog lay at the mill door
`;
const priv = privatize(record);
assert(/^% holding-how-read: \(2026-11-12\) from the MIDI/m.test(priv), 'HOW READ becomes a holding- comment, its date kept');
assert(/^% holding-uncertain: bar 3\.$/m.test(priv), 'UNCERTAIN becomes a holding- comment');
assert(/^N:A ring game/m.test(priv), 'a note for readers stays an N: line');
const pub = clean(priv);
assert(!/^%(?!%)/m.test(pub), 'no single-% line is published');
assert(/^%%style folk$/m.test(pub), '%% directives are published');
assert(/^X:1\nT:Bingo/.test(pub), 'the published ABC starts at X:');
assert.deepStrictEqual(publicIssues(priv).filter(i => i.level !== 'note'), [], 'a clean record needs nothing fixed');
assert(publicIssues(record).some(i => i.code === 'public-note'), 'a working note left as N: is flagged');
assert(publicIssues(priv.replace(/^C:.*\n/m, '')).some(i => i.code === 'public-header'), 'a missing C: is flagged');
assert(publicIssues(priv.replace('T:Bingo', 'T:Bingo\nT:singing game, -1')).some(i => i.code === 'public-title'), 'a version number in a title is flagged');
assert(publicIssues(priv.replace('S:Gomme (1894), p. 29', 'S:traditional, as commonly sung (course transcription)')).some(i => i.code === 'public-header'), 'bookkeeping in a header line is flagged');
assert(publicIssues(priv.replace('S:Gomme (1894), p. 29', 'S:course/samples/first-tunes.abc')).some(i => i.code === 'public-header'), 'a file path as the source is flagged');
assert(!publicIssues(priv.replace('N:A ring game', 'N:A ring game whose origin is uncertain')).some(i => i.code === 'public-note'), '"uncertain" in a sentence is a reader\'s word');
const { repeatsOrigin, datedSource, hideDatedSource } = require('../course/abc-clean.js');
assert(publicIssues(priv.replace('C:traditional', 'C:traditional (England)')).some(i => i.code === 'public-header' && /repeats the origin/.test(i.msg)), 'a composer line that repeats the origin is flagged');
assert.strictEqual(repeatsOrigin('traditional (French), set by Ch.-M. Widor', 'France'), 'traditional, set by Ch.-M. Widor', 'the repeated bracket goes, the rest stays');
assert.strictEqual(repeatsOrigin('traditional (Ndau)', 'Mozambique, Ndau people'), null, 'a people the origin names after a place is kept');
assert(datedSource('Songs and Tales from the Dark Continent') && !datedSource('Traditional Games of England'), 'a dated title is recognised');
const hid = hideDatedSource('X:1\nS:Curtis, Songs from the Dark Continent (1920)\nK:C\n');
assert(/^%S/m.test(hid) && hid.length === 'X:1\nS:Curtis, Songs from the Dark Continent (1920)\nK:C\n'.length, 'a dated source line becomes a comment of the same length');
console.log('abc-clean checks passed (18 checks)');
