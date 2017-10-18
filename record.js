document.addEventListener('DOMContentLoaded', function(event) {
	let view = document.getElementById('wa_webview');

	view.addContentScripts([{
		name: 'contentScript',
		matches: ['*://web.whatsapp.com/*'],
		js: { files: ['contentScript.js']},
		run_at: 'document_start'
	}]);

	view.addEventListener('loadstop', function(e) {
		view.contentWindow.postMessage('communication_init', '*');
	});

	view.addEventListener('consolemessage', function(e) {
		console.log('Guest page: ', e.message);
	});
});

{ // The log on the record.js page
	let logElement = document.getElementById('div_log');
	let messages = [];
	let MAX_LOG_LENGTH = 10;
	let MAX_MESSAGE_LENGTH = 100;
	let messageCounter = 0;

	window.outputToLog = function(message) {
		if (message.length > MAX_MESSAGE_LENGTH) {
			message = message.substring(0, MAX_MESSAGE_LENGTH - 3) + '...';
		}

		messages.push(message);
		messageCounter++;
		if (messages.length > MAX_LOG_LENGTH)
			messages.shift();
		let log = '';
		for (let i = 0; i < messages.length; i++) {
			log += (messageCounter - (messages.length - 1 - i)) + ': ' + messages[i] + '\n';
		}
		logElement.innerText = log;
	}
}

const State = {
	LOGGED_OUT: 0,
	LOGGED_IN: 1,
	RECORDING: 2
};

let state = State.LOGGED_OUT;

let port = null;

window.onmessage = function(e) {
	let message = e.data;
	console.log('Guest message', message);
	outputToLog(JSON.stringify(message));

	switch (message.type) {
		case 'wa_stream_start':
			if (!port)
				port = chrome.runtime.connect({name: 'presenceUpdates'});
			break;
		case 'wa_stream_end':
			if (port) {
				port.disconnect();
				port = null;
			}
			break;
		case 'wa_presence_update':
			if (port) {
				port.postMessage(message.value);
			}
			else {
				outputToLog('Message dropped because the port is closed');
				console.warn('Message dropped because the port is closed');
			}
			break;
		case 'wa_contacts':
			chrome.runtime.sendMessage(message);
			break;
	}

	let oldState = state;

	switch (message.type) {
		case 'wa_stream_start':
			state = State.RECORDING;
			break;
		case 'wa_stream_end':
			if (state == State.RECORDING)
				state = State.LOGGED_IN;
			break;
		case 'wa_logged_in':
			if (state == State.LOGGED_OUT)
				state = State.LOGGED_IN;
			break;
		case 'wa_logged_out':
			state = State.LOGGED_OUT;
			break;
	}

	if (oldState != state) {
		let text;

		switch(state) {
			case State.LOGGED_OUT:
				text = 'Sign in to WhatsApp to begin recording:';
				break;
			case State.LOGGED_IN:
				text = 'Signed in but not recording';
				break;
			case State.RECORDING:
				text = 'Recording';
				break;
		}

		document.getElementById('heading').innerText = text;
	}
}

chrome.power.requestKeepAwake('system');
chrome.app.window.current().onClosed.addListener(function() {
	chrome.power.releaseKeepAwake();
});
