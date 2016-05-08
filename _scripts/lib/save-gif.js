/* global Animated_GIF */

let recording = false;
let ag;

function receiveFrame(data) {
	if (recording) {
		console.log('adding frame');
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
		console.log(ag.isRendering(), a);
	});
}

function stopRecording() {
	return new Promise(resolve => ag.getBase64GIF(resolve))
	.then(href => {
		ag.destroy();
		recording = false;
		ag = null;
		return href;
	});
}

export {
	receiveFrame,
	startRecording,
	stopRecording
};