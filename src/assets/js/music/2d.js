let myAudioConnect, bufferLength, dataArray, barWidth, barHeight, analyser;

const canvas = $("#canvas")[0];
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const ctx = canvas.getContext("2d");
ctx.fillStyle = "rgba(255, 255, 255, 0)";

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let styleControl;


const connect = (audioConnect) => {
  myAudioConnect = audioConnect;
  analyser = myAudioConnect.analyser;
  // analyser.smoothingTimeConstant = 0.8;
  const source = myAudioConnect.source;
  bufferLength = analyser.frequencyBinCount; // fftsize / 2
  dataArray = new Uint8Array(bufferLength);
  barWidth = WIDTH / bufferLength * 2;
}

const resetCtx = () => {
  // 更新频率数据
  analyser.getByteFrequencyData(dataArray);
  // 清空画布，每次重新绘制
  // 要清除的矩形左上角的 x 、y 坐标，要清除的矩形的宽度，以像素计
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
}

const lineRender = () => {

  resetCtx();

  ctx.beginPath();
  ctx.strokeStyle = "#0000ff";
  ctx.moveTo(0, HEIGHT - dataArray[0] * 2);

  for (var i = 0, x = 0; i < bufferLength; i++) {
    barHeight = dataArray[i] * 2;

    var y = barHeight;


    // 二级贝塞尔曲线
    ctx.quadraticCurveTo(x, HEIGHT - y, x + barWidth, HEIGHT - dataArray[i + 1] * 2)

    ctx.stroke();
    ctx.moveTo(x + barWidth, HEIGHT - dataArray[i + 1] * 2);

    var r = 90;
    var g = 18 + barHeight * ((i + 20) * .9) / bufferLength;
    var b = 183;
    var alp = (barHeight + 0 * (i / bufferLength)) / 100 + .1;
    ctx.strokeStyle = "rgb(" + r + "," + g + "," + b + ")";

    x += barWidth;
  }
}

const rectRender = () => {
  resetCtx();

  for (var i = 0, x = 0; i < bufferLength; i++) {
    barHeight = dataArray[i] * 2;

    var y = barHeight;

    // 根据每个矩形高度映射一个背景色
    var r = 90;
    var g = 180 + barHeight * ((i + 20) * .9) / bufferLength;
    var b = 183;
    var alp = (barHeight + 10 * (i / bufferLength)) / 100 + .1;

    // 绘制一个矩形，并填充背景色
    ctx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + alp + ")";
    ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

    // 256个数据这里不会全部都渲染，根据barWidth宽度来
    // 矩形间隔
    x += barWidth + 0.5;
  }
}

const render = (audioConnect, type) => {
  if (styleControl === type) return;
  // 避免重复连接
  if (!myAudioConnect) connect(audioConnect);
  analyser.smoothingTimeConstant = 0.8;
  styleControl = type;
  function renderFrame() {
    if (styleControl !== type) return;
    requestAnimationFrame(renderFrame);
    if (type === "line") return lineRender();
    rectRender();
  }
  renderFrame();
}

const removeRender = () => {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  styleControl = "";
}

export {
  render,
  removeRender
};