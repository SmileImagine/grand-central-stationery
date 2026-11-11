#!/usr/bin/env node
'use strict';

/*
  Rounds for the course reports: how well a tune works sung against itself.

  ROUND_COST, roundFit and roundPlan are copies of index.html's, which play and
  check a tune with a %%round line; test/class-parts.test.js checks that the
  copies agree, so change them together. roundFit scores, on every beat, each
  pair of top notes the groups sound together (unisons, thirds, fifths, sixths
  and octaves fit; fourths count half; seconds, sevenths and the tritone
  clash), and names the bars with a clash on the downbeat. roundPlan picks the
  distance between entries as the page does when no every= is written.

  timeline(abc) builds what the page's timeline holds (events in ms with their
  sounding pitches, the bars, the beat) from abcjs's audio tracks, at a fixed
  tempo; rounds(abc) gives the page's plan for 2, 3 and 4 groups.

    node course/round-fit.js course/set.json      every tune's best round
*/
const path = require('path');
const ABCJS = require(path.join(__dirname, '..', 'vendor', 'abcjs-basic-min.js'));

  const ROUND_COST = [0, 1, 1, 0, 0, 0.5, 1, 0, 0, 0, 1, 1];
  function roundFit(events, total, off, parts, step, bars, first = 0) {
    const top = x => {
      x = ((x % total) + total) % total;
      let lo = 0, hi = events.length - 1, k = -1;
      while (lo <= hi) { const mid = (lo + hi) >> 1; if (events[mid].ms <= x + 1e-6) { k = mid; lo = mid + 1; } else hi = mid - 1; }
      const ms = k >= 0 ? events[k].midis : []; return ms && ms.length ? Math.max(...ms) : null;
    };
    let cost = 0, n = 0, same = 0; const clash = new Set();
    for (let x = 0; x < total - 1; x += step) {
      const ps = []; for (let g = 0; g < parts; g++) { const p = top(x - g * off); if (p !== null) ps.push(p); }
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const ic = Math.abs(ps[i] - ps[j]) % 12, c = ROUND_COST[ic]; cost += c; n++; if (!ic) same++;
        if (c === 1) { const b = bars.findIndex(b => x >= b.start - 1e-6 && x < b.end - 1e-6); if (b >= 0 && Math.abs(x - bars[b].start) < 1) clash.add(Math.max(1, b + 1 - first)); }
      }
    }
    return { fit: n ? 1 - cost / n : 1, same: n ? same / n : 0, clash: [...clash].sort((a, b) => a - b) };
  }
  function roundPlan(fit, bars, want, written) {
    const even = Math.max(1, Math.floor(bars / want));
    let every = written, chosen = false;
    if (!every) {
      let top = null;
      for (let e = 1; e <= even; e++) {
        const f = fit(e, want), score = f.fit - 0.05 * f.clash.length - 0.25 * f.same - (f.same > 0.5 ? 1 : 0) - 0.001 * (even - e);
        if (!top || score > top.score) top = { e, score };
      }
      every = top ? top.e : even; chosen = !!top && top.e !== even;
    }
    const room = Math.ceil(bars / every), parts = Math.min(want, room);
    if (parts < 2) return { every, chosen, room, parts, mine: null, best: null };
    const mine = fit(every, parts); let best = null;
    if (written) for (let e = 1; e <= Math.max(1, Math.floor(bars / parts)); e++) if (e !== every) {
      const f = fit(e, parts);
      if (f.same <= Math.max(0.5, mine.same) && f.fit > mine.fit + (mine.clash.length ? 0.03 : 0.08) && f.clash.length <= mine.clash.length && (!best || f.fit > best.fit)) best = { ...f, every: e };
    }
    return { every, chosen, room, parts, mine, best };
  }

const MS_PER_WHOLE = 2400;   // any tempo: the fit is in beats, and the downbeat test allows 1 ms

