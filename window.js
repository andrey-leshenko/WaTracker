var page = {
    section_selectFolder:       document.getElementById('section_selectFolder'),
    section_signin:             document.getElementById('section_signin'),
    section_record:             document.getElementById('section_record'),
    button_selectStorageFolder: document.getElementById('button_selectStorageFolder'),
    button_clearStorageFolder:  document.getElementById('button_clearStorageFolder'),
    text_selectedFolder:        document.getElementById('text_selectedFolder'),
}

var background;

var USAGE_SELECT_FOLDER = 0,
    USAGE_SIGN_IN = 1,
    USAGE_RECORD = 2;

var currentUsageState = USAGE_SELECT_FOLDER;

function setUsageStateAndRerender(usageState) {
    currentUsageState = usageState;

    switch (usageState) {
        case USAGE_SELECT_FOLDER:
            page.section_selectFolder   .style.visibility = 'visible';
            page.section_signin         .style.visibility = 'hidden';
            page.section_record         .style.visibility = 'hidden';
            break;
        case USAGE_SIGN_IN:
            page.section_selectFolder   .style.visibility = 'visible';
            page.section_signin         .style.visibility = 'visible';
            page.section_record         .style.visibility = 'hidden';
            break;
        case USAGE_RECORD:
            page.section_selectFolder   .style.visibility = 'visible';
            page.section_signin         .style.visibility = 'visible';
            page.section_record         .style.visibility = 'visible';
            break;
    }
}

setUsageStateAndRerender(USAGE_SELECT_FOLDER);

function storageFolderFound() {
    chrome.fileSystem.getDisplayPath(background.mem.storageFolder, function(displayPath) {
            page.text_selectedFolder.innerText = displayPath;
    });
    setUsageStateAndRerender(USAGE_SIGN_IN);
}

chrome.runtime.getBackgroundPage(function(bg) {
    background = bg;

    if (background.mem.storageFolder != null)
        storageFolderFound();
});

page.button_selectStorageFolder.addEventListener('click', function() {
    chrome.fileSystem.chooseEntry({type: 'openDirectory'}, function(entry) {
        if (chrome.runtime.lastError)
            return;

        background.setStorageFolder(entry);
        storageFolderFound();
    });
});

page.button_clearStorageFolder.addEventListener('click', function() {
    background.setStorageFolder(null);
    page.text_selectedFolder.innerText = 'No folder selected';
    setUsageStateAndRerender(USAGE_SELECT_FOLDER);
});

document.addEventListener("DOMContentLoaded", function(event) {
    return;
    console.log('window.js: onload');

    var whatsAppWebView = document.getElementById('wa_webview');

    whatsAppWebView.addContentScripts([{
        name: 'presenceCapture',
        matches: ['*://web.whatsapp.com/*'],
        js: { files: ['contentScript.js']},
        run_at: 'document_start'
    }]);

    whatsAppWebView.addEventListener('loadstop', function(e) {
        whatsAppWebView.contentWindow.postMessage('hello', '*');
    });

    whatsAppWebView.addEventListener('consolemessage', function(e) {
        console.log('Guest page: ', e.message);
    });
});

var State = {
    LOGGED_OUT: 0,
    LOGGED_IN: 1,
    RECORDING: 2
};

var state = State.LOGGED_OUT;

var port = null;

window.onmessage = function(e) {
    var message = e.data;
    console.log('Guest message', message);

    switch (message.type) {
        case 'wa_stream_start':
            if (!port)
                port = chrome.runtime.connect({name: "presenceUpdates"});
            break;
        case 'wa_stream_end':
            if (port) {
                port.disconnect();
                port = null;
            }
            break;
        case 'wa_presence_message':
            port.postMessage(message.value);
            break;
        case 'wa_contacts':
            chrome.runtime.sendMessage(message);
            break;
    }

    var oldState = state;

    switch (message.type) {
        case 'wa_stream_start':
            state = State.RECORDING;
            break;
        case 'wa_stream_end':
            if (state == State.RECORDING)
                state = State.LOGGED_IN;
            break;
        case 'wa_logged_in':
            if (state == State.LOGGED_OUT)
                state = State.LOGGED_IN;
            break;
        case 'wa_logged_out':
            state = State.LOGGED_OUT;
            break;
    }

    if (oldState != state) {
        var text;
        switch(state) {
            case State.LOGGED_OUT:
                text = 'Sign in to WhatsApp to begin recording:';
                break;
            case State.LOGGED_IN:
                text = '...';
                break;
            case State.RECORDING:
                text = 'Recording';
                break;
        }

        document.getElementById('status').innerText = text;
    }
}
