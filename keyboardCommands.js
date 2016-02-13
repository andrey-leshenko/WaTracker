window.addEventListener('keydown', function(e) {
	console.log(e);
	switch (e.keyCode) {
		// Escape
		case 27:
		// q
		case 81:
			chrome.app.window.current().close();
			break;
	}
});