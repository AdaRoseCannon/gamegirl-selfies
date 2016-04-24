let w;
let h;
let context;

function init(o) {
	w = o.width;
	h = o.height;
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
	ctx.globalCompositeOperation = options.composite || 'source-over';
	ctx.rect(0, 0, w, h);
	const oldFillStyle = ctx.fillStyle;
	ctx.fillStyle = fillStyle;
	ctx.fill();
	ctx.fillStyle = oldFillStyle;
}

function clear(fillStyle, options = {}) {
	(options.context || context).clearRect(0, 0, w, h);
	if (fillStyle) fill(fillStyle);
}

function renderData(options = {}) {
	const ctx = options.context || context;
	ctx.globalCompositeOperation = options.composite || 'source-over';
	ctx.globalAlpha = this.opacity === undefined ? 1 : this.opacity;
	ctx.drawImage(this.buffer, this.x + (this.dx || 0), this.y + (this.dy || 0));
	ctx.globalAlpha = 1;
}

function Buffer(width = w, height = h) {
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

function imageToSprite(url) {
	return new Promise(function (resolve, reject) {
		const image = document.createElement('img');
		image.onload = function render() {
			resolve({
				width: this.width,
				height: this.height,
				x: 0,
				y: 0,
				buffer: image,
				render: renderData
			});
		};
		image.onerror = function error(e) {
			reject(e);
		};
		image.src = url;
	});
}

export {
	grabArea,
	init,
	static_initContext,
	clear,
	fill,
	Buffer,
	renderData,
	imageToSprite
};