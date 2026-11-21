// Monetisation architecture. NO payment is simulated here.
// A real payment provider (Google Play Billing, Stripe, Cafe Bazaar …) registers itself with registerProvider()
// and answers `has(feature)`. Until one is registered, premium features stay locked (except developer unlock for testing).
import { Settings } from './storage.js';

export const FEATURES = {
  premiumTemplates: 'premiumTemplates', // templates flagged premium
  noWatermark: 'noWatermark',           // exports without the CardStudio watermark
  packs: 'packs',                       // purchasable template packs (occasion bundles / luxury collections)
};
const providers = [];
export function registerProvider(p) { providers.push(p); } // p = { name, has(feature, ctx) -> bool|Promise<bool>, purchase(productId) }

export function has(feature, ctx = {}) {
  if (Settings.get('devUnlock')) return true;
  for (const p of providers) { try { if (p.has(feature, ctx) === true) return true; } catch { /* ignore */ } }
  return false;
}
export const canUseTemplate = (tpl) => !tpl?.premium || has(FEATURES.premiumTemplates, { tpl });
export const needsWatermark = () => !has(FEATURES.noWatermark);
export const hasPaymentProvider = () => providers.length > 0;
