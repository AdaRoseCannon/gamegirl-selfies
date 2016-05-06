
import TWEEN from 'tween.js';
import {rasterDOM} from './canvas/svg-render';
import {isCameraOn, render as renderCamera} from './tinycam';
import {
	grabArea,
	imageToSprite,
	Buffer,
	clear,
	loadImage,
	getSpriteWithEmptyBuffer,
	fill
} from './canvas/utils';

const renderSpriteFn = function renderSprite(sprite, options = {}) {
	options.context = options.context || this;
	if (sprite.render) {
		sprite.render.bind(sprite)(options);
	}
};

let buffer1;
let renderSprite;
let sprites;
let sizes;
let context;

function init(options) {
	sizes = options.sizes;
	sprites = options.sprites;
	context = options.context;
	renderSprite = renderSpriteFn.bind(options.context);
	buffer1 = new Buffer(options.width, options.height);
	sprites.buffers.buffer1 = buffer1;
	sizes = options.sizes;
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
			.to({ x: sprites.logo1.width/2 + sprites.highlight.width*3 }, 1000)
			.easing(TWEEN.Easing.Quadratic.InOut)
			.onUpdate(() => window.stale = true)
			.start()
		,
		new TWEEN.Tween(sprites.logo1)
			.to({ y: (sizes.screen.height - sprites.logo1.height)/2 }, 2000)
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
		text.x = (sizes.screen.width - text.width) / 2;
		text.y = (sizes.screen.height - text.height) / 2;

		sprites.bg = bg;
		bg.x = (sizes.screen.width - bg.width) / 2;
		bg.y = Math.max((sizes.screen.height - bg.height) / 2, 0);
		bg.opacity = 1;
	});
}

function loadStars() {
	if (loadStars.prototype.starsPromise) {
		return loadStars.prototype.starsPromise;
	}
	loadStars.prototype.starsPromise = Promise.all([
		loadImage('images/star16.png'),
		loadImage('images/star32.png'),
		loadImage('images/star64.png')
	])
	.then(detail => {
		sprites.buffers.starSmall = detail[0];
		sprites.buffers.starMed = detail[1];
		sprites.buffers.starLarge = detail[2];
	});
	return loadStars.prototype.starsPromise;
}

const renderMenuContentPromises = new Map();
const nameToDom = new Map();
function renderMenuContent(dom, name, force) {
	if (force !== true && renderMenuContentPromises.has(name)) {
		return renderMenuContentPromises.get(name);
	}
	const p = rasterDOM(dom)
	.then(menu => {
		if (sprites[name]) {
			Object.keys(menu).forEach(key => {
				sprites[name][key] = menu[key];
			});
		} else {
			sprites[name] = menu;
		}
		return sprites[name];
	});
	nameToDom.set(name, dom);
	renderMenuContentPromises.set(name, p);
	return p;
}

function rerenderAllMenuContent() {
	return Promise.all(
		Array.from(nameToDom.entries()).map(pair => renderMenuContent(pair[1], pair[0], true))
	);
}

function splitPageAtLogo() {

	const splitPos = Math.floor(sprites.logo1.y + sprites.logo1.height);
	sprites.pageSplitTop = grabArea(0, 0, sizes.screen.width, splitPos);
	sprites.pageSplitBottom = grabArea(0, splitPos, sizes.screen.width, sizes.screen.height - splitPos);

	return Promise.all([
		new TWEEN.Tween(sprites.pageSplitTop)
		.to({ y: -sprites.pageSplitTop.height }, 1000)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(() => window.stale = true)
		.start(),
		new TWEEN.Tween(sprites.pageSplitBottom)
		.to({ y: sizes.screen.height }, 1000)
		.easing(TWEEN.Easing.Quadratic.Out)
		.onUpdate(() => window.stale = true)
		.start()
	]
	.map(tweenPromisify));
}

