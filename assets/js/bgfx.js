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
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  canvas.width = cw * dpr; canvas.height = ch * dpr;
  // 归一化到固定虚拟高度：各分辨率/各显示器表现一致，只整体缩放（不改任何效果参数）
  h = 900; w = Math.round(h * cw / Math.max(1, ch));
  const s = (ch / h) * dpr;
  ctx.setTransform(s, 0, 0, s, 0, 0);
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
  ripples.push({ x: p.clientX / window.innerWidth * w, y: p.clientY / window.innerHeight * h, t0: performance.now(), life: 1400 });
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

// ---------- 6 个效果 ----------
// Q1 星空：三层星点（景深视差）+ 闪烁 + 斥力 + 点击爆发
const stars = {
  layers: [],
  init(w, h, o) {
    const base = [160, 95, 42], par = [4, 11, 24], depth = [0.35, 0.6, 1];
    const k = (0.55 + 0.45 * o.tension) * (o.mobile ? 0.55 : 1);
    this.layers = base.map((n, li) => ({
      par: par[li], depth: depth[li],
      ps: Array.from({ length: Math.round(n * k) }, () => ({
        x: rand(0, w), y: rand(0, h), sz: rand(0.6, 1.8) * (li + 1) * 0.6,
        vx: rand(-4, 4) * depth[li], vy: rand(-3, 3) * depth[li], ph: rand(0, 6.28),
      })),
    }));
  },
  update(dt, env) {
    const s = dt / 1000;
    for (const L of this.layers) for (const p of L.ps) {
      p.x = (p.x + p.vx * s + env.w) % env.w; p.y = (p.y + p.vy * s + env.h) % env.h;
      p.ph += s * 2.2;
      const ox = (env.pointer.x * env.w), oy = (env.pointer.y * env.h);
      const dx = p.x - ox, dy = p.y - oy, d2 = dx * dx + dy * dy;
      if (L.depth > 0.5 && d2 < 14000) { const d = Math.sqrt(d2) || 1, f = (120 - d) / 120 * 28 * s; p.x += dx / d * f; p.y += dy / d * f; }
      for (const r of env.ripples) {
        const age = (env.t - r.t0) / r.life, rx = p.x - r.x, ry = p.y - r.y, rd2 = rx * rx + ry * ry;
        if (rd2 < 20000) { const rd = Math.sqrt(rd2) || 1, ff = (1 - age) * (140 - rd) / 140 * 80 * s; if (ff > 0) { p.x += rx / rd * ff; p.y += ry / rd * ff; } }
      }
    }
  },
  draw(ctx, env) {
    for (const L of this.layers) {
      const ox = (env.pointer.x - 0.5) * L.par, oy = (env.pointer.y - 0.5) * L.par;
      ctx.shadowColor = rgba(env.color, 0.7); ctx.shadowBlur = L.depth > 0.7 ? 4 : 0;
      for (const p of L.ps) {
        const a = (0.25 + 0.55 * (0.5 + 0.5 * Math.sin(p.ph))) * (0.5 + L.depth * 0.5);
        ctx.fillStyle = rgba(env.color, a);
        ctx.beginPath(); ctx.arc(p.x + ox, p.y + oy, p.sz, 0, 6.283); ctx.fill();
      }
    }
    ctx.shadowBlur = 0;
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};

// Q2 铁轨：透视枕木滚近 + 轨道线 + 消失点视差 + 点击脉冲
const tracks = {
  ties: [], pulses: [], NEAR: 1, FAR: 14,
  init(w, h, o) {
    const n = Math.round(22 * (0.6 + 0.4 * o.tension));
    this.ties = Array.from({ length: n }, (_, i) => ({ wz: this.NEAR + (this.FAR - this.NEAR) * (i / n) }));
    this.pulses = [];
  },
  update(dt, env) {
    const s = dt / 1000, span = this.FAR - this.NEAR;
    for (const t of this.ties) { t.wz -= 2.2 * s; if (t.wz < this.NEAR) t.wz += span; }
    for (const r of env.ripples) if (!r._tk) { r._tk = 1; this.pulses.push({ wz: this.FAR }); }
    for (const p of this.pulses) p.wz -= 7 * s;
    this.pulses = this.pulses.filter(p => p.wz > this.NEAR);
  },
  draw(ctx, env) {
    // 真实 1/深度 透视：枕木世界等距，投影 near/wz → 近大远小 + 近疏远密
    const vpX = env.w / 2 + (env.pointer.x - 0.5) * env.w * 0.04, vpY = env.h * 0.28;
    const railBase = env.w * 0.22, span = env.h - vpY, NEAR = this.NEAR;
    const projY = wz => vpY + span * (NEAR / wz);
    const projW = wz => railBase * (NEAR / wz);
    const grad = ctx.createLinearGradient(0, vpY, 0, env.h);
    grad.addColorStop(0, rgba(env.color, 0)); grad.addColorStop(0.22, rgba(env.color, 0.4)); grad.addColorStop(1, rgba(env.color, 0.5));
    ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
    const yF = projY(this.FAR), wF = projW(this.FAR);
    ctx.beginPath();
    ctx.moveTo(vpX - railBase, env.h); ctx.lineTo(vpX - wF, yF);
    ctx.moveTo(vpX + railBase, env.h); ctx.lineTo(vpX + wF, yF);
    ctx.stroke();
    const breathe = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(env.t / 600));
    for (const t of this.ties) {
      const n01 = NEAR / t.wz, y = projY(t.wz), hw = projW(t.wz);
      ctx.strokeStyle = rgba(env.color, breathe + n01 * 0.25);
      ctx.lineWidth = n01 * 3.5 + 0.4;
      ctx.beginPath(); ctx.moveTo(vpX - hw, y); ctx.lineTo(vpX + hw, y); ctx.stroke();
    }
    for (const p of this.pulses) {
      const n01 = NEAR / p.wz, y = projY(p.wz), hw = projW(p.wz);
      ctx.strokeStyle = rgba(env.color, 0.85 * n01); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(vpX - hw, y); ctx.lineTo(vpX + hw, y); ctx.stroke();
    }
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};

// Q3 声波：中心持续发环 + 点击发环 + 鼠标移动漾涟漪
const waves = {
  rings: [], acc: 0, _lx: null, _ly: null,
  init(w, h) { this.rings = []; this.acc = 0; this._lx = null; this._ly = null; },
  update(dt, env) {
    const s = dt / 1000; this.acc += dt;
    if (this.acc > 2200) { this.acc = 0; this.rings.push({ x: env.w / 2, y: env.h * 0.46, r: 4, life: 3600, born: env.t, max: env.w * 0.5 }); }
    for (const r of env.ripples) if (!r._wv) { r._wv = 1; this.rings.push({ x: r.x, y: r.y, r: 4, life: 2600, born: env.t, max: env.w * 0.4 }); }
    const px = env.pointer.x * env.w, py = env.pointer.y * env.h;
    if (this._lx != null && Math.hypot(px - this._lx, py - this._ly) > 90) this.rings.push({ x: px, y: py, r: 2, life: 1100, born: env.t, max: env.w * 0.12 });
    if (this._lx == null || Math.hypot(px - this._lx, py - this._ly) > 90) { this._lx = px; this._ly = py; }
    for (const ring of this.rings) ring.r += (ring.max / (ring.life / 1000)) * s;
    this.rings = this.rings.filter(ring => (env.t - ring.born) < ring.life);
  },
  draw(ctx, env) {
    ctx.lineWidth = 1.5;
    for (const ring of this.rings) {
      const age = (env.t - ring.born) / ring.life;
      ctx.strokeStyle = rgba(env.color, 0.5 * (1 - age));
      ctx.beginPath(); ctx.arc(ring.x, ring.y, ring.r, 0, 6.283); ctx.stroke();
    }
  },
  drawStatic(ctx, env) { ctx.strokeStyle = rgba(env.color, 0.3); ctx.beginPath(); ctx.arc(env.w / 2, env.h * 0.46, env.w * 0.2, 0, 6.283); ctx.stroke(); },
};

// Q4 黄昏：地平线光晕呼吸 + 漂浮尘埃（布朗）+ 视差 + 点击扬尘
const dusk = {
  dust: [],
  init(w, h, o) {
    const n = Math.round(84 * (0.55 + 0.45 * o.tension) * (o.mobile ? 0.55 : 1));
    this.dust = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), vy: rand(6, 22), drift: rand(0, 6.28), sz: rand(0.6, 1.8), a: rand(0.1, 0.5) }));
  },
  update(dt, env) {
    const s = dt / 1000;
    for (const p of this.dust) {
      p.y -= p.vy * s; p.drift += s; p.x += Math.sin(p.drift) * 6 * s;
      if (p.y < -4) { p.y = env.h + 4; p.x = rand(0, env.w); }
      for (const r of env.ripples) { const dx = p.x - r.x, dy = p.y - r.y, d2 = dx * dx + dy * dy; if (d2 < 9000) p.vy += 30 * s; }
    }
  },
  draw(ctx, env) {
    const px = (env.pointer.x - 0.5) * 24, py = (env.pointer.y - 0.5) * 12;
    const horizon = env.h + py;
    // 天空霞光：地平线向上的暖色铺底
    const sky = ctx.createLinearGradient(0, horizon, 0, env.h * 0.05 + py);
    const br = 0.32 + 0.06 * Math.sin(env.t / 1400);
    sky.addColorStop(0, rgba(env.color, br)); sky.addColorStop(0.38, rgba(env.color, br * 0.72)); sky.addColorStop(0.72, rgba(env.color, br * 0.28)); sky.addColorStop(1, rgba(env.color, 0));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, env.w, horizon);
    // （太阳已移除，保留天空暖色渐变 + 地平线 + 浮尘）
    // 地平线亮线（柔和）
    ctx.fillStyle = rgba(env.color, 0.22); ctx.fillRect(0, horizon, env.w, 1);
    // 漂浮尘埃
    for (const p of this.dust) { ctx.fillStyle = rgba(env.color, p.a); ctx.beginPath(); ctx.arc(p.x + px, p.y + py, p.sz, 0, 6.283); ctx.fill(); }
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};

