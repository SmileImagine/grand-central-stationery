/*
  Phrase marks above the notes. abcjs bends a slur to the side away from the stems, so a long phrase mark over notes
  with their stems up lies under them, through the words. ABC has no portable way to say "above" that abcjs reads,
  so after drawing, a phrase slur that lies below its notes is mirrored above them.

  A phrase slur: a dotted one (.( ... ), the course's phrase mark), or any slur that crosses a bar line or runs on over
  a line's edge. A short solid slur (legato) is left where abcjs puts it.

  GCSLiftPhraseSlurs(root)   root: an element holding abcjs's svg(s), drawn with add_classes: true
*/
(function (root) {
  'use strict';
  function lift(container) {
    if (!container) return;
    const svgs = container.tagName && container.tagName.toLowerCase() === 'svg' ? [container] : [...container.querySelectorAll('svg')];
    const box = el => { try { return el.getBBox(); } catch (e) { return null; } };
    // A note's own drawing (head, stem, flags, accidentals), not its words: abcjs groups the lyrics with the note.
    const noteBox = n => {
      const parts = [...n.querySelectorAll('path')].map(box).filter(q => q && (q.width || q.height));
      if (!parts.length) return box(n);
      const x = Math.min(...parts.map(q => q.x)), y = Math.min(...parts.map(q => q.y));
      return { x, y, width: Math.max(...parts.map(q => q.x + q.width)) - x, height: Math.max(...parts.map(q => q.y + q.height)) - y };
    };
    const headMid = n => { const h = n.querySelector('.abcjs-notehead'), q = h ? box(h) : noteBox(n); return q ? q.y + q.height / 2 : null; };
    const lineOf = el => [...el.classList].find(c => /^abcjs-l\d+$/.test(c)) || '';
    for (const svg of svgs) for (const p of svg.querySelectorAll('path.abcjs-slur')) {
      if (p.dataset.lifted) continue;
      const b = box(p), L = lineOf(p); if (!b || !b.width || !L) continue;
      const x1 = b.x, x2 = b.x + b.width, mid = b.y + b.height / 2;
      const notes = [...svg.querySelectorAll(`.abcjs-note.${L}`)].map(n => ({ q: noteBox(n), mid: headMid(n) })).filter(o => o.q && o.q.width && o.q.x + o.q.width > x1 && o.q.x < x2);
      if (!notes.length) continue;
      const under = notes.map(o => o.q);
      const dotted = p.classList.contains('abcjs-dotted') || /dash/.test(p.getAttribute('stroke-dasharray') || '') || !!p.getAttribute('stroke-dasharray');
      const edge = p.classList.contains('abcjs-start-edge') || p.classList.contains('abcjs-end-edge');
      const crosses = [...svg.querySelectorAll(`.abcjs-bar.${L}`)].map(box).some(r => r && r.x > x1 + 2 && r.x < x2 - 2);
      if (!dotted && !edge && !crosses) continue;
      const top = Math.min(...under.map(q => q.y)), heads = notes.map(o => o.mid).filter(v => v !== null);
      const centre = heads.reduce((t, v) => t + v, 0) / heads.length;
      if (mid < centre) continue;   // already above the noteheads
      // Mirror the path's own points so that its old top edge lands just over the highest note (and chord symbol), and
      // flatten it a little: above the notes the arc rises toward the line of words over the staff.
      const base = top - 3, k = 0.65;
      p.setAttribute('d', p.getAttribute('d').replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g, (m, x, y) => `${x} ${(base - (y - b.y) * k).toFixed(2)}`));
      p.dataset.lifted = '1';
    }
  }
  root.GCSLiftPhraseSlurs = lift;
  if (typeof module === 'object' && module.exports) module.exports = lift;
}(typeof self !== 'undefined' ? self : this));
