#!/usr/bin/env node
// Copies the RhythmDance function (the rhythm and dance kit) from the lab page into index.html, so both pages run the same code.
//   node lab/sync-kit.js
const fs = require('fs'), path = require('path'), root = path.join(__dirname, '..');
const lab = fs.readFileSync(path.join(root, 'lab', 'Rhythm and Dance v1.html'), 'utf8'), idx = path.join(root, 'index.html');
let page = fs.readFileSync(idx, 'utf8');
const START = '/* ================= the rhythm and dance kit =================', END = '/* ---------- rhythm and dance cells ----------';
const a = lab.indexOf(START), b = lab.indexOf('/* ================= wiring ================= */'); if (a < 0 || b < 0) throw new Error('kit not found in the lab');
const kit = lab.slice(a, b);
const c = page.indexOf(START), d = page.indexOf(END); if (c < 0 || d < 0) throw new Error('kit markers not found in index.html');
page = page.slice(0, c) + kit + page.slice(d);
fs.writeFileSync(idx, page); console.log(`kit synced: ${kit.length} characters`);
