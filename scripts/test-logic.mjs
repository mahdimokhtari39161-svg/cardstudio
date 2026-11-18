// Pure-logic tests (no browser). Extended as modules are added.
let failed = 0;
export function ok(cond, msg) { if (!cond) { failed++; console.error('FAIL:', msg); } else console.log('ok  :', msg); }
ok(true, 'test harness runs');
if (failed) process.exit(1);
