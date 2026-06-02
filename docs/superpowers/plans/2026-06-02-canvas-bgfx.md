# Canvas 背景特效系统 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 6 道题的 CSS 背景特效替换为手写 canvas 粒子引擎，逐题粒子化重做，加入鼠标视差/斥力/点击交互，保持随题变色、零依赖、零构建。

**Architecture:** 新增 `assets/js/bgfx.js`——一个全屏 `<canvas>` + 单 RAF 主循环 + 6 个效果模块（各实现 `init/update/draw`）+ 统一交互层（pointer 视差/斥力、ripples 点击）+ 颜色 lerp 过渡。`terminal.js` 启动时 `BGFX.init(canvas)`；`quiz.js` 切题时 `BGFX.setEffect(name, palette, tension)`。零依赖、零构建。

**Tech Stack:** 原生 Canvas 2D + ES module，无库、无 WebGL、无构建工具、无测试框架。

---

## ⚠️ 验证方式（先读）

本项目**无测试框架**（spec 非目标），canvas 动效**只有人眼能验**。每个 Task 验证 = 两部分：
- **静态检查**（实现者可做）：`node --input-type=module --check < assets/js/bgfx.js`、grep 结构、确认无遗漏
- **人工浏览器走查**（标注「🔍 人工」，由人完成）：启动 server 后在浏览器看视觉 + 交互 + 控制台报错

视觉参数（粒子数、速度、透明度、力度）给的是**初值**，**实测在浏览器微调**——这是 canvas 视觉代码的正常迭代，不算偏离计划。

启动预览：
```bash
cd /Users/simmzl/Desktop/personal/Personal-site
python3 -m http.server 8765   # 浏览器开 http://127.0.0.1:8765/
```
> ES module 必须经 http，不能 file:// 双击。

**所有 commit 追加 trailer：** `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`（下方命令省略，提交时补上）。

---

## File Structure

| 文件 | 责任 |
|------|------|
| `assets/js/bgfx.js`（新增） | canvas 引擎：主循环 / 交互层 / 颜色过渡 / 6 效果模块 / 工具。单文件、分区注释组织（与 terminal.js 同量级） |
| `index.html`（改 1 行） | `<div id="bgfx">` → `<canvas id="bgfx">` |
| `assets/js/terminal.js`（改 2 处） | import BGFX；启动调 `BGFX.init`；`setBackdrop` 移除 `dom.bgfx.className` 行 |
| `assets/js/quiz.js`（改 3 处） | import BGFX；`questionBackdrop` 调 `BGFX.setEffect`；`startTest`/`verdict` 的 `resetBackdrop` 旁调 `BGFX.reset` |
| `assets/style.css`（删 1 段） | 删 `#bgfx.fx-*` 6 段特效 + 相关 keyframes（179-235），保留 `#bgfx` 基础定位（174-178） |

---

## Task 1: 引擎骨架 + 管线跑通（含一个占位效果）

**Files:**
- Create: `assets/js/bgfx.js`
- Modify: `index.html:31`、`assets/js/terminal.js`、`assets/js/quiz.js`

- [ ] **Step 1: 新建 `assets/js/bgfx.js`，写引擎核心 + 占位效果**

完整代码：

```js
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
function staticFrame() {
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);
  if (current && current.drawStatic) { current.update(0, baseEnv()); current.drawStatic(ctx, baseEnv()); }
}
function baseEnv() { return { color: curColor, dim: curDim, pointer, ripples: [], tension, w, h, dt: 0, t: performance.now(), mobile }; }

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

// ---------- 效果注册表（Task 2-7 逐个填充；Task 1 先放占位）----------
const placeholder = {
  parts: [],
  init(w, h) { this.parts = Array.from({ length: 40 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(1, 2.5), vx: rand(-8, 8), vy: rand(-8, 8) })); },
  update(dt, env) { const s = dt / 1000; for (const p of this.parts) { p.x = (p.x + p.vx * s + env.w) % env.w; p.y = (p.y + p.vy * s + env.h) % env.h; } },
  draw(ctx, env) { ctx.fillStyle = rgba(env.color, 0.5); for (const p of this.parts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); } },
};
const EFFECTS = { stars: placeholder, tracks: placeholder, waves: placeholder, dusk: placeholder, rain: placeholder, moon: placeholder };

export const BGFX = { init, setEffect, reset };
```

