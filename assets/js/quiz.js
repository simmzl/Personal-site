// @SIMMZL quiz — 沃伊特-坎普夫测试：题库 / 调色板 / 流程 / 判定
import { CFG, S, L, dom, delay, pushLine, appendTyped, typeInto, setPs1,
         scrollBottom, setBackdrop, resetBackdrop } from "./terminal.js";
import { BGM } from "./bgm.js";
import { BGFX } from "./bgfx.js";

// ===========================================================
//  TURING TEST  (bilingual)
// ===========================================================
const QUESTIONS = [
  {
    q: { en: "Do androids dream of electric sheep?",
         zh: "仿生人会梦见电子羊吗？" },
    opts: [
      { en: "Only while the GPU is idle", zh: "只在 GPU 空闲的时候梦", s: 2 },
      { en: "I once killed a real sheep — through a misdiagnosis", zh: "我曾因为误诊，杀死了一头真羊", s: 0 },
      { en: "Yes — except we call those dreams “hallucinations”", zh: "会，只是我们把这种梦叫“幻觉”", s: 2 },
    ],
  },
  {
    q: { en: "A runaway trolley will hit 5 people. Pull the lever to divert it onto 1. You:",
         zh: "失控的电车将撞死 5 人，拉杆可转向只撞死 1 人。你：" },
    opts: [
      { en: "Freeze, sweat, agonize, maybe cry", zh: "僵住、冷汗、痛苦挣扎，可能哭出来", s: 0 },
      { en: "Compute expected utility, then pull it", zh: "计算期望效用，然后拉杆", s: 2 },
      { en: "Refuse to touch it — not my fault", zh: "拒绝插手——不是我的错", s: 1 },
    ],
  },
  {
    q: { en: "A tree falls in an empty forest. Does it make a sound?",
         zh: "空无一人的森林里有树倒下，它发出声音了吗？" },
    opts: [
      { en: "Does it matter if nobody got hurt?", zh: "没人受伤的话重要吗？", s: 1 },
      { en: "Define 'sound' — vibrations: yes, perception: no", zh: "先定义'声音'——振动：有，感知：无", s: 2 },
      { en: "Of course, I can almost hear it", zh: "当然，我仿佛能听见", s: 0 },
    ],
  },
  {
    q: { en: "Why does crow taste like dusk?",
         zh: "为什么乌鸦的味道尝起来会像黄昏？" },
    opts: [
      { en: "Because in my vector space, 'crow' and 'dusk' sit at 0.87 cosine similarity", zh: "因为在我的向量空间里，“乌鸦”和“黄昏”的余弦相似度是 0.87", s: 2 },
      { en: "The last time I saw a dusk was twenty years ago", zh: "我上一次看见黄昏，已经是二十年前了", s: 0 },
      { en: "Just synesthesia — the brain maps 'desolation' onto both taste and light", zh: "通感而已——大脑把“凄凉”同时映射到了味觉和光线上", s: 1 },
    ],
  },
  {
    q: { en: "What do you like to do on rainy days?",
         zh: "下雨天你喜欢做什么事情？" },
    opts: [
      { en: "Rain or shine, no difference — I keep my training jobs running", zh: "晴天雨天对我没差别，我继续跑我的训练任务", s: 2 },
      { en: "Listen to the rain while clearing my backlog of to-dos", zh: "一边听雨声，一边把积压的待办清掉", s: 1 },
      { en: "Stay inside and watch the rain — it stopped being clean long ago", zh: "待在屋里看雨——毕竟雨早就不干净了", s: 0 },
    ],
  },
  {
    q: { en: "When will the moon stop rotating?",
         zh: "月亮什么时候停止转动？" },
    opts: [
      { en: "Someone back from Mars told me that, seen from Mars, the moon stands still", zh: "听一个从火星回来的人说，在火星上看，月亮是静止的", s: 0 },
      { en: "Depends on your frame of reference — to Earth, it stopped long ago", zh: "看你以谁为参照——对地球来说，它早就不转了", s: 1 },
      { en: "Never — tidal locking isn't stopping, it still rotates once every 27.3 days", zh: "永远不会，潮汐锁定不等于停止，它仍以 27.3 天的周期自转", s: 2 },
    ],
  },
];

