document.addEventListener('DOMContentLoaded', function() {
    var script = document.createElement('script');
    script.setAttribute('type', 'text/javascript');
    script.textContent = '(' + presenceCapture + ')();';
    document.body.appendChild(script);
});

function presenceCapture() {
    parentWindow = null;

    window.onmessage = function(e){
        if (e.data === 'hello')
            parentWindow = e.source;
    };

    var waitForStore = setInterval(function() {
        if (window.Store && window.Store.Stream && window.Store.Presence) {
            clearInterval(waitForStore);
            start();
        }
    }, 15);

    function start() {
        ///// Detect presence changes /////

        setInterval(checkState, 1000);

        var online = {};

        function checkState() {
            console.log('Checking State ');

            window.Store.Presence.toArray().forEach(function(c) {
                if (!c || !c.id)
                    return;

                if (!c.isSubscribed) {
                    c.subscribe();
                    console.log('Subscribing for ' + c.id);
                }

                if (c.isOnline == undefined)
                    return;

                if (online[c.id] != c.isOnline) {
                    online[c.id] = c.isOnline;
                    var change = {
                        id: c.id,
                        online: c.isOnline,
                        time: parseInt((new Date()).getTime() / 1000)
                    };
                    parentWindow.postMessage({type: 'wa_presence_update', value: change}, '*');
                    console.log('Presence update:' + change);
                }
            });
        }

        ///// Listen to stream state changes /////

        var _streamHandle = Store.Stream.handle;
        Store.Stream.handle = function() {
            console.log('Stream.handle:', arguments, arguments[0]);
            switch (arguments[0][0]) {
                case 'awake':
                    parentWindow.postMessage({type: 'wa_stream_start'}, '*');
                    break;
                case 'asleep':
                    parentWindow.postMessage({type: 'wa_stream_end'}, '*');
                    // // Try to wake up the steam
                    // Store.Wap.presenceSubscribe(Store.Conn.me);
                    break;
            }

            return _streamHandle.apply(Store.Stream, arguments);
        };

        ///// Login information /////

        var _phoneAuthed = Store.Stream._values.phoneAuthed;
        Object.defineProperty(Store.Stream._values, 'phoneAuthed', {
            get: function() { return _phoneAuthed; },
            set: function(newValue) {
                _phoneAuthed = newValue;
                var eventName = _phoneAuthed ? 'wa_logged_in' : 'wa_logged_out';
                parentWindow.postMessage({type: eventName}, '*');

                online = {};
            },
        });

        ///// Transfer the contacts to the background /////

        var _contactHandle = Store.Contact.handle;
        Store.Contact.handle = function() {
            console.log('Contact.handle:', arguments);

            var originalReturnValue = _contactHandle.apply(Store.Contact, arguments);

            // At this point the contacts should be in place
            console.log('Reporting contacts to background');
            var contacts = Store.Contact.toJSON();
            parentWindow.postMessage({type: 'wa_contacts', value: contacts}, '*');

            return originalReturnValue;
        };

        ///// Make always available /////

        Store.Wap.sendPresenceUnavailable = function() {
            console.log('Store.Wap.sendPresenceUnavailable blocked');
            // The calling script expects to get this in return
            return {'catch': function() {}};
        };

        Store.Stream.markUnavailable = function() {
            console.log('Store.Stream.markUnavailable blocked');
        };
    }
}