// Q5 雨：每滴独立长度/速度/透明度 + 溅水花 + 鼠标斥力拨开 + 点击溅射
const rain = {
  drops: [], splash: [],
  init(w, h, o) {
    const n = Math.round(140 * (0.55 + 0.45 * o.tension) * (o.mobile ? 0.5 : 1));
    this.drops = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), len: rand(10, 26), sp: rand(450, 900), a: rand(0.28, 0.66) }));
    this.splash = [];
  },
  update(dt, env) {
    const s = dt / 1000, ox = env.pointer.x * env.w, oy = env.pointer.y * env.h;
    for (const d of this.drops) {
      d.y += d.sp * s; d.x += d.sp * 0.18 * s;
      const dx = d.x - ox, dy = d.y - oy;
      if (dx * dx + dy * dy < 9000) d.x += (dx > 0 ? 1 : -1) * 60 * s;
      if (d.y > env.h) { this.splash.push({ x: d.x, y: env.h, vx: rand(-30, 30), vy: rand(-60, -20), life: 360, born: env.t }); d.y = rand(-40, 0); d.x = rand(0, env.w); }
    }
    for (const r of env.ripples) if (!r._rn) { r._rn = 1; for (let i = 0; i < 10; i++) this.splash.push({ x: r.x, y: r.y, vx: rand(-80, 80), vy: rand(-120, -20), life: 500, born: env.t }); }
    for (const sp of this.splash) { sp.x += sp.vx * s; sp.vy += 200 * s; sp.y += sp.vy * s; }
    this.splash = this.splash.filter(sp => (env.t - sp.born) < sp.life);
  },
  draw(ctx, env) {
    ctx.strokeStyle = rgba(env.color, 0.7); ctx.lineWidth = 1;
    for (const d of this.drops) { ctx.globalAlpha = d.a; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.18, d.y - d.len); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const sp of this.splash) { ctx.fillStyle = rgba(env.color, 0.4 * (1 - (env.t - sp.born) / sp.life)); ctx.beginPath(); ctx.arc(sp.x, sp.y, 1.3, 0, 6.283); ctx.fill(); }
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};

