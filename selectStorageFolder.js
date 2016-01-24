var storageFolder = null;

document.getElementById('change-button').addEventListener('click', function() {
	chrome.fileSystem.chooseEntry({type: "openDirectory"}, function(entry) {
		if (chrome.runtime.lastError)
			return;

		storageFolder = entry;

		chrome.fileSystem.getDisplayPath(entry, function(displayPath) {
			document.getElementById('selected-file').innerText = displayPath;
			document.getElementById('save-button').removeAttribute('disabled');
		});
	});
});

document.getElementById('save-button').addEventListener('click', function() {
	if (!storageFolder)
		return;

	chrome.runtime.getBackgroundPage(function(bg) {
		bg.setStorageFolder(storageFolder)
		bg.openMainWindow();
		chrome.app.window.current().close();
	})
});

document.getElementById('cancel-button').addEventListener('click', function() {
	chrome.app.window.current().close();
});