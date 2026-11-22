// Plan / entitlement panel for Settings. No payment is simulated: without a registered provider nothing can be bought.
import { h } from './dom.js';
import { hasPaymentProvider, needsWatermark } from '../core/entitlements.js';
import { Settings } from '../core/storage.js';
export function entitlementsInfo(L) {
  return h('div', null,
    h('p', { style: { margin: '0 0 6px' } }, Settings.get('devUnlock') ? L('حالت آزمایشی توسعه‌دهنده فعال است.', 'Developer test unlock is active.') : L('نسخهٔ رایگان: قالب‌های رایگان و خروجی با نشان CardStudio.', 'Free plan: free templates, exports carry a CardStudio mark.')),
    h('p', { class: 'muted', style: { fontSize: '12.5px', margin: 0 } }, hasPaymentProvider() ? L('درگاه پرداخت متصل است.', 'A payment provider is connected.') : L('درگاه پرداخت هنوز به برنامه متصل نشده است؛ قالب‌های ویژه تا اتصال یک سرویس پرداخت واقعی قفل می‌مانند.', 'No payment provider is connected yet; premium items stay locked until a real billing service is registered.')),
    needsWatermark() ? null : h('p', { style: { margin: '6px 0 0' } }, '✓ ' + L('بدون نشان', 'No watermark')));
}
