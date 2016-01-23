console.log('window.js running');

document.addEventListener("DOMContentLoaded", function(event) {
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

    // document.getElementById('B1').addEventListener('click', function(e) {
    //     whatsAppWebView.executeScript({ code: 'console.log(window.Store);' });
    // });

    // document.getElementById('B2').addEventListener('click', function(e) {
    //     console.log('B2');
    // });

    // document.getElementById('B3').addEventListener('click', function(e) {
    //     console.log('B3');
    // });

    // document.getElementById('B4').addEventListener('click', function(e) {
    //     console.log('B4');
    // });
});

var State = {
    LOGGED_OUT: 0,
    LOGGED_IN: 1,
    RECORDING: 2
};

var state = State.LOGGED_OUT;

window.onmessage = function(e) {
    if (typeof e.data === 'string');

    switch(e.data) {
        case 'wa_stream_start':
            state = State.RECORDING;
            break;
        case 'wa_stream_end':
            if (state == State.RECORDING) {
                state = State.LOGGED_IN;
            }
            break;
        case 'wa_logged_in':
            if (state == State.LOGGED_OUT) {
                state = State.LOGGED_IN;
            }
            break;
        case 'wa_logged_out':
            state = State.LOGGED_OUT;
            break;
    }

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

    document.getElementById('heading').innerText = text;

    console.log('Guest message', e.data);
}

var port = null;

// window.addEventListener('wa_session_began', function() {
//     if (!port)
//         port = chrome.runtime.connect({name: "presenceUpdates"});
// });

// window.addEventListener('wa_session_ended', function() {
//     if (port) {
//         port.disconnect();
//         port = null;
//     }
// });

// window.addEventListener('wa_presence_message', function(e) {
//     var message = e.detail;
//     port.postMessage(message);
// });

// document.documentElement.addEventListener('wa_contacts', function(e) {
//     var contacts = e.detail;
//     chrome.runtime.sendMessage({type: "contacts", data: contacts});
// });

// window.addEventListener('wa_logged_in', function() {
//     console.log('event: wa_logged_in');
// });