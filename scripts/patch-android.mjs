// Customises the Capacitor-generated android/ project: permissions, deep-link scheme, icons, version.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const android = path.join(root, 'android');
const app = path.join(android, 'app');
const manifestPath = path.join(app, 'src/main/AndroidManifest.xml');
if (!fs.existsSync(manifestPath)) { console.error('android project not found – run `npx cap add android` first'); process.exit(1); }

// ---- manifest
let m = fs.readFileSync(manifestPath, 'utf8');
const perms = [
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />',
];
for (const p of perms) {
  const name = p.match(/android:name="([^"]+)"/)[1];
  if (!m.includes(name)) m = m.replace('</manifest>', `    ${p}\n</manifest>`);
}
if (!m.includes('android:scheme="cardstudio"')) {
  const filter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="cardstudio" />
            </intent-filter>
        </activity>`;
  m = m.replace('</activity>', filter);
}
fs.writeFileSync(manifestPath, m);

// ---- version
const gradlePath = path.join(app, 'build.gradle');
let g = fs.readFileSync(gradlePath, 'utf8');
const run = Number(process.env.GITHUB_RUN_NUMBER || 1);
g = g.replace(/versionCode\s+\d+/, `versionCode ${run}`).replace(/versionName\s+"[^"]*"/, `versionName "1.0.${run}"`);
fs.writeFileSync(gradlePath, g);

// ---- icons
const iconsSrc = path.join(root, 'resources/android');
const resDir = path.join(app, 'src/main/res');
if (fs.existsSync(iconsSrc)) {
  for (const dir of fs.readdirSync(iconsSrc)) {
    const from = path.join(iconsSrc, dir);
    if (!fs.statSync(from).isDirectory()) continue;
    const to = path.join(resDir, dir);
    fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(from)) fs.copyFileSync(path.join(from, f), path.join(to, f));
  }
  // legacy adaptive-icon xml from the template points to drawable foreground; replace with our mipmaps
  const any = path.join(resDir, 'mipmap-anydpi-v26');
  fs.mkdirSync(any, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>`;
  fs.writeFileSync(path.join(any, 'ic_launcher.xml'), xml);
  fs.writeFileSync(path.join(any, 'ic_launcher_round.xml'), xml);
  const values = path.join(resDir, 'values');
  fs.mkdirSync(values, { recursive: true });
  fs.writeFileSync(path.join(values, 'ic_launcher_background.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F1020</color>\n</resources>\n');
}
console.log('android project patched (permissions, deep link, version 1.0.' + run + ', icons)');
