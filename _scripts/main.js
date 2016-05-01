'use strict'; //eslint-disable-line

import HAMMER from 'hammerjs';
import TWEEN from 'tween.js';
import addScript from './lib/add-script';
import {init as initSVGRender} from './lib/canvas/svg-render';
import {
	renderBgAndMessage,
	startAnimLoop,
	renderMenuContent,
	animateLogoIn,
	splitPageAtLogo,
	renderLogo,
	init as initAnims,
	renderStarWipe,
	animateStarWipe
} from './lib/loading-animations';
import {
	static_initContext,
	clear,
	init as initUtils
} from './lib/canvas/utils';

const assetPromise = Promise.all([
	addScript('scripts/color-thief.js')()
]);

const pixelScale = 3;
const canvas = document.getElementById('render-target');
const domWidth = canvas.clientWidth - (canvas.clientWidth % pixelScale);
const domHeight = canvas.clientHeight - (canvas.clientHeight % pixelScale);
const menuContent = document.querySelector('#menuContentForRender');
const cameraDom = document.querySelector('#cameraContentForRender');

const w = domWidth/pixelScale;
const h = domHeight/pixelScale;
window.stale = false;
window.state = 'START';
const sprites = {};
sprites.buffers = {};

canvas.style.flexGrow = 0;
canvas.style.flexShrink = 0;
canvas.style.alignSelf = 'center';
canvas.style.width = domWidth + 'px';
canvas.style.height = domHeight + 'px';
canvas.width = w;
canvas.height = h;

const context = static_initContext(canvas);

(function init() {
	const initOptions = {width: w, height: h, context, sprites};
	initSVGRender(initOptions);
	initUtils(initOptions);
	initAnims(initOptions);
}());

const hammer = new HAMMER(canvas);
const tempVars = {};
hammer.on('pan', function(event) {
	switch (window.state) {
		case 'SPLASH':
			if (event.isFirst) {
				if (tempVars.splashTween) tempVars.splashTween.stop();
			} else if (!event.isFinal) {
				sprites.text.dx = event.deltaX/pixelScale;
				window.stale = true;
			} else if (event.isFinal) {
				const endPos = Math.round(sprites.text.dx/w) * w * 2;
				if (endPos !== 0) {
					showDomContent('MENU');
					clear(undefined, {context: sprites.buffers.buffer1.context});
					new TWEEN.Tween(sprites.bg)
					.to({ opacity: 0 })
					.easing(TWEEN.Easing.Quadratic.Out)
					.onUpdate(() => window.stale = true)
					.start();
				}
				tempVars.splashTween = new TWEEN.Tween(sprites.text)
				.to({ dx: endPos }, 1200)
				.easing(endPos === 0 ? TWEEN.Easing.Elastic.Out : TWEEN.Easing.Quadratic.Out)
				.onUpdate(() => window.stale = true)
				.onComplete(() => {
					if (endPos === 0) return;
					delete sprites.bg;
					delete sprites.text;
				})
				.start();
			}
			break;
	}
});

function showDomContent(name, wipe) {
	const wipes = {
		star: animateStarWipe
	};
	const doms = {
		MENU: menuContent,
		CAMERA: cameraDom
	};

	const myWipe = wipes[wipe] || function(){};

	return renderMenuContent(doms[name], name)
	.then(sprite => {
		sprites.nextDom = sprite;
		Object.keys(doms).forEach(k => doms[k].classList.add('no-interaction'));
	})
	.then(myWipe)
	.then(() => {
		doms[name].classList.remove('no-interaction');
		window.state = name;
		sprites.currentDom = sprites.nextDom;
		sprites.nextDom = null;
		window.stale = true;
	});
}

menuContent.addEventListener('click', function (e) {
	if (!e.target.dataset.setState) return;
	showDomContent(e.target.dataset.setState, 'star');
});

new Promise(function (resolve) {
	window.addEventListener('load', function onload() {
		window.removeEventListener('load', onload);
		resolve();
	});
})
.then(renderLogo)
.then(() => new Promise(resolve => requestAnimationFrame(resolve)))
.then(startAnimLoop)
.then(() => Promise.all([
	renderBgAndMessage(),
	renderStarWipe(),
	animateLogoIn(),
	assetPromise
]))
.then(() => window.state = 'SPLASH')
.then(() => Promise.all([
	splitPageAtLogo()
]))
.then(function () {
	delete sprites.logo1;
	delete sprites.logo2;
	delete sprites.pageSplitTop;
	delete sprites.pageSplitBottom;
})
.catch(e => {
	throw e;
});