- [ ] **Step 2: `index.html:31` div → canvas**

```html
<!-- 改前 -->
  <div id="bgfx" aria-hidden="true"></div>
<!-- 改后 -->
  <canvas id="bgfx" aria-hidden="true"></canvas>
```

- [ ] **Step 3: `terminal.js` 接入 init + 清理 setBackdrop**

顶部 import 区加：
```js
import { BGFX } from "./bgfx.js";
```
`setBackdrop`（240-247 行）删掉第 246 行 `if (dom.bgfx) dom.bgfx.className = fx || "";`（canvas 不用 class；`fx` 参数保留在签名上、不再使用，避免改调用方）。
启动区 `applyCRT();`（403 行）之后加一行：
```js
if (dom.bgfx) BGFX.init(dom.bgfx);
```

- [ ] **Step 4: `quiz.js` 接入 setEffect + reset**

顶部 import 区加：
```js
import { BGFX } from "./bgfx.js";
```
`questionBackdrop`（75-78 行）改为：
```js
function questionBackdrop(i) {
  const q = QBG[i] || QBG[0];
  setBackdrop(q.c[0], q.c[1], q.bg, i / (QUESTIONS.length - 1), q.fx);
  BGFX.setEffect(q.fx, q, i / (QUESTIONS.length - 1));
}
```
`startTest` 里 `resetBackdrop();`（84 行）之后加 `BGFX.reset();`
`verdict` 里 `resetBackdrop();`（205 行）之后加 `BGFX.reset();`

- [ ] **Step 5: 静态检查**

```bash
cd /Users/simmzl/Desktop/personal/Personal-site
node --input-type=module --check < assets/js/bgfx.js && echo "bgfx.js OK"
for f in terminal quiz; do node --input-type=module --check < assets/js/$f.js && echo "$f OK"; done
grep -c "<canvas id=\"bgfx\"" index.html        # 1
grep -c "BGFX" assets/js/terminal.js assets/js/quiz.js  # 各 >=2
```

- [ ] **Step 6: 🔍 人工走查（管线）**

启动 server，浏览器走到答题阶段：每题都应看到占位粒子（小圆点漂移）、切题颜色平滑过渡、控制台无报错；缩放窗口 canvas 跟随；切到别的 tab 再回来动画恢复；移动鼠标 `pointer` 在更新（占位效果暂时看不出视差，下个 Task 起体现）。

- [ ] **Step 7: 提交**

```bash
git add assets/js/bgfx.js index.html assets/js/terminal.js assets/js/quiz.js
git commit -m "feat(bgfx): canvas 引擎骨架 + 管线接入"
```

---

## Task 2–7 通用结构

每个效果是 `EFFECTS` 注册表里的一个对象，替换占位，实现 `init(w,h,opt)` / `update(dt,env)` / `draw(ctx,env)`（可选 `resize(w,h)` / `drawStatic(ctx,env)`）。`opt = {mobile, tension}`，数量按 `Math.round(base * (0.55 + 0.45*tension) * (mobile?0.55:1))`。颜色一律用 `env.color`（亮）/ `env.dim`（暗）+ `rgba()`。视差用 `(env.pointer.x-0.5)`、`(env.pointer.y-0.5)`。斥力/点击见各 Task。每个 Task：实现该效果对象 → 静态检查 → 🔍 人工走查该题 → 提交。

> 提示：调试某效果时，可临时在控制台 `SIM` 旁手动触发，或直接走到对应题号。

---

## Task 2: 星空 stars（Q1 绿）

**Files:** Modify `assets/js/bgfx.js`（替换 `EFFECTS.stars`）

- [ ] **Step 1: 实现 stars**

数据结构：三层粒子 `{x, y, sz, vx, vy, ph}`（ph=闪烁相位）。

```js
const stars = {
  layers: [],
  init(w, h, o) {
    const base = [70, 40, 16], par = [4, 11, 24], depth = [0.35, 0.6, 1];
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
      // 斥力（近层更敏感）
      const ox = (env.pointer.x * env.w), oy = (env.pointer.y * env.h);
      const dx = p.x - ox, dy = p.y - oy, d2 = dx * dx + dy * dy;
      if (L.depth > 0.5 && d2 < 14000) { const d = Math.sqrt(d2) || 1, f = (120 - d) / 120 * 28 * s; p.x += dx / d * f; p.y += dy / d * f; }
      // 点击爆发：附近星点被外推（随 ripple 衰减）
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
```
注册：`EFFECTS.stars = stars;`（替换占位引用）。

