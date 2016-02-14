function record() {
	chrome.app.window.create('record.html', {
		'outerBounds': {
			'width': 900,
			'height': 900
		}
	});
}

function timeline() {
	chrome.app.window.create('timeline.html', {
		'outerBounds': {
			'width': 900,
			'height': 750
		}
	});
}

function online() {
	chrome.app.window.create('online.html', {
		'outerBounds': {
			'width': 900,
			'height': 750
		}
	});
}

document.getElementById('button_record').addEventListener('click', record);
document.getElementById('button_timeline').addEventListener('click', timeline);
document.getElementById('button_online').addEventListener('click', online);

window.addEventListener('keydown', function(e) {
	// R keyn
	if (e.keyCode == 82) {
		record();
	}
	// T key
	else if (e.keyCode == 84) {
		timeline();
	}
	// O key
	else if (e.keyCode == 79) {
		online();
	}
	// Escape or Q key
	else if (e.keyCode == 27 || e.keyCode == 81) {
		chrome.app.window.current().close();
	}
});