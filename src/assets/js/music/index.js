
import "./RequestAnimationFrame";
import AudioConnect from "./AudioConnect";
import webgl from "./webgl";
import { render, removeRender } from "./2d";
import lottie from 'lottie-web';

$(document).ready(function () {

  let playing = false;
  let style = "webgl";
  let myAudioConnect;
  
  const isSupportWebgl = (function () {
    try {
      return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
    } catch (e) {
      return false;
    }
  })();

  const myLottie = lottie.loadAnimation({
    container: document.getElementById("control-play"),
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: 'https://assets2.lottiefiles.com/datafiles/f7kUXm0C69KLtty/data.json'
  });
  myLottie.play();

  const playByStyle = (type) => {
    style = type;
    if (!myAudioConnect) myAudioConnect = new AudioConnect();

    if (type === "webgl") {
      removeRender();
      isSupportWebgl ? webgl.renderWebgl(myAudioConnect) :  $('#tip-alert').html(
        '你的浏览器并不支持WebGL，跟上时代的脚步，请使用<a target="_blank" href="https://www.google.cn/intl/zh-CN/chrome/">Chrome</a>浏览。'
      );
    } else {
      isSupportWebgl ? webgl.removeWebgl() : $('#tip-alert').html("");
      render(myAudioConnect, type);
    }
  }

  $("#control-play").click(() => {
    if (playing) {
      myLottie.setDirection(1);
      myLottie.play();
      $("#audio")[0].pause();
      playing = !playing;
    } else {
      // 浏览器播放声音除了audio标签之外，还有另外一个API：AudioContext。
      // 在页面无任何交互点击情况下，Chrome 66 禁止声音自动播放，即使new AudioContext()也不行
      if (!myAudioConnect) myAudioConnect = new AudioConnect();
      $("#control-play").addClass("control-play-active");
      myLottie.setDirection(-1);
      myLottie.play();
      $("#audio")[0].play();
      playing = !playing;
      playByStyle(style);
    }
  })

  $("#line").click(() => playByStyle("line"));
  $("#rect").click(() => playByStyle("rect"));
  $("#webgl").click(() => playByStyle("webgl"));
});