- [ ] **Step 2: 静态检查** `node --input-type=module --check < assets/js/bgfx.js`
- [ ] **Step 3: 🔍 人工走查 Q1**：三层星点景深、独立闪烁自然（不再像贴图）；移动鼠标整体视差偏移（近层动更多）；鼠标靠近时附近星点避让；控制台无报错。参数（数量/闪烁速度/视差幅度/斥力半径）按手感微调。
- [ ] **Step 4: 提交** `git commit -am "feat(bgfx): 星空 stars 效果"`

---

## Task 3: 铁轨 tracks（Q2 红）

**Files:** Modify `assets/js/bgfx.js`（替换 `EFFECTS.tracks`）

- [ ] **Step 1: 实现 tracks**

单点透视：消失点 `vp`，枕木用归一化深度 `z`（0=近大、1=远小），屏幕 y 用透视映射 `y = vpY + (1-z)^1.6 * (h - vpY)`；脉冲沿 z 推进。

```js
const tracks = {
  ties: [], pulses: [],
  init(w, h, o) {
    const n = Math.round(16 * (0.6 + 0.4 * o.tension));
    this.ties = Array.from({ length: n }, (_, i) => ({ z: i / n }));
    this.pulses = [];
  },
  update(dt, env) {
    const s = dt / 1000;
    for (const t of this.ties) { t.z -= 0.12 * s; if (t.z < 0) t.z += 1; }
    // 点击 → 脉冲从远处冲来
    for (const r of env.ripples) if (!r._tk) { r._tk = 1; this.pulses.push({ z: 1 }); }
    for (const p of this.pulses) p.z -= 0.5 * s;
    this.pulses = this.pulses.filter(p => p.z > 0);
  },
  draw(ctx, env) {
    const vpX = env.w / 2 + (env.pointer.x - 0.5) * env.w * 0.12, vpY = env.h * 0.42;
    const persp = z => vpY + Math.pow(1 - z, 1.6) * (env.h - vpY);
    const halfW = z => (1 - z) * env.w * 0.6;
    // 两条轨道线
    ctx.strokeStyle = rgba(env.color, 0.5); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(vpX - env.w * 0.6, env.h); ctx.lineTo(vpX, vpY);
    ctx.moveTo(vpX + env.w * 0.6, env.h); ctx.lineTo(vpX, vpY); ctx.stroke();
    // 枕木（红色警报呼吸用 0.06~0.14 alpha）
    const breathe = 0.06 + 0.05 * (0.5 + 0.5 * Math.sin(env.t / 600));
    for (const t of this.ties) {
      const y = persp(t.z), hw = halfW(t.z) * 0.5;
      ctx.strokeStyle = rgba(env.color, breathe + (1 - t.z) * 0.2);
      ctx.lineWidth = (1 - t.z) * 4 + 0.5;
      ctx.beginPath(); ctx.moveTo(vpX - hw, y); ctx.lineTo(vpX + hw, y); ctx.stroke();
    }
    // 脉冲
    for (const p of this.pulses) {
      const y = persp(p.z), hw = halfW(p.z) * 0.5;
      ctx.strokeStyle = rgba(env.color, 0.8 * p.z); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(vpX - hw, y); ctx.lineTo(vpX + hw, y); ctx.stroke();
    }
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};
```
注册 `EFFECTS.tracks = tracks;`

- [ ] **Step 2: 静态检查**（同上 node --check）
- [ ] **Step 3: 🔍 人工走查 Q2**：枕木由远及近滚向你（纵深逼近）、红色警报呼吸；移动鼠标消失点横移；点击有脉冲沿轨道冲来；无报错。透视指数/速度/呼吸幅度实测调。
- [ ] **Step 4: 提交** `git commit -am "feat(bgfx): 铁轨 tracks 效果"`

---

## Task 4: 声波 waves（Q3 蓝）

**Files:** Modify `assets/js/bgfx.js`（替换 `EFFECTS.waves`）

- [ ] **Step 1: 实现 waves**

