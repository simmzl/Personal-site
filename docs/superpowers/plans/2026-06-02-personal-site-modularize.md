# @SIMMZL 个人主页模块化重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把单文件 `index.html`（1291 行）拆成 `index.html` + `style.css` + 4 个原生 ES module（terminal/quiz/cli/bgm），视觉与行为 100% 不变。

**Architecture:** HTML / CSS / JS 三分。JS 按业务块拆为 4 个 ES module；`terminal.js` 当核心宿主，导出共享状态对象 `S`、DOM 引用 `dom`、输出引擎、视觉/启动/输入函数；`quiz.js`、`cli.js` `import` 它们要用的；`bgm.js` 基本独立、被 `quiz` 调用。`terminal.js` 是入口，`index.html` 只引它一个，其余靠 import 链加载。零构建，GitHub Pages 直接部署。

**Tech Stack:** 原生 ES Modules（`<script type="module">`），无构建工具、无 TypeScript、无测试框架。

---

## ⚠️ 本计划的验证方式（请先读）

这是**行为等价的重构**（搬移现有代码），不是写新功能。因此：

- **没有自动化测试**（spec 明确不引入测试框架）。每个 Task 的"验证"步骤 = 启动本地 server + 浏览器人工走查指定功能，确认行为与原版一致。
- **核心是平移，不是重写**：绝大多数函数体**原样搬运**，只按下方《平移改造规则》改动"变量从哪来"。
- 每个 Task 结束都提交，保持可回滚。

### 启动本地预览 server（每次验证用）

```bash
cd /Users/simmzl/Desktop/personal/Personal-site
# 若已在跑可跳过；端口被占用换一个
python3 -m http.server 8765
# 浏览器访问 http://127.0.0.1:8765/index.html
```

> ⚠️ 拆成 ES module 后，**不能再用 `file://` 双击打开**（CORS 拦截 module 加载），必须经 http。

### 《平移改造规则》（搬运任何函数体时统一套用）

1. **闭包状态变量 → `S` 属性**：
   `mode`→`S.mode`，`lang`→`S.lang`，`qIndex`→`S.qIndex`，`silicon`→`S.silicon`，`maxPts`→`S.maxPts`，`lastVerdict`→`S.lastVerdict`，`themeIdx`→`S.themeIdx`，`typing`→`S.typing`，`typeQ`→`S.typeQ`，`gen`→`S.gen`，`cliReady`→`S.cliReady`，`booted`→`S.booted`
2. **DOM 引用 → `dom` 属性**：
   `log`→`dom.log`，`idEl`→`dom.idEl`，`prompt`→`dom.prompt`，`ps1El`→`dom.ps1El`，`cli`→`dom.cli`，`cmd`→`dom.cmd`，`history`→`dom.history`，`bgfx`→`dom.bgfx`
3. **跨模块调用 → 用 import 进来的符号**（各 Task 给出 import 清单）
4. 其余代码**原样保留**（包括注释、空白、字符串）

> 注：`gen` 原是 `let gen = 0`，`boot()` 里 `const my = ++gen` → 改为 `const my = ++S.gen`；`typeLine/progressLine/typeInto` 里 `const my = gen` → `const my = S.gen`。所有对 `gen` 的读写都走 `S.gen`。

---

## File Structure

| 文件 | 职责 | 来源（原 index.html 行号） |
|------|------|------|
| `index.html` | 纯 HTML 结构 + `<link>` + 入口 module + analytics inline | 重写 head/script，body 保留 302–379 |
| `assets/style.css` | 全部 CSS | 28–300（`<style>` 内容） |
| `assets/js/terminal.js` | 核心：状态/DOM/输出引擎/prompt/滚动/视觉/剪贴板/启动/电源/输入/入口装配 | 见 Task 3 映射表 |
| `assets/js/quiz.js` | 沃伊特测试：题库/调色板/流程/判定 | QUESTIONS 495–550, QBG 673–680, questionBackdrop/startTest/askQuestion/doLang/doBgm/doAnswer/quirkyLines/verdict 690–893 |
| `assets/js/cli.js` | slash 命令分发 + 各命令文案 | helpText/whoamiText/aboutText/sheepArt/doCli 912–1006 |
| `assets/js/bgm.js` | 背景音乐 + phosphor beam 动画 | 1143–1263（第二个 IIFE） |

