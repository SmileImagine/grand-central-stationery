#!/usr/bin/env node
'use strict';
// The tune editor's save server, run against a temporary copy of serve.js and course/ so no real record changes.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gcs-serve-'));
fs.cpSync(path.join(root, 'course'), path.join(tmp, 'course'), { recursive: true });
fs.copyFileSync(path.join(root, 'serve.js'), path.join(tmp, 'serve.js'));
const privateDir = path.join(tmp, 'course', 'private-review');
fs.mkdirSync(privateDir, { recursive: true });
const fixtureHoldingId = JSON.parse(fs.readFileSync(path.join(tmp, 'course/holding/index.json'), 'utf8')).items[0].id;
fs.writeFileSync(path.join(privateDir, 'reviewer-outreach.local.json'), JSON.stringify({ schema: 1, records: { [`holding/${fixtureHoldingId}`]: { contacts: [{ name: 'Local test reviewer' }] } } }));
const port = 20000 + Math.floor(Math.random() * 20000);
const base = `http://127.0.0.1:${port}`;
let checks = 0;
const assert = (ok, message) => { checks++; if (!ok) throw new Error(message); };
const put = (url, body, headers = { 'Content-Type': 'application/json' }) => fetch(base + url, { method: 'PUT', headers, body: JSON.stringify(body) });

const server = spawn(process.execPath, ['serve.js', String(port)], { cwd: tmp, stdio: ['ignore', 'pipe', 'pipe'] });
const done = err => { server.kill(); fs.rmSync(tmp, { recursive: true, force: true }); if (err) { console.error(err.stack || err); process.exit(1); } };

(async () => {
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/ping'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  assert((await (await fetch(base + '/api/ping')).json()).save === true, 'ping must say the server can save');
  assert((await fetch(base + '/course/editor.html')).status === 200, 'the editor page must be served');
  assert([403, 404].includes((await fetch(base + '/%2e%2e/%2e%2e/%2e%2e/etc/hosts')).status), 'a path outside the folder must not be served');
  const outreach = await (await fetch(base + '/api/reviewer-outreach')).json();
  assert(outreach.available === true && outreach.records[`holding/${fixtureHoldingId}`].contacts[0].name === 'Local test reviewer', 'the loopback API must load the ignored reviewer file');
  assert((await fetch(base + '/course/private-review/reviewer-outreach.local.json')).status === 404, 'the reviewer file must never be served as a static file');
  assert((await fetch(base + '/course/private-review/')).status === 404, 'the private reviewer directory must never be listed');

  const id = fixtureHoldingId;
  const file = path.join(tmp, 'course/holding/items', `${id}.abc`), original = fs.readFileSync(file, 'utf8');
  const got = await (await fetch(`${base}/api/tune/holding/${id}`)).json();
  assert(got.text === original && /^[0-9a-f]{40}$/.test(got.etag), 'GET must return the file and its etag');
  assert((await fetch(`${base}/api/tune/holding/..%2F..%2Fserve`)).status === 400, 'an id with a path in it must be refused');
  assert((await fetch(`${base}/api/tune/elsewhere/${id}`)).status === 400, 'only the holding and review folders may be named');

  assert((await put(`/api/tune/holding/${id}`, { text: original, etag: got.etag }, { 'Content-Type': 'text/plain' })).status === 403, 'a save that is not JSON must be refused');
  assert((await put(`/api/tune/holding/${id}`, { text: original + '\n', etag: 'stale' })).status === 409, 'a stale etag must be refused as changed on disk');

  // A reject without a note fails the workshop's validation: the save is undone and the reason comes back.
  const rejected = original.replace(/^(% holding-id:.*)$/m, '$1\n% holding-decision: reject');
  const bad = await put(`/api/tune/holding/${id}`, { text: rejected, etag: got.etag });
  assert(bad.status === 422 && /decision-note/.test((await bad.json()).error), 'a reject without a note must fail validation');
  assert(fs.readFileSync(file, 'utf8') === original, 'a failed save must leave the file as it was');

  // A good save writes the file, rebuilds the index and the sets, and returns the new etag.
  const good = rejected.replace('% holding-decision: reject', '% holding-decision: reject\n% holding-decision-note: not for this course\n% holding-response: Agreed on the source.\n% holding-response:\n% holding-response: Second paragraph.');
  const ok = await put(`/api/tune/holding/${id}`, { text: good, etag: got.etag });
  const okBody = await ok.json();
  assert(ok.status === 200 && fs.readFileSync(file, 'utf8') === good, `a valid save must write the file (${okBody.error || ''})`);
  const item = JSON.parse(fs.readFileSync(path.join(tmp, 'course/holding/index.json'), 'utf8')).items.find(it => it.id === id);
  assert(item.decision === 'reject' && item.decisionNote === 'not for this course', 'the index must carry the decision and its note');
  assert(item.response === 'Agreed on the source.\n\nSecond paragraph.', 'a response over several lines must be joined with its blank line');
  assert(fs.readFileSync(path.join(tmp, 'course/sets.js'), 'utf8').includes('not for this course'), 'course/sets.js must be rebuilt after a save');
  assert((await put(`/api/tune/holding/${id}`, { text: original, etag: got.etag })).status === 409, 'the old etag must no longer save');

  // The review queue: a remove needs a review-decision.
  const rid = JSON.parse(fs.readFileSync(path.join(tmp, 'course/review/index.json'), 'utf8')).items[0].id;
  const rg = await (await fetch(`${base}/api/tune/review/${rid}`)).json();
  const removed = rg.text.replace(/^% review-status:.*$/m, '% review-status: remove');
  assert((await put(`/api/tune/review/${rid}`, { text: removed, etag: rg.etag })).status === 422, 'a remove without a review-decision must fail validation');
  const kept = rg.text.replace(/^% review-status:.*$/m, '% review-status: keep').replace(/^% review-decision:.*$/m, '% review-decision: fine as it is\n% review-response: I agree.');
  assert((await put(`/api/tune/review/${rid}`, { text: kept, etag: rg.etag })).status === 200, 'a review record must save');
  const ritem = JSON.parse(fs.readFileSync(path.join(tmp, 'course/review/index.json'), 'utf8')).items.find(it => it.id === rid);
  assert(ritem.status === 'keep' && ritem.response === 'I agree.', 'the review index must carry the status and the response');

  console.log(`Save server checks passed (${checks} checks).`);
  done();
})().catch(done);
