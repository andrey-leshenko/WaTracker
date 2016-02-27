chrome.runtime.getBackgroundPage(function(bg) {
	window.bg = bg;
	bg.getAllEntries(function(entries) {
		bg.getRecordingTimes(function(recordingTimes) {
			bg.getContacts(function(contacts) {
				findOnline(entries, recordingTimes, contacts);
			});
		});
	});
});

var divs = {};
var lastUpdate = {};

function findOnline(entries, recordingTimes, contacts) {
	///// Create a display element for each user /////
	{
		var container = document.getElementById('users_container');

		for (var id in contacts) {
			var elem = document.createElement('div');
			elem.className = 'offline';
			elem.innerText = contacts[id].name ? contacts[id].name : id;
			container.appendChild(elem);
			divs[id] = elem;
		}
	}

	///// Find the last update for each user /////
	{
		for (var i = 0; i < entries.length; i++) {
			var update = entries[i];
			if (!lastUpdate[update.id] || lastUpdate[update.id].time < update.time) {
				lastUpdate[update.id] = update;
			}
		}
	}

	///// Listen to presence updates /////
	{
		chrome.runtime.onConnect.addListener(listenToPort);
		
		if (bg.presencePort) {
			for (var id in lastUpdate) {
				if (lastUpdate[id].online) {
					divs[id].className = 'online';
				}
			}

			listenToPort(bg.presencePort);
		}

		function listenToPort(port) {
			console.assert(port.name == 'presenceUpdates');

			document.getElementById('usage_text').style.display = 'none';

			port.onMessage.addListener(function(presenceMsg) {
				lastUpdate[presenceMsg.id] = presenceMsg;
				divs[presenceMsg.id].className = presenceMsg.online ? 'online' : 'offline';
			});

			port.onDisconnect.addListener(function() {
				document.getElementById('usage_text').style.display = 'block';

				for (var id in lastUpdate) {
					divs[id].className = 'offline';
				}
			});
		}
	}
}
