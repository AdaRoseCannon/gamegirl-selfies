'use strict'; //eslint-disable-line

import HAMMER from 'hammerjs';
import debounce from 'debounce';
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
	animateStarWipe,
	rerenderAllMenuContent
} from './lib/loading-animations';
import {
	static_initContext,
	clear,
	init as initUtils,
	getContentBoxPos
} from './lib/canvas/utils';

import {
	start as startCamera,
	render as renderCamera,
	stop as cameraStop,
	togglePaletteUpdate,
	changeFilter,
} from './lib/tinycam.js';

const assetPromise = Promise.all([
	addScript('scripts/color-thief.js')()
]);


const pixelScale = 2;
let w=0;
let h=0;

const canvas = document.getElementById('render-target');
const menuContent = document.querySelector('#menuContentForRender');
const cameraContent = document.querySelector('#cameraContentForRender');
const viewFinderEl = document.querySelector('#cameraContentForRender .viewfinder');
let context = null;

const sizes = {};

window.stale = false;
window.state = 'START';
const sprites = {};
sprites.buffers = {};

function setSizes() {
	canvas.style.width = '';
	canvas.style.height = '';
	canvas.style.flexGrow = 1;
	canvas.style.flexShrink = 0;
	canvas.style.alignSelf = 'stretch';

	const domWidth = canvas.clientWidth - (canvas.clientWidth % pixelScale);
	const domHeight = canvas.clientHeight - (canvas.clientHeight % pixelScale);
	w = domWidth/pixelScale;
	h = domHeight/pixelScale;
	window.stale = true;

	canvas.style.flexGrow = 0;
	canvas.style.flexShrink = 0;
	canvas.style.alignSelf = 'center';
	canvas.style.width = domWidth + 'px';
	canvas.style.height = domHeight + 'px';
	canvas.width = w;
	canvas.height = h;

	context = static_initContext(canvas);

	sizes.screen = {
		width: w,
		height: h
	};

	(function init() {
		const initOptions = {context, sprites, sizes};
		initSVGRender(initOptions);
		initUtils(initOptions);
		initAnims(initOptions);
	}());

	[].slice.call(document.querySelectorAll('.dummy-for-render'))
	.forEach(el => {
		el.style.width = `${w}px`;
		el.style.height = `${h}px`;
		if (el.id !== 'svg-to-raster') {
			el.style.transform = `scale(${pixelScale})`;
		}
	});

	const vfDetails = getContentBoxPos(viewFinderEl);
	sizes.viewfinder = {
		left: vfDetails.left,
		top: vfDetails.top,
		width: viewFinderEl.offsetWidth,
		height: viewFinderEl.offsetHeight
	};

	rerenderAllMenuContent()
	.then(() => window.stale = true);
}
window.addEventListener('resize', debounce(setSizes, 400));
setSizes();
setSizes();

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

					startCamera();
					showDomContent('CAMERA');

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
		CAMERA: cameraContent
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

	if (e.target.dataset.setState === 'CAMERA') {
		startCamera()
		.then(renderCamera)
		.then(() => showDomContent('CAMERA', 'star'));
	} else {
		showDomContent(e.target.dataset.setState, 'star');
	}
});

cameraContent.addEventListener('click', function (e) {
	switch (e.target.dataset.action) {
		case 'CAMERA_CHANGE_FILTER':
			changeFilter();
			break;
		case 'CAMERA_PHOTO':
			cameraStop();
			break;
		case 'CAMERA_PAUSE_PALETTE':
			togglePaletteUpdate;
			break;
		default:
			console.log(e.target.dataset.action);
			break;
	}
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

