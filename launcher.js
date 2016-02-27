"use strict";

let pageIds = [
	'button_record',
	'button_online',
	'button_timeline',
	'form_timeline',
	'select_display_mode',
	'container_select_last',
	'container_select_range',
];

let page = {};

for (var id of pageIds) {
	page[id] = document.getElementById(id);
}

function createWindow(filename, outerBounds, callback) {
	chrome.app.window.create(filename, {id: filename, outerBounds: outerBounds}, callback);
}

page.button_record.addEventListener('click', function() {
	createWindow('record.html', { 'width': 900, 'height': 900 });
});

page.button_online.addEventListener('click', function() {
	createWindow('online.html', { 'width': 900, 'height': 750 });
});

page.button_timeline.addEventListener('click', function() {
	let displayExtent = getDisplayExtent();

	createWindow('timeline.html', { 'width': 900, 'height': 750 },
		function(createdWindow) {
			createdWindow.contentWindow.parent_displayTimeExtent = displayExtent;
		});
});

function getDisplayExtent() {
	let form = page.form_timeline;
	let displayMode = page.select_display_mode.value;

	let startTime, endTime;

	if (displayMode == 'anytime') {
		startTime = 0;
		endTime = Infinity;
	}
	else if (displayMode == 'last') {
		let interval = parseInterval(form.elements.displayLastWhat.value)

		endTime = Math.floor(new Date().getTime() / 1000);
		startTime = endTime - interval;

		function parseInterval(lastWhat) {
			const day = 60 * 60 * 24;

			switch (lastWhat) {
				case 'day': 	return day;
				case 'week': 	return day * 7;
				case 'month': 	return day * 31;
				case 'year': 	return day * 365;
			}
		}
	}
	else if (displayMode == 'range') {
		startTime = 0;
		endTime = Infinity;

		if (form.startDate.value)
			startTime = parseDateToSeconds(form.startDate.value);
		if (form.endDate.value)
			endTime = parseDateToSeconds(form.endDate.value);

		if (startTime > endTime) {
			let temp = endTime;
			endTime = startTime;
			startTime = temp;
		}

		function parseDateToSeconds(dateString) {
			return Math.floor(new Date(dateString) / 1000);
		}
	}

	return [startTime, endTime];
}

displayRightFormElements();
page.select_display_mode.addEventListener('change', displayRightFormElements);

function displayRightFormElements() {
	function setDisplay(elem, visible) {
		elem.style.display = visible ? 'initial' : 'none';
	}

	let displayMode = page.select_display_mode.value;

	setDisplay(page.container_select_last, displayMode == 'last');
	setDisplay(page.container_select_range, displayMode == 'range');
}

makePresistentForm(page.form_timeline, 'timeline_display_form');

function makePresistentForm(form, formName) {
	function getFormValues(form) {
		let values = {};

		for (let i = 0; i < form.elements.length; i++) {
			let elem = form.elements[i];
			if (elem.name)
				values[elem.name] = elem.value;
		}

		return values;
	}

	function setFormValues(form, values) {
		console.log(formName + ' restoring saved state: ', values);

		for (let elemName in values) {
			let elem = form.elements.namedItem(elemName);
			if (elem) {
				elem.value = values[elemName];
				elem.dispatchEvent(new Event('change'));
			}
		}
	}

	form.addEventListener('change', function(e) {
		console.log(formName + ' saved to local storage: ', getFormValues(form));
		chrome.storage.local.set({[formName]: getFormValues(form)});
	});

	chrome.storage.local.get(formName, function(values) {
		setFormValues(form, values[formName]);
	});
}
