'use strict';

import TWEEN  from 'tween.js';
const svg = document.getElementById('svg-to-raster');
const rasterTarget = svg.querySelector('svg div');
const canvas = document.getElementById('render-target');
const domWidth = canvas.clientWidth - (canvas.clientWidth % 3);
const domHeight = canvas.clientHeight - (canvas.clientHeight % 3);
const offscreenCanvas = document.createElement('canvas');
const b64Start = 'data:image/svg+xml;base64,';
const serializer = new XMLSerializer();

canvas.style.flexGrow = 0;
canvas.style.flexShrink = 0;
canvas.style.alignSelf = 'center';
canvas.style.width = domWidth + 'px';
canvas.style.height = domHeight + 'px';
offscreenCanvas.width = canvas.width = domWidth / 3;
offscreenCanvas.height = canvas.height = domHeight / 3;
svg.setAttribute('width', domWidth / 3);
svg.setAttribute('height', domHeight / 3);

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
			const w = domWidth / 3;
			const h = domHeight / 3;
			const pix = {x:[0, w], y:[0,h]};
			bufferContext.clearRect(0,0,w,h);
			bufferContext.drawImage(bufferImg, 0, 0);
			const imageData = bufferContext.getImageData(0,0,w,h);

			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const index = (y * w + x) * 4;
					if (imageData.data[index+3] > 0) {
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

rasterDOM(`
	<div class="logo"></div>
	<span>Hello World</span>
`).then(image => {
	context.putImageData(image.data, 0, 0);
});

