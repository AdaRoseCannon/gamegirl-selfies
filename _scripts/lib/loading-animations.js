
import TWEEN from 'tween.js';
import {rasterDOM} from './canvas/svg-render';
import {
	grabArea,
	imageToSprite,
	Buffer,
	clear,
	loadImage
} from './canvas/utils';

const renderSpriteFn = function renderSprite(sprite, options = {}) {
	options.context = this;
	if (sprite.render) {
		sprite.render.bind(sprite)(options);
	}
};

let buffer1;
let renderSpriteToBuffer;
let renderSprite;
let sprites;
let w;
let h;
let context;

function init(options) {
	w = options.width;
	h = options.height;
	sprites = options.sprites;
	context = options.context;
	renderSprite = renderSpriteFn.bind(options.context);
	buffer1 = new Buffer(options.width, options.height);
	sprites.buffers.buffer1 = buffer1;
	renderSpriteToBuffer = renderSpriteFn.bind(buffer1.context);
}

function tweenPromisify(tween) {
	return new Promise(function (resolve) {
		tween.onComplete(resolve);
	});
}

function animateLogoIn() {
	return Promise.all([
		new TWEEN.Tween(sprites.highlight)
			.delay(1200)
			.to({ x: sprites.logo1.width/2 + sprites.highlight.width*2 }, 1000)
			.easing(TWEEN.Easing.Quadratic.InOut)
			.onUpdate(() => window.stale = true)
			.start()
		,
		new TWEEN.Tween(sprites.logo1)
			.to({ y: (h - sprites.logo1.height)/2 }, 2000)
			.easing(TWEEN.Easing.Elastic.Out)
			.onUpdate(() => window.stale = true)
			.start()
		]
		.map(tweenPromisify));
}

function renderBgAndMessage() {
	return Promise.all([
		rasterDOM('<span class="swipe">&lt; SWIPE &gt;</span>'),
		imageToSprite('images/temp.jpg')
	]).then(detail => {

		const text = detail[0];
		const bg = detail[1];

		sprites.text = text;
		text.x = (w - text.width) / 2;
		text.y = (h - text.height) / 2;

		sprites.bg = bg;
		bg.x = (w - bg.width) / 2;
		bg.y = Math.max((h - bg.height) / 2, 0);
		bg.opacity = 1;
	});
}

function loadStars() {
	return Promise.all([
		loadImage('images/star16.png'),
		loadImage('images/star32.png'),
		loadImage('images/star64.png')
	]).then(detail => {
		sprites.buffers.starSmall = detail[0];
		sprites.buffers.starMed = detail[1];
		sprites.buffers.starLarge = detail[2];
	});
}

function renderMenu() {
	return rasterDOM(document.getElementById('menuContentForRender'))
	.then(menu => sprites.menu = menu);
}

function splitPageAtLogo() {

	const splitPos = Math.floor(sprites.logo1.y + sprites.logo1.height);
	sprites.pageSplitTop = grabArea(0, 0, w, splitPos);
	sprites.pageSplitBottom = grabArea(0, splitPos, w, h - splitPos);

	return Promise.all([
		new TWEEN.Tween(sprites.pageSplitTop)
		.to({ y: -sprites.pageSplitTop.height }, 1000)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(() => window.stale = true)
		.start(),
		new TWEEN.Tween(sprites.pageSplitBottom)
		.to({ y: h }, 1000)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(() => window.stale = true)
		.start()
	]
	.map(tweenPromisify));
}

function renderLogo() {
	return Promise.all([
		rasterDOM('<div class="logo" data-first="GAMEGIRL" style="font-size: 14px;"></div>'),
		rasterDOM('<div class="logo" data-second="SELFIES" style="font-size: 14px;"></div>')
	]).then(function ([logo1, logo2]) {
		sprites.logo1 = logo1;
		sprites.logo2 = logo2;

		sprites.highlight = { x: -30 - logo1.width/2, y: -10, width: 15, height: 60, render(options = {}) {
			const ctx = options.context || context;
			ctx.globalCompositeOperation = 'source-atop';
			ctx.fillStyle = 'rgba(255,255,255,0.4)';
			ctx.beginPath();
			ctx.moveTo(sprites.logo1.x + this.x + this.width, sprites.logo1.y + this.y + 0);
			ctx.lineTo(sprites.logo1.x + this.x + this.width * 2, sprites.logo1.y + this.y + 0);
			ctx.lineTo(sprites.logo1.x + this.x + this.width, sprites.logo1.y + this.y + this.height);
			ctx.lineTo(sprites.logo1.x + this.x + 0, sprites.logo1.y + this.y + this.height);
			ctx.fill();
		} };

		logo1.x = (w - logo1.width)/2;
		logo2.x = (w - logo2.width)/2;
		logo1.y = 0;
		logo2.y = logo1.height;
	});
}

function startAnimLoop(time) {
	requestAnimationFrame(startAnimLoop);
	TWEEN.update(time);
	if (window.stale) {
		window.stale = false;
		switch (window.state) {
			case 'START':
				clear('#C9CAC9');
				clear(undefined, {context: buffer1.context});
				sprites.logo2.y = sprites.logo1.y + sprites.logo1.height;
				renderSpriteToBuffer(sprites.logo1);
				renderSpriteToBuffer(sprites.logo2);
				renderSpriteToBuffer(sprites.highlight);
				context.drawImage(buffer1, 0, 0);
				break;
			case 'SPLASH':
				clear('lavenderblush');
				sprites.bg.dx = sprites.text.dx * 0.6;
				renderSprite(sprites.bg);
				renderSprite(sprites.text);
				if (sprites.pageSplitTop) {
					renderSprite(sprites.pageSplitTop);
					renderSprite(sprites.pageSplitBottom);
				}
				break;
			case 'MENU':
				clear('lavenderblush');
				renderSprite(sprites.menu);
				if (sprites.bg) {
					sprites.bg.dx = sprites.text.dx * 0.6;
					renderSprite(sprites.bg);
					renderSprite(sprites.text);
				}
				buffer1.context.globalCompositeOperation = 'source-over';
				const star = [
					sprites.buffers.starSmall,
					sprites.buffers.starMed
				][Math.floor(Math.random() * 2)]; -
				buffer1.context.drawImage(star, Math.floor(Math.random() * w - star.width/2), Math.floor(Math.random() * h - star.height/2));
				context.drawImage(buffer1, 0, 0);
				break;
		}
	}
}

export {
	splitPageAtLogo,
	renderBgAndMessage,
	renderMenu,
	animateLogoIn,
	init,
	startAnimLoop,
	renderLogo,
	loadStars
};