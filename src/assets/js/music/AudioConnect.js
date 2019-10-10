const audioConnect = (id = "audio" ) => {
  const context = new(window.AudioContext || window.webkitAudioContext)();

	const audio = document.getElementById(id);

	// 将音频节点，关联到 AudioContext 上，作为整个音频分析过程的输入。
	// 通过<audio>节点创建音频源
	const source = context.createMediaElementSource(audio);

	// AnalyserNode 用于获取音频的频率数据（ FrequencyData ）和时域数据（ TimeDomainData ）。从而实现音频的可视化。
	const analyser = context.createAnalyser();
	analyser.fftSize = 1024;
	// 0 ～ 1，变化剧烈 ～ 平滑
	analyser.smoothingTimeConstant = 0.8;

	// 将音频源关联到分析器
	source.connect(analyser);
	// 将分析器关联到输出设备（耳机、扬声器）
	analyser.connect(context.destination);
	
	const disconnect = () => {
		if (source) source.disconnect();
	}
  return {
		source,
		analyser,
		disconnect,
  }
}

export default audioConnect;