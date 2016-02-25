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
			if (contacts[id] == undefined) {
				contacts[id] = {id: id};
			}
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

		for (var i = 0; i < updates.length; i++) {
			var m = updates[i];

			if (!online && m.online) {
				ranges.push([m,null]);
				online = true
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

	///// Set scales /////

	var scale = {
		secondWidth: 0.15,
		rowHeight: 10,
		panelWidth: 120,
		panelPaddingLeft: 5
	};

	var timeExtent = d3.extent(myEntries, function(d) { return d.time; });

	var ids = Object.keys(contacts).sort(function(a, b) { return contacts[a]._displayName.localeCompare(contacts[b]._displayName); });

	var outerWidth = (timeExtent[1] - timeExtent[0]) * scale.secondWidth;
	var outerHeight = ids.length * scale.rowHeight;

	var yScale = d3.scale.ordinal()
		.domain(ids)
		.rangeRoundPoints([0, outerHeight]);

	var yScaleInverse = function(y) {
		var parts  = ids.length - 1;
		var width = outerHeight / parts;

		y += width / 2;
		var index = Math.floor(y / width);
		return ids[index];
	};

	var xScale = d3.scale.linear()
		.domain(timeExtent)
		.rangeRound([0, outerWidth]);

	var svg = d3.select('body').append('svg')
		.attr('width', outerWidth)
		.attr('height', outerHeight)
		.style({'position': 'absolute', 'left': scale.panelWidth, 'top': 0});

	///// Background /////
	{
		svg.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', outerWidth)
			.attr('height', outerHeight)
			.attr('id', 'background');
	}

	///// Recording sessions /////
	{
		var recordingsGroup = svg.append('g')
			.attr('id', 'recordings_group');

		var recordings = recordingsGroup.selectAll('rect')
			.data(recordingTimes);

		recordings.enter().append('rect')
			.attr('y', 0)
			.attr('height', outerHeight);

		recordings
			.attr('x', function(d) { return xScale(d['startTime']); })
			.attr('width', function(d) { return xScale(d['endTime']) - xScale(d['startTime']); });

		recordings.exit().remove();
	}

	///// Online times /////
	{
		var linesGroup = svg.append('g')
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
				var name = contacts[d[1]['id']._displayName];
				var time = new Date(d[0].time * 1000);
				return name + ' at ' +  time;
			});

		lines.exit().remove();
	}

	///// Timeticks /////
	{
		///// Lines /////

		var timeTicksGroup = svg.append('g')
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
			.attr('y2', outerHeight);

		timeRules
			.attr('x1', function(d) { return xScale(d.getTime() / 1000); })
			.attr('x2', function(d) { return xScale(d.getTime() / 1000); });
		
		timeRules.exit().remove();

		///// Labels /////

		var timeLabelsGroup = svg.append('g')
			.attr('font-size', 12);
		
		var timeLabels = timeLabelsGroup.selectAll('text')
			.data(timeTicks);
		
		timeLabels.enter().append('text')
			.attr('y', 10 + 5);
		
		timeLabels.attr('x', function(d) { return xScale(d.getTime() / 1000) + 5; })
			.text(function(d) { return timeTickFormatFunction(d) });
		
		timeLabels.exit().remove();
	}

	///// Debug presence updates /////
	if (false)
	{
		var circles = svg.selectAll('circle').data(myEntries);

		circles.enter().append('circle')
			.attr('r', 3);

		circles
			.attr('cx', function (d) { return xScale(d['time']); })
			.attr('cy', function (d) { return yScale(d['id']); })
			.attr('fill', function (d) { return (d['online']) ? 'green' : 'red'; });

		circles.exit().remove();
	}

	///// Side panel /////
	{
		var panel = d3.select('body').append('svg')
			.attr('width', scale.panelWidth)
			.attr('height', outerHeight)
			.style({'position': 'absolute', 'top': 0, 'left': 0});

		document.addEventListener('scroll', function(e) {
			panel.style('left', window.scrollX);
		});

		var xLabelsGroup = panel.append('g');

		xLabelsGroup.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', scale.panelWidth)
			.attr('height', outerHeight)
			.attr('id', 'panel_background');

		xLabelsGroup.append('line')
			.attr('x1', scale.panelWidth)
			.attr('x2', scale.panelWidth)
			.attr('y1', 0)
			.attr('y2', outerHeight)
			.attr('id', 'panel_border');

		var xLabels = xLabelsGroup.selectAll('text')
			.data(ids);

		xLabels.enter().append('text')
			.attr('x', scale.panelPaddingLeft)
			.attr('alignment-baseline', 'middle')
			.style('font-family', 'Verdana')
			.style('font-size', 9);

		xLabels
			.attr('y', function(d) { return yScale(d); })
			.text(function(id) { return contacts[id]._displayName; });

		var overlay = d3.select('body').append('svg')
			.attr('width', outerWidth)
			.attr('height', outerHeight)
			.attr('id', 'highlight_line_group')
			// To get proper sotring of the different svg layers
			.style('position', 'absolute')
			.style('left', 0);

		// 1. Refactor this part
		// 2. Try drawing using only one svg
		// 3. Make the tooltips work
		// 4. Add tooptips for the users
		// 5. Record for 24 hours
		// 6. Try subscribing to random users

		document.addEventListener('mousemove', function(e) {
			var id = yScaleInverse(e.pageY);
			var y = yScale(id);

			overlay.select('rect.highlight').remove();

			overlay.append('rect')
				.attr('x', 0)
				.attr('y', y - scale.rowHeight / 2)
				.attr('width', outerWidth)
				.attr('height', scale.rowHeight)
				.attr('class', 'highlight');

			// xLabelsGroup.append('rect')
			// 	.attr('x', 0).attr('y', y)
			// 	.attr('width', window.innerWidth).attr('height', 13)
			// 	.style({'fill': 'green'});
		});

		var selected = overlay.append('rect.selected');

		document.addEventListener('click', function(e) {
			var id = yScaleInverse(e.pageY);
			var y = yScale(id);

			var clickedSelf = selected.attr('y') == y - scale.rowHeight / 2;

			selected.remove();

			if (!clickedSelf) {
				selected = overlay.append('rect')
					.attr('x', 0)
					.attr('y', y - scale.rowHeight / 2)
					.attr('width', outerWidth)
					.attr('height', scale.rowHeight)
					.attr('class', 'selected');
			}
		});
	}
}
