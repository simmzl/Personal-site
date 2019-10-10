
import AudioConnect from "./AudioConnect";
import webgl from "./webgl";
import { render, removeRender } from "./2d";
import lottie from 'lottie-web';

let playing = false;
let style = "webgl";

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

  const myAudioConnect = new AudioConnect();

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
      $("#control-play").addClass("control-play-active");
      $("#control-play-container").addClass("control-play-container-active");
      myLottie.setDirection(-1);
      myLottie.play();
      $("#audio")[0].play();
      playing = !playing;
      playByStyle(style);
    }
  })

  const playByStyle = (type) => {
    style = type;
    if (type === "webgl") {
      removeRender();
      webgl.renderWebgl(myAudioConnect);
    } else {
      webgl.removeWebgl();
      render(myAudioConnect, type);
    }
  }

  $("#turn").click(() => {
    playByStyle("line");
  });

  $("#turnRect").click(() => {
    playByStyle("rect");
  });

  $("#webgl").click(() => {
    playByStyle("webgl");
  });

  $('#loadSample').click(function () {
    $("#audio")[0].play();
  });

  $("#pause").click(function () {
    $("#audio")[0].pause();
  });
});