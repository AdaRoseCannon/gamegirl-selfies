(function () {'use strict';
var define = false;
var window = window || self
/* global caches, Request, self, toolbox, importScripts */

importScripts('/scripts/sw-toolbox.js');

var resources = ['styles/main.css', 'scripts/main.min.js', 'icon-192.png', 'icon-768.png', 'https://fonts.googleapis.com/css?family=Open+Sans:300italic,400,300,600,800', '/'];
toolbox.precache(resources);

var defaultRoute = location.protocol === 'http:' || location.hostname === 'localhost' ? toolbox.networkFirst : toolbox.fastest;
toolbox.router.default = defaultRoute;
}());
//# sourceMappingURL=sw.js.map