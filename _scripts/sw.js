
/* global caches, Request, self, toolbox, importScripts */

importScripts('/scripts/sw-toolbox.js');

const resources = [
	'styles/main.css',
	'scripts/main.min.js',
	'icon-192.png',
	'icon-768.png',
	'https://fonts.googleapis.com/css?family=Open+Sans:300italic,400,300,600,800',
	'/'
];
toolbox.precache(resources);

const defaultRoute = (location.protocol === 'http:' || location.hostname === 'localhost') ? toolbox.networkFirst : toolbox.fastest;
toolbox.router.default = defaultRoute;