/* global Animated_GIF */

let recording = false;
let ag;
let progress = 0;

function receiveFrame(data) {
	if (recording) {
		ag.addFrameImageData(data);
	}
}

function startRecording(palette) {
	if (recording) throw Error('Already recording');
	recording = true;
	ag = new Animated_GIF({
		workerPath: 'scripts/Animated_GIF.worker.min.js',
		palette,
		dithering: 'closest',
		useQuantizer: false,
	});
	ag.setDelay(0.032);
	ag.setSize(96, 96);
	ag.onRenderProgress(a => {
		progress = a;
	});
}

function stopRecording() {
	return new Promise(resolve => ag.getBase64GIF(resolve))
	.then(href => {
		ag.destroy();
		recording = false;
		ag = null;
		progress = 0;
		return href;
	});
}

function getProgress() {
	return progress;
}

export {
	receiveFrame,
	startRecording,
	stopRecording,
	getProgress
};