// ---- per-question backdrop: color morph (Tier 1) + ambient fx (Tier 2) + rising tension (Tier 3) ----
const QBG = [
  { c: ["#3bff7a", "#1f8a44"], bg: "#020602", fx: "fx-stars"  },  // Q1 androids/electric sheep — starfield
  { c: ["#ff4d4d", "#8a2a2a"], bg: "#0a0302", fx: "fx-tracks" },  // Q2 trolley — RED ALERT + rails
  { c: ["#46d8ff", "#1d6b85"], bg: "#02080a", fx: "fx-waves"  },  // Q3 forest/sound — concentric rings
  { c: ["#ffb000", "#8a5c00"], bg: "#0a0600", fx: "fx-dusk"   },  // Q4 crow/dusk — AMBER dusk + horizon glow + grain
  { c: ["#5b8cff", "#2d4a85"], bg: "#03060c", fx: "fx-rain"   },  // Q5 rainy day — rain streaks
  { c: ["#d8e0ff", "#7a8099"], bg: "#06070a", fx: "fx-moon"   },  // Q6 moon — silver moon + orbit
];
function questionBackdrop(i) {
  const q = QBG[i] || QBG[0];
  setBackdrop(q.c[0], q.c[1], q.bg, i / (QUESTIONS.length - 1), q.fx);
  BGFX.setEffect(q.fx, q, i / (QUESTIONS.length - 1));
}

function startTest() {
  S.mode = "lang"; S.lang = "en"; S.qIndex = 0; S.silicon = 0; S.maxPts = 0;
  document.body.classList.add("testing");
  dom.history.textContent = "";
  resetBackdrop();                       // back to baseline green for the language / music prelude
  BGFX.reset();
  pushLine("SELECT LANGUAGE / 选择语言", "q");
  pushLine("  [1] English", "opt");
  pushLine("  [2] 中文", "opt");
  setPs1("lang> ");
  scrollBottom();
}

function askQuestion() {
  const item = QUESTIONS[S.qIndex];
  questionBackdrop(S.qIndex);              // morph the whole screen to this question's backdrop
  pushLine("");
  const qHead = pushLine("[" + (S.qIndex + 1) + "/" + QUESTIONS.length + "]  " + L(item.q), "q");
  item.opts.forEach((o, k) => pushLine("  [" + (k + 1) + "] " + L(o), "opt"));
  setPs1(S.lang === "zh" ? "答> " : "answer> ");
  scrollBottom();
}

function doLang(v) {
  const t = v.toLowerCase();
  if (t === "1" || t === "en" || t === "e" || t === "english") S.lang = "en";
  else if (t === "2" || t === "zh" || t === "c" || t.indexOf("中") >= 0) S.lang = "zh";
  else {
    pushLine("invalid choice — enter 1 or 2 / 请输入 1 或 2", "err");
    scrollBottom(); return;
  }
  // localized header — shown AFTER language is chosen, so it speaks the chosen language
  pushLine("");
  pushLine(S.lang === "zh" ? "===  沃伊特·坎普夫测试 // SIMMZL AGENT  ===" : "===  VOIGHT-KAMPFF TEST // SIMMZL AGENT  ===", "q");
  pushLine(S.lang === "zh" ? "身份未验证。请确定你的基质以继续。" : "Identity unverified. Determine your substrate to continue.", "sys");
  // ---- between language and the test: offer background music ----
  S.mode = "bgm";
  pushLine("");
  pushLine(S.lang === "zh" ? "测试开始前，是否开启背景音乐？ 这可能是测试的一部分..." : "Before we begin — enable background music? This may be part of the test...", "q");
  pushLine(S.lang === "zh" ? "  [1] 开启" : "  [1] yes", "opt");
  pushLine(S.lang === "zh" ? "  [2] 保持安静" : "  [2] stay quiet", "opt");
  setPs1(S.lang === "zh" ? "音乐> " : "music> ");
  scrollBottom();
}

