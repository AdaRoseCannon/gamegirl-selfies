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
	if (this.data || this.__buffer) {
		if (!this.__buffer) {
			const buffer = new Buffer(this.width, this.height);
			buffer.context.putImageData(this.data, 0,0);
			this.__buffer = buffer;
			delete this.data;
		}
		ctx.globalCompositeOperation = options.composite || 'source-over';
		ctx.drawImage(this.__buffer, this.x + (this.dx || 0), this.y + (this.dy || 0));
	}
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
	return {
		data,
		width, height,
		x, y,
		render: renderData
	};
}

export {
	grabArea,
	init,
	static_initContext,
	clear,
	fill,
	Buffer,
	renderData
};