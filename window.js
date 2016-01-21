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

    window.onmessage = function(e){
        console.log('Guest message', e.data);
    }

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

// var port = null;

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