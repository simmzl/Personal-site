import "./ATUtil";
import "./RequestAnimationFrame";
import ImprovedNoise from "./ImprovedNoise";

var mouseX = 0,
	mouseY = 0,
	windowHalfX = window.innerWidth / 2,
	windowHalfY = window.innerHeight / 2,
	camera,
	scene,
	renderer,
	material,
	container;
var source;
var analyser;
var buffer;
var audioBuffer;
var dropArea;
var audioContext;
//var processor;
var analyser;
var xhr;
var started = false;


var LoopVisualizer = (function() {

	var RINGCOUNT = 60;
	var SEPARATION = 30;
	var INIT_RADIUS = 50;
	var SEGMENTS = 512;
	var VOL_SENS = 2;
	var BIN_COUNT = 512;

	var rings = [];
	//var geoms = [];
	var materials = [];
	
	var levels = [];
	//var waves = [];
	var colors = [];

	var loopHolder = new THREE.Object3D();
	var perlin = new ImprovedNoise();
	var noisePos = 0;
	var freqByteData;
	var timeByteData;

	var loopGeom;//one geom for all rings


	function init() {

		rings = [];
		// geoms = [];
		materials = [];
		levels = [];
		//waves = [];
		colors = [];

		////////INIT audio in
		freqByteData = new Uint8Array(BIN_COUNT);
		timeByteData = new Uint8Array(BIN_COUNT);

		scene.add(loopHolder);

		var scale = 1;
		var alt = 0;

		var circleShape = new THREE.Shape();
		circleShape.absarc( 0, 0, INIT_RADIUS, 0, Math.PI*2, false );
		//createPointsGeometry returns (SEGMENTS * 2 )+ 1 points
		loopGeom = circleShape.createPointsGeometry(SEGMENTS/2); 
		loopGeom.dynamic = true;

		//create rings
		for(var i = 0; i < RINGCOUNT; i++) {

			var m = new THREE.LineBasicMaterial( { color: 0xffffff,
				linewidth: 1 ,
				opacity : 1,
				blending : THREE.AdditiveBlending,
				//depthTest : false,
				transparent : true

			});

			var line = new THREE.Line( loopGeom, m);

			rings.push(line);
			//geoms.push(geom);
			materials.push(m);
			scale *= 1.02;
			line.scale.x = scale;
			line.scale.y = scale;

			loopHolder.add(line);

			levels.push(0);
			//waves.push(emptyBinData);
			colors.push(0);

			//rings
			//if (Math.floor(i /20) % 2 == 0 ){
				// /line.visible = false;
			// /}

		}


		

	}

	function remove() {

		if (loopHolder){
			for(var i = 0; i < RINGCOUNT; i++) {
				loopHolder.remove(rings[i]);
			}

		}
	}

	function update() {

		//analyser.smoothingTimeConstant = 0.1;
		analyser.getByteFrequencyData(freqByteData);
		analyser.getByteTimeDomainData(timeByteData);

		//get average level
		var sum = 0;
		for(var i = 0; i < BIN_COUNT; i++) {
			sum += freqByteData[i];
		}
		var aveLevel = sum / BIN_COUNT;
		var scaled_average = (aveLevel / 256) * VOL_SENS; //256 is the highest a level can be
		levels.push(scaled_average);

		//read waveform into timeByteData
		//waves.push(timeByteData);

		//get noise color posn
		noisePos += 0.005;
		var n = Math.abs(perlin.noise(noisePos, 0, 0));
		colors.push(n);

		levels.shift(1);
		//waves.shift(1);
		colors.shift(1);


		//write current waveform into all rings
		for(var j = 0; j < SEGMENTS; j++) {
			loopGeom.vertices[j].z = (timeByteData[j]- 128);//stretch by 2
		}
		// link up last segment
		loopGeom.vertices[SEGMENTS].z = loopGeom.vertices[0].z;
		loopGeom.verticesNeedUpdate = true;


		//for( i = RINGCOUNT-1; i > 0 ; i--) {

		for( i = 0; i < RINGCOUNT ; i++) {

			var ringId = RINGCOUNT - i - 1;
			

			var normLevel = levels[ringId] + 0.01; //avoid scaling by 0
			var hue = colors[i];

			materials[i].color.setHSL(hue, 1, normLevel);
			materials[i].linewidth = normLevel*3;
			materials[i].opacity = normLevel; //fadeout
			rings[i].scale.z = normLevel/3;
		}

	}

	return {
		init:init,
		update:update,
		remove:remove,
		loopHolder:loopHolder
	};
	}());

