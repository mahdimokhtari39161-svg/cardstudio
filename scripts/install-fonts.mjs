// Installs the @fontsource packages. `npm install --no-save` prunes earlier --no-save installs, so all names are
// installed in ONE command; if that fails, packages are added cumulatively and unavailable ones are skipped.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const names = (pkg.config?.fonts || []).map((n) => `${n}@^5`);
const run = (list) => execSync(`npm install --no-save --no-audit --no-fund ${list.join(' ')}`, { stdio: 'pipe' });
try { run(names); console.log('fonts ok:', names.length); }
catch {
  const good = [];
  for (const n of names) { try { run([...good, n]); good.push(n); console.log('font ok:', n); } catch { console.warn('font package unavailable, skipped:', n); } }
}