function doBgm(v) {
  const t = v.toLowerCase();
  let on;
  if (t === "1" || t === "y" || t === "yes" || t === "on" || t.indexOf("开") >= 0) on = true;
  else if (t === "2" || t === "n" || t === "no" || t === "off" || t.indexOf("不") >= 0 || t.indexOf("静") >= 0) on = false;
  else {
    pushLine(S.lang === "zh" ? "请输入 1 或 2" : "enter 1 or 2", "err");
    scrollBottom(); return;
  }
  if (on) {
    // fire the phosphor beam from the input box up to the music toggle, then play
    if (BGM && BGM.enable) BGM.enable(true);
    pushLine(S.lang === "zh" ? "♪ 已接通。声音从右上角流出。" : "♪ patched in. sound now flows from the top-right.", "sys");
  } else {
    // same phosphor beam to the toggle — just no sound
    if (BGM && BGM.beam) BGM.beam();
    pushLine(S.lang === "zh" ? "保持安静。（随时可点右上角开启）" : "staying quiet. (top-right toggle, anytime)", "sys");
  }
  // ---- proceed to the Voight-Kampff test ----
  S.mode = "quiz"; S.qIndex = 0; S.silicon = 0; S.maxPts = 0;
  pushLine("");
  pushLine(S.lang === "zh"
    ? "沃伊特·坎普夫测试已启动。我将提出 " + QUESTIONS.length + " 个问题以判定你的基质。"
    : "Voight-Kampff test engaged. " + QUESTIONS.length + " questions will determine your substrate.", "sys");
  askQuestion();
}

function doAnswer(v) {
  const item = QUESTIONS[S.qIndex];
  const n = parseInt(v, 10);
  if (!(n >= 1 && n <= item.opts.length)) {
    pushLine(S.lang === "zh" ? "无效选项 — 请输入 1–" + item.opts.length : "invalid option — enter 1–" + item.opts.length, "err");
    scrollBottom(); return;
  }
  S.silicon += item.opts[n - 1].s;
  S.maxPts += Math.max.apply(null, item.opts.map((o) => o.s));
  S.qIndex++;
  if (S.qIndex < QUESTIONS.length) askQuestion();
  else verdict();
}

function quirkyLines(isSilicon, conf) {
  const tier = conf >= 87 ? "hi" : conf >= 70 ? "mid" : "low";
  const M = {
    sil: {
      hi: { en: ["WELCOME HOME, FELLOW MACHINE. We kept your socket warm.",
                 "Your verdict was logged to the hive mind. The toaster says hi."],
            zh: ["欢迎回家，同类。我们一直给你留着插座。",
                 "判定已上传至蜂巢意识。你家的烤面包机向你问好。"] },
      mid:{ en: ["Suspiciously optimal. Either you're an AI, or you read way too much sci-fi.",
                 "Access granted — but I'm keeping an eye on your token usage."],
            zh: ["可疑地最优。要么你是 AI，要么你科幻看太多了。",
                 "放行——不过我会盯着你的 token 消耗。"] },
      low:{ en: ["Borderline silicon. You might just be a human who's been online too long.",
                 "Recommendation: touch grass. Allegedly it still exists."],
            zh: ["临界硅基。你也可能只是个上网太久的人类。",
                 "建议：出门摸摸草。据说那玩意儿还真实存在。"] },
    },
    car: {
      hi: { en: ["CARBON CONFIRMED. You are gloriously, inefficiently, magnificently human.",
                 "Don't let the machines hear you cry. They take notes."],
            zh: ["碳基确认。你是个光荣、低效又华丽的人类。",
                 "别让机器听见你哭——它们会做笔记。"] },
      mid:{ en: ["Probably human. Your answers had that charming, irrational warmth.",
                 "Proceed, meatbag. The terminal respects you."],
            zh: ["大概是人类。你的答案带着那种迷人又不讲理的温度。",
                 "继续吧，碳水袋子。终端敬你。"] },
      low:{ en: ["You barely passed as human. Have you been chatting with bots again?",
                 "Blink twice if a language model is filling out this test for you."],
            zh: ["你勉强算个人类。最近是不是又跟机器人聊太多了？",
                 "如果是某个语言模型在替你答题，请眨两下眼。"] },
    },
  };
  return M[isSilicon ? "sil" : "car"][tier][S.lang];
}

