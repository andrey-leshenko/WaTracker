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
        if (false) {
            parentWindow = window;
        }

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

            parentWindow.postMessage({type: 'wa_presence_message', value: msgCopy}, '*');
            console.log('Presence update:', msgCopy);

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
                    Store.Wap.presenceSubscribe(Store.Conn.me);
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
        window.subscribeToAll = subscribeToAll;

        function subscribeToAll() {
            parentWindow.postMessage({type: 'wa_subscribing'}, '*');
            console.log(Store.Presence.toArray().length);

            Store.Presence.toArray().forEach(function(c) {
                window.Store.Wap.presenceSubscribe(c.id);
                window.Store.Wap.lastseenFind(c.id);
                c.subscribe();
                console.log("state: " + c.chatstate.t);
                return;

                if (c.isGroup)
                    return;

                if (!c.isSubscribed) {
                    window.Store.Wap.lastseenFind(c.id);
                    c.subscribe();
                    console.log("subscribing for " + c.id);
                }
                else {
                    console.log("fake message for " + c.id);
                    var msg = {
                        id: c.id,
                        type: c.isOnline ? 'available'  : 'unavailable',
                        t: c.isOnline ? getCurrentTime() : c.t,
                        sendT: getCurrentTime()
                    };

                    if (!c.isOnline) {
                        // If he is unavailable but we don't know his last-seen time,
                        // he's denying it!
                        msg.deny = !c.t;
                    }

                    parentWindow.postMessage({type: 'wa_fake_presence_message', value: msg}, '*');
                }
            });
            // var contacts = Store.Contact.toJSON();
            // console.log('Subscribing to all ' + contacts.length + ' contacts:', contacts);

            // function endsWith(str, suffix) {
            //     return str.indexOf(suffix, str.length - suffix.length) !== -1;
            // }

            // function isUserWid(str) {
            //     return str && endsWith(str, '@c.us');
            // }

            // for (var i = 0; i < contacts.length; i++) {
            //     if (isUserWid(contacts[i].id)) {
            //         Store.Wap.presenceSubscribe(contacts[i].id);
            //     }
            // }
        }

        ///// Subscribe to all contacts when they are found /////

        var _contactHandle = Store.Contact.handle;
        Store.Contact.handle = function() {
            console.log('Contact.handle:', arguments);
            // At this point the contacts should be in place

            var originalReturnValue = _contactHandle.apply(Store.Contact, arguments);

            setTimeout(subscribeToAll, 1);
            setTimeout(reportContactstoBg, 1);

            //subscribeToAll();
            //reportContactstoBg();

            return originalReturnValue;
        };

        function getCurrentTime() {
            return parseInt((new Date()).getTime() / 1000);
        }
    }
}
