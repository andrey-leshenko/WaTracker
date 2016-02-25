window.addEventListener('keydown', function(e) {
	// Escape or Q key
	if (e.keyCode == 27 || e.keyCode == 81) {
		chrome.app.window.current().close();
	}
});

chrome.runtime.getBackgroundPage(function(bg) {
	bg.getAllEntries(function(entries) {
		bg.getRecordingTimes(function(recordingTimes) {
			bg.getContacts(function(contacts) {
				plot(entries, recordingTimes, contacts);
			});
		});
	});
});

function plot(entries, recordingTimes, contacts) {
	d3.shuffle(entries);
	d3.shuffle(recordingTimes);

	///// Prepare the contacts /////
	{
		for (var i = 0; i < entries.length; i++) {
			var id = entries[i].id;
			contacts[id] = contacts[id] || {id: id};
		}

		for (var id in contacts) {
			contacts[id]._displayName = contacts[id].name || id;
		}
	}

	///// Add 'offline' message at the end of each recording /////

	var myEntries = entries.slice();

	recordingTimes.forEach(function(recording) {
		for (var id in contacts) {
			myEntries.push({
				id: id,
				time: recording['endTime'],
				online: false,
			});
		}
	});

	///// Calculate online ranges /////

	var nestedById = d3.nest()
		.key(function(d) { return d.id; })
		.sortKeys(d3.ascending)
		.sortValues(function(a, b) { return a.time - b.time; })
		.entries(myEntries);

	var onlineRanges = d3.merge(nestedById.map(function(d) {
		var updates = d.values;
		var ranges = [];
		var online = false;
		var onlineMessage = null;

		for (var i = 0; i < updates.length; i++) {
			var m = updates[i];

			if (!online && m.online) {
				onlineMessage = m;
				online = true
			}
			if (online && !m.online) {
				ranges.push([onlineMessage, m]);
				online = false;
			}
		}

		return ranges;
	}));

	///// Sizes /////

	var timeExtent = d3.extent(myEntries, function(d) { return d.time; });
	var ids = Object.keys(contacts)
		.sort(function(a, b) { return contacts[a]._displayName.localeCompare(contacts[b]._displayName); });

	var scale = {
		SECOND_WIDTH: 0.15,
		ROW_HEIGHT: 10,
		PANEL_WIDTH: 120,
		PANEL_PADDING_LEFT: 5,
	}

	var TIMELINE_WIDTH = (timeExtent[1] - timeExtent[0]) * scale.SECOND_WIDTH;
	var OUTER_WIDTH = TIMELINE_WIDTH + scale.PANEL_WIDTH;
	var OUTER_HEIGHT = ids.length * scale.ROW_HEIGHT;

	///// Scales /////

	var yScale = d3.scale.ordinal()
		.domain(ids)
		.rangeRoundPoints([0, OUTER_HEIGHT]);

	var yScaleInverse = function(y) {
		var parts  = ids.length - 1;
		var width = OUTER_HEIGHT / parts;

		y += width / 2;
		var index = Math.floor(y / width);
		return ids[index];
	};

	var xScale = d3.scale.linear()
		.domain(timeExtent)
		.rangeRound([0, TIMELINE_WIDTH]);

	var svg = d3.select('body').append('svg')
		.attr('width', OUTER_WIDTH)
		.attr('height', OUTER_HEIGHT);

	var timelineGroup = svg.append('g')
		.attr('transform', 'translate(' + scale.PANEL_WIDTH +')');

	///// Background /////
	{
		timelineGroup.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', OUTER_WIDTH)
			.attr('height', OUTER_HEIGHT)
			.attr('id', 'background');
	}

	///// Recording sessions /////
	{
		var recordingsGroup = timelineGroup.append('g')
			.attr('id', 'recordings_group');

		var recordings = recordingsGroup.selectAll('rect')
			.data(recordingTimes);

		recordings.enter().append('rect')
			.attr('y', 0)
			.attr('height', OUTER_HEIGHT);

		recordings
			.attr('x', function(d) { return xScale(d['startTime']); })
			.attr('width', function(d) { return xScale(d['endTime']) - xScale(d['startTime']); });

		recordings.exit().remove();
	}

	///// Timeticks /////
	{
		///// Lines /////

		var timeTicksGroup = timelineGroup.append('g')
			.attr('id', 'timeticks_group');

		var timeScale = d3.time.scale()
			.domain(xScale.domain().map(function(t) { return new Date(t * 1000); }))
			.range(xScale.range);

		var timeTicks = timeScale.ticks(d3.time.hour);
		var timeTickFormatFunction = timeScale.tickFormat();

		var timeRules = timeTicksGroup.selectAll('line')
			.data(timeTicks);

		timeRules.enter().append('line')
			.attr('y1', 0)
			.attr('y2', OUTER_HEIGHT);

		timeRules
			.attr('x1', function(d) { return xScale(d.getTime() / 1000); })
			.attr('x2', function(d) { return xScale(d.getTime() / 1000); });
		
		timeRules.exit().remove();

		///// Labels /////

		var timeLabelsGroup = timelineGroup.append('g')
			.attr('font-size', 12);
		
		var timeLabels = timeLabelsGroup.selectAll('text')
			.data(timeTicks);
		
		timeLabels.enter().append('text')
			.attr('y', 10 + 5);
		
		timeLabels.attr('x', function(d) { return xScale(d.getTime() / 1000) + 5; })
			.text(function(d) { return timeTickFormatFunction(d) });
		
		timeLabels.exit().remove();
	}
	
	///// Side panel /////
		var panel = svg.append('g');
	{
		document.addEventListener('scroll', function(e) {
			panel.attr('transform', 'translate(' + window.scrollX + ')');
		});

		var xLabelsGroup = panel.append('g');

		xLabelsGroup.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', scale.PANEL_WIDTH)
			.attr('height', OUTER_HEIGHT)
			.attr('id', 'panel_background');

		panel.append('line')
			.attr('x1', scale.PANEL_WIDTH)
			.attr('x2', scale.PANEL_WIDTH)
			.attr('y1', 0)
			.attr('y2', OUTER_HEIGHT)
			.attr('id', 'panel_border');

		var xLabels = xLabelsGroup.selectAll('text')
			.data(ids);

		xLabels.enter().append('text')
			.attr('x', scale.PANEL_PADDING_LEFT)
			.attr('alignment-baseline', 'middle')
			.style('font-family', 'Verdana')
			.style('font-size', 9);

		xLabels
			.attr('y', function(d) { return yScale(d); })
			.text(function(id) { return contacts[id]._displayName; });
	}

	{
		var overlay = timelineGroup.append('g')
			.attr('class', 'highlight_lines_group');
		var overlay2 = panel.append('g')
			.attr('class', 'highlight_lines_group');

		// 6. Try subscribing to random users

		document.addEventListener('mousemove', function(e) {
			var id = yScaleInverse(e.pageY);
			var y = yScale(id);

			overlay.select('rect.highlight').remove();
			overlay2.select('rect.highlight').remove();

			overlay.append('rect')
				.attr('x', 0)
				.attr('y', y - scale.ROW_HEIGHT / 2)
				.attr('width', OUTER_WIDTH)
				.attr('height', scale.ROW_HEIGHT)
				.attr('class', 'highlight');

			overlay2.append('rect')
				.attr('x', 0)
				.attr('y', y - scale.ROW_HEIGHT / 2)
				.attr('width', scale.PANEL_WIDTH)
				.attr('height', scale.ROW_HEIGHT)
				.attr('class', 'highlight');

			// xLabelsGroup.append('rect')
			// 	.attr('x', 0).attr('y', y)
			// 	.attr('width', window.innerWidth).attr('height', 13)
			// 	.style({'fill': 'green'});
		});

		var selected = overlay.append('rect.selected');
		var selected2 = overlay2.append('rect.selected');

		document.addEventListener('click', function(e) {
			var id = yScaleInverse(e.pageY);
			var y = yScale(id);

			var clickedSelf = selected.attr('y') == y - scale.ROW_HEIGHT / 2;

			selected.remove();
			selected2.remove();

			if (!clickedSelf) {
				selected = overlay.append('rect')
					.attr('x', 0)
					.attr('y', y - scale.ROW_HEIGHT / 2)
					.attr('width', OUTER_WIDTH)
					.attr('height', scale.ROW_HEIGHT)
					.attr('class', 'selected');
				selected2 = overlay2.append('rect')
					.attr('x', 0)
					.attr('y', y - scale.ROW_HEIGHT / 2)
					.attr('width', scale.PANEL_WIDTH)
					.attr('height', scale.ROW_HEIGHT)
					.attr('class', 'selected');
			}
		});
	}

	///// Online times /////
	{
		var linesGroup = timelineGroup.append('g')
			.attr('id', 'online_ranges_group');

		var lines = linesGroup.selectAll('line')
			.data(onlineRanges);

		lines.enter().append('line');

		lines
			.attr('x1', function (d){ return xScale(d[0]['time']); })
			.attr('y1', function (d){ return yScale(d[0]['id']); })
			.attr('x2', function (d){ return xScale(d[1]['time']); })
			.attr('y2', function (d){ return yScale(d[1]['id']); })
			.append('title').text(function (d){
				var name = contacts[d[1]['id']]._displayName;
				var time = new Date(d[0].time * 1000);
				return name + ' at ' +  time;
			});

		lines.exit().remove();
	}
}
