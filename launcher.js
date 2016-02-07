document.getElementById('button_record').addEventListener('click', function() {
    chrome.app.window.create('record.html', {
        'outerBounds': {
            'width': 900,
            'height': 900
        }
    });
});

document.getElementById('button_timeline').addEventListener('click', function() {
    chrome.app.window.create('timeline.html', {
        'outerBounds': {
            'width': 900,
            'height': 750
        }
    });
});
