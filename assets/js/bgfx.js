// @SIMMZL bgfx — canvas 背景特效引擎：RAF 主循环 + 交互层 + 颜色过渡 + 6 效果
// 零依赖。terminal 启动时 init()，quiz 切题时 setEffect()，前奏/判定时 reset()。

// ---------- 工具 ----------
const rand = (a, b) => a + Math.random() * (b - a);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
const lerpRgb = (a, b, t) => ({ r: lerp(a.r, b.r, t), g: lerp(a.g, b.g, t), b: lerp(a.b, b.b, t) });
const rgba = (c, a) => `rgba(${c.r | 0},${c.g | 0},${c.b | 0},${a})`;

// ---------- 引擎状态 ----------
let canvas, ctx, raf = 0, running = false, lastT = 0;
let w = 0, h = 0, dpr = 1;
const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };  // 归一化 0~1，t* 是目标（lerp 平滑）
let ripples = [];                                       // {x,y(px), t0, life}
let curColor = { r: 59, g: 255, b: 122 }, tgtColor = { ...curColor };
let curDim = { r: 31, g: 138, b: 68 }, tgtDim = { ...curDim };
let tension = 0;
let current = null;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobile = matchMedia("(max-width: 640px), (pointer: coarse)").matches;

// ---------- resize（DPR 上限 2）----------
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  w = canvas.clientWidth; h = canvas.clientHeight;
  canvas.width = w * dpr; canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (current && current.resize) current.resize(w, h);
}

// ---------- 交互 ----------
function onMove(e) {
  const p = e.touches ? e.touches[0] : e;
  pointer.tx = clamp(p.clientX / window.innerWidth, 0, 1);
  pointer.ty = clamp(p.clientY / window.innerHeight, 0, 1);
}
function onTap(e) {
  if (!document.body.classList.contains("testing")) return;
  const p = e.touches ? e.touches[0] : e;
  ripples.push({ x: p.clientX, y: p.clientY, t0: performance.now(), life: 1400 });
  if (ripples.length > 8) ripples.shift();
}

// ---------- 主循环 ----------
function frame(t) {
  if (!running) return;
  const dt = Math.min(50, t - lastT) || 16; lastT = t;
  pointer.x = lerp(pointer.x, pointer.tx, 0.08);
  pointer.y = lerp(pointer.y, pointer.ty, 0.08);
  curColor = lerpRgb(curColor, tgtColor, 0.05);
  curDim = lerpRgb(curDim, tgtDim, 0.05);
  ctx.clearRect(0, 0, w, h);
  const env = { color: curColor, dim: curDim, pointer, ripples, tension, w, h, dt, t, mobile };
  if (current) { current.update(dt, env); current.draw(ctx, env); }
  ripples = ripples.filter(r => (t - r.t0) < r.life);
  raf = requestAnimationFrame(frame);
}
function start() { if (running || reduced || !current) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
function stop() { running = false; cancelAnimationFrame(raf); }

// ---------- 降级：reduced-motion 画一帧静态 ----------
function baseEnv() { return { color: curColor, dim: curDim, pointer, ripples: [], tension, w, h, dt: 0, t: performance.now(), mobile }; }
function staticFrame() {
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (current && current.drawStatic) { current.update(0, baseEnv()); current.drawStatic(ctx, baseEnv()); }
}

// ---------- 可见性 ----------
function onVis() {
  if (document.hidden) stop();
  else if (current && !reduced && document.body.classList.contains("testing")) start();
}

// ---------- 接口 ----------
function init(cv) {
  canvas = cv; ctx = cv.getContext("2d");
  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove, { passive: true });
  window.addEventListener("mousedown", onTap);
  window.addEventListener("touchstart", onTap, { passive: true });
  document.addEventListener("visibilitychange", onVis);
}
function setEffect(name, palette, t) {
  tgtColor = hexToRgb(palette.c[0]); tgtDim = hexToRgb(palette.c[1]); tension = t || 0;
  const next = EFFECTS[String(name).replace("fx-", "")] || EFFECTS.stars;
  if (next !== current) { current = next; if (current.init) current.init(w, h, { mobile, tension }); }
  if (reduced) { curColor = { ...tgtColor }; curDim = { ...tgtDim }; staticFrame(); return; }
  start();
}
function reset() { stop(); current = null; ripples = []; if (ctx) ctx.clearRect(0, 0, w, h); }

// ---------- 效果注册表（Task 2-7 逐个替换占位）----------
const placeholder = {
  parts: [],
  init(w, h) { this.parts = Array.from({ length: 40 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(1, 2.5), vx: rand(-8, 8), vy: rand(-8, 8) })); },
  update(dt, env) { const s = dt / 1000; for (const p of this.parts) { p.x = (p.x + p.vx * s + env.w) % env.w; p.y = (p.y + p.vy * s + env.h) % env.h; } },
  draw(ctx, env) { ctx.fillStyle = rgba(env.color, 0.5); for (const p of this.parts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); } },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};
const EFFECTS = { stars: placeholder, tracks: placeholder, waves: placeholder, dusk: placeholder, rain: placeholder, moon: placeholder };

export const BGFX = { init, setEffect, reset };