**所有 commit 追加 trailer：**
```
Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```
（下方各 commit 命令省略该行，提交时补上。）

---

## Task 1: 抽离 CSS 到 style.css

**Files:**
- Create: `assets/style.css`
- Modify: `index.html`（删除 `<style>` 28–300，head 内加 `<link>`）

- [ ] **Step 1: 创建 `assets/style.css`**

把 `index.html` 第 **29–299 行**（`<style>` 与 `</style>` 之间的全部 CSS，不含标签本身）**原样**剪切到 `assets/style.css`。不改任何一个字符。

- [ ] **Step 2: 改 index.html 引用**

删除 `index.html` 的 `<style>…</style>`（28–300 整段），在原 `<link href="...JetBrains+Mono...">` 那行（第 27 行）之后插入：

```html
<link rel="stylesheet" href="./assets/style.css" />
```

- [ ] **Step 3: 验证视觉不变**

启动 server，浏览器打开 `http://127.0.0.1:8765/index.html`。确认：
- CRT 磷光绿、扫描线、屏幕闪烁、四角曲率、暗角（vignette）都在
- 字体是 VT323（像素终端体）
- boot 动画、`@SIMMZL` 居中、输入提示行样式与改动前一致

- [ ] **Step 4: 提交**

```bash
git add index.html assets/style.css
git commit -m "refactor: 抽离 CSS 到 style.css"
```

---

## Task 2: 抽离 bgm.js（ES module，暂留 window.BGM 兼容）

此时主逻辑仍是 inline IIFE（用 `window.BGM`），所以 `bgm.js` 先 `export` **并**保留 `window.BGM` 兼容，Task 6 再去掉 window 挂载。

**Files:**
- Create: `assets/js/bgm.js`
- Modify: `index.html`（把第二个 `<script>` 1143–1263 换成 module 引用）

- [ ] **Step 1: 创建 `assets/js/bgm.js`**

把 `index.html` 第 **1144–1262 行**（第二个 IIFE 内部，即 `(function () { "use strict"; … })();` 的内容）搬到 `assets/js/bgm.js`。改造：
- 去掉最外层 `(function () { "use strict"; … })();` 包裹，改为模块顶层 `"use strict";` 不需要（module 自动严格）
- 原 `window.BGM = { … }`（约原 1242 行）**保留不动**（兼容当前仍 inline 的主逻辑）
- 末尾追加一行导出：

```js
export const BGM = window.BGM;
```

> bgm 模块自身用 `document.getElementById("bgm")` / `("bgm-toggle")` / `("prompt")` / `querySelector(".term")` / `(".screen")` 获取元素，**不依赖 terminal.js**，零 import。

- [ ] **Step 2: 改 index.html 引用**

把 `index.html` 里第二个 `<script>`（1143–1263，BGM 那段，含注释 `<!-- (6) background music … -->`）整段替换为：

```html
<!-- (6) background music — opt-in via the in-terminal prompt (or the top-right toggle). -->
<script type="module" src="./assets/js/bgm.js"></script>
```

- [ ] **Step 3: 验证音乐功能**

刷新页面，走到语言选择后的"是否开启背景音乐"步骤：
- 选 `1`（开启）→ 应有 phosphor beam 从输入框射向右上角 toggle，音乐播放，toggle 显示 `BGM ON`
- 点右上角 toggle → 能暂停/播放
- 缩放窗口 → toggle 始终贴在终端区右上角

> 注：主逻辑此时仍 inline，`window.BGM` 仍被它调用，应与原版完全一致。

- [ ] **Step 4: 提交**