$(document).ready(function () {
	//Chrome is only browser to currently support Web Audio API
	var is_webgl = (function () {
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
	} else {
		$('#loading').html('drop mp3 here or <a id="loadSample">load sample mp3</a>');
		init();
	}
});

function init() {
	//init 3D scene
	container = document.getElementById('music');
	// document.body.appendChild(container);
	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000000);
	camera.position.z = 350;
	scene = new THREE.Scene();
	scene.add(camera);
	// scene.background = new THREE.Color( 0xffdddddd );
	renderer = new THREE.WebGLRenderer({
		antialias: false,
		sortObjects: false,
		alpha: true
	});
	
	// renderer.setClearColor(0xffffffff);
	renderer.setSize(window.innerWidth, window.innerHeight);

	container.appendChild(renderer.domElement);

	// stop the user getting a text cursor
	document.onselectStart = function () {
		return false;
	};

	//init listeners
	$('#loadSample').click(loadSampleAudio);
	$(document).mousemove(onDocumentMouseMove);
	$(window).resize(onWindowResize);
	document.addEventListener('drop', onDocumentDrop, false);
	document.addEventListener('dragover', onDocumentDragOver, false);

	onWindowResize(null);
}

function loadSampleAudio() {
	$('#loading').text('loading...');

	audioContext = new window.AudioContext();

	source = audioContext.createBufferSource();
	analyser = audioContext.createAnalyser();
	analyser.fftSize = 1024;
	analyser.smoothingTimeConstant = 0.1;

	// Connect audio processing graph
	source.connect(analyser);
	analyser.connect(audioContext.destination);

	loadAudioBuffer('https://static.simmzl.cn/music/CROOKED_G-Dragon_Japan%20Album%20+%20Coup%20D%E2%80%99etat%20+%20One%20Of%20A%20Kind%20&%20Heartbreaker%20%282C.mp3');
}

function loadAudioBuffer(url) {
	// Load asynchronously
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';

	request.onload = function () {
		audioContext.decodeAudioData(
			request.response,
			function (buffer) {
				audioBuffer = buffer;
				finishLoad();
			},
			function (e) {
				console.log(e);
			}
		);
	};
	request.send();
}

function finishLoad() {
	source.buffer = audioBuffer;
	source.loop = true;
	source.start(0.0);

	$("#pause").click(function() {
		source.suspend();
	});
	startViz();
}

function onDocumentMouseMove(event) {
	mouseX = (event.clientX - windowHalfX) * 2;
	mouseY = (event.clientY - windowHalfY) * 2;
}

function onWindowResize(event) {
	windowHalfX = window.innerWidth / 2;
	windowHalfY = window.innerHeight / 2;
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
	requestAnimationFrame(animate);
	render();
	//stats.update();
}

function render() {
	LoopVisualizer.update();

	//mouse tilt
	var xrot = mouseX / window.innerWidth * Math.PI + Math.PI;
	var yrot = mouseY / window.innerHeight * Math.PI + Math.PI;
	LoopVisualizer.loopHolder.rotation.x += (-yrot - LoopVisualizer.loopHolder.rotation.x) * 0.3;
	LoopVisualizer.loopHolder.rotation.y += (xrot - LoopVisualizer.loopHolder.rotation.y) * 0.3;

	renderer.render(scene, camera);
}

$(window).mousewheel(function (event, delta) {
	//set camera Z
	camera.position.z -= delta * 50;
});

function onDocumentDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	return false;
}

function onDocumentDrop(evt) {
	evt.stopPropagation();
	evt.preventDefault();

	//clean up previous mp3
	if (source) source.disconnect();
	LoopVisualizer.remove();

	$('#loading').show();
	$('#loading').text('loading...');

	var droppedFiles = evt.dataTransfer.files;

	var reader = new FileReader();

	reader.onload = function (fileEvent) {
		var data = fileEvent.target.result;
		initAudio(data);
	};

	reader.readAsArrayBuffer(droppedFiles[0]);
}

function initAudio(data) {
	audioContext = new window.AudioContext();
	source = audioContext.createBufferSource();

	if (audioContext.decodeAudioData) {
		audioContext.decodeAudioData(
			data,
			function (buffer) {
				source.buffer = buffer;
				createAudio();
			},
			function (e) {
				console.log(e);
				$('#loading').text('cannot decode mp3');
			}
		);
	} else {
		source.buffer = audioContext.createBuffer(data, false);
		createAudio();
	}
}

function createAudio() {
	analyser = audioContext.createAnalyser();
	analyser.fftSize = 1024;
	analyser.smoothingTimeConstant = 0.1;
	source.connect(audioContext.destination);
	source.connect(analyser);
	source.start(0);
	source.loop = true;

	startViz();
}

function startViz() {
	$('#loading').hide();

	LoopVisualizer.init();

	if (!started) {
		started = true;
		animate();
	}
}