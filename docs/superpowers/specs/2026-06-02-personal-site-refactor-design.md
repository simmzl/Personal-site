# @SIMMZL 个人主页重构设计

- **日期**：2026-06-02
- **项目**：Personal-site（simmzl.cn · GitHub Pages 纯静态部署）
- **分支**：`refactor/modularize`
- **状态**：已与用户对齐，待用户审阅 → 进入实施计划

---

## 1. 背景

当前首页 `index.html` 是单文件 **1291 行**，HTML / CSS / JS 全部内联：

| 区块 | 行范围 | 规模 |
|------|--------|------|
| `<style>` CSS | 28–300 | ~272 行 |
| `<body>` HTML | 302–380 | ~78 行 |
| 主 `<script>`（巨型 IIFE） | 381–1139 | ~758 行 |
| BGM `<script>`（独立 IIFE） | 1143–1263 | ~120 行 |
| analytics `<script>` | 1266–1289 | ~23 行 |

代码本身质量不低（注释完整、函数按职责分组、`gen` 代际取消机制、无障碍属性、邮箱 base64 混淆防爬）。**真正的问题是物理组织**：~900 行 JS 逻辑挤在一个文件、一个巨型 IIFE 里，职责仅靠注释划分，没有物理边界，维护时要在 1300 行里翻找。

## 2. 目标 / 非目标

**目标**
- 关注点分离：HTML / CSS / JS 三分，`index.html` 瘦身到 ~90 行纯结构
- JS 按**业务功能块**拆为 4 个原生 ES module（`terminal` / `quiz` / `cli` / `bgm`）
- 顺手净化：去重、提常量、统一命名与注释、清理小脏点
- **视觉、交互、文案 100% 不变**（纯重构，行为等价）

**非目标（明确不做）**
- ❌ 不引入构建工具 / TypeScript / ESLint / 测试框架
- ❌ 不改变「零构建、commit 即上线」的 GitHub Pages 部署方式
- ❌ 不改视觉、交互逻辑、文案内容
- ❌ 不动 analytics 逻辑（GA 为已停用的 Universal Analytics `UA-`，**仅在代码中加注释标注提醒**，治理留作另一件事）
- ❌ 不创建 `state.js` / `dom.js` / `data.js` / `input.js` / `main.js` 等无业务含义的胶水文件

## 3. 关键决策（与用户对齐）

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 重构基调 | 轻量净化 | 用户明确，风险最低 |
| 部署方式 | 保持零构建、直接部署 | 个人站点，无需工程化负担 |
| 文件组织 | 轻度拆文件（原生 ES module） | 浏览器原生支持 `<script type="module">`，零构建 |
| JS 粒度 | 按业务块切 4 个文件 | 每个都是完整功能块，**拒绝胶水文件** |
| 状态共享 | `terminal.js` 当核心宿主导出 | 不新建基础设施文件 |

## 4. 目标文件结构

```
Personal-site/
├─ index.html        HTML 结构 ~90 行（analytics 仍 inline 留这）
├─ assets/
│   ├─ style.css     全部 CSS ~272 行
│   └─ js/
│       ├─ terminal.js  核心：输出引擎+输入+prompt渲染+启动+CRT+剪贴板+滚动 ~380
│       ├─ quiz.js      沃伊特测试+题库+每题调色板 ~300
│       ├─ cli.js       slash 命令 ~120
│       └─ bgm.js       背景音乐（原样搬 BGM IIFE）~120
├─ v1.0/   v2.0/      （历史版本存档，不动）
└─ docs/superpowers/specs/   （本设计文档）
```

## 5. 模块划分与职责

### `terminal.js`（核心宿主 + 入口）
- **状态** `S`：运行时可变状态对象 —— `mode` / `lang` / `qIndex` / `silicon` / `maxPts` / `typing` / `typeQ` / `gen` / `lastVerdict` / `themeIdx`
- **配置** `CFG`：`speed` / `scanlines` / `flicker` / `curve`
- **DOM** `dom`：`log` / `idEl` / `prompt` / `ps1El` / `cli` / `cmd` / `history` / `bgfx`
- **输出引擎**：`typeInto` / `appendTyped` / `drain` / `pushLine` / `pushRender` / `trimHist` / `out`
- **prompt 渲染**：`escHtml` / `renderPrompt` / `setPs1`
- **滚动**：`scrollBottom` / `scrollCenter` / `scrollToQuiz`
- **视觉/特效**：`setBackdrop` / `resetBackdrop` / `applyCRT`（CRT 开关）/ `cycleTheme`（被 quiz、cli 共用）
- **剪贴板**：`legacyCopy` / `copyText` / `emailLineNode`
- **启动**：`BOOT` 数据 / `boot` / `typeLine` / `progressLine` / `barText` / `scrambleReveal` / `skipBoot`
- **输入**：`handleEnter` / `enableCLI` + 事件绑定 + `start`（visibility-robust 启动）