```bash
git add index.html assets/js/bgm.js
git commit -m "refactor: 抽离 bgm.js 模块"
```

---

## Task 3: 主 IIFE 拆成 terminal / quiz / cli 三个 module

这是核心步骤。三者通过 import 互相接通，必须一起完成才能运行，所以验证放在本 Task 末尾整体走查。

### terminal.js 行号映射（从 index.html 主 IIFE 搬运）

| 内容 | 原行号 |
|------|--------|
| `CFG` | 388–390 |
| DOM 引用（收进 `dom` 对象）+ `bgfx`(681) | 392–398, 681 |
| `ID_TEXT` / `BOOT` / `GLYPHS` / `rnd` / `delay` | 399, 402–421, 423, 424, 425 |
| `barText` / `typeLine` / `progressLine` / `boot` | 428–484 |
| 状态变量（收进 `S` 对象） | 489–493, 553, 554, 426(gen) |
| `charDelay` / `trimHist` / `typeInto` / `appendTyped` / `drain` / `pushLine` / `pushRender` | 555–607 |
| `legacyCopy` / `copyText` / `COPY_ICO` / `OK_ICO` / `emailLineNode` | 610–646 |
| `scrollBottom` / `scrollCenter` / `setPs1` / `L` / `scrollToQuiz` | 648–670 |
| `setBackdrop` / `resetBackdrop` | 682–689, 694 |
| `out` / `THEMES` / `cycleTheme` | 898–910 |
| `escHtml` / `renderPrompt` | 1009–1030 |
| `handleEnter` / `enableCLI` | 1033–1069 |
| `scrambleReveal` | 1072–1095 |
| `replayBoot` / `skipBoot` | 1097–1113 |
| `shutdown` / `powerOn` | 962–971 |
| `applyCRT` / halt 绑定 / `start`+visibility | 1116–1137 |

- [ ] **Step 1: 创建 `assets/js/terminal.js` 骨架（顶部）**

```js
// @SIMMZL terminal — 核心宿主：状态 / DOM / 输出引擎 / 视觉 / 启动 / 输入 / 入口装配
import * as quiz from "./quiz.js";
import * as cli from "./cli.js";
// 注：bgm 由 quiz.js import 加载（quiz 的 doBgm 用 BGM），terminal 无需直接引用

// ---- 配置（保留 window.SIM 调试接口）----
export const CFG = (window.SIM = window.SIM || { speed: 1, scanlines: 1, flicker: 1, curve: 1 });

// ---- 运行时可变状态（原闭包 let 变量）----
export const S = {
  mode: "lang",     // 'boot' | 'lang' | 'bgm' | 'quiz' | 'thinking' | 'cli' | 'off'
  lang: "en",
  qIndex: 0,
  silicon: 0,
  maxPts: 0,
  lastVerdict: null,
  themeIdx: 0,
  typing: false,
  typeQ: [],
  gen: 0,
  cliReady: false,
  booted: false,
};

// ---- DOM 引用 ----
export const dom = {
  log: document.getElementById("log"),
  idEl: document.getElementById("id"),
  prompt: document.getElementById("prompt"),
  ps1El: document.getElementById("ps1"),
  cli: document.getElementById("cli"),
  cmd: document.getElementById("cmd"),
  history: document.getElementById("history"),
  bgfx: document.getElementById("bgfx"),
};

// ---- 常量 ----
const ID_TEXT = "@SIMMZL";
const GLYPHS = "!<>-_\\/[]{}=+*^?#01@$%&ABCDEFGHKMNRSTUVWXYZ";
const rnd = (s) => s[(Math.random() * s.length) | 0];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
export const L = (o) => o[S.lang];
const BOOT = [ /* 原样平移 index.html:402–421 的数组内容 */ ];
const THEMES = [ /* 原样平移 index.html:903–904 的数组内容 */ ];
```

- [ ] **Step 2: 平移 terminal.js 的函数体**

