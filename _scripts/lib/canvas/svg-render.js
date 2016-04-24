import {renderData, static_initContext, Buffer} from './utils';

const svg = document.getElementById('svg-to-raster');
const offscreenCanvas = document.createElement('canvas');
const bufferContext = static_initContext(offscreenCanvas);
const rasterTarget = svg.querySelector('svg div');
const b64Start = 'data:image/svg+xml;base64,';
const serializer = new XMLSerializer();
let w;
let h;
let hasInit = false;

function init({width, height}) {
	w = width;
	h = height;
	offscreenCanvas.width = w;
	offscreenCanvas.height = h;
	svg.setAttribute('width', w);
	svg.setAttribute('height', h);
	[].slice.call(document.querySelectorAll('.dummy-for-render')).forEach(el => {
		el.style.width = `${w}px`;
		el.style.height = `${h}px`;
	});
	hasInit = true;
}

function inlineEl(...p) {
	return Promise.all(p.map(el => {
		let attr;
		let url;
		url = el.getAttribute('src');
		if (url) {
			attr = 'src';
		} else {
			url = el.getAttribute('href');
			attr = 'href';
		}
		if (!url) return Promise.reject('No url');
		return fetch(url)
		.then(response => response.blob())
		.then(function (blob) {
			return new Promise(resolve => {
				const a = new FileReader();
				a.onload = function (e) {
					resolve(e.target.result);
				};
				a.readAsDataURL(blob);
			});
		})
		.then(url => el.setAttribute(attr, url))
		.then(() => new Promise(resolve => setTimeout(resolve, 160)));
	}));
}

const stylePromise = inlineEl(...svg.querySelectorAll('link'));
let renderPromise = Promise.resolve();

function rasterDOM(dom) {
	if (!hasInit) throw Error('Need to init svg-render with width and height');
	renderPromise = renderPromise
	.then(() => stylePromise)
	.then(() => new Promise(resolve => {

		if (typeof dom === 'string') {
			rasterTarget.innerHTML = dom;
		} else {
			const newDom = dom.cloneNode(true);
			newDom.classList.remove('fake-render');
			rasterTarget.appendChild(newDom);
		}

		const image64 = b64Start + btoa(serializer.serializeToString(svg));
		const bufferImg = document.createElement('img');
		bufferImg.onload = readyLoad;
		bufferImg.src = image64;
		function readyLoad() {

			// hack it needs time to load the font
			setTimeout(load, 32);
		}
		function load() {
			const pix = {x:[w, 0], y:[h,0]};
			bufferContext.clearRect(0,0,w,h);
			bufferContext.drawImage(bufferImg, 0, 0);
			const imageData = bufferContext.getImageData(0,0,w,h);
			for (let y = 0; y < h; y++) {
				for (let x = 0; x < w; x++) {
					const index = (y * w + x) * 4;
					if (imageData.data[index+3] !== 0) {
						if (x < pix.x[0]) pix.x[0] = x;
						if (y < pix.y[0]) pix.y[0] = y;
						if (x > pix.x[1]) pix.x[1] = x;
						if (y > pix.y[1]) pix.y[1] = y;
					}
				}
			}

			rasterTarget.innerHTML = '';
			const width = pix.x[1] - pix.x[0] + 1;
			const height = pix.y[1] - pix.y[0] + 1;
			const data = bufferContext.getImageData(pix.x[0], pix.y[0], width, height);
			bufferContext.clearRect(0,0,w,h);

			const buffer = new Buffer(width, height);
			buffer.context.putImageData(data, 0,0);

			resolve({
				width,
				height,
				buffer,
				x: pix.x[0],
				y: pix.y[0],
				render: renderData
			});
		};
	}));

	return renderPromise;
}

export {
	init,
	rasterDOM,
	inlineEl
};