var bg_record_q = true,
    bg_prevent_shutdown_q = true;

var storageFolder = null;

function openMainWindow() {
    chrome.app.window.create('window.html', {
        'outerBounds': {
            'width': 900,
            'height': 750
        }
    });
}

function openSelectStorageFolder() {
    chrome.app.window.create('selectStorageFolder.html', {
        'outerBounds': {
            'width': 500,
            'height': 400
        }
    });
}

chrome.app.runtime.onLaunched.addListener(function() {
    if (storageFolder) {
        openMainWindow()
        return;
    }

    chrome.storage.local.get('storage_folder_id', function(values) {
        if (values['storage_folder_id'] == undefined) {
            openSelectStorageFolder()
        }
        else {
            storageFolder = chrome.fileSystem.restoreEntry(dirId, function(entry) {
                storageFolder = entry;
                openMainWindow();
            });
        }
    });
});

chrome.runtime.onConnect.addListener(function(port) {
    if (!bg_record_q)
        return;

    if (bg_prevent_shutdown_q)
        chrome.power.requestKeepAwake('system');

    port.onMessage.addListener(function(presenceMsg) {
        console.log(presenceMsg);
    });

    port.onDisconnect.addListener(function() {
        chrome.power.releaseKeepAwake();
    });
});

function setStorageFolder(dir) {
    storageFolder = dir;
    var retainId = chrome.fileSystem.retainEntry(dir);
    chrome.storage.local.set({'storage_folder_id': retainId});
}