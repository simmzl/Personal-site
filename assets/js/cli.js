// @SIMMZL cli — slash 命令分发 + 命令文案
import { S, dom, out, pushLine, pushRender, setPs1, scrollBottom,
         cycleTheme, emailLineNode, replayBoot, shutdown } from "./terminal.js";
import { startTest } from "./quiz.js";

function helpText() {
  return S.lang === "zh" ? [
    "可用指令（指令以 / 开头）：",
    "  /help        显示本列表",
    "  /restart     重新进行沃伊特·坎普夫测试",
    "  /reboot      完整重启系统",
    "  /shutdown    关机",
    "  /clear       清屏",
    "  /whoami      查看你的判定结果",
    "  /about       关于 @SIMMZL",
    "  /theme       更换磷光配色",
    "  /date        当前日期与时间",
    "  /echo <文字> 复读你说的话",
    "  /contact     去哪儿找我",
    "  /sheep       数一只电子羊",
    "  （还藏着几条彩蛋指令，自己挖吧）",
  ] : [
    "available commands (all start with /):",
    "  /help        show this list",
    "  /restart     run the Voight-Kampff test again",
    "  /reboot      full system reboot",
    "  /shutdown    power off",
    "  /clear       clear the screen",
    "  /whoami      show your verdict",
    "  /about       about @SIMMZL",
    "  /theme       recolor the phosphor",
    "  /date        current date & time",
    "  /echo <text> repeat after you",
    "  /contact     where to find me",
    "  /sheep       count an electric sheep",
    "  (a few easter-egg commands are hidden too)",
  ];
}
function whoamiText() {
  if (!S.lastVerdict) return [S.lang === "zh" ? "尚无判定。输入 /restart 完成测试。" : "no verdict yet. type /restart to take the test."];
  const s = S.lastVerdict.isSilicon;
  return [S.lang === "zh"
    ? "判定：" + (s ? "硅基生命体" : "碳基生命体") + " · 置信度 " + S.lastVerdict.conf + "%"
    : "substrate: " + (s ? "SILICON-BASED" : "CARBON-BASED") + "  ·  confidence " + S.lastVerdict.conf + "%"];
}
function aboutText() {
  return S.lang === "zh"
    ? ["@SIMMZL", "一个偶尔会被误判成硅基的碳基单元。", "热衷于做在黑暗里发光的东西。"]
    : ["@SIMMZL", "a carbon-based unit who occasionally passes for silicon.", "builds things that glow in the dark."];
}
function sheepArt() {
  return ["      __  _", "  ~~ (oo)\\_______", "     (__)\\       )\\/\\", "         ||----w |", "         ||     ||",
    S.lang === "zh" ? "  …一只电子羊。已为你数好。" : "  …one electric sheep, counted as requested."];
}

function doCli(raw) {
  let s = (raw || "").trim();
  if (!s) return;
  if (s[0] === "/") s = s.slice(1);
  const parts = s.split(/\s+/);
  const c = (parts.shift() || "").toLowerCase();
  const arg = parts.join(" ");
  switch (c) {
    case "help": case "?": case "h": case "帮助": out(helpText()); break;
    case "restart": case "r": case "重新": startTest(); break;
    case "reboot": replayBoot(); break;
    case "shutdown": case "poweroff": case "exit": case "quit": case "关机": shutdown(); break;
    case "clear": case "cls": dom.history.textContent = ""; dom.log.textContent = ""; setPs1("guest@simmzl:~$ "); scrollBottom(); break;
    case "whoami": out(whoamiText()); break;
    case "about": case "info": out(aboutText()); break;
    case "theme": cycleTheme(); out([S.lang === "zh" ? "磷光配色已切换。" : "phosphor recolored."]); break;
    case "date": case "time": out([new Date().toString()]); break;
    case "echo": out([arg]); break;
    case "contact": case "social": case "links":
      pushLine(S.lang === "zh" ? "到处都能找到我 — @SIMMZL" : "find me everywhere as @SIMMZL", "sys");
      pushRender(emailLineNode);
      scrollBottom();
      break;
    case "ls": case "dir": out(["github   blog   album   secrets/"]); break;
    case "sudo": out([S.lang === "zh" ? "权限不足。这次也不行 ;)" : "permission denied. nice try ;)"]); break;
    case "sheep": out(sheepArt()); break;
    case "coffee": out([S.lang === "zh" ? "☕ 正在冲泡 … 错误：我是个终端，没有手。" : "☕ brewing … error: I'm a terminal, I have no hands."]); break;
    case "matrix": out([S.lang === "zh" ? "别回头。这里没有勺子。" : "don't look back. there is no spoon."]); break;
    case "hello": case "hi": case "你好": out([S.lang === "zh" ? "你好，碳基 / 硅基朋友。" : "hello, carbon/silicon friend."]); break;
    default:
      out([(S.lang === "zh" ? "未知指令：/" : "unknown command: /") + c,
           S.lang === "zh" ? "输入 /help 查看所有指令。" : "type /help to see all commands."]);
  }
}

export { doCli };
