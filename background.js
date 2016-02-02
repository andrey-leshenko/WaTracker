var settings = {
    recordQ: true,
    preventShutdownQ: true,
    storageFolderRetainId: null,
}

var mem = {
    mainWindow: null,
    storageFolder: null,
}

function saveSettings() {
    chrome.storage.local.set({'settings': settings});
}

{ // Restore the settings
    chrome.storage.local.get('settings', function(values) {
        if (!values['settings'])
            return;

        settings = values['settings'];

        { // Restore the storage folder
            if (settings.storageFolderRetainId) {
                chrome.fileSystem.restoreEntry(settings.storageFolderRetainId, function(entry) {
                    mem.storageFolder = entry;
                    if (mem.mainWindow)
                        mem.mainWindow.storageFolderFound();
                });
            }
        }
    });
}

function setStorageFolder(newFolder) {
    mem.storageFolder = newFolder;
    if (newFolder == null) {
        settings.storageFolderRetainId = null;
    }
    else {
        settings.storageFolderRetainId = chrome.fileSystem.retainEntry(mem.storageFolder);
    }
    saveSettings();
}

chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('window.html', {
        'outerBounds': {
            'width': 900,
            'height': 750
        }
    }, function(wnd) {
        data.mainWindow = wnd;
    });
});

chrome.runtime.onConnect.addListener(function(port) {
    if (!settings.recordQ)
        return;

    if (settings.preventShutdownQ)
        chrome.power.requestKeepAwake('system');

    port.onMessage.addListener(function(presenceMsg) {
        console.log(presenceMsg);
    });

    port.onDisconnect.addListener(function() {
        chrome.power.releaseKeepAwake();
    });
});
