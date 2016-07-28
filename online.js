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

let divs = {};
let lastUpdate = {};

function findOnline(entries, recordingTimes, contacts) {
	///// Create a display element for each user /////
	{
		let container = document.getElementById('users_container');

		for (let id in contacts) {
			let elem = document.createElement('div');
			elem.className = 'offline';
			elem.innerText = contacts[id].name ? contacts[id].name : id;
			container.appendChild(elem);
			divs[id] = elem;
		}
	}

	///// Find the last update for each user /////
	{
		for (let i = 0; i < entries.length; i++) {
			let update = entries[i];
			if (!lastUpdate[update.id] || lastUpdate[update.id].time < update.time) {
				lastUpdate[update.id] = update;
			}
		}
	}

	///// Listen to presence updates /////
	{
		chrome.runtime.onConnect.addListener(listenToPort);
		
		if (bg.presencePort) {
			for (let id in lastUpdate) {
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

				for (let id in lastUpdate) {
					divs[id].className = 'offline';
				}
			});
		}
	}
}
