'use strict';
// The tunes the tests check the engine against. The checks name particular tunes and counts from the set as it was
// before every piece was withdrawn on 12 November 2026 (119 tunes), so they need that whole set: the published set
// once it holds most of it again (pieces return one at a time after the teacher confirms them); else, in the workshop
// branch, course/holding/test-set.json (a frozen copy, kept off main so the public site serves none of it); else
// null, and the test says it skipped.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const FULL = 100;   // a published set this large is the reference set again
const read = f => { try { const s = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); return s.tunes && s.tunes.length ? s : null; } catch (e) { return null; } };
module.exports = function publishedSet() {
  const pub = read('course/set.json');
  if (pub && pub.tunes.length >= FULL) return { set: pub, file: 'course/set.json' };
  const frozen = read('course/holding/test-set.json');
  if (frozen) return { set: frozen, file: 'course/holding/test-set.json' };
  return null;
};
module.exports.skip = name => {
  const pub = read('course/set.json'), n = pub ? pub.tunes.length : 0;
  console.log(`${name}: skipped: the engine checks need the reference set (${FULL}+ tunes); ${n} published since every piece was withdrawn on 12 November 2026. They run on the workshop branch.`);
  process.exit(0);
};
