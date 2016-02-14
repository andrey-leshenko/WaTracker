window.addEventListener('keydown', function(e) {
	// Escape or Q key
	if (e.keyCode == 27 || e.keyCode == 81) {
		chrome.app.window.current().close();
	}
});

// TODO: make this work
// document.addEventListener('click', function(e) {
// 	if (e.ctrlKey) {

// 		window.scrollTo(document.body.scrollWidth, window.scrollY);
// 	}
// });

chrome.runtime.getBackgroundPage(function(bg) {
	bg.getAllEntries(function(entries) {
		bg.getRecordingTimes(function(recordingTimes) {
			bg.getContacts(function(contacts) {
				// NOTE(Andrey): Make sure we are sorting when we need to
				shuffle(entries);
				shuffle(recordingTimes);
				plot(entries, recordingTimes, contacts);
				chrome.app.window.current().onBoundsChanged.addListener(function() {
					plot(entries, recordingTimes, contacts);
				});
			});
		});
	});
});

function shuffle(array) {
	var currentIndex = array.length,
		temporaryValue,
		randomIndex;

	// While there remain elements to shuffle
	while (0 !== currentIndex) {
		// Pick a remaining element
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

function plot(data, recordingTimes, contacts) {
	console.log('plottings');

	var displayName = {};

	for (var id in contacts) {
		displayName[id] = contacts[id].name || id;
	}

	function unique(array, f) {
		return Array.from(new Set(array.map(f)).values());
	}

	var ids = unique(data, function(d) { return d.id; });
	ids.sort();

	var modifiedData = data.slice();

	recordingTimes.forEach(function(recording) {
		ids.forEach(function(id) {
			modifiedData.push({
				id: id,
				time: recording['endTime'],
				online: false,
			});
		});
	});

	var nested = d3.nest()
		.key(function(d) { return d.id; })
		.sortKeys(d3.ascending)
		.sortValues(function(a,b) { return a.time - b.time; })
		.entries(modifiedData);

	var onlineRanges = d3.merge(nested.map(function(d) {
		var presenceUpdates = d.values;
		var ranges = [];
		var online = false;

		for (var i = 0; i < presenceUpdates.length; i++) {
			var m = presenceUpdates[i];

			if (!online && m.online) {
				ranges.push([m, null]);
				online = true;
			}
			if (online && !m.online) {
				ranges[ranges.length - 1][1] = m;
				online = false;
			}
		}

		if (ranges.length != 0 && ranges[ranges.length - 1][1] == null)
			ranges.pop();
		return ranges;
	}));
	
	var timeExtent = d3.extent(modifiedData, function (d) { return d.time; });

	var outerWidth = (timeExtent[1] - timeExtent[0]) * 0.15;
	var outerHeight = window.innerHeight;//ids.length * 13;

	d3.select('svg').remove();
	var svg = d3.select('body').append('svg')
		.attr('width',  outerWidth)
		.attr('height', outerHeight);

	svg.append('rect')
		.attr('x', 0).attr('y', 0)
		.attr('width', outerWidth)
		.attr('height', outerHeight)
		.attr('fill', 'rgb(237, 239, 240)');

	var yScale = d3.scale.ordinal()
		.domain(ids)
		.rangeRoundPoints([0, outerHeight]);

	var xScale = d3.scale.linear()
		.domain(timeExtent)
		.rangeRound([0, outerWidth]);

	///// Recording sessions /////

	{
		var recordingRectsG = svg.append('g')
		.style('fill', 'rgb(247, 249, 250)')

		var recordingRects = recordingRectsG.selectAll('rect').data(recordingTimes);

		recordingRects.enter().append('rect')
			.attr('y', 0)
			.attr('height', outerHeight)

		recordingRects
			.attr('x', function (d) { return xScale(d['startTime']); })
			.attr('width', function (d) { return xScale(d['endTime']) - xScale(d['startTime']); });

		recordingRects.exit().remove();
	}

	///// Drawing the presence times /////

	{
		var linesG = svg.append('g')
			.style('stroke', 'black')
			.style('stroke-width', 4);

		var lines = linesG.selectAll('line').data(onlineRanges);

		lines.enter().append('line');	

		lines
			.attr('x1', function (d){ return xScale(d[0]['time']); })
			.attr('y1', function (d){ return yScale(d[0]['id']); })
			.attr('x2', function (d){ return xScale(d[1]['time']); })
			.attr('y2', function (d){ return yScale(d[1]['id']); })
			.append('title').text(function (d){ return displayName[d[1]['id']]; });

		lines.exit().remove();
	}

	///// Labels /////

	{
		var xLabalsG = svg.append('g');
		var xLabels = xLabalsG.selectAll('text').data(ids);

		xLabels.enter().append('text')
			.attr('x', 0)
			.style('font-family', 'Verdana')
			.style('font-size', 9);

		xLabels
			.attr('y', function(d) { return yScale(d); })
			.text(function(id) { return displayName[id]; });
	}

	///// Timeticks /////

	{
		var timeTicksG = svg.append('g')
			.style('stroke', 'rgb(128, 128, 128)')
			.style('stroke-dasharray', '5, 2, 3, 2')
			.style('stroke-width', '1');

		var timeScale = d3.time.scale()
			.domain(xScale.domain().map(function(t) { return new Date(t * 1000); }))
			.range(xScale.range);
		
		var timeTicks = timeScale.ticks(d3.time.hour);
		var timeTickFormatFunction = timeScale.tickFormat();
		
		var timeRules = timeTicksG.selectAll('line')
			.data(timeTicks);

		timeRules.enter().append('line')
			.attr('y1', 0)
			.attr('y2', outerHeight);

		timeRules.attr('x1', function(d) { return xScale(d.getTime() / 1000); })
			.attr('x2', function(d) { return xScale(d.getTime() / 1000); });
		
		timeRules.exit().remove();
	}
		
	///// Time labels /////

	{
		var timeLabelsG = svg.append('g')
			.attr('font-size', 12);
		
		var timeLabels = timeLabelsG.selectAll('text')
			.data(timeTicks);
		
		timeLabels.enter().append('text')
			.attr('y', 10 + 5);
		
		timeLabels.attr('x', function(d) { return xScale(d.getTime() / 1000) + 5; })
			.text(function(d) { return timeTickFormatFunction(d) });
		
		timeLabels.exit().remove();
	}

	///// Presence updates /////

	if (false)
	{
		var circles = svg.selectAll('circle').data(modifiedData);

		circles.enter().append('circle')
			.attr('r', 3);

		circles
			.attr('cx', function (d) { return xScale(d['time']); })
			.attr('cy', function (d) { return yScale(d['id']); })
			.attr('fill', function (d) { return (d['online']) ? 'green' : 'red'; });

		circles.exit().remove();
	}
}
