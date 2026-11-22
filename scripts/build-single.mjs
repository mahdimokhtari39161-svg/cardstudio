// Builds ONE self-contained HTML file (all JS modules inlined through an import map, CSS inlined). Fonts fall back to system fonts.
import fs from 'node:fs'; import path from 'node:path';
const www = path.resolve('www'), out = process.argv[2] || 'CardStudio.html';
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); } })(path.join(www, 'js'));
const key = (p) => 'cs:' + path.relative(www, p).replace(/\\/g, '/');
const map = {};
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8'); const dir = path.dirname(f);
  s = s.replace(/(from\s*|import\s*\(\s*|import\s+)(['"])(\.{1,2}\/[^'"]+)\2/g, (m, a, q, spec) => `${a}${q}${key(path.resolve(dir, spec))}${q}`);
  map[key(f)] = 'data:text/javascript;base64,' + Buffer.from(s).toString('base64');
}
const css = fs.readFileSync(path.join(www, 'css/app.css'), 'utf8');
const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><title>CardStudio – کارت استودیو</title><style>${css}</style><script type="importmap">${JSON.stringify({ imports: map })}</script></head><body><div id="app"></div><script type="module">import 'cs:js/app.js'</script></body></html>`;
fs.writeFileSync(out, html); console.log(out, (html.length / 1e6).toFixed(2) + ' MB');
