var settings = {
    recordQ: true,
}


chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('launcher.html', {
        'outerBounds': {
            'width': 900,
            'height': 750
        }
    });
});

chrome.runtime.onConnect.addListener(function(port) {
    if (!settings.recordQ)
        return;

    chrome.power.requestKeepAwake('system');

    port.onMessage.addListener(function(presenceMsg) {
        console.log(presenceMsg);k
    });

    port.onDisconnect.addListener(function() {
        chrome.power.releaseKeepAwake();
    });
});
