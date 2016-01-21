var bg_record_q = true,
    bg_prevent_shutdown_q = true;

chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('window.html', {
        'outerBounds': {
            'width': 900,
            'height': 750
        }
    });
});

chrome.runtime.onConnect.addListener(function(port) {
    if (!bg_record_q)
        return;

    if (bg_prevent_shutdown_q)
        chrome.power.requestKeepAwake('system');

    port.onMessage.addListener(function(presenceMsg) {
    });

    port.onDisconnect.addListener(function() {
        chrome.power.releaseKeepAwake();
    });
});
