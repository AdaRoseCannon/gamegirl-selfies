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
let paletteInterval;
let currentFilter;
let stopFunc;
currentFilter = 0;

const filters = [
	{
		name: '#noFilter'
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
		name: 'Spin',
		postsort: color => color.saturate(20).spin(180)
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
window.filter = filters[1];

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

function distance(threeVA, x,y,z) {
	const dx = threeVA[0] - x;
	const dy = threeVA[1] - y;
	const dz = threeVA[2] - z;
	return dx*dx + dy*dy + dz*dz;
}

function render(updatePalette) {
	if (!started) throw Error('camera not started');
	const h = video.videoHeight;
	const w = video.videoWidth;
	const smallestSide = Math.min(h, w);
	const width = size * w/smallestSide;
	const height = size * h/smallestSide;
	if (isNaN(width) || isNaN(height)) return canvas;
	context.drawImage(video, (size - width)/2, (size - height)/2, width, height);
	const data = context.getImageData(0,0,size,size);

	if (!palette || updatePalette) {
		const paletteArr = ColorThief.getPaletteFromCanvas(data, 12);
		if (paletteArr) {
			palette = processPalette(paletteArr);

			const filter = filters[currentFilter];
			if (!filter.presort) filter.presort = i => i;
			if (!filter.postsort) filter.postsort = i => i;

			prePalette = palette.map(a => colorToVector(filter.presort(vectorToColor(a.vector))));
			prePalette.forEach((a,i) => a.index = i);
			postPalette = prePalette.map(a => colorToVector(filter.postsort(vectorToColor(a))));
		}
	}

	if (palette) {
		for (let i = 0, l = data.data.length; i < l; i += 4) {
			const r = data.data[i];
			const g = data.data[i+1];
			const b = data.data[i+2];

			const closestColor = prePalette.sort((aV,bV) => distance(aV,r,g,b) - distance(bV,r,g,b))[0];

			data.data[i] = postPalette[closestColor.index][0];
			data.data[i+1] = postPalette[closestColor.index][1];
			data.data[i+2] = postPalette[closestColor.index][2];
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
			paletteInterval = setInterval(() => render(true), 2000);

			function stop() {

				video.pause();
				video.src = '';
				stream.getTracks()[0].stop();

				clearInterval(paletteInterval);
				stop = null;
			}

			stopFunc = stop;

			video.src = window.URL.createObjectURL(stream);
			video.play();

			return resolve(stop);

		}, e => {
			console.error(e);
		});
	});
}

function stop() {
	if (stopFunc) stopFunc();
}

function togglePaletteUpdate() {
	if (!paletteInterval) {
		paletteInterval = setInterval(() => render(true), 2000);
		return true;
	} else {
		clearTimeout(paletteInterval);
		paletteInterval = null;
		return false;
	}
}

function isCameraOn() {
	return started;
}

function changeFilter() {
	currentFilter = (currentFilter + 1) % filters.length;
	render(true);
}

export {
	start,
	stop,
	render,
	isCameraOn,
	togglePaletteUpdate,
	changeFilter
};
