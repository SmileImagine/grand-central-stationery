/*
  The public face of a workshop record (the teacher's rule of 12 November 2026): the published ABC holds the music,
  the words, the header fields a reader needs (T: C: O: R: S: Z:), the band lines (%%style, %%band ...) and N: lines a
  teacher or performer needs. Everything about how the record was made stays in the workshop file as comment lines
  (% holding-*, % dossier-*, % source-url, % performance-*), which publishing drops.

  clean(text)         the ABC as it would be published: every single-% comment line dropped, %% directives kept
  privatize(text)     the working notes once written as N: lines (HOW READ, UNCERTAIN, PHRASES, THE PLATE, THE PAGE,
                      OTHER VERSIONS) rewritten as % holding-* comment lines, in place
  publicIssues(text)  what in the clean ABC still reads like a working note, or what a reader would miss

  Used by course/abc-lint.js (the public check), course/holding/publish.js and the library (Confirm shows the clean ABC).
*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GCSClean = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PRIVATE = { 'HOW READ': 'how-read', 'UNCERTAIN': 'uncertain', 'PHRASES': 'phrases', 'THE PLATE': 'page', 'THE PAGE': 'page', 'OTHER VERSIONS': 'other-versions' };
  const LABEL = new RegExp(`^N:\\s*(${Object.keys(PRIVATE).join('|')})\\b\\s*(\\([^)]*\\))?\\s*:?\\s*`);

  function privatize(text) {
    return text.split('\n').map(l => {
      const m = l.match(LABEL);
      if (!m) return l;
      return `% holding-${PRIVATE[m[1]]}: ${m[2] ? m[2] + ' ' : ''}${l.slice(m[0].length)}`.replace(/\s+$/, '');
    }).join('\n');
  }

  function clean(text) {
    const out = [];
    for (const l of text.split('\n')) {
      if (/^%(?!%)/.test(l)) continue;               // a comment: the workshop's own
      if (!l.trim() && (!out.length || !out[out.length - 1].trim())) continue;   // no leading or doubled blank lines
      out.push(l.replace(/\s+$/, ''));
    }
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out.join('\n') + '\n';
  }

  // Signs of a working note: our tools, how the notes were read, the labels of the private notes, dates of edits.
  // The private labels count only in capitals, as they were written ("the plate" in a sentence is a reader's word);
  // "Check:" opens a note to the checker.
  const LABELS = /\b(HOW READ|UNCERTAIN|PHRASES|THE PLATE|THE PAGE|OTHER VERSIONS|SOURCE CHECK)\b|\bCheck:/;
  const SIGNS = /abc-lint|approve\.js|\.(js|py)\b|\bscripts?\b|automat|quantis|\bMIDI\b|MusicXML|\bdpi\b|\bcrops?\b|detector|notehead|\bworkshop\b|\bholding\b|\bthis record\b|\b20\d\d-\d\d-\d\d\b/i;
  const PROCESS = { test: l => LABELS.test(l) || SIGNS.test(l) };
  // In a header field (title, composer, origin, type, source, credit): the course's own bookkeeping, a file path.
  const HEADER = /course transcription|course\/samples|\.(abc|js|py)\b|private workshop|canonical source|\bworkshop\b|\bholding\b|\bthis record\b|from memory|abc-lint|conservative guess/i;
  /* The composer line names the people or place in brackets, "traditional (Japan)"; abcjs prints the origin (O:) in
     brackets after the composer, so when the bracket only repeats the origin a reader sees "traditional (Japan)
     (Japan)". repeatsOrigin(C, O) gives the composer line without the parts of its bracket that repeat the origin
     (null when nothing repeats): "traditional (French), set by Widor" with O:France -> "traditional, set by Widor". */
  const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
  const DEMONYM = { french: 'france', english: 'england', japanese: 'japan', korean: 'korea', spanish: 'spain', persian: 'persia', scottish: 'scotland', irish: 'ireland', welsh: 'wales', american: 'unitedstates', chinese: 'china', german: 'germany', italian: 'italy', hungarian: 'hungary', bulgarian: 'bulgaria', mexican: 'mexico', jamaican: 'jamaica', turkish: 'turkey', greek: 'greece', russian: 'russia', polish: 'poland', czech: 'czech', swedish: 'sweden', norwegian: 'norway', danish: 'denmark', dutch: 'netherlands', portuguese: 'portugal', brazilian: 'brazil', cuban: 'cuba', filipino: 'philippines', indian: 'india', vietnamese: 'vietnam', thai: 'thailand' };
  const ALIAS = { usa: 'unitedstates', us: 'unitedstates', uk: 'unitedkingdom' };
  function repeatsOrigin(C, O) {
    if (!C || !O) return null;
    const m = C.match(/^(\s*traditional)\s*\(([^)]*)\)(.*)$/i); if (!m) return null;
    const o = norm(O), oo = o.replace(/^usa/, 'unitedstates');
    const dup = part => { const p = norm(part), q = ALIAS[p] || DEMONYM[p] || p; return !!q && (o.startsWith(q) || oo.startsWith(q)); };
    const parts = m[2].split(/,\s*/), keep = parts.filter(p => !dup(p));
    if (keep.length === parts.length) return null;
    return m[1] + (keep.length ? ` (${keep.join(', ')})` : '') + m[3];
  }

  /* Some old books' titles use words for peoples and places that hurt today ("the Dark Continent"). The citation stays
     in the ABC (S:), for anyone who looks the book up, but the pages do not print it: the culture is credited in C:
     and O:. hideDatedSource(text) turns such an S: line into a comment of the same length (so a map from the drawn
     score back to the typed text still holds); datedSource(s) says whether a source string is one of them. */
  const DATED = /\bdark continent\b|\bnegro(es)?\b|\bdarke?y|\bdarkies\b|\bcoons?\b|\bsavages?\b|\bheathens?\b|\bprimitive\b|\boriental\b|\bgip?s(y|ies)\b|\bgypsies\b|\bpickaninn|\bmammy\b|\bredskins?\b|\beskimos?\b|\bhindoos?\b|\bsquaws?\b/i;
  const datedSource = s => DATED.test(s || '');
  const hideDatedSource = text => text.replace(/^S:(.*)$/gm, (m, s) => DATED.test(s) ? '%S' + s : m);

  function publicIssues(text) {
    const issues = [], c = clean(text);
    const field = k => (c.match(new RegExp(`^${k}:(.*)$`, 'm')) || [])[1];
    for (const l of c.split('\n')) {
      if (/^N:/.test(l) && PROCESS.test(l)) issues.push({ level: 'warn', code: 'public-note', msg: `an N: line reads like a working note (move it to a % holding- line, or reword it for a reader): "${l.slice(0, 90)}${l.length > 90 ? '…' : ''}"` });
      if (/^[TCORSZ]:/.test(l) && HEADER.test(l)) issues.push({ level: 'warn', code: 'public-header', msg: `a header line carries the course's own bookkeeping: "${l.slice(0, 90)}${l.length > 90 ? '…' : ''}"` });
      if (/^T:/.test(l) && /,\s*-\d+\s*$|\bversion comment/i.test(l)) issues.push({ level: 'warn', code: 'public-title', msg: `a title carries a workshop version number: "${l}"` });
    }
    const C = field('C'), O = field('O');
    if (repeatsOrigin(C, O) !== null) issues.push({ level: 'warn', code: 'public-header', msg: `the composer line repeats the origin, which abcjs prints after it: "C:${C.trim()}" with "O:${O.trim()}"` });
    const missing = ['C', 'O', 'S'].filter(k => !field(k));
    if (missing.length) issues.push({ level: 'warn', code: 'public-header', msg: `the published ABC would have no ${missing.map(k => k + ':').join(' ')} (${missing.map(k => ({ C: 'composer or "traditional"', O: 'origin', S: 'source' })[k]).join(', ')})` });
    if (!field('Z')) issues.push({ level: 'note', code: 'public-credit', msg: 'no Z: line (who transcribed it, and its licence)' });
    return issues;
  }

  return { clean, privatize, publicIssues, repeatsOrigin, datedSource, hideDatedSource, PRIVATE };
}));
