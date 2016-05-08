/* global Animated_GIF */

let recording = false;
let ag;

function receiveFrame(img) {
	if (recording) {
		ag.addFrame(img);
	}
}

function startRecording(palette) {
	if (recording) throw Error('Already recording');
	recording = true;
	ag = new Animated_GIF({
		workerPath: 'dist/Animated_GIF.worker.js',
		palette,
		dithering: 'closest',
		useQuantizer: false
	});
	ag.setSize(96, 96);
}

function stopRecording() {
	return new Promise(resolve => ag.getBase64GIF(resolve))
	.then(() => {
		ag.destroy();
		recording = false;
		ag = null;
	});
}

export {
	receiveFrame,
	startRecording,
	stopRecording
};