console.log('contentScript.js running');

function injectFunction(f) {
    var script = document.createElement('script');
    script.id = 'websocket-interception-script';
    script.setAttribute('type', 'text/javascript');
    script.textContent = '(' + f + ')();';

    (document.body || document.head || document.documentElement).appendChild(script);
}

function presenceCapture() {
    // var waitForStore = setInterval(function() {
    //     //console.log('interception.js:', 'searching for window.Store');
    //     //console.log(window.Store.Wap);
    //     document.dispatchEvent(new CustomEvent('lol_cat'));
    // }, 1000);

    var parentWindow = null;

    window.onmessage = function(e){
        if (e.data == 'hello') {
            debugger;
            console.log(e);
            console.log('src', e.source);
            parentWindow = e.source;
            e.source.postMessage(!!window.Store.Stream, '*');
        }
    };
}

document.addEventListener("DOMContentLoaded", function(event) {
    injectFunction(presenceCapture);
    document.dispatchEvent(new CustomEvent('lol_cat'));
});



// window.Store = "NAPALM";

// var waitForStore = setInterval(function() {
//     //console.log('interception.js:', 'searching for window.Store');
//     console.log(window.Store);
//     if (true)
//         return;
//     console.log('interception.js:', 'window.Store found');
//     clearInterval(waitForStore);
//     onStoreLoaded();
// }, 100);

// function onStoreLoaded() {
//     Store.Stream._phoneAuthed = Store.Stream.phoneAuthed;

//     Object.defineProperty(Store.Stream, 'phoneAuthed', {
//         get: function() { return Store.Stream._phoneAuthed; },
//         set: function(authed) {
//             console.log('interception.js:', 'Store.Stream.phoneAuthed changed to', authed);
//             Store.Stream._phoneAuthed = authed;
//             if (authed)
//                 dispatchEvent(new CustomEvent('wa_loged_in'));
//             else
//                 dispatchEvent(new CustomEvent('wa_loged_out'));
//         },
//         enumerable: true,
//         configurable: true
//     });
// }

// function dispatchEvent(event) {
//     document.documentElement.dispatchEvent(event);
// }

// dispatchEvent(new CustomEvent('wa_logged_in'));