// The page's timeline for a tune: an event at each melody note (its pitch) and at each silence after one (none), the
// written bars as played (a pickup is bar 0, so its number is 1 less), the beat, and the length rounded to whole bars.
function timeline(abc) {
  const plain = abc.replace(/^%%?(band|tuning|style|round)\b/mg, m => '%' + ' '.repeat(m.length - 1));
  const tune = ABCJS.parseOnly(plain)[0];
  if (!tune || !tune.lines) return null;
  let tracks = null; try { tracks = tune.setUpAudio({}).tracks; } catch (err) { return null; }
  const melody = (tracks || []).map(tr => tr.filter(e => e.cmd === 'note' && e.duration > 0)).find(ns => ns.some(n => n.startChar !== undefined));
  if (!melody || !melody.length) return null;
  const mf = tune.getMeterFraction(), barLen = mf && mf.num ? mf.num / mf.den : 1, pickup = tune.getPickupLength() || 0;
  const starts = new Map();
  for (const n of melody) { const k = Math.round(n.start * 1e6); if (!starts.has(k)) starts.set(k, { t: n.start, midis: [], end: 0 }); const e = starts.get(k); e.midis.push(n.pitch); e.end = Math.max(e.end, n.start + n.duration); }
  const on = [...starts.values()].sort((a, b) => a.t - b.t), events = [];
  on.forEach((e, i) => { events.push({ ms: e.t * MS_PER_WHOLE, midis: e.midis }); const next = on[i + 1]; if (next && next.t > e.end + 1e-6) events.push({ ms: e.end * MS_PER_WHOLE, midis: [] }); });
  const end = Math.max(...on.map(e => e.end)), full = Math.max(1, Math.ceil((end - pickup) / barLen - 1e-6)), total = (pickup + full * barLen) * MS_PER_WHOLE;
  const bars = []; let t = 0;
  if (pickup > 1e-6) { bars.push({ start: 0, end: pickup * MS_PER_WHOLE }); t = pickup; }
  for (let b = 0; b < full; b++, t += barLen) bars.push({ start: t * MS_PER_WHOLE, end: (t + barLen) * MS_PER_WHOLE });
  return { events, total, bars, firstBar: pickup > 1e-6 ? 1 : 0, beatMs: tune.getBeatLength() * MS_PER_WHOLE, barMs: barLen * MS_PER_WHOLE, count: full };
}

// The page's plan for 2, 3 and 4 groups with no every= written: { groups, every, parts, fit, same, clash } each.
function rounds(abc) {
  const tl = timeline(abc); if (!tl) return null;
  const bars = Math.max(1, Math.round(tl.total / tl.barMs));
  const fit = (e, n) => roundFit(tl.events, tl.total, e * tl.barMs, n, tl.beatMs, tl.bars, tl.firstBar);
  return { bars, plans: [2, 3, 4].map(groups => { const p = roundPlan(fit, bars, groups, null); return { groups, every: p.every, parts: p.parts, fit: p.mine ? p.mine.fit : null, same: p.mine ? p.mine.same : null, clash: p.mine ? p.mine.clash : [] }; }) };
}

if (require.main === module) {
  const fs = require('fs'), file = process.argv[2] || path.join(__dirname, 'set.json');
  for (const t of JSON.parse(fs.readFileSync(file, 'utf8')).tunes) {
    const r = rounds(t.abc); if (!r) { console.log(`${t.title}: not read`); continue; }
    console.log(`${t.title} (${r.bars} bars): ` + r.plans.filter(p => p.parts === p.groups).map(p => `${p.groups} every ${p.every} ${Math.round(p.fit * 100)}%${p.clash.length ? ' clash ' + p.clash.join(',') : ''}${p.same > 0.5 ? ' unison' : ''}`).join('; '));
  }
}

module.exports = { ROUND_COST, roundFit, roundPlan, timeline, rounds, MS_PER_WHOLE };