function renderLogo() {
	return Promise.all([
		rasterDOM('<div class="logo" data-first="GAMEGIRL" style="font-size: 15vw;"></div>'),
		rasterDOM('<div class="logo" data-second="SELFIES" style="font-size: 15vw;"></div>')
	]).then(function ([logo1, logo2]) {
		sprites.logo1 = logo1;
		sprites.logo2 = logo2;

		sprites.highlight = { x: -40 - logo1.width/2, y: -10, width: 20, height: 80, render(options = {}) {
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

		logo1.x = (sizes.screen.width - logo1.width)/2;
		logo2.x = (sizes.screen.width - logo2.width)/2;
		logo1.y = 0;
		logo2.y = logo1.height;
	});
}

function renderStarWipe() {
	return loadStars()
	.then(() => {
		const starWipe = getSpriteWithEmptyBuffer(sizes.screen.width*2,sizes.screen.height*2);
		starWipe.buffer.context.globalCompositeOperation = 'source-over';
		const stars = [
			sprites.buffers.starSmall,
			sprites.buffers.starMed
		];
		starWipe.x = 0 + sizes.screen.width * 0.5;
		starWipe.y = -sizes.screen.height - sizes.screen.height * 0.5;
		let noStars = Math.floor(Math.sqrt(sizes.screen.width*sizes.screen.width + sizes.screen.height*sizes.screen.height) * 0.2);
		sprites.starWipe = starWipe;
		while (noStars--) {
			const star = stars[Math.floor(Math.random() * 2)];
			const t = Math.random();
			const lag = Math.random();
			starWipe.buffer.context.drawImage(
				star,
				t*sizes.screen.width*2 + (0.5 * sizes.screen.height * lag) - star.width/2,
				t*sizes.screen.height*2 + (0.5 * -sizes.screen.width * lag) - star.height/2
			);
		}
	});
}

function animateStarWipe() {
	return Promise.all([
		new TWEEN.Tween(sprites.starWipe)
			.to({ x: '-' + sizes.screen.width*2.5, y: '+' + sizes.screen.height*2.5 }, 2000)
			.onUpdate(() => window.stale = true)
			.start()
		].map(tweenPromisify));
}

let i=0;
function startAnimLoop(time) {
	requestAnimationFrame(startAnimLoop);

	// half frame rate
	if (i++ % 2) return;
	TWEEN.update(time);
	doRender();
}

function doRender() {
	if (window.stale) {
		window.stale = false;
		switch (window.state) {
			case 'START':
				clear('#C9CAC9');
				clear(undefined, {context: buffer1.context});
				sprites.logo2.y = sprites.logo1.y + sprites.logo1.height;
				renderSprite(sprites.logo1, {
					context: buffer1.context
				});
				renderSprite(sprites.logo2, {
					context: buffer1.context
				});
				renderSprite(sprites.highlight, {
					context: buffer1.context
				});
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

			default:
				clear('lavenderblush');

				renderSprite(sprites.currentDom);

				if (sprites.nextDom) {

					// There is an animation happening
					fill('lavenderblush', {
						context: buffer1.context,
						opactiy: 0.2,
						composite: 'source-atop'
					});

					renderSprite(sprites.nextDom, {
						context: buffer1.context,
						opacity: 1,
						composite: 'source-atop'
					});

					renderSprite(sprites.starWipe, {
						context: buffer1.context
					});

					context.drawImage(buffer1, 0, 0);
				}

				// Render the splash screen on on top of everything if it is loaded
				if (sprites.bg) {
					sprites.bg.dx = sprites.text.dx * 0.6;
					renderSprite(sprites.bg);
					renderSprite(sprites.text);
				}

				if (isCameraOn() && window.state === 'CAMERA') {
					context.drawImage(renderCamera(), sizes.viewfinder.left, sizes.viewfinder.top);
				}

				break;
		}
	}
}

export {
	splitPageAtLogo,
	renderBgAndMessage,
	renderMenuContent,
	animateLogoIn,
	init,
	startAnimLoop,
	renderLogo,
	loadStars,
	rerenderAllMenuContent,
	renderStarWipe,
	animateStarWipe
};