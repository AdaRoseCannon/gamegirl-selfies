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
let renderPromise = Promise.resolve();

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

function renderData(composite) {
	if (this.data) {
		context.globalCompositeOperation = composite || 'source-over';
		context.putImageData(this.data, this.x, this.y);
	}
}

function rasterDOM(dom) {

	renderPromise = renderPromise
	.then(() => stylePromise)
	.then(() => new Promise(resolve => {

		if (typeof dom === 'string') {
			rasterTarget.innerHTML = dom;
		} else {
			rasterTarget.appendChild(dom.clone(true));
		}

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

			const width = pix.x[1] - pix.x[0] + 1;
			const height = pix.y[1] - pix.y[0] + 1;
			const data = bufferContext.getImageData(pix.x[0], pix.y[0], width, height);
			bufferContext.clearRect(0,0,w,h);

			rasterTarget.innerHTML = '';
			resolve({
				data,
				width,
				height,
				x: pix.x[0],
				y: pix.y[0],
				render: renderData
			});
		};
	}));

	return renderPromise;
}

function tweenPromise(tween) {
	return new Promise(function (resolve) {
		tween.onComplete(resolve);
	});
}

Promise.all([
	rasterDOM('<div class="logo" data-first="GAMEGIRL" style="font-size: 14px;"></div>'),
	rasterDOM('<div class="logo" data-second="SELFIES" style="font-size: 14px;"></div>')
]).then(function ([logo1, logo2]) {
	let stale = false;
	const states = ['START', 'SPLASH', 'CAMERA'];
	let state = 'START';
	logo1.x = (w - logo1.width)/2;
	logo2.x = (w - logo2.width)/2;
	logo1.y = 0;
	logo2.y = logo1.height;
	const sprites = {
		logo1,
		logo2,
		highlight: { x: -30 - logo1.width/2, y: -10, width: 15, height: 60, render() {
			context.globalCompositeOperation = 'source-atop';
			context.fillStyle = 'rgba(255,255,255,0.4)';
			context.beginPath();
			context.moveTo(sprites.logo1.x + this.x + this.width, sprites.logo1.y + this.y + 0);
			context.lineTo(sprites.logo1.x + this.x + this.width * 2, sprites.logo1.y + this.y + 0);
			context.lineTo(sprites.logo1.x + this.x + this.width, sprites.logo1.y + this.y + this.height);
			context.lineTo(sprites.logo1.x + this.x + 0, sprites.logo1.y + this.y + this.height);
			context.fill();
		} }
	};

	function renderSprite(sprite) {
		if (sprite.render) {
			sprite.render.bind(sprite)();
		}
	}

	(function animate(time) {
		requestAnimationFrame(animate);
		TWEEN.update(time);
		if (stale) {
			stale = false;
			switch (state) {
				case 'START':
					clear();
					renderSprite(sprites.logo1);
					sprites.logo2.y = sprites.logo1.y + sprites.logo1.height;
					renderSprite(sprites.logo2);
					renderSprite(sprites.highlight);
					break;
				case 'SPLASH':
					clear();
					renderSprite(sprites.logo1);
					renderSprite(sprites.logo2);
					renderSprite(sprites.text);
					break;
			}
		}
	}());

	new Promise(resolve => requestAnimationFrame(resolve))
	.then(function () {
		return Promise.all([
			new TWEEN.Tween(sprites.highlight)
				.delay(1200)
				.to({ x: sprites.logo1.width/2 + sprites.highlight.width*2 }, 1000)
				.easing(TWEEN.Easing.Quadratic.InOut)
				.onUpdate(() => stale = true)
				.start()
			,
			new TWEEN.Tween(sprites.logo1)
				.to({ y: (h - sprites.logo1.height)/2 }, 2000)
				.easing(TWEEN.Easing.Elastic.Out)
				.onUpdate(() => stale = true)
				.start()
			]
			.map(tweenPromise)
			.concat(rasterDOM('<span>Hello <b>World</b></span>'))
		);
	})
	.then(function ([a,b,text]) {
		console.log(text);
		sprites.text = text;
		state = states[1];
		return Promise.all([
			new TWEEN.Tween(sprites.logo1)
			.to({ y: -sprites.logo1.height }, 1000)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(() => stale = true)
			.start(),
			new TWEEN.Tween(sprites.logo2)
			.to({ y: h }, 1000)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(() => stale = true)
			.start()
		]
		.map(tweenPromise));
	});
});

