'use strict';

import TWEEN from 'tween.js';
const svg = document.getElementById('svg-to-raster');
const rasterTarget = svg.querySelector('svg div');
const canvas = document.getElementById('render-target');
const domWidth = canvas.clientWidth - (canvas.clientWidth % 3);
const domHeight = canvas.clientHeight - (canvas.clientHeight % 3);
const offscreenCanvas = document.createElement('canvas');
const b64Start = 'data:image/svg+xml;base64,';

const w = domWidth/3;
const h = domHeight/3;
const serializer = new XMLSerializer();

canvas.style.flexGrow = 0;
canvas.style.flexShrink = 0;
canvas.style.alignSelf = 'center';
canvas.style.width = domWidth + 'px';
canvas.style.height = domHeight + 'px';
offscreenCanvas.width = canvas.width = w;
offscreenCanvas.height = canvas.height = h;
svg.setAttribute('width', w);
svg.setAttribute('height', h);

const bufferContext = initContext(offscreenCanvas);
const context = initContext(canvas);

const stylePromise = (function updateStyle() {
	const p = [].slice.call(svg.querySelectorAll('link'));
	return Promise.all(p.map(el => {
		const url = el.href;
		return fetch(url)
		.then(response => response.blob())
		.then(function (blob) {
			return new Promise(resolve => {
				const a = new FileReader();
				a.onload = function (e) {
					resolve(e.target.result);
				};
				a.readAsDataURL(blob);
			});
		})
		.then(url => el.setAttribute('href', url))
		.then(() => new Promise(resolve => setTimeout(resolve, 160)));
	}));
}());

function initContext(canvas) {
	const context = canvas.getContext('2d');
	context.mozImageSmoothingEnabled = false;
	context.webkitImageSmoothingEnabled = false;
	context.msImageSmoothingEnabled = false;
	context.imageSmoothingEnabled = false;
	return context;
}

function clear() {
	context.clearRect(0, 0, domWidth/3, domHeight/3);
}

function rasterDOM(dom) {

	if (typeof dom === 'string') {
		rasterTarget.innerHTML = dom;
	} else {
		rasterTarget.appendChild(dom.clone(true));
	}

	return stylePromise.then(() => new Promise(resolve => {
		const image64 = b64Start + btoa(serializer.serializeToString(svg));
		const bufferImg = document.createElement('img');
		bufferImg.src = image64;
		bufferImg.onload = function load() {
			const pix = {x:[w, 0], y:[h,0]};
			bufferContext.clearRect(0,0,w,h);
			bufferContext.drawImage(bufferImg, 0, 0);
			const imageData = bufferContext.getImageData(0,0,w,h);
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const index = (y * w + x) * 4;
					if (imageData.data[index+3] !== 0) {
						if (x < pix.x[0]) pix.x[0] = x;
						if (y < pix.y[0]) pix.y[0] = y;
						if (x > pix.x[1]) pix.x[1] = x;
						if (x > pix.y[1]) pix.y[1] = y;
					}
				}
			}

			const width = pix.x[1] - pix.x[0];
			const height = pix.y[1] - pix.y[0];
			const data = bufferContext.getImageData(pix.x[0], pix.y[0], width, height);
			bufferContext.clearRect(0,0,w,h);

			rasterTarget.innerHTML = '';
			resolve({
				data,
				width,
				height
			});
		};
	}));
}

function tweenPromise(tween) {
	return new Promise(function (resolve) {
		tween.onComplete(resolve);
	});
}

rasterDOM(`
	<div class="logo" style="font-size: 14px;"></div>
`).then(function ({data, height, width}) {

	let stale = false;
	const states = ['START', 'SPLASH', 'CAMERA'];
	let state = 'START';
	const logoCoords = { x: (w - width)/2, y: 0 };
	const highlightCoords = { x: -30 - width/2, y: -10, width: 15, height: 60 };

	(function animate(time) {
		requestAnimationFrame(animate);
		TWEEN.update(time);
		if (stale) {
			switch (state) {
				case 'START':
					clear();
					context.globalCompositeOperation = 'source-over';
					context.putImageData(data, logoCoords.x, logoCoords.y);

					context.globalCompositeOperation = 'source-atop';
					context.fillStyle = 'rgba(255,255,255,0.4)';
					context.beginPath();
					context.moveTo(logoCoords.x + highlightCoords.x + highlightCoords.width, logoCoords.y + highlightCoords.y + 0);
					context.lineTo(logoCoords.x + highlightCoords.x + highlightCoords.width * 2, logoCoords.y + highlightCoords.y + 0);
					context.lineTo(logoCoords.x + highlightCoords.x + highlightCoords.width, logoCoords.y + highlightCoords.y + highlightCoords.height);
					context.lineTo(logoCoords.x + highlightCoords.x + 0, logoCoords.y + highlightCoords.y + highlightCoords.height);
					context.fill();
					break;
			}
		}
	}());

	Promise.all([
		new TWEEN.Tween(highlightCoords)
			.delay(1200)
			.to({ x: width/2 + highlightCoords.width*2 }, 1000)
			.easing(TWEEN.Easing.Quadratic.InOut)
			.onUpdate(() => stale = true)
			.start(),

		new TWEEN.Tween(logoCoords)
			.to({ y: (h - height)/2 }, 2000)
			.easing(TWEEN.Easing.Elastic.Out)
			.onUpdate(() => stale = true)
			.start()
	].map(t => tweenPromise(t)))
	.then(function () {
		state = states[1];
	});
});

