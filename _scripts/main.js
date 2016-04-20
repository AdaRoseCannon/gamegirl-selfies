'use strict';

import TWEEN from 'tween.js';
import {init as initSVGRender, rasterDOM} from './libs/canvas/svg-render';
import {static_initContext, init as initUtils, clear, grabArea} from './libs/canvas/utils';

const canvas = document.getElementById('render-target');
const domWidth = canvas.clientWidth - (canvas.clientWidth % 3);
const domHeight = canvas.clientHeight - (canvas.clientHeight % 3);

const w = domWidth/3;
const h = domHeight/3;

canvas.style.flexGrow = 0;
canvas.style.flexShrink = 0;
canvas.style.alignSelf = 'center';
canvas.style.width = domWidth + 'px';
canvas.style.height = domHeight + 'px';
canvas.width = w;
canvas.height = h;

const context = static_initContext(canvas);

(function init() {
	const initOptions = {width: w, height: h, context};
	initSVGRender(initOptions);
	initUtils(initOptions);
}());

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
		highlight: { x: -30 - logo1.width/2, y: -10, width: 15, height: 60, render({ctx = context} = {}) {
			ctx.globalCompositeOperation = 'source-atop';
			ctx.fillStyle = 'rgba(255,255,255,0.4)';
			ctx.beginPath();
			ctx.moveTo(sprites.logo1.x + this.x + this.width, sprites.logo1.y + this.y + 0);
			ctx.lineTo(sprites.logo1.x + this.x + this.width * 2, sprites.logo1.y + this.y + 0);
			ctx.lineTo(sprites.logo1.x + this.x + this.width, sprites.logo1.y + this.y + this.height);
			ctx.lineTo(sprites.logo1.x + this.x + 0, sprites.logo1.y + this.y + this.height);
			ctx.fill();
		} }
	};

	function renderSprite(sprite, options) {
		if (sprite.render) {
			sprite.render.bind(sprite)(options);
		}
	}

	(function animate(time) {
		requestAnimationFrame(animate);
		TWEEN.update(time);
		if (stale) {
			stale = false;
			switch (state) {
				case 'START':
					clear('lavenderblush');
					renderSprite(sprites.logo1);
					sprites.logo2.y = sprites.logo1.y + sprites.logo1.height;
					renderSprite(sprites.logo2);
					renderSprite(sprites.highlight);
					break;
				case 'SPLASH':
					clear();
					renderSprite(sprites.text);
					renderSprite(sprites.pageSplitTop);
					renderSprite(sprites.pageSplitBottom);
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
			.concat(rasterDOM('<span>Swipe<span style="font-weight: bold;">Swipe</span></span>'))
		);
	})
	.then(function (detail) {
		state = states[1];

		const splitPos = Math.floor(sprites.logo1.y + sprites.logo1.height + 1);
		sprites.pageSplitTop = grabArea(0, 0, w, splitPos);
		sprites.pageSplitBottom = grabArea(0, splitPos, w, h - splitPos);

		const text = detail[2];
		console.log(text);
		sprites.text = text;
		text.x = (w - text.width) / 2;
		text.y = h / 2;
		console.log(text);

		return Promise.all([
			new TWEEN.Tween(sprites.pageSplitTop)
			.to({ y: -sprites.pageSplitTop.height }, 1000)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(() => stale = true)
			.start(),
			new TWEEN.Tween(sprites.pageSplitBottom)
			.to({ y: h }, 1000)
			.easing(TWEEN.Easing.Quadratic.Out)
			.onUpdate(() => stale = true)
			.start()
		]
		.map(tweenPromise));
	});
});

