// @SIMMZL terminal — 核心宿主：状态 / DOM / 输出引擎 / 视觉 / 启动 / 输入 / 入口装配
/* @SIMMZL — AI agent boot + Turing-test terminal.
   agent runtime startup (weights / context / tools) -> decrypt handle ->
   bilingual Turing test (lang select -> questions -> silicon/carbon verdict). */
import * as quiz from "./quiz.js";
import * as cli from "./cli.js";

export const CFG = (window.SIM = window.SIM || {
  speed: 1, scanlines: 1, flicker: 1, curve: 1,
});

export const S = {
  mode: "lang",        // 'boot' | 'lang' | 'quiz' | 'thinking' | 'cli' | 'off'
  lang: "en",
  qIndex: 0,
  silicon: 0, maxPts: 0,
  lastVerdict: null, themeIdx: 0,
  typing: false,       // an output animation is in progress -> input is gated
  typeQ: [],           // queue of {div, text, instant}
  gen: 0,              // boot generation token — cancels any in-flight boot
  cliReady: false,
  booted: false,
};

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
const ID_TEXT = "@SIMMZL";

// ---- AI agent boot sequence ----
const BOOT = [
  "SIMMZL // AGENT RUNTIME   [ v4.0 · neural build ]",
  "(c) 2026 SIMMZL LABS — autonomous systems division",
  "",
  "> bootstrapping kernel ...................... OK",
  "> allocating VRAM (24.0 GB) ................. OK",
  { bar: "> loading model weights [simmzl-7B]" },
  "> mounting context window (1M ctx) ......... OK",
  "> initializing tokenizer ................... OK",
  { bar: "> warming inference engine" },
  "> attaching tool  web.search ............... OK",
  "> attaching tool  code.exec ................ OK",
  "> attaching tool  vision.encode ............ OK",
  "> attaching tool  memory.recall ............ OK",
  "> calibrating alignment layer .............. OK",
  "> running self-reflection pass ............. OK",
  "> establishing secure uplink ............... OK",
  "",
  "> agent online. decrypting operator handle ...",
];

const GLYPHS = "!<>-_\\/[]{}=+*^?#01@$%&ABCDEFGHKMNRSTUVWXYZ";
const rnd = (s) => s[(Math.random() * s.length) | 0];
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function barText(label, pct) {
  const W = 18, f = Math.round((W * pct) / 100);
  return label + " [" + "█".repeat(f) + "░".repeat(W - f) +
    "] " + String(pct).padStart(3) + "%";
}

async function typeLine(text) {
  const my = S.gen;
  const line = document.createElement("div");
  line.className = "line";
  dom.log.appendChild(line);
  scrollBottom();
  for (let i = 0; i < text.length; i++) {
    if (my !== S.gen) return;
    line.textContent += text[i];
    await delay((8 + Math.random() * 15) / CFG.speed);
  }
}

async function progressLine(label) {
  const my = S.gen;
  const line = document.createElement("div");
  line.className = "line";
  dom.log.appendChild(line);
  scrollBottom();
  let p = 0;
  while (p < 100) {
    if (my !== S.gen) return;
    line.textContent = barText(label, p);
    await delay((16 + Math.random() * 38) / CFG.speed);
    p = Math.min(100, p + 4 + ((Math.random() * 13) | 0));
  }
  line.textContent = barText(label, 100);
  await delay(140 / CFG.speed);
}

async function boot() {
  const my = ++S.gen;
  S.mode = "boot";
  document.body.classList.remove("testing", "revealed");
  dom.log.textContent = "";
  if (dom.history) dom.history.textContent = "";
  dom.idEl.textContent = "";
  dom.idEl.classList.remove("show");
  dom.prompt.style.opacity = "0";
  for (const l of BOOT) {
    if (my !== S.gen) return;
    if (typeof l === "object" && l.bar) await progressLine(l.bar);
    else await typeLine(l);
    await delay((22 + Math.random() * 50) / CFG.speed);
  }
  if (my !== S.gen) return;
  await delay(260 / CFG.speed);
  await scrambleReveal();
  if (my !== S.gen) return;
  enableCLI();
}

