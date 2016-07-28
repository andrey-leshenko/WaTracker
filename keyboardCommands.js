"use strict";

const keyEscape = 27;
const keyQ = 'Q'.charCodeAt(0);

const bindings = {
	[keyEscape]: () => chrome.app.window.current().close(),
	[keyQ]: () => chrome.app.window.current().close()
};

document.addEventListener('DOMContentLoaded', function() {
	let elements = document.querySelectorAll('[shortcut-key]');

	for (let elem of elements) {
		let key = elem.getAttribute('shortcut-key').toUpperCase().charCodeAt(0);
		bindings[key] = function() {
			elem.dispatchEvent(new Event('click'));
		};
	}
});

window.addEventListener('keydown', function(e) {
	if (bindings[e.keyCode])
		bindings[e.keyCode]();
});
