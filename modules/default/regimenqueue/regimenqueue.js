


Module.register("regimenqueue", {
	
	// module defaults
	defaults: {
		maximumEntries: 10,
		maxTitleLength: 25,
		updateInterval: 5000, // update every 30 min
		animationSpeed: 2000,
		fade: true,
		fadePoint: 0.25,
		initialLoadDelay: 0,

		retryDelay: 2500
	},

	// required module styles
	// getStyles: function() {
	// 	return ["regimenqueue.css"] // maybe add fontawesome.css
	// },

	getHeader: function() {
		return this.data.header;
	},

	// required modules scripts
	getScripts: function() {
		return ["moment.js"]
	},

	// required translations (not using any, so return false)
	getTranslations: function() {
		return false;
	},

	// module-specific start method (Override)
	start: function() {
		Log.log("Starting module: " + this.name);

		moment.locale(config.language); // set the locale (english)

		this.regimenNotifications = null;
		this.loaded = false;
		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	// DOM generator for module (Override)
	getDom: function() {

		var wrapper = document.createElement('div');

		if (!this.loaded) {
			wrapper.innerHTML = "LOADING";
			wrapper.className = "small dimmed";
			return wrapper;
		}

		Log.log('heres the regimenQueue');
		Log.log(this.regimenQueue);

		var self = this;

		var table = document.createElement('table');
		table.className = 'small';

		for (var i = 0; i < self.regimenQueue.length && i < self.config.maximumEntries; i++) {
			var currNotification = self.regimenQueue[i];

			var row = document.createElement('tr');
			var titleWrapper = document.createElement('td');
			var timeWrapper = document.createElement('td');

			titleWrapper.innerHTML = self.shorten(currNotification.med_name, self.config.maxTitleLength);
			timeWrapper.innerHTML = currNotification.date;

			titleWrapper.className = "title";
			timeWrapper.className = "time bright";

			row.appendChild(titleWrapper);
			row.appendChild(timeWrapper);

			table.appendChild(row);

			// Create fade effect.
			if (this.config.fade && this.config.fadePoint < 1) {
				if (this.config.fadePoint < 0) {
					this.config.fadePoint = 0;
				}
				var startingPoint = (self.regimenQueue.length < self.config.maximumEntries ? self.regimenQueue.length : self.config.maximumEntries) * this.config.fadePoint;
				var steps = (self.regimenQueue.length < self.config.maximumEntries ? self.regimenQueue.length : self.config.maximumEntries) - startingPoint;
				if (i >= startingPoint) {
					var currentStep = i - startingPoint;
					row.style.opacity = 1 - (1 / steps * currentStep);
				}
			}
		}

		return table;
	},

	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval; // 30 min
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		setTimeout(function() {
			self.updateRegimen(); // updateRegimen
		}, nextLoad);
	},

	updateRegimen: function() {

		var self = this;

		var url = 'modules/default/regimenqueue/tests/sample_regimens.json';
		var retry = true;

		var regimenRequest = new XMLHttpRequest();
		regimenRequest.open("GET", url, true);
		regimenRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processRegimens(JSON.parse(this.response));
				} else if (this.status === 401) {
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": 401 ERROR.");
					retry = true;
				} else {
					Log.error(self.name + ": Could not fetch patient regimen.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		regimenRequest.send();
	},

	getNearestDate: function() {
		var latest_date = null;

		for (var key in this.regimenNotifications) {
			if (!latest_date) latest_date = key;
			else if (new Date(key) < new Date(latest_date)) latest_date = key;
		}

		return latest_date;
	},

	processRegimens: function(data) {
		// map containing each date of a patients overall regimen (key), paired
		// with all regimen instances that have a timeslots for that day (values)
		if (!data.regimens) return;

		var regimenQueue = [];
		var patientRegimens = data.regimens;

		// fill map keyset with each date and 
		for (var i = 0; i < patientRegimens.length; i++) {
			var reg_date_time_combos = patientRegimens[i].date_time_combos;

			for (var j = 0; j < reg_date_time_combos.length; j++) {
				var curr_date_time_combo = reg_date_time_combos[j].split(" ");
				var curr_date = curr_date_time_combo.shift();   // remove head element from list anzd store it
				if (new Date(curr_date) < new Date()) continue; // skip past dates in the regimen

				for (var k = 0; k < curr_date_time_combo.length; k++) {     // remainder of the list will just be the times for that date
					var reg_notification = new Object();
					reg_notification.med_name  = patientRegimens[i].med_name;
					reg_notification.date      = curr_date;
					reg_notification.time      = curr_date_time_combo[k];
					reg_notification.reg_index =  i;

					regimenQueue.push(reg_notification);
				}

			}
		}

		regimenQueue.sort(function(a,b) {
			// add extra space between the time and time-period (9:00am -> 9:00 am) in order to satisfy Date constructor
			var a_time_formatted = a.time.slice(0, a.time.length-2) + ' ' + a.time.slice(a.time.length-2);
			var b_time_formatted = b.time.slice(0, b.time.length-2) + ' ' + b.time.slice(b.time.length-2);
			return new Date(a.date + ' ' + a_time_formatted) - new Date(b.date + ' ' + b_time_formatted);
		});

		this.regimenQueue = regimenQueue;
		// might need to do this.show() -> see currrentweather
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},

	/* shorten(string, maxLength)
	 * Shortens a sting if it's longer than maxLenthg.
	 * Adds an ellipsis to the end.
	 *
	 * argument string string - The string to shorten.
	 * argument maxLength number - The max lenth of the string.
	 *
	 * return string - The shortened string.
	 */
	shorten: function (string, maxLength) {
		if (string.length > maxLength) {
			return string.slice(0, maxLength) + "&hellip;";
		}

		return string;
	},

});