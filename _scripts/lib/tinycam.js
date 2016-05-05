/* global ColorThief, MediaDevices*/
import color from 'tinycolor2';

function vectorToColor([r,g,b]) {
	const col = color({r,g,b});
	col.vector = [r,g,b];
	return col;
}

function colorToVector(color) {
	const o = color.toRgb();
	return [o.r, o.g, o.b];
}

const size = 96;

navigator.getUserMedia = (MediaDevices && MediaDevices.getUserMedia) || navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;

let started = false;
let palette = false;
let prePalette = false;
let postPalette = false;
let currentFilter;
currentFilter = 0;
currentFilter = 0;

const filters = [
	{
		name: '#noFilter'
	},
	{
		name: 'Spin',
		postsort: color => color.saturate(20).spin(180)
	},
	{
		name: 'Brighten',
		postsort: color => color.brighten(20)
	},
	{
		name: 'Pop',
		postsort: color => color.saturate(20).brighten(20)
	},
	{
		name: 'Power Pink',
		postsort: colorIn => {
			const col2 = colorIn.toHsv();
			col2.h = 310;
			col2.s = 0.2 + col2.s*0.8;
			col2.v = 0.2 + col2.v*0.8;
			return color(col2);
		}
	}
];

const video = document.createElement('video');
video.width = video.height = size;
const canvas = document.createElement('canvas');
canvas.width = canvas.height = size;
const context = canvas.getContext('2d');

// sort the array into rgb objects
function processPalette(p) {
	return p.map(vectorToColor)
	.sort((a,b) => a.toHsv().v - b.toHsv().v);
}

function distance(threeVA, threeVB) {
	const dx = threeVA[0] - threeVB[0];
	const dy = threeVA[1] - threeVB[1];
	const dz = threeVA[2] - threeVB[2];
	return dx*dx + dy*dy + dz*dz;
}

function render(updatePalette) {
	if (!started) throw Error('camera not started');
	const h = video.videoHeight;
	const w = video.videoWidth;
	const smallestSide = Math.min(h, w);
	const width = size * w/smallestSide;
	const height = size * h/smallestSide;
	if (isNaN(width) || isNaN(height)) return;
	context.drawImage(video, (size - width)/2, (size - height)/2, width, height);
	const data = context.getImageData(0,0,size,size);

	if (!palette || updatePalette) {
		const paletteArr = ColorThief.getPaletteFromCanvas(data, 16);
		if (paletteArr) {
			palette = processPalette(paletteArr);

			const filter = filters[currentFilter];
			if (!filter.presort) filter.presort = i => i;
			if (!filter.postsort) filter.postsort = i => i;

			prePalette = palette.map(a => colorToVector(filter.presort(vectorToColor(a.vector))));
			postPalette = prePalette.map(a => colorToVector(filter.postsort(vectorToColor(a))));
		}
	}

	if (palette) {
		for (let i = 0, l = data.data.length; i < l; i += 4) {
			const r = data.data[i];
			const g = data.data[i+1];
			const b = data.data[i+2];
			const arr = [r,g,b];

			const closestColor = prePalette.concat().sort((a,b) => distance(a,arr) - distance(b,arr))[0];
			const index = prePalette.indexOf(closestColor);

			data.data[i] = postPalette[index][0];
			data.data[i+1] = postPalette[index][1];
			data.data[i+2] = postPalette[index][2];
		}
		context.putImageData(data, 0, 0);
	}

	window.stale = true;
	return canvas;
}

function start() {
	return new Promise(function (resolve) {
		navigator.getUserMedia({
			video: {
				width: {ideal: size},
				height: {ideal: size}
			},
		}, function (stream) {

			started = true;

			// update palette every 2 seconds
			const interval2 = setInterval(() => render(true), 2000);

			function stop() {

				video.pause();
				video.src = '';
				stream.getTracks()[0].stop();

				clearInterval(interval2);
			}

			video.src = window.URL.createObjectURL(stream);
			video.play();

			return resolve();

		}, e => {
			console.error(e);
		});
	});
}

function isCameraOn() {
	return started;
}

export {
	start,
	render,
	isCameraOn
};
