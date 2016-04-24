export default function addScript (url) {
	const p = new Promise(function (resolve, reject) {
		const script = document.createElement('script');
		script.setAttribute('src', url);
		document.head.appendChild(script);
		script.onload = resolve;
		script.onerror = reject;
	});
	function promiseScript () {
		return p;
	};
	promiseScript.promise = p;
	return promiseScript;
}
