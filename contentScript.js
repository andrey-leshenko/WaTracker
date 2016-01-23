console.log('contentScript.js running');

document.addEventListener('DOMContentLoaded', function() {
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.textContent = '(' + presenceCapture + ')();';
    document.body.appendChild(script);
});

function presenceCapture() {
    var parentWindow = null;

    window.onmessage = function(e){
        if (e.data !== 'hello')
            return;
        parentWindow = e.source;
    };

    var waitForStore = setInterval(function() {
        if (window.Store && window.Store.Stream) {
            clearInterval(waitForStore);
            start();
        }
    }, 1);

    function start() {
        console.log('interception.js: start()')

        var _streamHandle = Store.Stream.handle;
        Store.Stream.handle = function() {
            console.info('Stream.handle:', arguments, arguments[0]);
            switch (arguments[0][0]) {
                case 'awake':
                    parentWindow.postMessage('wa_stream_start', '*');
                    //subscribeToAll();
                    break;
                case 'asleep':
                    parentWindow.postMessage('wa_stream_end', '*');
                    // Store.Wap.presenceSubscribe(window.Wa.me);
                    // dispatchEvent(new CustomEvent('wa_session_ended'));
                    break;
            }

            return _streamHandle.apply(Store.Stream, arguments);
        };

        var _phoneAuthed = Store.Stream._values.phoneAuthed;
        Object.defineProperty(Store.Stream._values, 'phoneAuthed', {
            get: function() { return _phoneAuthed; },
            set: function(newValue) {
                _phoneAuthed = newValue;
                parentWindow.postMessage(_phoneAuthed ? 'wa_logged_in' : 'wa_logged_out', '*');
            },
        });
    }
}