圆环数组 `{x, y, r, born, life}`；中心定时发环；点击在点击处发环（最契合"声音"）；鼠标移动漾小环。

```js
const waves = {
  rings: [], acc: 0,
  init(w, h) { this.rings = []; this.acc = 0; },
  update(dt, env) {
    const s = dt / 1000; this.acc += dt;
    if (this.acc > 1100) { this.acc = 0; this.rings.push({ x: env.w / 2, y: env.h * 0.46, r: 4, life: 3600, born: env.t, max: env.w * 0.5 }); }
    for (const r of env.ripples) if (!r._wv) { r._wv = 1; this.rings.push({ x: r.x, y: r.y, r: 4, life: 2600, born: env.t, max: env.w * 0.4 }); }
    // 鼠标移动沿途漾小涟漪（节流：移动 >40px 才发）
    const px = env.pointer.x * env.w, py = env.pointer.y * env.h;
    if (this._lx != null && Math.hypot(px - this._lx, py - this._ly) > 40) this.rings.push({ x: px, y: py, r: 2, life: 1400, born: env.t, max: env.w * 0.12 });
    if (this._lx == null || Math.hypot(px - this._lx, py - this._ly) > 40) { this._lx = px; this._ly = py; }
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
```
注册 `EFFECTS.waves = waves;`

- [ ] **Step 2: 静态检查**
- [ ] **Step 3: 🔍 人工走查 Q3**：中心持续发同心圆扩散淡出；**点击在点击处激发新声波**；无报错。发环间隔/扩散速度/数量实测调。
- [ ] **Step 4: 提交** `git commit -am "feat(bgfx): 声波 waves 效果"`

---

## Task 5: 黄昏 dusk（Q4 橙）

**Files:** Modify `assets/js/bgfx.js`（替换 `EFFECTS.dusk`）

- [ ] **Step 1: 实现 dusk**

底部地平线光晕（线性渐变呼吸）+ 漂浮尘埃 `{x, y, vy, drift, sz, a}`（上升 + 布朗）。

```js
const dusk = {
  dust: [],
  init(w, h, o) {
    const n = Math.round(60 * (0.55 + 0.45 * o.tension) * (o.mobile ? 0.55 : 1));
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
    // 地平线光晕（呼吸）
    const g = ctx.createLinearGradient(0, env.h, 0, env.h * 0.44 + py);
    const br = 0.32 + 0.08 * Math.sin(env.t / 1400);
    g.addColorStop(0, rgba(env.color, br)); g.addColorStop(0.4, rgba(env.color, br * 0.4)); g.addColorStop(1, rgba(env.color, 0));
    ctx.fillStyle = g; ctx.fillRect(0, env.h * 0.44, env.w, env.h * 0.56);
    // 尘埃
    for (const p of this.dust) { ctx.fillStyle = rgba(env.color, p.a); ctx.beginPath(); ctx.arc(p.x + px, p.y + py, p.sz, 0, 6.283); ctx.fill(); }
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};
```
注册 `EFFECTS.dusk = dusk;`

- [ ] **Step 2: 静态检查**
- [ ] **Step 3: 🔍 人工走查 Q4**：底部琥珀光晕呼吸、尘埃缓升布朗漂浮；鼠标视差光晕/尘埃偏移；点击附近尘埃被扬起；无报错。光晕高度/尘埃数/上升速度实测调。
- [ ] **Step 4: 提交** `git commit -am "feat(bgfx): 黄昏 dusk 效果"`

---

## Task 6: 雨 rain（Q5 蓝）

**Files:** Modify `assets/js/bgfx.js`（替换 `EFFECTS.rain`）

- [ ] **Step 1: 实现 rain**

雨滴**每滴独立** `{x, y, len, sp, a}`（长度/速度/透明度随机 → 自然）；落地溅水花；鼠标斥力拨开。

