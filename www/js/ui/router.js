// Minimal view router with back stack, tab bar and hardware back-button support.
import { h, clear, ic } from './dom.js';
import { t } from '../core/i18n.js';

const views = {}; const stack = []; let root, current = null;
export const register = (name, fn) => { views[name] = fn; };
export const init = (el) => { root = el; };
export const currentView = () => stack[stack.length - 1];

const TABS = [['home', 'home', 'home'], ['gallery', 'gallery', 'grid'], ['guests', 'guests', 'users'], ['settings', 'settings', 'settings']];

async function show(entry) {
  if (current?.destroy) { try { current.destroy(); } catch { /* ignore */ } }
  clear(root);
  const v = await views[entry.name](entry.params || {}); current = v;
  const wrap = h('div', { class: 'view' }, v.el);
  root.append(wrap);
  if (v.tab) root.append(h('nav', { class: 'tabbar' }, TABS.map(([name, label, icon]) => h('button', { class: v.tab === name ? 'on' : '', onclick: () => go(name, {}, { reset: true }) }, ic(icon, 22), t(label)))));
  v.onShow?.();
}
export async function go(name, params = {}, { replace = false, reset = false } = {}) {
  if (reset) stack.length = 0; else if (replace) stack.pop();
  const e = { name, params }; stack.push(e); await show(e);
}
export async function back() {
  if (stack.length < 2) return false;
  stack.pop(); await show(stack[stack.length - 1]); return true;
}
// Called for the Android back button. Returns true when handled.
export async function handleBack() {
  const ms = document.querySelectorAll('.backdrop'), m = ms[ms.length - 1];
  if (m) { m.querySelector('.modal-head .icon-btn')?.click(); return true; }
  if (current?.onBack && (await current.onBack()) === true) return true;
  return back();
}
export const refresh = () => stack.length && show(stack[stack.length - 1]);
export const topbar = (title, { onBack, right = [] } = {}) => h('header', { class: 'topbar' }, onBack !== null ? h('button', { class: 'icon-btn', onclick: onBack || back, 'aria-label': t('back') }, h('span', { class: 'flip-rtl' }, ic('back'))) : null, h('h1', null, title), ...right);
