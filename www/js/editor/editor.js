// Interactive canvas editor: select / move / resize / rotate / multi-select / snapping guides / grid / zoom / undo-redo.
import { drawPage, hitElement, corners, boundsOf, elementCenter, toLocal, layoutText, Assets } from '../gfx/render.js';
import { newText, newShape, newClip, newImage, newQR, newFrame, newPage, cloneElement } from '../core/model.js';
import { clamp, clone, uid } from '../core/util.js';
import { restack, refreshCard } from '../templates/engine.js';

const HANDLE = 11, ROT_OFF = 38, SNAP_PX = 7;

export class Editor {
  constructor(host, card, opts = {}) {
    this.host = host; this.card = card; this.opts = opts;
    this.pageIdx = 0; this.sel = new Set(); this.zoom = 1; this.px = 0; this.py = 0;
    this.undoStack = []; this.redoStack = []; this.lastKey = ''; this.lastKeyT = 0;
    this.grid = !!opts.grid; this.snap = opts.snap !== false; this.multi = false; this.guides = [];
    this.styleClip = null; this.pointers = new Map(); this.drag = null; this.dirty = false;
    this.cv = document.createElement('canvas'); this.cv.className = 'editor-canvas'; this.cv.style.touchAction = 'none';
    host.appendChild(this.cv); this.ctx = this.cv.getContext('2d');
    this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(host);
    this.bind(); this.resize(); this.fit();
    Assets.onLoad = () => this.draw();
  }
  destroy() { this._ro.disconnect(); this.cv.remove(); Assets.onLoad = null; clearTimeout(this._raf); }

  get page() { return this.card.pages[this.pageIdx]; }
  get selected() { return this.page.elements.filter((e) => this.sel.has(e.id)); }
  get one() { const s = this.selected; return s.length === 1 ? s[0] : null; }