// Q6 月：月盘 + 环形山 + 卫星椭圆轨道 + 自转虚线轨道 + 视差 + 点击泛光
const moon = {
  sats: [], spin: 0, flash: 0,
  init(w, h, o) {
    this.sats = Array.from({ length: o.mobile ? 3 : 5 }, (_, i) => ({ ang: rand(0, 6.28), sp: rand(0.2, 0.5) * (i % 2 ? 1 : -1), rx: rand(0.34, 0.46), ry: rand(0.12, 0.2) }));
    this.spin = 0; this.flash = 0;
  },
  update(dt, env) {
    const s = dt / 1000; this.spin += s * 0.1;
    for (const sat of this.sats) sat.ang += sat.sp * s;
    for (const r of env.ripples) if (!r._mn) { r._mn = 1; this.flash = 1; }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - s * 1.5);
  },
  draw(ctx, env) {
    const cx = env.w / 2 + (env.pointer.x - 0.5) * 16, cy = env.h * 0.4 + (env.pointer.y - 0.5) * 10;
    const R = Math.min(env.w, env.h) * 0.16;
    const ox = (env.pointer.x - 0.5) * 30, oy = (env.pointer.y - 0.5) * 18;
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
    g.addColorStop(0, rgba(env.color, 0.22 + this.flash * 0.3)); g.addColorStop(1, rgba(env.color, 0.04));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
    for (const sat of this.sats) { const x = env.w / 2 + ox + Math.cos(sat.ang) * R * 2.4 * (sat.rx / 0.4), y = env.h * 0.4 + oy + Math.sin(sat.ang) * R * (sat.ry / 0.16); ctx.fillStyle = rgba(env.color, 0.7); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.283); ctx.fill(); }
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};

const EFFECTS = { stars, tracks, waves, dusk, rain, moon };

export const BGFX = { init, setEffect, reset };
