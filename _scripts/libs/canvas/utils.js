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

function fill(fillStyle, composite) {
	context.globalCompositeOperation = composite || 'source-over';
	context.rect(0, 0, w, h);
	const oldFillStyle = context.fillStyle;
	context.fillStyle = fillStyle;
	context.fill();
	context.fillStyle = oldFillStyle;
}

function clear(fillStyle) {
	context.clearRect(0, 0, w, h);
	if (fillStyle) fill(fillStyle);
}

function renderData({composite, ctx = context} = {}) {
	if (this.data) {
		if (!this.__buffer) {
			const buffer = new Buffer(this.width, this.height);
			buffer.context.putImageData(this.data, 0,0);
			this.___buffer = buffer;
		}
		ctx.globalCompositeOperation = composite || 'source-over';
		ctx.drawImage(this.___buffer, this.x, this.y);
	}
}

function Buffer(width = w, height = h) {
	const tempCanvas = document.createElement('canvas');
	tempCanvas.width = width;
	tempCanvas.height = height;
	const context = tempCanvas.getContext('2d');
	tempCanvas.context = context;
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