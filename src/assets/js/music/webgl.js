// import "./ATUtil";
import ImprovedNoise from "./ImprovedNoise";

const webgl = (function () {

	let mouseX = 0,
			mouseY = 0,
			windowHalfX = window.innerWidth / 2,
			windowHalfY = window.innerHeight / 2,
			camera,
			scene,
			renderer;
	let analyser;
	// let source;
	let started = false;


	var LoopVisualizer = (function () {

		var RINGCOUNT = 60;
		var SEPARATION = 30;
		var INIT_RADIUS = 50;
		var SEGMENTS = 512;
		var VOL_SENS = 2;
		var BIN_COUNT = 512;

		var rings = [];
		var materials = [];

		var levels = [];
		var colors = [];

		var loopHolder = new THREE.Object3D();
		var perlin = new ImprovedNoise();
		var noisePos = 0;
		var freqByteData;
		var timeByteData;

		var loopGeom; //one geom for all rings


		function init() {

			rings = [];
			materials = [];
			levels = [];
			colors = [];

			////////INIT audio in
			freqByteData = new Uint8Array(BIN_COUNT);
			timeByteData = new Uint8Array(BIN_COUNT);

			scene.add(loopHolder);

			var scale = 1;
			var alt = 0;

			var circleShape = new THREE.Shape();
			circleShape.absarc(0, 0, INIT_RADIUS, 0, Math.PI * 2, false);
			loopGeom = circleShape.createPointsGeometry(SEGMENTS / 2);
			loopGeom.dynamic = true;

			//create rings
			for (var i = 0; i < RINGCOUNT; i++) {

				var m = new THREE.LineBasicMaterial({
					color: 0xffffff,
					linewidth: 1,
					opacity: 1,
					blending: THREE.AdditiveBlending,
					// 背景透明
					//depthTest : false,
					transparent: true

				});

				var line = new THREE.Line(loopGeom, m);

				rings.push(line);
				materials.push(m);
				scale *= 1.02;
				line.scale.x = scale;
				line.scale.y = scale;

				loopHolder.add(line);

				levels.push(0);
				colors.push(0);
			}
		}

		function remove() {

			if (loopHolder) {
				for (var i = 0; i < RINGCOUNT; i++) {
					loopHolder.remove(rings[i]);
				}

			}
		}

		function update() {

			analyser.getByteFrequencyData(freqByteData);
			analyser.getByteTimeDomainData(timeByteData);

			//get average level
			var sum = 0;
			for (var i = 0; i < BIN_COUNT; i++) {
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
			colors.shift(1);

			//write current waveform into all rings
			for (var j = 0; j < SEGMENTS; j++) {
				loopGeom.vertices[j].z = (timeByteData[j] - 128); //stretch by 2
			}
			// link up last segment
			loopGeom.vertices[SEGMENTS].z = loopGeom.vertices[0].z;
			loopGeom.verticesNeedUpdate = true;

			for (i = 0; i < RINGCOUNT; i++) {

				var ringId = RINGCOUNT - i - 1;

				var normLevel = levels[ringId] + 0.01; //avoid scaling by 0
				var hue = colors[i];

				materials[i].color.setHSL(hue, 1, normLevel);
				materials[i].linewidth = normLevel * 3;
				materials[i].opacity = normLevel; //fadeout
				rings[i].scale.z = normLevel / 3;
			}

		}

		return {
			init: init,
			update: update,
			remove: remove,
			loopHolder: loopHolder
		};
	}());

	function initWebgl(audioConnect) {
		//init 3D scene
		const container = document.getElementById('music');
		camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000000);
		camera.position.z = 200;
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
		$(document).mousemove(onDocumentMouseMove);
		$(window).resize(onWindowResize);

		onWindowResize(null);
		loadAudioConnect(audioConnect);
	}

	function loadAudioConnect(audioConnect) {
		const myAudioConnect = audioConnect;
		analyser = myAudioConnect.analyser;
		// analyser.smoothingTimeConstant = 0.1;
		// source = myAudioConnect.source;
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

	function startViz() {

		LoopVisualizer.init();

		if (!started) {
			started = true;
			animate();
		}
	}

	function renderWebgl(myAudioConnect) {
		if (!scene) initWebgl(myAudioConnect);
		analyser.smoothingTimeConstant = 0.1;
		startViz();
	}

	function removeWebgl() {
		LoopVisualizer.remove();
	}

	return {
		renderWebgl,
		removeWebgl
	}
}())

export default webgl;