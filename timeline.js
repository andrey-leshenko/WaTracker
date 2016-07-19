"use strict";

chrome.runtime.getBackgroundPage(function(bg) {
	bg.getAllEntries(function(entries) {
		bg.getRecordingTimes(function(recordingTimes) {
			bg.getContacts(function(contacts) {
				plot(entries, recordingTimes, contacts);
				window.scrollTo(document.body.scrollWidth, 0);
			});
		});
	});
});

function plot(inputEntries, inputRecordingTimes, inputContacts) {
	let timeExtent = window.parent_displayTimeExtent || [0, Infinity];

	let startTime = timeExtent[0];
	let endTime = timeExtent[1];

	let shownEntries = inputEntries.filter((d) => (d.time > startTime && d.time < endTime));
	let shownRecordingTimes = inputRecordingTimes.filter((d) => (d.startTime < endTime && d.endTime > startTime));

	let data = {
		contacts: fullContacts(inputContacts, shownEntries),
		recordingTimes: shownRecordingTimes,
		onlineRanges: onlineRanges(shownEntries, shownRecordingTimes),
		ids: null,
		timeExtent: null,
	}
	data.ids = Object.keys(data.contacts)
		.sort((a, b) => data.contacts[a].displayName.localeCompare(data.contacts[b].displayName));
	data.timeExtent = [
		d3.min(data.onlineRanges, (d) => d[0].time),
		d3.max(data.onlineRanges, (d) => d[1].time)
	];
	if (data.onlineRanges.length == 0)
		data.timeExtent= [0,0];

	let size = {
		secondWidth: 0.15,
		rowHeight: 10,
		panelWidth: 120,
		panelPaddingLeft: 5,

		timelineWidth: null,
		outerWidth: null,
		outerHeight: null,
	}
	size.timelineWidth = (data.timeExtent[1] - data.timeExtent[0]) * size.secondWidth;
	size.outerWidth = size.timelineWidth + size.panelWidth;
	size.outerHeight = data.ids.length * size.rowHeight;

	let scale = {
		x: d3.scale.linear()
			.domain(data.timeExtent)
			.rangeRound([0, size.timelineWidth]),
		y: d3.scale.ordinal()
			.domain(data.ids)
			.rangeRoundPoints([0, size.outerHeight]),
		yInverse: function(y) {
			let parts  = data.ids.length - 1;
			let width = size.outerHeight / parts;

			y += width / 2;
			let index = Math.floor(y / width);
			return data.ids[index];
		},
		time: d3.time.scale()
			.domain(data.timeExtent.map((t) => new Date(t * 1000)))
			.range([0, size.timelineWidth])
	}

	let svg = d3.select('body').append('svg')
		.attr('width', size.outerWidth)
		.attr('height', size.outerHeight);

	let groups = {};

	groups.timeline					= svg.append('g');
	groups.timeline_background		= groups.timeline.append('g').attr('id', 'background_group');
	groups.timeline_recordings		= groups.timeline.append('g').attr('id', 'recordings_group');
	groups.timeline_timeticks		= groups.timeline.append('g').attr('id', 'timeticks_group')
	groups.timeline_timelabels		= groups.timeline.append('g').attr('id', 'timelabels_group');
	groups.timeline_highlight		= groups.timeline.append('g').attr('id', 'timeline_highlight_group');
	groups.timeline_onlineranges	= groups.timeline.append('g').attr('id', 'online_ranges_group');;

	groups.panel			= svg.append('g');
	groups.panel_background = groups.panel.append('g');
	groups.panel_highlight 	= groups.panel.append('g').attr('id', 'panel_highlight_group');
	groups.panel_labels 	= groups.panel.append('g').attr('id', 'panel_labels_group');

	groups.timeline_background.append('rect')
		.attr('x', 0)
		.attr('y', 0)
		.attr('width', size.outerWidth)
		.attr('height', size.outerHeight);

	groups.timeline_recordings.selectAll('rect')
		.data(data.recordingTimes).enter().append('rect')
		.attr('y', 0)
		.attr('height', size.outerHeight)
		.attr('x', (d) => scale.x(d['startTime']))
		.attr('width', (d) => (scale.x(d['endTime']) - scale.x(d['startTime'])));

	groups.timeline_onlineranges.selectAll('line')
		.data(data.onlineRanges).enter().append('line')
		.attr('x1', (d) => scale.x(d[0]['time']))
		.attr('y1', (d) => scale.y(d[0]['id']))
		.attr('x2', (d) => scale.x(d[1]['time']))
		.attr('y2', (d) => scale.y(d[1]['id']))
		.append('title').text(function (d){
			let name = data.contacts[d[1]['id']].displayName;
			let time = new Date(d[0].time * 1000);
			return name + ' at ' +  time;
		});

	{
		let timeTicks = scale.time.ticks(d3.time.hour);

		groups.timeline_timeticks.selectAll('line')
			.data(timeTicks).enter().append('line')
			.attr('y1', 0)
			.attr('y2', size.outerHeight)
			.attr('x1', (d) => scale.x(d.getTime() / 1000))
			.attr('x2', (d) => scale.x(d.getTime() / 1000));

		let timeTickFormatFunction = scale.time.tickFormat();

		groups.timeline_timelabels.selectAll('text')
			.data(timeTicks).enter().append('text')
			.attr('y', 10 + 5)
			.attr('x', (d) => (scale.x(d.getTime() / 1000) + 5))
			.text((d) => timeTickFormatFunction(d));
	}
	
	{
		groups.panel_background.append('rect')
			.attr('x', 0)
			.attr('y', 0)
			.attr('width', size.panelWidth)
			.attr('height', size.outerHeight)
			.attr('id', 'panel_background');

		groups.panel_background.append('line')
			.attr('x1', size.panelWidth)
			.attr('x2', size.panelWidth)
			.attr('y1', 0)
			.attr('y2', size.outerHeight)
			.attr('id', 'panel_border');

		groups.panel_labels.selectAll('text')
			.data(data.ids).enter().append('text')
			.attr('x', size.panelPaddingLeft)
			.attr('y', (d) => scale.y(d))
			.text((id) => data.contacts[id].displayName)
			.attr('alignment-baseline', 'middle');
	}

	{
		groups.timeline.attr('transform', 'translate(' + size.panelWidth +')');

		document.addEventListener('scroll', function(e) {
			groups.panel.attr('transform', 'translate(' + window.scrollX + ')');
		});
	}

	{
		const hidden = -1024;

		let sel_timeline 		= groups.timeline_highlight	.append('rect');
		let sel_panel 			= groups.panel_highlight	.append('rect');
		let highlight_timeline 	= groups.timeline_highlight	.append('rect');
		let highlight_panel		= groups.panel_highlight	.append('rect');

		for (let elem of [sel_timeline, sel_panel, highlight_timeline, highlight_panel])
			elem.attr('x', 0)
				.attr('y', hidden)
				.attr('height', size.rowHeight)
				.attr('class', 'highlight');

		for (let elem of [sel_timeline, highlight_timeline])
			elem.attr('width', size.timelineWidth);

		for (let elem of [sel_panel, highlight_panel])
			elem.attr('width', size.panelWidth);

		document.addEventListener('mouseout', function(e) {
			highlight_timeline.attr('y', hidden);
			highlight_panel.attr('y', hidden);
		});

		document.addEventListener('mousemove', function(e) {
			let y = scale.y(scale.yInverse(e.pageY)) - size.rowHeight / 2;

			highlight_timeline.attr('y', y);
			highlight_panel.attr('y', y);
		});

		document.addEventListener('click', function(e) {
			let y = scale.y(scale.yInverse(e.pageY)) - size.rowHeight / 2

			let clickedSelf = sel_timeline.attr('y') == y;
			if (clickedSelf)
				y = hidden;

			sel_timeline.attr('y', y);
			sel_panel.attr('y', y);
		});
	}
}

function fullContacts(contacts, entries) {

	var newContacts = {};

	for (let entry of entries) {
		newContacts[entry.id] = {id: entry.id};
	}

	for (let id in contacts) {
		newContacts[id] = contacts[id];
	}

	for (let id in newContacts) {
		newContacts[id].displayName = newContacts[id].name || id;
	}

	return newContacts;
}

function onlineRanges(entries, recordingTimes) {

	let myEntries = entries.slice();

	let nestedById = d3.nest()
		.key(function(d) { return d.id; })
		.sortKeys(d3.ascending)
		.entries(myEntries);

	let online = d3.merge(nestedById.map(function(d) {
		let updates = d.values;
		let ranges = [];
		let online = false;
		let onlineMessage = null;

		for (let recording of recordingTimes) {
			updates.push({
				id: d.key,
				time: recording['endTime'],
				online: false,
			});
		}

		updates.sort((a, b) => (a.time - b.time));

		for (let m of updates) {
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

	return online;
}