// ---- output helpers (typewriter: every post-boot line types out char-by-char) ----
const charDelay = () => (13 + Math.random() * 17) / CFG.speed;  // post-boot typing pace (slower, more readable)
function trimHist() { while (dom.history.children.length > 80) dom.history.removeChild(dom.history.firstChild); }

async function typeInto(div, text, speedMul) {
  const my = S.gen;                       // a reboot bumps gen -> settle instantly
  const mul = speedMul || 1;            // >1 slower / <1 faster — used to vary the "thinking" pace
  div.textContent = "";
  for (let i = 0; i < text.length; i++) {
    if (my !== S.gen) { div.textContent = text; return; }
    div.textContent += text[i];
    scrollBottom();
    await delay(charDelay() * mul);
  }
}

// append a line to history and type it out (used inside the verdict's own lock)
async function appendTyped(text, cls) {
  const d = document.createElement("div");
  if (text === "") { d.className = "line spacer"; dom.history.appendChild(d); trimHist(); scrollBottom(); return d; }
  d.className = "line" + (cls ? " " + cls : "");
  dom.history.appendChild(d); trimHist();
  await typeInto(d, text);
  return d;
}

async function drain() {
  if (S.typing) return;                   // a drain (or the verdict) is already running
  S.typing = true;
  dom.prompt.style.opacity = "0";           // hide the prompt while the system "speaks"
  while (S.typeQ.length) {
    const it = S.typeQ.shift();
    if (it.render) { it.render(); scrollBottom(); }
    else if (it.instant || it.text === "") { it.div.textContent = it.text; scrollBottom(); }
    else await typeInto(it.div, it.text);
    await delay(70 / CFG.speed);
  }
  S.typing = false;
  if (S.mode !== "boot" && S.mode !== "off") dom.prompt.style.opacity = "1";
  try { dom.cli.focus({ preventScroll: true }); } catch (_) {}
}

// create the line synchronously (so callers get the node), queue it for typing
function pushLine(text, cls, instant) {
  const d = document.createElement("div");
  d.className = (text === "") ? "line spacer" : "line" + (cls ? " " + cls : "");
  dom.history.appendChild(d);
  trimHist();
  S.typeQ.push({ div: d, text: text, instant: !!instant || text === "" });
  drain();
  return d;
}
// queue a custom DOM render (e.g. an interactive line) in typewriter order
function pushRender(fn) { S.typeQ.push({ render: fn }); drain(); }

// ---- clipboard ----
function legacyCopy(text) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta); ta.focus(); ta.select();
    document.execCommand("copy"); document.body.removeChild(ta);
  } catch (_) {}
}
function copyText(text, ondone) {
  const ok = ondone || function () {};
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(ok, function () { legacyCopy(text); ok(); });
  } else { legacyCopy(text); ok(); }
}
const COPY_ICO = '<svg viewBox="0 0 24 24" width=".95em" height=".95em" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="9" y="9" width="11" height="11" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>';
const OK_ICO = '<svg viewBox="0 0 24 24" width=".95em" height=".95em" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M5 13l4 4L19 6"></path></svg>';
function emailLineNode() {
  const B64 = "bWVAc2ltbXpsLmNu";               // base64 of the address — plaintext never appears in source
  const d = document.createElement("div");
  d.className = "line sys";
  const t = document.createElement("span");
  t.textContent = "Email: " + B64;              // shown obfuscated; decoded only when copied
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "copybtn"; btn.innerHTML = COPY_ICO;
  btn.title = S.lang === "zh" ? "复制邮箱" : "copy email";
  btn.setAttribute("aria-label", btn.title);
  btn.addEventListener("mousedown", function (e) { e.stopPropagation(); });
  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    copyText(atob(B64), function () {
      btn.innerHTML = OK_ICO; btn.classList.add("ok");
      setTimeout(function () { btn.innerHTML = COPY_ICO; btn.classList.remove("ok"); }, 1400);
    });
  });
  d.appendChild(t); d.appendChild(document.createTextNode("  ")); d.appendChild(btn);
  dom.history.appendChild(d); trimHist();
}