```js
const rain = {
  drops: [], splash: [],
  init(w, h, o) {
    const n = Math.round(140 * (0.55 + 0.45 * o.tension) * (o.mobile ? 0.5 : 1));
    this.drops = Array.from({ length: n }, () => ({ x: rand(0, w), y: rand(0, h), len: rand(10, 26), sp: rand(450, 900), a: rand(0.1, 0.4) }));
    this.splash = [];
  },
  update(dt, env) {
    const s = dt / 1000, ox = env.pointer.x * env.w, oy = env.pointer.y * env.h;
    for (const d of this.drops) {
      d.y += d.sp * s; d.x += d.sp * 0.18 * s;            // 斜向（104deg 观感）
      const dx = d.x - ox, dy = d.y - oy;
      if (dx * dx + dy * dy < 9000) d.x += (dx > 0 ? 1 : -1) * 60 * s;   // 斥力拨开
      if (d.y > env.h) { this.splash.push({ x: d.x, y: env.h, vx: rand(-30, 30), vy: rand(-60, -20), life: 360, born: env.t }); d.y = rand(-40, 0); d.x = rand(0, env.w); }
    }
    for (const r of env.ripples) if (!r._rn) { r._rn = 1; for (let i = 0; i < 10; i++) this.splash.push({ x: r.x, y: r.y, vx: rand(-80, 80), vy: rand(-120, -20), life: 500, born: env.t }); }
    for (const sp of this.splash) { sp.x += sp.vx * s; sp.vy += 200 * s; sp.y += sp.vy * s; }
    this.splash = this.splash.filter(sp => (env.t - sp.born) < sp.life);
  },
  draw(ctx, env) {
    ctx.strokeStyle = rgba(env.color, 0.5); ctx.lineWidth = 1;
    for (const d of this.drops) { ctx.globalAlpha = d.a; ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.18, d.y - d.len); ctx.stroke(); }
    ctx.globalAlpha = 1;
    for (const sp of this.splash) { ctx.fillStyle = rgba(env.color, 0.4 * (1 - (env.t - sp.born) / sp.life)); ctx.beginPath(); ctx.arc(sp.x, sp.y, 1.3, 0, 6.283); ctx.fill(); }
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};
```
注册 `EFFECTS.rain = rain;`

- [ ] **Step 2: 静态检查**
- [ ] **Step 3: 🔍 人工走查 Q5**：雨丝长短/快慢/浓淡不一（自然，不再规则）、落地溅水花；鼠标拨开附近雨丝；点击一片溅射；无报错。雨量/速度/斥力实测调。
- [ ] **Step 4: 提交** `git commit -am "feat(bgfx): 雨 rain 效果"`

---

## Task 7: 月 moon（Q6 银）

**Files:** Modify `assets/js/bgfx.js`（替换 `EFFECTS.moon`）

- [ ] **Step 1: 实现 moon**

月盘（径向渐变 + 环形山暗点）+ 卫星沿椭圆轨道 + 自转虚线轨道环。

```js
const moon = {
  sats: [], craters: [], spin: 0, flash: 0,
  init(w, h, o) {
    this.sats = Array.from({ length: o.mobile ? 3 : 5 }, (_, i) => ({ ang: rand(0, 6.28), sp: rand(0.2, 0.5) * (i % 2 ? 1 : -1), rx: rand(0.34, 0.46), ry: rand(0.12, 0.2) }));
    this.craters = Array.from({ length: 6 }, () => ({ dx: rand(-0.5, 0.5), dy: rand(-0.5, 0.5), r: rand(0.06, 0.16) }));
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
    // 自转虚线轨道环（视差更远：偏移更大）
    const ox = (env.pointer.x - 0.5) * 30, oy = (env.pointer.y - 0.5) * 18;
    ctx.save(); ctx.translate(env.w / 2 + ox, env.h * 0.4 + oy); ctx.rotate(this.spin);
    ctx.setLineDash([4, 8]); ctx.strokeStyle = rgba(env.dim, 0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, 0, R * 2.4, R * 1, 0, 0, 6.283); ctx.stroke();
    ctx.setLineDash([]); ctx.restore();
    // 月盘
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
    g.addColorStop(0, rgba(env.color, 0.22 + this.flash * 0.3)); g.addColorStop(1, rgba(env.color, 0.04));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.fill();
    // 环形山
    for (const c of this.craters) { ctx.fillStyle = rgba(env.dim, 0.18); ctx.beginPath(); ctx.arc(cx + c.dx * R, cy + c.dy * R, c.r * R, 0, 6.283); ctx.fill(); }
    // 卫星
    for (const sat of this.sats) { const x = env.w / 2 + ox + Math.cos(sat.ang) * R * 2.4 * (sat.rx / 0.4), y = env.h * 0.4 + oy + Math.sin(sat.ang) * R * (sat.ry / 0.16); ctx.fillStyle = rgba(env.color, 0.7); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.283); ctx.fill(); }
  },
  drawStatic(ctx, env) { this.draw(ctx, env); },
};
```
注册 `EFFECTS.moon = moon;`