按上方映射表把对应行号的函数搬入 `terminal.js`，全部套用《平移改造规则》。需要 `export` 的符号（供 quiz/cli 使用）：

```js
export { pushLine, pushRender, appendTyped, typeInto, drain, out, trimHist,
         renderPrompt, setPs1, scrollBottom, scrollCenter, scrollToQuiz,
         setBackdrop, resetBackdrop, applyCRT, cycleTheme,
         copyText, emailLineNode,
         boot, replayBoot, skipBoot, scrambleReveal, shutdown, powerOn,
         handleEnter, enableCLI, start };
```

（其中 `barText` / `typeLine` / `progressLine` / `legacyCopy` / `escHtml` / `charDelay` / `rnd` / `delay` 是内部用，不导出。`replayBoot` 定义为 `const replayBoot = boot;`。）

关键改造点 —— **handleEnter**（跨模块分发，原 1033–1044）改造后完整代码：

```js
function handleEnter() {
  if (S.typing) return;                 // 输出动画中 -> 忽略
  const raw = dom.cli.value;
  dom.cli.value = ""; renderPrompt();
  if (S.mode === "off") { powerOn(); return; }
  if (S.mode === "boot" || S.mode === "thinking") return;
  if (raw.length) pushLine((dom.ps1El ? dom.ps1El.textContent : "") + raw, "you", true);
  if (S.mode === "lang") quiz.doLang(raw.trim());
  else if (S.mode === "bgm") quiz.doBgm(raw.trim());
  else if (S.mode === "quiz") quiz.doAnswer(raw);
  else cli.doCli(raw);
}
```

关键改造点 —— **enableCLI** 末尾（原 1067）调用 `startTest()` 改为 `quiz.startTest()`。

关键改造点 —— **boot** 内（原 466）`mode = "boot"` → `S.mode = "boot"`；其余按规则。

- [ ] **Step 3: 平移 terminal.js 末尾装配（原 1097–1137）**

```js
// ---- 向后兼容 / 调试接口（保留原有 window 挂载）----
window.replayBoot = boot;
window.skipBoot = skipBoot;        // skipBoot 函数体平移自 1098–1113
window.SIM_applyCRT = applyCRT;

// ---- 启动 ----
applyCRT();
const haltEl = document.getElementById("halt");
if (haltEl) haltEl.addEventListener("click", () => { if (S.mode === "off") powerOn(); });

function start() { if (S.booted) return; S.booted = true; boot(); }
if (document.hidden) {
  document.addEventListener("visibilitychange", function once() {
    if (!document.hidden) { document.removeEventListener("visibilitychange", once); start(); }
  });
} else { start(); }
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && S.booted && dom.prompt.style.opacity !== "1") skipBoot();
});
```

> 注：原 `skipBoot`（1098）内有 `gen++` → 改 `S.gen++`；`window.skipBoot = function(){…}` 改为先定义 `function skipBoot(){…}` 再 `window.skipBoot = skipBoot`，以便 visibility 监听与 import 都能引用。

- [ ] **Step 4: 创建 `assets/js/quiz.js`**

```js
// @SIMMZL quiz — 沃伊特-坎普夫测试：题库 / 调色板 / 流程 / 判定
import { S, L, dom, pushLine, appendTyped, typeInto, drain, setPs1,
         scrollBottom, scrollCenter, setBackdrop, resetBackdrop } from "./terminal.js";
import { BGM } from "./bgm.js";

const QUESTIONS = [ /* 原样平移 index.html:495–550 */ ];
const QBG = [ /* 原样平移 index.html:673–680 */ ];

export { startTest, doLang, doBgm, doAnswer };
// questionBackdrop / askQuestion / quirkyLines / verdict 为模块内部函数
```

平移这些函数（套用《平移改造规则》）：`questionBackdrop`(690), `startTest`(696), `askQuestion`(708), `doLang`(718), `doBgm`(740), `doAnswer`(767), `quirkyLines`(781), `verdict`(816)。

