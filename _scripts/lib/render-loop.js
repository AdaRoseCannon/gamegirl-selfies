import TWEEN from 'tween.js';
import {
	isCameraOn,
	render as renderCamera,
	isRecording
} from './tinycam';
import {
	getProgress as getGitProgress
} from './save-gif';
import {
	Buffer,
	clear,
	fill
} from './canvas/utils';

const renderSpriteFn = function renderSprite(sprite, options = {}) {
	options.context = options.context || this;
	if (sprite.render) {
		sprite.render.bind(sprite)(options);
	}
};

let i=0;
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

function startAnimLoop(time) {
	requestAnimationFrame(startAnimLoop);

	// half frame rate
	if (i = i++ % 2) return;
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
				sprites.text.x = (sizes.screen.width - sprites.text.width) / 2;
				sprites.text.y = sizes.screen.height / 2;
				sprites.bg.x = (sizes.screen.width - sprites.bg.width) / 2;
				sprites.bg.y = Math.max((sizes.screen.height - sprites.bg.height) / 2, 0);

				renderSprite(sprites.bg);

				context.save();
				context.globalAlpha = 0.7;
				context.fillStyle = 'lavenderblush';
				context.beginPath();
				context.rect(sprites.text.x + (sprites.text.dx || 0) - 150, sprites.text.y - 1, sprites.text.width + 300, sprites.text.height + 2);
				context.fill();
				context.globalAlpha = 1;
				context.restore();

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
					context.save();
					context.scale(-1, 1);
					context.drawImage(renderCamera(), -96 - sizes.viewfinder.left, sizes.viewfinder.top);
					context.restore();
					if (isRecording()) {
						sprites.rec.x = sizes.viewfinder.left + 96 - 1;
						sprites.rec.y = sizes.viewfinder.top + 96 - 1;
						renderSprite(sprites.rec);
					}
					if (getGitProgress() !== 0 && getGitProgress() !== 1) {
						console.log('rendering');
					}
				}

				break;
		}
	}
}

export {
	init,
	startAnimLoop
};