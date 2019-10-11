
import AudioConnect from "./AudioConnect";
import webgl from "./webgl";
import { render, removeRender } from "./2d";
import lottie from 'lottie-web';

let playing = false;
let style = "webgl";
let myAudioConnect;

$(document).ready(function () {
  //Chrome is only browser to currently support Web Audio API
  const is_webgl = (function () {
    try {
      return !!window.WebGLRenderingContext && !!document.createElement('canvas').getContext('experimental-webgl');
    } catch (e) {
      return false;
    }
  })();

  if (!is_webgl) {
    $('#loading').html(
      'Your graphics card does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation">WebGL</a>.<br />' +
      'Find out how to get it <a href="http://get.webgl.org/">here</a>, or try restarting your browser.'
    );
  }

  const myLottie = lottie.loadAnimation({
    container: document.getElementById("control-play"),
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: 'https://assets2.lottiefiles.com/datafiles/f7kUXm0C69KLtty/data.json'
  });
  myLottie.play();

  $("#control-play").click(() => {
    if (playing) {
      // myLottie.pause();
      myLottie.setDirection(1);
      myLottie.play();
      $("#audio")[0].pause();
      playing = !playing;
    } else {
      // 浏览器播放声音除了audio标签之外，还有另外一个API：AudioContext。
      // 在页面无任何交互点击情况下，Chrome 66 禁止声音自动播放，即使new AudioContext()也不行
      if (!myAudioConnect) myAudioConnect = new AudioConnect();
      $("#control-play").addClass("control-play-active");
      // $("#control-play-container").addClass("control-play-container-active");
      myLottie.setDirection(-1);
      myLottie.play();
      $("#audio")[0].play();
      playing = !playing;
      playByStyle(style);
    }
  })

  const playByStyle = (type) => {
    style = type;
    if (!myAudioConnect) myAudioConnect = new AudioConnect();
    if (type === "webgl") {
      removeRender();
      webgl.renderWebgl(myAudioConnect);
    } else {
      webgl.removeWebgl();
      render(myAudioConnect, type);
    }
  }

  $("#line").click(() => {
    playByStyle("line");
  });

  $("#rect").click(() => {
    playByStyle("rect");
  });

  $("#webgl").click(() => {
    playByStyle("webgl");
  });
});