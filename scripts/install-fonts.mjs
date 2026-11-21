// Installs @fontsource packages one by one; a missing package only produces a warning.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
for (const name of pkg.config?.fonts || []) {
  try { execSync(`npm install --no-save --no-audit --no-fund ${name}@^5`, { stdio: 'pipe' }); console.log('font ok:', name); }
  catch { console.warn('font package unavailable, skipped:', name); }
}
