console.log('window.js running');

chrome.runtime.getBackgroundPage(function(bg) {
    chrome.fileSystem.getDisplayPath(bg.storageFolder, function(displayPath) {
        document.getElementById('storage-folder').innerText = displayPath;
    });
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
        case 'wa_contacts':
            chrome.runtime.sendMessage(message);
            break;
        case 'wa_presence_message':
            port.postMessage(message.value);
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