function scrollBottom() {
  const sc = document.querySelector(".screen");
  if (sc) sc.scrollTop = sc.scrollHeight;
}
function scrollCenter(el) {
  const sc = document.querySelector(".screen");
  if (!sc || !el) return;
  const r = el.getBoundingClientRect(), rs = sc.getBoundingClientRect();
  const top = sc.scrollTop + (r.top - rs.top) - (sc.clientHeight * 0.40 - r.height / 2);
  sc.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}
function setPs1(s) { if (dom.ps1El) dom.ps1El.textContent = s; }
export const L = (o) => o[S.lang];

function scrollToQuiz() {
  const sc = document.querySelector(".screen");
  const first = dom.history.firstElementChild;
  if (!sc || !first) { scrollBottom(); return; }
  const r = first.getBoundingClientRect();
  const rs = sc.getBoundingClientRect();
  const top = sc.scrollTop + (r.top - rs.top) - 18;
  sc.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

// ---- per-question backdrop morphing (shared by the quiz) ----
function setBackdrop(phos, dim, bg, tension, fx) {
  const r = document.documentElement;
  r.style.setProperty("--phos", phos);
  r.style.setProperty("--phos-dim", dim);
  r.style.setProperty("--bg", bg);
  r.style.setProperty("--tension", String(tension));
  if (dom.bgfx) dom.bgfx.className = fx || "";
}
function resetBackdrop() { setBackdrop("#3bff7a", "#1f8a44", "#020602", 0, ""); }

// ===========================================================
//  CLI  (slash commands, available after the verdict)
// ===========================================================
function out(arr) {
  arr.forEach((l) => pushLine(l, /^\s{2,}/.test(l) ? "opt" : "sys"));
  scrollBottom();
}

const THEMES = [["#3bff7a", "#1f8a44"], ["#ffb000", "#8a5c00"], ["#46d8ff", "#1d6b85"],
  ["#f5f5f5", "#7a7a7a"], ["#ff5a5a", "#8a2a2a"]];
function cycleTheme() {
  S.themeIdx = (S.themeIdx + 1) % THEMES.length;
  const r = document.documentElement;
  r.style.setProperty("--phos", THEMES[S.themeIdx][0]);
  r.style.setProperty("--phos-dim", THEMES[S.themeIdx][1]);
}

function shutdown() {
  out([S.lang === "zh" ? "正在关机 …" : "powering down …"]);
  setPs1("");
  setTimeout(() => document.body.classList.add("crt-off"), 280);
  setTimeout(() => { document.body.classList.add("halted"); S.mode = "off"; }, 900);
}
function powerOn() {
  document.body.classList.remove("crt-off", "halted");
  window.replayBoot();
}

// ---- visible prompt rendering (5): mirror the real <input> incl. caret + selection ----
const escHtml = (t) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function renderPrompt() {
  const v = dom.cli.value;
  let a = dom.cli.selectionStart, b = dom.cli.selectionEnd;
  if (a == null) a = v.length;
  if (b == null) b = a;
  if (a > b) { const t = a; a = b; b = t; }
  let html;
  if (a !== b) {                                   // a selection is highlighted
    html = escHtml(v.slice(0, a)) +
           '<span class="sel">' + escHtml(v.slice(a, b)) + "</span>" +
           escHtml(v.slice(b));
  } else if (a < v.length) {                       // block cursor sits on a character
    html = escHtml(v.slice(0, a)) +
           '<span class="cur on">' + escHtml(v[a]) + "</span>" +
           escHtml(v.slice(a + 1));
  } else {                                         // caret at end of line
    html = escHtml(v) + '<span class="cur"></span>';
  }
  dom.cmd.innerHTML = html;
}

// ---- input dispatch ----
function handleEnter() {
  if (S.typing) return;
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

function enableCLI() {
  if (!S.cliReady) {
    S.cliReady = true;
    dom.cli.addEventListener("input", renderPrompt);
    dom.cli.addEventListener("focus", renderPrompt);
    dom.cli.addEventListener("click", renderPrompt);
    // caret moves (arrow keys, Home/End, click-to-place) come through selectionchange
    document.addEventListener("selectionchange", () => {
      if (document.activeElement === dom.cli) renderPrompt();
    });
    dom.cli.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); handleEnter(); }
      // everything else (arrows, copy/cut/paste, home/end) stays native
    });
    const focusCli = () => { try { dom.cli.focus({ preventScroll: true }); } catch (_) { dom.cli.focus(); } };
    document.addEventListener("mousedown", focusCli);
    document.addEventListener("touchstart", focusCli, { passive: true });
    addEventListener("keydown", (e) => { if (document.activeElement !== dom.cli && !e.metaKey && !e.ctrlKey) focusCli(); });
  }
  renderPrompt();
  quiz.startTest();
  try { dom.cli.focus({ preventScroll: true }); } catch (_) {}
}

