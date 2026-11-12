'use strict';
// The tunes the tests check the engine against: the published set when it has tunes; otherwise, in the workshop
// branch, course/holding/test-set.json (a frozen copy of the set as it was before every piece was withdrawn on
// 12 November 2026, kept off main so the public site serves none of it); otherwise null, and the test says it skipped.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
module.exports = function publishedSet() {
  for (const f of ['course/set.json', 'course/holding/test-set.json']) {
    try { const s = JSON.parse(fs.readFileSync(path.join(root, f), 'utf8')); if (s.tunes && s.tunes.length) return { set: s, file: f }; } catch (e) {}
  }
  return null;
};
module.exports.skip = name => { console.log(`${name}: skipped, no published tunes to check against (every piece was withdrawn on 12 November 2026)`); process.exit(0); };
