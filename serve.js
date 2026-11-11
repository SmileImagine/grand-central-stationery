#!/usr/bin/env node
// Grand Central Stationery's local server: serves this folder (as `python3 -m http.server` does) and lets
// course/editor.html save a tune record back to its file.
//
//   node serve.js [port]          default 8765, bound to 127.0.0.1 only
//
// The only files it writes are the existing records course/holding/items/<id>.abc and
// course/review/items/<id>.abc. After a save it runs that folder's build.js, which validates every item
// (a save that fails validation is undone and the errors go back to the page), then course/build-sets.js.
'use strict';
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');

const root = __dirname;
const port = parseInt(process.argv[2] || process.env.PORT || '8765', 10);
const HOST = '127.0.0.1';
const FOLDERS = { holding: 'course/holding', review: 'course/review' };
const PRIVATE_REVIEW = path.join(root, 'course', 'private-review', 'reviewer-outreach.local.json');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
  '.abc': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.py': 'text/plain; charset=utf-8'
};
const etagOf = text => crypto.createHash('sha1').update(text).digest('hex');
const send = (res, status, body, type = 'application/json; charset=utf-8') => {
  const data = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(data);
};
const recordPath = (folder, id) => FOLDERS[folder] && /^[a-z0-9][a-z0-9-]*$/.test(id) ? path.join(root, FOLDERS[folder], 'items', `${id}.abc`) : null;
const run = script => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });

// Writes come only from this server's own pages: the Host must be this machine (no DNS rebinding), any Origin
// must be the same, and the body must be JSON (which a cross-site form cannot send without a preflight we never answer).
function sameSite(req) {
  const hostOk = new RegExp(`^(127\\.0\\.0\\.1|localhost|\\[::1\\]):${port}$`).test(req.headers.host || '');
  const origin = req.headers.origin;
  return hostOk && (!origin || origin === `http://${req.headers.host}`) && /^application\/json\b/.test(req.headers['content-type'] || '');
}

function localHost(req) {
  return new RegExp(`^(127\\.0\\.0\\.1|localhost|\\[::1\\]):${port}$`).test(req.headers.host || '');
}

function readBody(req, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function api(req, res, url) {
  if (url.pathname === '/api/ping') return send(res, 200, { ok: true, save: true, privateReviewerOutreach: fs.existsSync(PRIVATE_REVIEW) });
  if (url.pathname === '/api/reviewer-outreach') {
    if (req.method !== 'GET') return send(res, 405, { error: 'GET only' });
    if (!localHost(req)) return send(res, 403, { error: 'Reviewer outreach is available only through this machine\'s loopback server' });
    if (!fs.existsSync(PRIVATE_REVIEW)) return send(res, 404, { available: false });
    try {
      const data = JSON.parse(fs.readFileSync(PRIVATE_REVIEW, 'utf8'));
      return send(res, 200, { available: true, ...data });
    } catch (e) {
      return send(res, 500, { error: `Local reviewer file is unreadable: ${e.message}` });
    }
  }
  const m = url.pathname.match(/^\/api\/tune\/([a-z]+)\/([^/]+)$/);
  const file = m && recordPath(m[1], decodeURIComponent(m[2]));
  if (!file) return send(res, 400, { error: 'Not a tune record: wants /api/tune/holding|review/<id>' });
  if (!fs.existsSync(file)) return send(res, 404, { error: `No file ${path.relative(root, file)}` });
  const current = fs.readFileSync(file, 'utf8');
  if (req.method === 'GET') return send(res, 200, { text: current, etag: etagOf(current) });
  if (req.method !== 'PUT') return send(res, 405, { error: 'GET or PUT' });
  if (!sameSite(req)) return send(res, 403, { error: 'Saves are accepted only from this server\'s own pages' });
  let body;
  try { body = JSON.parse(await readBody(req)); } catch (e) { return send(res, 400, { error: `Unreadable request: ${e.message}` }); }
  if (typeof body.text !== 'string' || !body.text.trim()) return send(res, 400, { error: 'The file would be empty' });
  // Another session (Claude, Codex, a git pull) may have changed the file since the page loaded it.
  if (body.etag !== etagOf(current)) return send(res, 409, { error: 'The file changed on disk since you opened it', text: current, etag: etagOf(current) });
  const text = body.text.replace(/\r\n?/g, '\n');
  if (text === current) return send(res, 200, { etag: etagOf(current), log: 'No change' });
  fs.writeFileSync(file, text);
  const built = run(`${FOLDERS[m[1]]}/build.js`);
  if (built.status !== 0) {
    fs.writeFileSync(file, current);   // the build stopped before writing its index, so the old file is all there is to undo
    return send(res, 422, { error: (built.stderr || built.stdout || 'the build failed').trim() });
  }
  const sets = run('course/build-sets.js');
  if (sets.status !== 0) return send(res, 500, { error: `Saved, but course/sets.js was not rebuilt: ${(sets.stderr || sets.stdout).trim()}` });
  console.log(`saved ${path.relative(root, file)}`);
  return send(res, 200, { etag: etagOf(text), log: `${built.stdout.trim()}\n${sets.stdout.trim()}` });
}

function staticFile(req, res, url) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch (e) { return send(res, 400, 'Bad path', 'text/plain'); }
  let file = path.join(root, path.normalize(rel));
  if (file !== root && !file.startsWith(root + path.sep)) return send(res, 403, 'Forbidden', 'text/plain');
  const privatePath = candidate => {
    const parts = path.relative(root, candidate).split(path.sep);
    return parts.some(p => p === '.git') || (parts[0] === 'course' && parts[1] === 'private-review');
  };
  if (privatePath(file)) return send(res, 404, 'Not found', 'text/plain');
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!url.pathname.endsWith('/')) { res.writeHead(301, { Location: url.pathname + '/' + url.search }); return res.end(); }
      const index = path.join(file, 'index.html');
      if (fs.existsSync(index)) { file = index; st = fs.statSync(index); }
      else {
        const names = fs.readdirSync(file, { withFileTypes: true }).filter(d => !d.name.startsWith('.') && !privatePath(path.join(file, d.name))).map(d => d.name + (d.isDirectory() ? '/' : ''));
        const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        return send(res, 200, `<!doctype html><meta charset="utf-8"><title>${esc(rel)}</title><ul>${names.map(n => `<li><a href="${esc(encodeURI(n))}">${esc(n)}</a>`).join('')}</ul>`, 'text/html; charset=utf-8');
      }
    }
    if (err || !st.isFile()) return send(res, 404, 'Not found', 'text/plain');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || HOST}`);
  if (url.pathname.startsWith('/api/')) return api(req, res, url).catch(e => send(res, 500, { error: e.message }));
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'GET only', 'text/plain');
  staticFile(req, res, url);
});
if (require.main === module) {
  server.listen(port, HOST, () => console.log(`Serving ${root} at http://localhost:${port}/  (the tune editor can save; Ctrl+C to stop)`));
}
module.exports = { server, etagOf };