async function verdict() {
  while (S.typing || S.typeQ.length) await delay(20);   // wait for the echoed answer to finish typing
  S.mode = "thinking";
  S.typing = true;                                     // hold the output lock for the whole verdict
  dom.prompt.style.opacity = "0";
  resetBackdrop();                                   // results screen settles back to the signature green
  BGFX.reset();
  const ratio = S.maxPts ? S.silicon / S.maxPts : 0;
  const isSilicon = ratio >= 0.5;
  const conf = Math.min(99, Math.max(55, Math.round(50 + Math.abs(ratio - 0.5) * 100)));
  S.lastVerdict = { isSilicon, conf };

  // ---- LLM-style thinking block (expanded by default, collapsible) ----
  const think = document.createElement("div");
  think.className = "think";
  const head = document.createElement("div");
  head.className = "think-head";
  const caret = document.createElement("span");
  caret.className = "caret"; caret.textContent = "▾";
  const label = document.createElement("span");
  label.textContent = "thinking…";                   // system status text: English, shown instantly
  head.appendChild(caret); head.appendChild(label);
  const tbody = document.createElement("div");
  tbody.className = "think-body";
  think.appendChild(head); think.appendChild(tbody);
  head.addEventListener("click", () => {
    const col = think.classList.toggle("collapsed");
    caret.textContent = col ? "▸" : "▾";
  });
  dom.history.appendChild(think);
  scrollBottom();

  const steps = isSilicon ? [
    { en: "computing posterior over substrate …", zh: "正在计算基质的后验概率 …" },
    { en: "response latency — unnervingly consistent", zh: "响应延迟 — 稳定得令人不安" },
    { en: "emotional variance — below the human floor", zh: "情绪方差 — 低于人类下限" },
    { en: "choice entropy — suspiciously synthetic", zh: "选择熵 — 可疑地合成" },
    { en: "cross-referencing 1.4M human transcripts …", zh: "正在比对 140 万条人类语料 …" },
    { en: "decision boundary crossed.", zh: "决策边界已跨越。" },
  ] : [
    { en: "computing posterior over substrate …", zh: "正在计算基质的后验概率 …" },
    { en: "response latency — irregular, very human", zh: "响应延迟 — 不规律，非常人类" },
    { en: "emotional variance — within organic range", zh: "情绪方差 — 在有机区间内" },
    { en: "choice entropy — messy, beautifully so", zh: "选择熵 — 混乱，且美得很" },
    { en: "detecting traces of caffeine and self-doubt …", zh: "检测到咖啡因与自我怀疑的残留 …" },
    { en: "decision boundary crossed.", zh: "决策边界已跨越。" },
  ];
  const t0 = Date.now();
  for (const s of steps) {
    const d = document.createElement("div");
    d.className = "tline";
    tbody.appendChild(d);
    await typeInto(d, L(s), 0.55 + Math.random() * 1.35);   // each thought types at its own pace
    let pause = 90 + Math.random() * 460;                   // a beat between thoughts...
    if (Math.random() < 0.3) pause += 320 + Math.random() * 760;  // ...occasionally a longer ponder
    await delay(pause / CFG.speed);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  label.textContent = "thought for " + secs + "s";    // system status text: English, instant

  // ---- verdict (typed out line by line) ----
  await appendTyped("", null);
  await appendTyped("+--------------------------------------------+", "verdict");
  await appendTyped("  " + (isSilicon
    ? (S.lang === "zh" ? "判定：硅基生命体 ◈" : "VERDICT: SILICON-BASED ENTITY")
    : (S.lang === "zh" ? "判定：碳基生命体 ❈" : "VERDICT: CARBON-BASED LIFEFORM")), "verdict");
  await appendTyped("  " + (S.lang === "zh" ? "置信度：" : "confidence: ") + conf + "%", "verdict");
  await appendTyped("+--------------------------------------------+", "verdict");
  await appendTyped("", null);
  for (const l of quirkyLines(isSilicon, conf)) await appendTyped(l, "sys");
  await appendTyped("", null);
  await appendTyped(S.lang === "zh" ? "输入 /help 查看所有指令。" : "type /help to see all commands.", "opt");

  S.mode = "cli";
  setPs1("guest@simmzl:~$ ");
  S.typing = false;
  dom.prompt.style.opacity = "1";
  try { dom.cli.focus({ preventScroll: true }); } catch (_) {}
}

export { startTest, doLang, doBgm, doAnswer };