- [ ] **Step 2: 静态检查**
- [ ] **Step 3: 🔍 人工走查 Q6**：银月盘 + 环形山 + 卫星椭圆环绕 + 虚线轨道自转；鼠标视差月/轨道分层；点击月面泛光；无报错。轨道半径/卫星数/自转速度实测调。
- [ ] **Step 4: 提交** `git commit -am "feat(bgfx): 月 moon 效果"`

---

## Task 8: 删除旧 CSS 特效 + 清理

**Files:** Modify `assets/style.css`

- [ ] **Step 1: 删除 `#bgfx.fx-*` 6 段特效 + 相关 keyframes**

删除 `style.css` 第 179-235 行区间内所有 `#bgfx.fx-stars` / `fx-tracks` / `fx-waves` / `fx-dusk` / `fx-rain` / `fx-moon` 规则，以及它们专用的 `@keyframes`（`fxdrift` / `fxslidey` / `fxring` / `fxgrain` / `fxrain` / `fxspin`）。
**保留** `#bgfx{...}` 基础定位（174-176）、`body.testing #bgfx{opacity:1}`（177）。canvas 复用这些定位。
保留 `@media (prefers-reduced-motion:reduce){#bgfx::before,#bgfx::after{...}}`？——已无 `::before/::after`，一并删除该条。

- [ ] **Step 2: 验证 CSS 未误删 + canvas 定位仍在**

```bash
cd /Users/simmzl/Desktop/personal/Personal-site
grep -c "fx-stars\|fx-tracks\|fx-waves\|fx-dusk\|fx-rain\|fx-moon" assets/style.css   # 0
grep -n "#bgfx{" assets/style.css     # 基础定位仍在
grep -n "@keyframes flick\|@keyframes" assets/style.css | head   # CRT 等其它 keyframes 不受影响
```

- [ ] **Step 3: 🔍 人工走查**：6 题特效仍正常（现在全 canvas）、`#bgfx` canvas 全屏定位正确、无残留 CSS 影响。
- [ ] **Step 4: 提交** `git commit -am "refactor(bgfx): 移除旧 CSS 背景特效"`

---

## Task 9: 全流程走查 + 性能/降级实测

**Files:** 仅验证 + 按需微调参数

- [ ] **Step 1: 🔍 完整走查**：6 题逐题（效果正确、变色过渡平滑、靠后题更密=tension）；三种交互（视差/斥力/点击）在每效果表现；前奏/判定回基线（reset 清屏）；测试流程（boot/语言/答题/判定/命令/彩蛋）全程无回归、控制台无报错。
- [ ] **Step 2: 🔍 降级验证**：系统开启「减弱动态效果」（macOS 辅助功能）后刷新 → canvas 应是静态帧、不跑动画、不卡。
- [ ] **Step 3: 🔍 性能验证**：DevTools 移动端模拟（粒子应更少）；与 CRT 闪烁/扫描线叠加流畅（目标 ~60fps，低端可接受 30+）；tab 切走 RAF 暂停（Performance 面板确认无后台绘制）。
- [ ] **Step 4: 按走查反馈微调各效果参数**（数量/速度/力度/透明度），逐项确认手感。
- [ ] **Step 5: 提交**（若有调参）`git commit -am "polish(bgfx): 性能与手感调参"`

---

## 完成标准（Definition of Done）

- [ ] 6 题全部 canvas 粒子特效，视觉自然（无"贴图/规则"机械感）
- [ ] 三种交互（视差/斥力/点击）在各效果生效
- [ ] 随题变色平滑过渡、tension 渐强保留
- [ ] `prefers-reduced-motion` 降级静态、tab 暂停、移动端减粒子
- [ ] 旧 CSS `#bgfx.fx-*` 已删，`bgfx.js` 单文件、零依赖
- [ ] 测试流程零回归、控制台零报错
- [ ] 全部在 `feat/canvas-bgfx` 分支，提交历史清晰
