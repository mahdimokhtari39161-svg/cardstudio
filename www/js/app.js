// App bootstrap.
import { Settings } from './core/storage.js';
import { setUILang } from './core/i18n.js';
import { init, go, handleBack } from './ui/router.js';
import { toast } from './ui/dom.js';
import { onBackButton, isNative } from './io/native.js';
import './ui/views-home.js';
import './ui/views-form.js';
import './ui/views-edit.js';
import './ui/views-manage.js';
import './ui/views-tools.js';

async function main() {
  const root = document.getElementById('app');
  try { await Settings.load(); } catch { /* defaults */ }
  setUILang(Settings.get('uiLang') || 'fa');
  document.documentElement.dataset.theme = Settings.get('theme') === 'light' ? 'light' : 'dark';
  init(root);
  onBackButton(async () => {
    const handled = await handleBack();
    if (!handled) { const A = window.Capacitor?.Plugins?.App; A?.minimizeApp?.() || A?.exitApp?.(); }
  });
  await go('home', {}, { reset: true });
  if (!isNative() && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
window.addEventListener('unhandledrejection', (e) => { console.warn('unhandled', e.reason); });
main().catch((e) => { document.getElementById('app').textContent = 'Error: ' + (e?.message || e); console.error(e); });