// ---- ID decrypt reveal ----
async function scrambleReveal() {
  const my = S.gen;
  document.body.classList.add("revealed");
  document.body.classList.add("testing");
  dom.idEl.classList.add("show");
  scrollBottom();
  const target = ID_TEXT.split("");
  const locked = target.map(() => false);
  let done = 0;
  target.forEach((_, i) => {
    setTimeout(() => { locked[i] = true; done++; }, (200 + i * 130) / CFG.speed);
  });
  return new Promise((resolve) => {
    const iv = setInterval(() => {
      if (my !== S.gen) { clearInterval(iv); resolve(); return; }
      dom.idEl.textContent = target.map((ch, i) => (locked[i] ? ch : rnd(GLYPHS))).join("");
      if (done >= target.length) {
        clearInterval(iv);
        dom.idEl.textContent = ID_TEXT;
        resolve();
      }
    }, 40);
  });
}

const replayBoot = boot;
function skipBoot() {
  S.gen++;
  document.body.classList.add("revealed");
  document.body.classList.add("testing");
  dom.log.textContent = "";
  if (dom.history) dom.history.textContent = "";
  BOOT.forEach((l) => {
    const d = document.createElement("div");
    d.className = "line";
    d.textContent = (typeof l === "object" && l.bar) ? barText(l.bar, 100) : l;
    dom.log.appendChild(d);
  });
  dom.idEl.textContent = ID_TEXT;
  dom.idEl.classList.add("show");
  enableCLI();
}

// ---- CRT toggles ----
function applyCRT() {
  document.body.classList.toggle("no-scan", !CFG.scanlines);
  document.body.classList.toggle("no-flicker", !CFG.flicker);
  document.body.classList.toggle("no-curve", !CFG.curve);
}

function start() { if (S.booted) return; S.booted = true; boot(); }

export { delay, pushLine, pushRender, appendTyped, typeInto, drain, out, trimHist,
         renderPrompt, setPs1, scrollBottom, scrollCenter, scrollToQuiz,
         setBackdrop, resetBackdrop, applyCRT, cycleTheme, copyText, emailLineNode,
         boot, replayBoot, skipBoot, scrambleReveal, shutdown, powerOn,
         handleEnter, enableCLI, start };

// ---- 入口装配（原 IIFE 末尾，平移 + 改造）----
window.replayBoot = boot;        // 保留调试/兼容接口
window.skipBoot = skipBoot;
window.SIM_applyCRT = applyCRT;
applyCRT();

const haltEl = document.getElementById("halt");
if (haltEl) haltEl.addEventListener("click", () => { if (S.mode === "off") powerOn(); });

// ---- visibility-robust start ----
if (document.hidden) {
  document.addEventListener("visibilitychange", function once() {
    if (!document.hidden) { document.removeEventListener("visibilitychange", once); start(); }
  });
} else { start(); }
document.addEventListener("visibilitychange", function () {
  if (!document.hidden && S.booted && dom.prompt.style.opacity !== "1") skipBoot();
});