  // ------------------------------------------------------------- view
  resize() {
    const r = this.host.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    this.cw = Math.max(50, r.width); this.ch = Math.max(50, r.height); this.dpr = dpr;
    this.cv.width = Math.round(this.cw * dpr); this.cv.height = Math.round(this.ch * dpr);
    this.cv.style.width = this.cw + 'px'; this.cv.style.height = this.ch + 'px';
    if (this._fitted) this.fit(); else this.draw();
  }
  fit() {
    const m = 18, p = this.page;
    this.zoom = Math.min((this.cw - m * 2) / p.w, (this.ch - m * 2) / p.h);
    this.px = (this.cw - p.w * this.zoom) / 2; this.py = (this.ch - p.h * this.zoom) / 2;
    this._fitted = true; this.draw(); this.opts.onView?.(this);
  }
  setZoom(z, cx = this.cw / 2, cy = this.ch / 2) {
    z = clamp(z, 0.1, 6); const k = z / this.zoom;
    this.px = cx - (cx - this.px) * k; this.py = cy - (cy - this.py) * k; this.zoom = z; this._fitted = false; this.draw(); this.opts.onView?.(this);
  }
  toPage(x, y) { return [(x - this.px) / this.zoom, (y - this.py) / this.zoom]; }
  evXY(e) { const r = this.cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  requestDraw() { if (this._pending) return; this._pending = true; requestAnimationFrame(() => { this._pending = false; this.draw(); }); }

  draw() {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#2a2c3a';
    ctx.fillRect(0, 0, this.cw, this.ch);
    const p = this.page;
    ctx.save(); ctx.translate(this.px, this.py);
    ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, p.w * this.zoom, p.h * this.zoom); ctx.restore();
    ctx.save(); ctx.translate(this.px, this.py);
    drawPage(ctx, p, this.card, { scale: this.zoom });
    ctx.restore();
    ctx.save(); ctx.translate(this.px, this.py); ctx.scale(this.zoom, this.zoom);
    if (this.grid) this.drawGrid(ctx, p);
    this.drawOverlay(ctx);
    ctx.restore();
  }
  drawGrid(ctx, p) {
    const step = this.gridStep(); ctx.save(); ctx.strokeStyle = 'rgba(120,120,255,.28)'; ctx.lineWidth = 1 / this.zoom; ctx.beginPath();
    for (let x = step; x < p.w; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, p.h); }
    for (let y = step; y < p.h; y += step) { ctx.moveTo(0, y); ctx.lineTo(p.w, y); }
    ctx.stroke(); ctx.restore();
  }
  gridStep() { return Math.max(10, Math.round(Math.min(this.page.w, this.page.h) / 20 / 10) * 10); }
  drawOverlay(ctx) {
    const z = this.zoom, sel = this.selected;
    ctx.lineWidth = 1.6 / z; ctx.setLineDash([]);
    for (const el of sel) {
      const c = corners(el); ctx.strokeStyle = el.locked ? '#f59e0b' : '#6c8cff'; ctx.beginPath(); c.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.stroke();
    }
    const one = this.one;
    if (one && !one.locked) {
      for (const h of this.handlePoints(one)) {
        const hs = (HANDLE * 1.4) / z; ctx.beginPath(); if (h.k === 'rot') ctx.arc(h.x, h.y, HANDLE / z, 0, 6.3); else ctx.rect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#6c8cff'; ctx.stroke();
      }
      const t = this.handlePoints(one).find((h) => h.k === 'rot'), tc = corners(one); ctx.beginPath(); ctx.moveTo((tc[0][0] + tc[1][0]) / 2, (tc[0][1] + tc[1][1]) / 2); ctx.lineTo(t.x, t.y); ctx.stroke();
    } else if (sel.length > 1) {
      const b = boundsOf(sel); ctx.setLineDash([6 / z, 4 / z]); ctx.strokeStyle = '#6c8cff'; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.setLineDash([]);
    }
    ctx.strokeStyle = '#ff3d9a'; ctx.lineWidth = 1.2 / z;
    for (const g of this.guides) { ctx.beginPath(); if (g.v) { ctx.moveTo(g.v, 0); ctx.lineTo(g.v, this.page.h); } else { ctx.moveTo(0, g.h); ctx.lineTo(this.page.w, g.h); } ctx.stroke(); }
  }
  handlePoints(el) {
    const c = corners(el), z = this.zoom, a = (el.rot * Math.PI) / 180, mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    const tm = mid(c[0], c[1]), r = ROT_OFF / z;
    const pts = [{ k: 'nw', x: c[0][0], y: c[0][1] }, { k: 'ne', x: c[1][0], y: c[1][1] }, { k: 'se', x: c[2][0], y: c[2][1] }, { k: 'sw', x: c[3][0], y: c[3][1] }];
    const ml = mid(c[0], c[3]), mr = mid(c[1], c[2]);
    pts.push({ k: 'w', x: ml[0], y: ml[1] }, { k: 'e', x: mr[0], y: mr[1] });
    pts.push({ k: 'rot', x: tm[0] + Math.sin(a) * r, y: tm[1] - Math.cos(a) * r });
    return pts;
  }

  // ------------------------------------------------------------- history
  snapshot() { return JSON.stringify({ pages: this.card.pages, extras: this.card.extras, data: this.card.data }); }
  push(key = '') {
    const now = Date.now();
    if (key && key === this.lastKey && now - this.lastKeyT < 900) { this.lastKeyT = now; return; }
    this.undoStack.push(this.snapshot()); if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack.length = 0; this.lastKey = key; this.lastKeyT = now; this.changed();
  }
  restore(s) {
    const o = JSON.parse(s); this.card.pages = o.pages; this.card.extras = o.extras; this.card.data = o.data;
    this.pageIdx = Math.min(this.pageIdx, this.card.pages.length - 1);
    const ids = new Set(this.page.elements.map((e) => e.id)); this.sel = new Set([...this.sel].filter((i) => ids.has(i)));
    this.draw(); this.changed(true);
  }
  undo() { if (!this.undoStack.length) return; this.redoStack.push(this.snapshot()); this.restore(this.undoStack.pop()); this.lastKey = ''; }
  redo() { if (!this.redoStack.length) return; this.undoStack.push(this.snapshot()); this.restore(this.redoStack.pop()); this.lastKey = ''; }
  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }
  changed(noDirty) { if (!noDirty) this.dirty = true; this.opts.onChange?.(this); }

  // ------------------------------------------------------------- selection
  select(ids, add = false) {
    const list = Array.isArray(ids) ? ids : ids ? [ids] : [];
    if (!add) this.sel.clear();
    list.forEach((i) => this.sel.add(i)); this.opts.onSelect?.(this); this.draw();
  }
  toggle(id) { this.sel.has(id) ? this.sel.delete(id) : this.sel.add(id); this.opts.onSelect?.(this); this.draw(); }
  selectAll() { this.select(this.page.elements.filter((e) => !e.hidden).map((e) => e.id)); }
  hitTest(x, y) {
    const els = this.page.elements;
    for (let i = els.length - 1; i >= 0; i--) { const e = els[i]; if (e.hidden || e.locked) continue; if (hitElement(e, x, y, 4 / this.zoom)) return e; }
    return null;
  }
  handleAt(sx, sy) {
    const one = this.one; if (!one || one.locked) return null;
    const [x, y] = this.toPage(sx, sy), r = (HANDLE * 1.9) / this.zoom;
    for (const h of this.handlePoints(one)) if (Math.hypot(h.x - x, h.y - y) <= r) return h.k;
    return null;
  }

  // ------------------------------------------------------------- pointer input
  bind() {
    const cv = this.cv;
    cv.addEventListener('pointerdown', (e) => this.onDown(e));
    cv.addEventListener('pointermove', (e) => this.onMove(e));
    const up = (e) => this.onUp(e);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !this.drag) return; });
    cv.addEventListener('wheel', (e) => { e.preventDefault(); const [x, y] = this.evXY(e); this.setZoom(this.zoom * (e.deltaY < 0 ? 1.1 : 0.9), x, y); }, { passive: false });
    cv.addEventListener('dblclick', (e) => { const [sx, sy] = this.evXY(e), [x, y] = this.toPage(sx, sy), el = this.hitTest(x, y); if (el?.type === 'text') { this.select(el.id); this.opts.onEditText?.(el); } });
  }
  onDown(e) {
    this.cv.setPointerCapture?.(e.pointerId);
    const [sx, sy] = this.evXY(e); this.pointers.set(e.pointerId, { sx, sy });
    if (this.pointers.size === 2) { this.startPinch(); return; }
    if (this.pointers.size > 2) return;
    const h = this.handleAt(sx, sy);
    const [x, y] = this.toPage(sx, sy);
    if (h) {
      const el = this.one; this.push();
      this.drag = h === 'rot' ? { k: 'rot', el, c: elementCenter(el) } : { k: 'resize', h, el, o: { x: el.x, y: el.y, w: el.w, h: el.h, size: el.size, rot: el.rot }, p0: [x, y] };
      return;
    }
    const hit = this.hitTest(x, y);
    const now = Date.now();
    if (hit) {
      if (this.multi || e.shiftKey) this.toggle(hit.id); else if (!this.sel.has(hit.id)) this.select(hit.id);
      if (this.sel.has(hit.id)) {
        this.push();
        this.drag = { k: 'move', p0: [x, y], origs: this.selected.map((el) => [el, el.x, el.y]), moved: false };
        if (hit.type === 'text' && this._lastTap && now - this._lastTap.t < 320 && this._lastTap.id === hit.id) { this.drag = null; this.opts.onEditText?.(hit); }
        this._lastTap = { t: now, id: hit.id };
      }
    } else {
      if (!this.multi) this.select([]);
      this.drag = { k: 'pan', s0: [sx, sy], p0: [this.px, this.py] };
    }
  }
  startPinch() {
    const [a, b] = [...this.pointers.values()];
    this.drag = { k: 'pinch', d0: Math.hypot(a.sx - b.sx, a.sy - b.sy), z0: this.zoom, c0: [(a.sx + b.sx) / 2, (a.sy + b.sy) / 2], p0: [this.px, this.py] };
  }
  onMove(e) {
    const [sx, sy] = this.evXY(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { sx, sy });
    const d = this.drag; if (!d) return;
    const [x, y] = this.toPage(sx, sy);
    if (d.k === 'pinch' && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()], dist = Math.hypot(a.sx - b.sx, a.sy - b.sy), c = [(a.sx + b.sx) / 2, (a.sy + b.sy) / 2];
      const z = clamp(d.z0 * (dist / d.d0), 0.1, 6), k = z / d.z0;
      this.px = d.c0[0] - (d.c0[0] - d.p0[0]) * k + (c[0] - d.c0[0]); this.py = d.c0[1] - (d.c0[1] - d.p0[1]) * k + (c[1] - d.c0[1]); this.zoom = z; this._fitted = false; this.requestDraw(); return;
    }
    if (d.k === 'pan') { this.px = d.p0[0] + (sx - d.s0[0]); this.py = d.p0[1] + (sy - d.s0[1]); this.requestDraw(); return; }
    if (d.k === 'move') {
      let dx = x - d.p0[0], dy = y - d.p0[1];
      if (!d.moved && Math.hypot(dx, dy) * this.zoom < 3) return;
      d.moved = true;
      for (const [el, ox, oy] of d.origs) { el.x = ox + dx; el.y = oy + dy; }
      this.guides = [];
      const adj = this.snapMove(); if (adj) for (const [el] of d.origs) { el.x += adj[0]; el.y += adj[1]; }
      for (const [el] of d.origs) el.free = true;
      this.dirty = true; this.opts.onChange?.(this, true); this.requestDraw(); return;
    }
    if (d.k === 'rot') {
      let a = (Math.atan2(y - d.c[1], x - d.c[0]) * 180) / Math.PI + 90;
      a = ((a % 360) + 360) % 360; if (this.snap) { for (const t of [0, 45, 90, 135, 180, 225, 270, 315, 360]) if (Math.abs(a - t) < 4) a = t % 360; }
      d.el.rot = Math.round(a * 10) / 10; d.el.free = true; this.opts.onChange?.(this, true); this.requestDraw(); return;
    }
    if (d.k === 'resize') this.doResize(d, x, y);
  }
  doResize(d, x, y) {
    const { el, o, h } = d, [cx, cy] = [o.x + o.w / 2, o.y + o.h / 2];
    const a = (-o.rot * Math.PI) / 180, loc = (px, py) => { const dx = px - cx, dy = py - cy; return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; };
    const [lx, ly] = loc(x, y);
    let w = o.w, hh = o.h, sx = 0, sy = 0; // sx/sy: which side is moving (−1 / +1)
    if (h.includes('e')) { sx = 1; w = lx + o.w / 2; } if (h.includes('w')) { sx = -1; w = o.w / 2 - lx; }
    if (h.includes('s')) { sy = 1; hh = ly + o.h / 2; } if (h.includes('n')) { sy = -1; hh = o.h / 2 - ly; }
    const corner = sx !== 0 && sy !== 0, min = 24;
    if (corner) { const k = Math.max(w / o.w, hh / o.h, min / Math.min(o.w, o.h)); w = o.w * k; hh = o.h * k; }
    w = Math.max(min, w); hh = Math.max(min, hh);
    // keep opposite side fixed in local space
    const ncx = sx ? (sx * (w - o.w)) / 2 : 0, ncy = sy ? (sy * (hh - o.h)) / 2 : 0;
    const b = (o.rot * Math.PI) / 180, wx = ncx * Math.cos(b) - ncy * Math.sin(b), wy = ncx * Math.sin(b) + ncy * Math.cos(b);
    el.w = w; el.h = hh; el.x = cx + wx - w / 2; el.y = cy + wy - hh / 2;
    if (el.type === 'text') {
      if (corner) el.size = Math.max(8, Math.round(o.size * (w / o.w)));
      el.free = true; if (!corner && !sy) this.autoHeight(el);
    } else el.free = true;
    this.opts.onChange?.(this, true); this.requestDraw();
  }
  onUp(e) {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2 && this.drag?.k === 'pinch') this.drag = null;
    if (this.pointers.size === 0 && this.drag) {
      const was = this.drag; this.drag = null; this.guides = [];
      if (was.k === 'move' && !was.moved) this.undoStack.pop(); // click without move: nothing to undo
      else if (was.k !== 'pan') this.changed();
      this.opts.onSelect?.(this); this.draw();
    }
  }
  snapMove() {
    const sel = this.selected; if (!sel.length) return null;
    const b = boundsOf(sel), z = this.zoom, th = SNAP_PX / z, p = this.page;
    const xs = [b.x, b.x + b.w / 2, b.x + b.w], ys = [b.y, b.y + b.h / 2, b.y + b.h];
    const tx = [0, p.w / 2, p.w], ty = [0, p.h / 2, p.h];
    for (const o of p.elements) { if (this.sel.has(o.id) || o.hidden) continue; const ob = boundsOf([o]); tx.push(ob.x, ob.x + ob.w / 2, ob.x + ob.w); ty.push(ob.y, ob.y + ob.h / 2, ob.y + ob.h); }
    let ax = null, ay = null;
    if (this.snap) {
      for (const x of xs) for (const t of tx) if (Math.abs(x - t) < th && (ax === null || Math.abs(t - x) < Math.abs(ax))) ax = t - x;
      for (const y of ys) for (const t of ty) if (Math.abs(y - t) < th && (ay === null || Math.abs(t - y) < Math.abs(ay))) ay = t - y;
      if (this.grid && ax === null) { const s = this.gridStep(); ax = Math.round(b.x / s) * s - b.x; if (Math.abs(ax) > th) ax = null; }
      if (this.grid && ay === null) { const s = this.gridStep(); ay = Math.round(b.y / s) * s - b.y; if (Math.abs(ay) > th) ay = null; }
    }
    this.guides = [];
    if (ax !== null) for (const x of xs) for (const t of tx) if (Math.abs(x + ax - t) < 0.5) this.guides.push({ v: t });
    if (ay !== null) for (const y of ys) for (const t of ty) if (Math.abs(y + ay - t) < 0.5) this.guides.push({ h: t });
    return ax !== null || ay !== null ? [ax || 0, ay || 0] : null;
  }

  // ------------------------------------------------------------- operations
  autoHeight(el) { if (el.type !== 'text' || el.fit) return; const L = layoutText(null, el, el.text || ' '); el.h = Math.max(20, Math.ceil(L.totalH + 12)); }
  add(el) { this.push(); this.page.elements.push(el); this.select(el.id); this.changed(); this.draw(); return el; }
  centerNew(el) { el.x = (this.page.w - el.w) / 2; el.y = (this.page.h - el.h) / 2; return el; }
  addText(o = {}) { const u = this.page.w / 1000; const el = newText({ text: o.text || 'متن جدید', size: Math.round(64 * u), w: 640 * u, h: 120 * u, color: '#222222', font: o.font || 'Vazirmatn', ...o, edited: true }); this.centerNew(el); this.autoHeight(el); return this.add(el); }
  addShape(shape, o = {}) { const u = this.page.w / 1000; const el = newShape({ shape, w: (shape === 'line' ? 400 : 300) * u, h: (shape === 'line' ? 10 : shape === 'pill' ? 120 : 300) * u, fill: shape === 'line' ? '' : '#c9a24a', stroke: shape === 'line' ? '#c9a24a' : '', sw: shape === 'line' ? 6 * u : 0, ...o }); this.centerNew(el); return this.add(el); }
  addClip(id, c1 = '#c9a24a', o = {}) { const u = this.page.w / 1000; const w = id.startsWith('divider') || id === 'ribbonBanner' ? 520 * u : id === 'ribbonCurl' ? 460 * u : 260 * u; const ratio = id.startsWith('divider') ? 0.13 : id === 'ribbonBanner' ? 0.27 : id === 'ribbonCurl' ? 0.3 : id === 'rainbow' ? 0.7 : id === 'mehrab' || id === 'toranj' ? 1.4 : 1; const el = newClip({ clip: id, c1, w, h: w * ratio, ...o }); this.centerNew(el); return this.add(el); }
  addFrame(kind, color = '#c9a24a') { const u = this.page.w / 1000, ins = 40 * u; return this.add(newFrame({ kind, color, sw: 6 * u, x: ins, y: ins, w: this.page.w - ins * 2, h: this.page.h - ins * 2 })); }
  addQR(value) { const u = this.page.w / 1000; const el = newQR({ value: value || 'https://', w: 260 * u, h: 260 * u }); this.centerNew(el); el.y = this.page.h - el.h - 70 * u; return this.add(el); }
  addImage(assetId, iw, ih, o = {}) {
    const u = this.page.w / 1000, W = Math.min(this.page.w * 0.7, 640 * u), H = iw && ih ? W * (ih / iw) : W;
    const el = newImage({ src: assetId, w: W, h: Math.min(H, this.page.h * 0.7), fit: 'cover', ...o }); this.centerNew(el); return this.add(el);
  }
  deleteSelected() { if (!this.sel.size) return; this.push(); const ids = this.sel; this.page.elements = this.page.elements.filter((e) => !ids.has(e.id) || e.locked); this.sel = new Set(); this.opts.onSelect?.(this); this.changed(); this.draw(); }
  duplicateSelected() { const s = this.selected; if (!s.length) return; this.push(); const nid = []; for (const el of s) { const c = cloneElement(el, 36, 36); c.stack = undefined; c.free = true; this.page.elements.push(c); nid.push(c.id); } this.select(nid); this.changed(); this.draw(); }
  order(dir) {
    const s = this.selected; if (!s.length) return; this.push(); const arr = this.page.elements;
    if (dir === 'front') { for (const el of s) { arr.splice(arr.indexOf(el), 1); arr.push(el); } }
    else if (dir === 'back') { for (const el of [...s].reverse()) { arr.splice(arr.indexOf(el), 1); arr.unshift(el); } }
    else if (dir === 'forward') { for (const el of [...s].reverse()) { const i = arr.indexOf(el); if (i < arr.length - 1) [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]]; } }
    else if (dir === 'backward') { for (const el of s) { const i = arr.indexOf(el); if (i > 0) [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]]; } }
    this.changed(); this.opts.onSelect?.(this); this.draw();
  }
  moveLayer(id, to) { const arr = this.page.elements, i = arr.findIndex((e) => e.id === id); if (i < 0 || to < 0 || to >= arr.length) return; this.push(); const [el] = arr.splice(i, 1); arr.splice(to, 0, el); this.changed(); this.opts.onSelect?.(this); this.draw(); }
  toggleLock(ids) { this.push(); const els = (ids ? this.page.elements.filter((e) => ids.includes(e.id)) : this.selected); const v = !els.every((e) => e.locked); els.forEach((e) => (e.locked = v)); this.changed(); this.opts.onSelect?.(this); this.draw(); }
  toggleHide(id) { const el = this.page.elements.find((e) => e.id === id); if (!el) return; this.push(); el.hidden = !el.hidden; if (el.hidden) this.sel.delete(id); this.changed(); this.opts.onSelect?.(this); this.draw(); }
  set(props, key = '') { const s = this.selected; if (!s.length) return; this.push(key || 'set:' + Object.keys(props).join()); for (const el of s) { Object.assign(el, props); if (el.type === 'text') { if ('text' in props) el.edited = true; if ('size' in props || 'font' in props || 'text' in props || 'lh' in props || 'weight' in props || 'ls' in props || 'italic' in props || 'upper' in props) { if (el.free || !el.stack) this.autoHeight(el); } } } this.changed(); this.draw(); }
  setDeep(prop, value, key = '') { const s = this.selected; if (!s.length) return; this.push(key || 'deep:' + prop); for (const el of s) el[prop] = value && typeof value === 'object' ? clone(value) : value; this.changed(); this.draw(); }
  align(how) {
    const s = this.selected; if (!s.length) return; this.push(); const ref = s.length > 1 ? boundsOf(s) : { x: 0, y: 0, w: this.page.w, h: this.page.h };
    for (const el of s) { const b = boundsOf([el]); let dx = 0, dy = 0;
      if (how === 'left') dx = ref.x - b.x; if (how === 'center') dx = ref.x + ref.w / 2 - (b.x + b.w / 2); if (how === 'right') dx = ref.x + ref.w - (b.x + b.w);
      if (how === 'top') dy = ref.y - b.y; if (how === 'middle') dy = ref.y + ref.h / 2 - (b.y + b.h / 2); if (how === 'bottom') dy = ref.y + ref.h - (b.y + b.h);
      el.x += dx; el.y += dy; el.free = true; }
    this.changed(); this.draw();
  }
  distribute(axis) {
    const s = [...this.selected]; if (s.length < 3) return; this.push();
    const key = axis === 'h' ? 'x' : 'y', size = axis === 'h' ? 'w' : 'h'; s.sort((a, b) => a[key] - b[key]);
    const first = s[0][key], last = s[s.length - 1][key] + s[s.length - 1][size], total = s.reduce((a, e) => a + e[size], 0), gap = (last - first - total) / (s.length - 1);
    let pos = first; for (const e of s) { e[key] = pos; e.free = true; pos += e[size] + gap; }
    this.changed(); this.draw();
  }
  nudge(dx, dy) { const s = this.selected; if (!s.length) return; this.push('nudge'); for (const el of s) { el.x += dx; el.y += dy; el.free = true; } this.changed(); this.draw(); }
  copyStyle() { const el = this.one; if (!el) return false; const keep = ['color', 'font', 'weight', 'italic', 'lh', 'ls', 'grad', 'shadow', 'stroke', 'extrude', 'fill', 'sw', 'opacity', 'c1', 'c2', 'align', 'radius', 'border', 'mask', 'color2']; this.styleClip = { type: el.type, props: clone(Object.fromEntries(keep.filter((k) => k in el).map((k) => [k, el[k]]))) }; return true; }
  pasteStyle() { if (!this.styleClip) return false; const s = this.selected.filter((e) => e.type === this.styleClip.type); if (!s.length) return false; this.push(); for (const el of s) Object.assign(el, clone(this.styleClip.props)); this.changed(); this.draw(); return true; }
  setBackground(bg) { this.push(); this.page.bg = bg; this.changed(); this.draw(); }
  addPage(copyFrom) { this.push(); const p = copyFrom ? clone(this.page) : newPage(this.page.w, this.page.h); p.id = uid('p'); p.elements.forEach((e) => (e.id = uid())); this.card.pages.splice(this.pageIdx + 1, 0, p); this.gotoPage(this.pageIdx + 1); this.changed(); }
  deletePage() { if (this.card.pages.length < 2) return false; this.push(); this.card.pages.splice(this.pageIdx, 1); this.gotoPage(Math.max(0, this.pageIdx - 1)); this.changed(); return true; }
  gotoPage(i) { this.pageIdx = clamp(i, 0, this.card.pages.length - 1); this.sel = new Set(); this.fit(); this.opts.onSelect?.(this); this.opts.onPage?.(this); }
  resizePage(w, h) { this.push(); const p = this.page; const sx = w / p.w, sy = h / p.h, s = Math.min(sx, sy); for (const e of p.elements) { e.x *= sx; e.y *= sy; e.w *= sx; e.h *= sy; if (e.size) e.size = Math.round(e.size * s); } p.w = w; p.h = h; if (p.stacks) for (const b of Object.values(p.stacks)) { b.x *= sx; b.y *= sy; b.w *= sx; b.h *= sy; } this.fit(); this.changed(); }
  relayout() { this.push(); for (const p of this.card.pages) for (const e of p.elements) if (e.stack) { e.free = false; e.edited = false; } refreshCard(this.card); this.changed(); this.draw(); }
  refreshFromData() { refreshCard(this.card); this.draw(); }
}
