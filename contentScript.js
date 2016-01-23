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
        if (e.data === 'hello')
            parentWindow = e.source;
    };

    var waitForStore = setInterval(function() {
        if (window.Store && window.Store.Stream) {
            clearInterval(waitForStore);
            start();
        }
    }, 1);

    function start() {
        console.log('interception.js: start()');

        ///// Intercept presence updates /////

        var _presenceHandle = Store.Presence.handle;
        Store.Presence.handle = function(messages) {
            console.assert(messages.length == 1, 'More than one presence update per message');
            console.assert(messages[0].type != 'unsubscribe', 'Unsubscribe message');

            var msg = messages[0];

            // the original handle is going to destroy the message, 
            // make a copy
            var msgCopy = {
                id: msg.id,
                type: msg.type,
                t: msg.t || getCurrentTime(),
                sendT: getCurrentTime(),
                deny: msg.deny
            };

            console.log('Presence update:', msgCopy);
            parentWindow.postMessage({type: 'wa_presence_message', value: msgCopy}, '*');

            return _presenceHandle.apply(Store.Presence, arguments);
        };


        ///// Listen to stream state changes /////

        var _streamHandle = Store.Stream.handle;
        Store.Stream.handle = function() {
            console.log('Stream.handle:', arguments, arguments[0]);
            switch (arguments[0][0]) {
                case 'awake':
                    parentWindow.postMessage({type: 'wa_stream_start'}, '*');
                    subscribeToAll();
                    break;
                case 'asleep':
                    parentWindow.postMessage({type: 'wa_stream_end'}, '*');
                    // Try to wake up the steam
                    Store.Wap.presenceSubscribe(Wa.me);
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
            },
        });

        ///// Make always available /////

        Store.Wap.sendPresenceUnavailable = function() {
            console.log('Store.Wap.sendPresenceUnavailable blocked');
            // The calling script expects to get this in return
            return {'catch': function() {}};
        };

        Store.Stream.markUnavailable = function() {
            console.log('Store.Stream.markUnavailable blocked');
        };

        ///// Transfer the contacts to the background /////

        function reportContactstoBg() {
            console.log('Reporting contacts to background');
            var contacts = Store.Contact.toJSON();
            parentWindow.postMessage({type: 'wa_contacts', value: contacts}, '*');
        }

        ///// Subscription /////

        function subscribeToAll() {
            var contacts = Store.Contact.toJSON();
            console.log('Subscribing to all contacts:', contacts);

            for (var i = 0; i < contacts.length; i++) {
                if (Wa.isUserWid(contacts[i].id))
                    Store.Wap.presenceSubscribe(contacts[i].id);
            }
        }

        ///// Subscribe to all contacts when they are found /////

        var _contactHandle = Store.Contact.handle;
        Store.Contact.handle = function() {
            console.log('Contact.handle:', arguments);
            // At this point the contacts should be in place
            subscribeToAll();
            reportContactstoBg();
            return _contactHandle.apply(Store.Contact, arguments);
        };

        function getCurrentTime() {
            return parseInt((new Date()).getTime() / 1000);
        }
    }
}