关键改造点：
- `doBgm` 内 `window.BGM.enable(true)` / `window.BGM.beam()` → `BGM.enable(true)` / `BGM.beam()`
- `verdict` 内 `typing` → `S.typing`，`typeQ` → `S.typeQ`，`silicon/maxPts` → `S.silicon`/`S.maxPts`，`lastVerdict` → `S.lastVerdict`
- `doAnswer` 末尾 `verdict()` 直接调（同模块内）；`askQuestion()` 同模块内直接调

- [ ] **Step 5: 创建 `assets/js/cli.js`**

```js
// @SIMMZL cli — slash 命令分发 + 命令文案
import { S, L, dom, out, pushLine, pushRender, setPs1, scrollBottom,
         cycleTheme, emailLineNode, replayBoot, shutdown } from "./terminal.js";
import { startTest } from "./quiz.js";

export { doCli };
// helpText / whoamiText / aboutText / sheepArt 为模块内部函数
```

平移 `helpText`(912), `whoamiText`(945), `aboutText`(952), `sheepArt`(957), `doCli`(973)（套用规则）。

关键改造点（`doCli` 内的跨模块调用）：
- `case "restart"` → `startTest()`
- `case "reboot"` → `replayBoot()`
- `case "shutdown"…` → `shutdown()`
- `case "clear"` → `dom.history.textContent = ""; dom.log.textContent = ""; setPs1("guest@simmzl:~$ "); scrollBottom();`
- `case "theme"` → `cycleTheme()`
- `whoamiText` 内 `lastVerdict` → `S.lastVerdict`

- [ ] **Step 6: 替换 index.html 的主 IIFE 为 module 入口**

删除 `index.html` 第一个 `<script>`（381–1139，整个主 IIFE），替换为：

```html
<script type="module" src="./assets/js/terminal.js"></script>
```

> `terminal.js` 顶层 `import` 了 `quiz`、`cli`、`bgm`，会自动加载整条链。无需在 HTML 里逐个引入。

- [ ] **Step 7: 验证（全流程走查 — 关键）**

刷新页面，打开浏览器**控制台看有无报错**（import 路径、循环依赖、未定义符号），然后按 spec §8 走一遍：
- boot 动画完整播放 → `@SIMMZL` 解密揭示
- 切到别的 tab 再切回来 → `skipBoot` 路径（直接显示终端，不卡）
- 选语言 1/2、输入 `en`/`zh`/`中` → 正确切换；输入乱码 → 报错提示
- BGM 开/关 → beam 动画 + 音乐
- 6 道题逐题作答（中英混测、各选项）→ 背景调色板每题切换
- 凑出**硅基**与**碳基**两种判定（多答 `s:2` 的选项偏硅基）→ 思考动画 + 置信度 + quirky 文案
- 判定后 `/help`、`/whoami`、`/about`、`/theme`（循环换色）、`/date`、`/echo hi`、`/clear`、`/sheep`、`/contact`（点复制按钮，粘贴应得 `me@simmzl.cn`）
- `/restart`（重新测试）、`/reboot`（重启动画）、`/shutdown`（关机 → 按 Enter 或点屏开机）
- 彩蛋：`/sudo` `/matrix` `/coffee` `/hello` `/ls`；未知命令提示

> 任一环节行为与原版不符 → 检查对应函数的《平移改造规则》是否漏改（最常见：漏改 `S.` 或 `dom.` 前缀、跨模块函数没走 import）。

- [ ] **Step 8: 提交**

```bash
git add index.html assets/js/terminal.js assets/js/quiz.js assets/js/cli.js
git commit -m "refactor: 主逻辑拆分为 ES module"
```

---

## Task 4: bgm.js 收尾（去掉 window.BGM 依赖）

主逻辑已 module 化，`doBgm` 现在用 `import { BGM }`，可以去掉 bgm 的 window 挂载了。

**Files:**
- Modify: `assets/js/bgm.js`

- [ ] **Step 1: 改 bgm.js 为纯 export**

