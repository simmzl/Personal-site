// @SIMMZL bgm — 背景音乐 + phosphor beam 动画（ES module）
export const BGM = (function () {
  "use strict";
var audio = document.getElementById("bgm");
var btn = document.getElementById("bgm-toggle");
if (!audio || !btn) return null;
var lbl = btn.querySelector(".lbl");
audio.volume = 0.30;

// ---- keep the fixed toggle pinned to the .term's top-right corner ----
var term = document.querySelector(".term");
var screenEl = document.querySelector(".screen");
function placeToggle() {
  if (!term) return;
  var t = term.getBoundingClientRect();
  var padTop = screenEl ? (parseFloat(getComputedStyle(screenEl).paddingTop) || 18) : 18;
  btn.style.top = padTop + "px";
  btn.style.right = Math.max(8, Math.round(window.innerWidth - t.right)) + "px";
}
placeToggle();
requestAnimationFrame(placeToggle);
window.addEventListener("resize", placeToggle);
window.addEventListener("load", placeToggle);

function paint(playing) {
  btn.classList.toggle("playing", playing);
  btn.setAttribute("aria-pressed", playing ? "true" : "false");
  if (lbl) lbl.textContent = playing ? "BGM ON" : "BGM OFF";
}
function play() { var p = audio.play(); if (p && p.catch) p.catch(function () {}); }

audio.addEventListener("play", function () { paint(true); });
audio.addEventListener("pause", function () { paint(false); });

// ---- phosphor beam: from the input box, right then up to the toggle ----
var SVGNS = "http://www.w3.org/2000/svg";
function fireBeam() {
  var promptEl = document.getElementById("prompt");
  if (!promptEl || !btn.getBoundingClientRect) { zap(); return; }
  var pr = promptEl.getBoundingClientRect();
  var br = btn.getBoundingClientRect();
  var sx = pr.left + 10;                 // near the input caret
  var sy = pr.top + pr.height / 2;
  var tx = br.left + br.width / 2;
  var ty = br.bottom - 2;                // arrive at the toggle from below
  var r = 16;                            // elbow radius
  var dirX = tx >= sx ? 1 : -1;
  // horizontal toward tx, round the corner, then vertical up to ty
  var d = "M " + sx + " " + sy +
          " H " + (tx - dirX * r) +
          " Q " + tx + " " + sy + " " + tx + " " + (sy - r) +
          " V " + ty;

  var svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("id", "beam");
  var wire = document.createElementNS(SVGNS, "path");   // faint full trace
  wire.setAttribute("d", d);
  wire.setAttribute("stroke-width", "1.5");
  wire.style.opacity = "0.28";
  var comet = document.createElementNS(SVGNS, "path");  // bright travelling streak
  comet.setAttribute("d", d);
  comet.setAttribute("stroke-width", "2.4");
  svg.appendChild(wire); svg.appendChild(comet);
  document.body.appendChild(svg);

  var len = comet.getTotalLength ? comet.getTotalLength() : 600;
  var streak = Math.max(40, len * 0.14);
  var dur = Math.min(900, Math.max(520, len * 1.1));

  comet.style.strokeDasharray = streak + " " + (len + streak);
  var anims = [];
  if (comet.animate) {
    anims.push(comet.animate(
      [{ strokeDashoffset: len + streak }, { strokeDashoffset: -streak }],
      { duration: dur, easing: "cubic-bezier(.45,0,.15,1)", fill: "forwards" }));
    // wire draws in behind the comet, then both fade
    wire.style.strokeDasharray = len + " " + len;
    anims.push(wire.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration: dur * 0.85, easing: "ease-out", fill: "forwards" }));
  }
  // light the toggle when the streak arrives, then clean up
  setTimeout(zap, dur * 0.82);
  setTimeout(function () {
    if (svg.animate) {
      var fade = svg.animate([{ opacity: 1 }, { opacity: 0 }],
        { duration: 380, easing: "ease-in", fill: "forwards" });
      fade.onfinish = function () { svg.remove(); };
    } else { svg.remove(); }
  }, dur + 120);
}
function zap() {
  btn.classList.remove("zap");
  void btn.offsetWidth;           // restart the keyframe
  btn.classList.add("zap");
  setTimeout(function () { btn.classList.remove("zap"); }, 650);
}

// exposed to the terminal flow
const api = {
  enable: function (withBeam) {
    play();
    if (withBeam) {
      // wait a frame so layout/rects are settled after the echoed line
      requestAnimationFrame(function () { requestAnimationFrame(fireBeam); });
    }
  },
  beam: function () {
    requestAnimationFrame(function () { requestAnimationFrame(fireBeam); });
  },
  isOn: function () { return !audio.paused; }
};

// top-right toggle always works directly too
btn.addEventListener("click", function (e) {
  e.stopPropagation();
  if (audio.paused) play();
  else audio.pause();
});

return api;
})();
