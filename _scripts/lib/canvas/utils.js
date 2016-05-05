let sizes;
let context;

function init(o) {
	sizes = o.sizes;
	context = o.context;
}

function static_initContext(canvas) {
	const context = canvas.getContext('2d');
	context.mozImageSmoothingEnabled = false;
	context.webkitImageSmoothingEnabled = false;
	context.msImageSmoothingEnabled = false;
	context.imageSmoothingEnabled = false;
	return context;
}

function fill(fillStyle, options = {}) {
	const ctx = (options.context || context);

	// backup old state
	const oldComposite = ctx.globalCompositeOperation;
	const oldAlpha = ctx.globalAlpha;
	const oldFillStyle = ctx.fillStyle;

	// set fill style
	ctx.globalCompositeOperation = options.composite || 'source-over';
	if (options.opacity !== undefined) {
		ctx.globalAlpha = options.opacity;
	} else {
		ctx.globalAlpha = 1;
	}
	ctx.fillStyle = fillStyle;

	// Draw
	ctx.rect(0, 0, sizes.screen.width, sizes.screen.height);
	ctx.fill();

	// reset
	ctx.fillStyle = oldFillStyle;
	ctx.globalAlpha = oldAlpha;
	ctx.globalCompositeOperation = oldComposite;
}

function clear(fillStyle, options = {}) {
	(options.context || context).clearRect(0, 0, sizes.screen.width, sizes.screen.height);
	if (fillStyle) fill(fillStyle);
}

function renderData(options = {}) {
	const ctx = options.context || context;

	// backup old state
	const oldComposite = ctx.globalCompositeOperation;
	const oldAlpha = ctx.globalAlpha;

	// set fill style
	ctx.globalCompositeOperation = options.composite || 'source-over';
	if (this.opacity !== undefined) {
		ctx.globalAlpha = this.opacity;
	} else if (options.opacity !== undefined) {
		ctx.globalAlpha = options.opacity;
	} else {
		ctx.globalAlpha = 1;
	}

	ctx.drawImage(this.buffer, this.x + (this.dx || 0), this.y + (this.dy || 0));

	ctx.globalAlpha = oldAlpha;
	ctx.globalCompositeOperation = oldComposite;
}

function Buffer(width = sizes.screen.width, height = sizes.screen.height) {
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = width;
	tempCanvas.height = height;
	tempCanvas.context = tempCanvas.getContext('2d');


	return tempCanvas;
}

function grabArea(x,y,width,height) {
	const data = context.getImageData(x,y,width,height);
	const buffer = new Buffer(width, height);
	buffer.context.putImageData(data, 0,0);
	return {
		buffer,
		width, height,
		x, y,
		render: renderData
	};
}

function getSpriteWithEmptyBuffer(width, height) {
	const buffer = new Buffer(width, height);
	return {
		buffer,
		width, height,
		x: 0, y: 0,
		render: renderData
	};
}

function loadImage(url) {
	const image = document.createElement('img');
	return new Promise(function (resolve, reject) {
		image.onerror = function error(e) {
			reject(e);
		};
		image.onload = function render() {
			resolve(image);
		};
		image.src = url;
	});
}

function imageToSprite(url) {
	return loadImage(url).then(image => ({
		width: image.width,
		height: image.height,
		x: 0,
		y: 0,
		buffer: image,
		render: renderData
	}));
}

export {
	grabArea,
	init,
	static_initContext,
	clear,
	fill,
	Buffer,
	renderData,
	imageToSprite,
	loadImage,
	getSpriteWithEmptyBuffer
};