把 `bgm.js` 里 `window.BGM = { … }` 改为 `export const BGM = { … }`（直接导出对象字面量），删除末尾 `export const BGM = window.BGM;` 那行。

- [ ] **Step 2: 验证音乐仍正常**

刷新，重测 BGM 开/关 + beam 动画 + toggle 点击 + resize 定位。控制台无 `window.BGM` 相关报错。

- [ ] **Step 3: 提交**

```bash
git add assets/js/bgm.js
git commit -m "refactor: bgm 改 export 接入"
```

---

## Task 5: 净化（spec §7，严格行为等价）

在已拆好的模块上做净化。**每改一类立即走查相关功能**，拿不准是否影响行为的**保留原样并加注释**。

> spec §7.5「统一命名与注释风格」：原代码命名本就规范，无需重命名；注释风格统一已在 Task 3 各模块平移时通过顶部模块注释头 + 分区完成。本 Task 不再额外改命名。

**Files:** `assets/js/*.js`（按条目涉及的文件）

- [ ] **Step 1: 清理多余尾逗号等小脏点**

搜索 `pushLine("", )`（quiz.js 内多处，原 711/727/732 等），改为 `pushLine("");`。这是无参等价调用，行为不变。

- [ ] **Step 2: 收敛重复的 scrollBottom() 调用**

仅处理**明确冗余**的：若某函数末尾 `scrollBottom()`，而它调用的 `pushLine`/`drain` 内部已 `scrollBottom`，可删外层那次。**逐个改 + 走查**，任何不确定的保留。

- [ ] **Step 3: 双语三元/魔法值（保守处理）**

本条**默认只加注释分区、不强行重构**——大量 `L(o)` 已是封装。仅当某段 `S.lang === "zh" ? A : B` 在同函数出现 ≥3 次且文案是静态串时，提取为模块顶部 `const` 文案表。**拿不准就跳过**，宁可不做。

- [ ] **Step 4: 加 analytics 提醒注释**

在 `index.html` 的 analytics inline `<script>` 顶部加注释：

```html
<!-- TODO(后续治理): GA 用的是已停用的 Universal Analytics (UA-103794454-1)，需迁移到 GA4。本次重构不动。 -->
```

- [ ] **Step 5: 走查 + 提交**

完整跑一遍 spec §8 清单确认无回归。

```bash
git add -A
git commit -m "refactor: 代码净化与注释"
```

---

## Task 6: 最终全流程走查与收尾

**Files:** 无新增改动（仅验证 + 必要修补）

- [ ] **Step 1: 确认 index.html 终态**

`index.html` 应为：head（meta/og/font + `<link>` style.css）+ body（原 302–379 结构）+ 末尾 `<script type="module" src="./assets/js/terminal.js">` + analytics inline。总行数应 ≈ 90–110 行。

- [ ] **Step 2: 完整走查 spec §8 全清单**（同 Task 3 Step 7，逐项打勾），外加：
- 移动端/窄屏（DevTools 模拟）布局与字号
- CRT 开关：控制台执行 `SIM.scanlines=0; SIM_applyCRT()` 应关掉扫描线；`SIM.curve=0; SIM_applyCRT()` 关曲率

- [ ] **Step 3: 对照原版做最终 diff 检查**

```bash
git log --oneline master..HEAD
# 确认提交历史清晰；如需可 git diff master -- index.html 看结构变化
```

- [ ] **Step 4: 收尾提交（若 Step 2 有修补）**

```bash
git add -A
git commit -m "refactor: 全流程走查收尾"
```

---

## 完成标准（Definition of Done）

- [ ] `index.html` ≈ 90–110 行纯结构
- [ ] CSS 在 `assets/style.css`；JS 在 `assets/js/{terminal,quiz,cli,bgm}.js`
- [ ] 浏览器控制台零报错
- [ ] spec §8 全流程清单逐项与原版行为一致
- [ ] 所有改动在 `refactor/modularize` 分支，提交历史清晰