### `quiz.js`（沃伊特-坎普夫测试）
- 数据：`QUESTIONS` 题库、`QBG` 每题配色、`quirkyLines` 文案
- 流程：`startTest` / `askQuestion` / `doLang` / `doBgm` / `doAnswer` / `verdict` / `questionBackdrop`
- 依赖：`import` terminal 的状态 / 输出 / 视觉函数；`import` bgm

### `cli.js`（slash 命令）
- `doCli` 分发 + `helpText` / `whoamiText` / `aboutText` / `sheepArt` / `shutdown` / `powerOn` / `THEMES`
- 依赖：`import` terminal 的输出 / 视觉 / 启动函数；`/restart` 调 quiz 的 `startTest`

### `bgm.js`（背景音乐）
- 基本原样平移现有第二个 IIFE：audio 控制、toggle 定位、phosphor beam 动画
- 导出 `BGM = { enable, beam, isOn }`，被 quiz 的 `doBgm` 调用
- 依赖：少量 DOM，基本独立

### 依赖关系（无环）
```
        terminal.js          ← 核心：状态/DOM/输出/视觉/启动/输入
        /    |     \
     quiz   cli   bgm         ← quiz、cli import terminal；bgm 基本独立
       └──────┘
   （terminal 作入口装配输入分发：handleEnter 在运行时按 mode 调 quiz/cli 的函数）
```
> terminal 与 quiz/cli 的相互引用**只在运行时**（用户输入 → `handleEnter` 分发）发生，模块顶层不互相调用，故 ES module 循环引用安全。`<script type="module">` 默认 `defer`，执行时 DOM 已解析，模块顶层 `getElementById` 安全。

## 6. 状态共享设计

原来 ~900 行靠**闭包**共享 `mode`/`lang`/`gen` 等变量。拆模块后：

- **可变状态收进 `S` 对象**——各模块 `import { S }`，读写 `S.mode = "quiz"` / `S.gen++`。
  （ES module 不能 import 一个会被重新赋值的 `let`，导出绑定对基本类型只读，故必须用对象属性——标准做法）
- **DOM 引用收进 `dom` 对象**。
- **关键原则**：函数体逻辑**原样平移**，只改"变量从哪来"（闭包 → import）。不重写。

## 7. 净化清单（严格行为等价）

1. 收敛几十处 `lang === "zh" ? A : B` 双语三元 —— 文案集中到各模块顶部常量区
2. 清掉 `pushLine("", )` 这类多余尾逗号等小脏点
3. 重复 `scrollBottom()` 调用收敛
4. 散落魔法值补提常量（动画时长 / 音量 / 配色）
5. 统一命名与注释风格

> **拿不准是否影响行为的，一律保留原样并加注释标注，不擅自改。**

## 8. 验证（无自动化测试，靠对照走查）

重构后对照原版手动跑全流程：

- boot 启动动画 → 切 tab 再回来（`skipBoot` 路径）
- 选语言（1/2、en/zh、中文输入）→ 无效输入
- BGM 开 / 关（phosphor beam 动画）
- 6 道题：中英文、不同答案分支、无效选项
- 判定：硅基 & 碳基两种结果（含 LLM 思考动画、置信度、quirky 文案）
- 全部命令：`/help` `/theme` `/clear` `/restart` `/reboot` `/shutdown`→开机 `/whoami` `/about` `/contact`（复制邮箱）`/sheep` `/echo` `/date` + 彩蛋（`/sudo` `/matrix` `/coffee` `/hello` `/ls`）+ 未知命令
- CRT 开关（`window.SIM` + `SIM_applyCRT`）
- 窗口 resize（BGM 按钮跟随 `.term` 右上角定位）

## 9. 风险与回滚

| 风险 | 缓解 |
|------|------|
| ES module 拆分引入 import 顺序 / 循环依赖 / 状态共享错误 | 逻辑原样平移、仅改变量来源 + 全流程走查 |
| **`file://` 直开失效** | ES module 受 CORS 限制，双击 `file://` 打开会被浏览器拦截。当前单文件可双击直开，拆分后**本地预览必须经 http(s)**（如本地 server）。GitHub Pages 是 https，线上无影响。**这是与现状的一个行为差异，需知悉。** |
| 重构出错 | 全部工作在 `refactor/modularize` 分支，master 不受影响，分支可随时丢弃 |

## 10. 实施顺序（概览，细节留给实施计划）

1. 抽离 `style.css`，`index.html` 改 `<link>` 引用 → 验证视觉不变
2. 平移 `bgm.js`（最独立）→ 验证音乐
3. 抽 `terminal.js` 核心（状态/DOM/输出/视觉/启动/输入）
4. 抽 `quiz.js` / `cli.js`，接好 import
5. `index.html` 收尾为纯结构 + module 引用
6. 按 §8 清单全流程走查
7. 同步净化（§7）
