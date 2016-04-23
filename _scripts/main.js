'use strict';

import HAMMER from 'hammerjs';
import TWEEN from 'tween.js';
import {init as initSVGRender, rasterDOM} from './libs/canvas/svg-render';
import {
	static_initContext,
	init as initUtils,
	clear, grabArea,
	Buffer,
	imageToSprite
} from './libs/canvas/utils';

const pixelScale = 3;
const canvas = document.getElementById('render-target');
const domWidth = canvas.clientWidth - (canvas.clientWidth % pixelScale);
const domHeight = canvas.clientHeight - (canvas.clientHeight % pixelScale);

const w = domWidth/pixelScale;
const h = domHeight/pixelScale;

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
		highlight: { x: -30 - logo1.width/2, y: -10, width: 15, height: 60, render(options = {}) {
			const ctx = options.context || context;
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

	const renderSpriteFn = function renderSprite(sprite, options = {}) {
		options.context = this;
		if (sprite.render) {
			sprite.render.bind(sprite)(options);
		}
	};

	const renderSprite = renderSpriteFn.bind(context);
	const hammer = new HAMMER(canvas);
	const tempVars = {};
	hammer.on('panstart', function () {
		switch (state) {
			case 'SPLASH':
			if (tempVars.splashTween) tempVars.splashTween.stop();
			break;
		}
	})
	hammer.on('pan', function(event) {
		switch (state) {
			case 'SPLASH':
				sprites.text.dx = event.deltaX/pixelScale;
				stale = true;
				break;
		}
    });
	hammer.on('panend', function() {
		switch (state) {
			case 'SPLASH':
				tempVars.splashTween = new TWEEN.Tween(sprites.text)
				.to({ dx: 0 }, 1000)
				.easing(TWEEN.Easing.Elastic.Out)
				.onUpdate(() => stale = true)
				.start();
				break;
		}
    });

	const buffer1 = new Buffer();
	const bufferRender = renderSpriteFn.bind(buffer1.context);
	(function animate(time) {
		requestAnimationFrame(animate);
		TWEEN.update(time);
		if (stale) {
			stale = false;
			switch (state) {
				case 'START':
					clear('#C9CAC9');
					clear(undefined, {context: buffer1.context});
					bufferRender(sprites.logo1);
					sprites.logo2.y = sprites.logo1.y + sprites.logo1.height;
					bufferRender(sprites.logo2);
					bufferRender(sprites.highlight);
					context.drawImage(buffer1, 0, 0);
					break;
				case 'SPLASH':
					clear('lavenderblush');
					renderSprite(sprites.text);
					if (sprites.pageSplitTop) {
						renderSprite(sprites.pageSplitTop);
						renderSprite(sprites.pageSplitBottom);
					}
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
			.concat(rasterDOM('<span class="swipe">&lt; SWIPE &gt;</span>'))
			.concat(imageToSprite('images/temp.jpg'))
		)
		.then(detail => detail[3]);
	})
	.then(function (text) {
		state = states[1];

		const splitPos = Math.floor(sprites.logo1.y + sprites.logo1.height);
		sprites.pageSplitTop = grabArea(0, 0, w, splitPos);
		sprites.pageSplitBottom = grabArea(0, splitPos, w, h - splitPos);

		sprites.text = text;
		text.x = (w - text.width) / 2;
		text.y = Math.max((h - text.height) / 2, 0);

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
	})
	.then(() => {
		delete sprites.logo1;
		delete sprites.logo2;
		delete sprites.pageSplitTop;
		delete sprites.pageSplitBottom;
	})
	.catch(e => {
		throw e;
	});
});

