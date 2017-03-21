


Module.register("regimenqueue", {
	
	// module defaults
	defaults: {
		maximumEntries: 10,
		maxTitleLength: 25,
		updateInterval: 30 * 60 * 1000, // update every 30 min
		animationSpeed: 1000,
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

		this.loaded = false;
		this.currentTimerExpectedEnd = null;
		this.regimenQueue = null;

		this.scheduleUpdate(this.config.initialLoadDelay);

		this.regimens = null;

		this.waitingReports = 0;
	},

	// DOM generator for module (Override)
	getDom: function() {

		var wrapper = document.createElement('div');

		var self = this;

		if (!self.loaded) {
			wrapper.innerHTML = "LOADING";
			wrapper.className = "small dimmed";
			return wrapper;
		}

		Log.log('heres the regimenQueue');
		Log.log(self.regimenQueue);

		var table = document.createElement('table');
		table.className = 'small';

		for (var i = 0; i < self.regimenQueue.length && i < self.config.maximumEntries; i++) {
			var currNotification = self.regimenQueue[i];

			var row = document.createElement('tr');
			var titleWrapper = document.createElement('td');
			var timeWrapper = document.createElement('td');

			// titleWrapper.innerHTML = self.shorten(currNotification.med_name, self.config.maxTitleLength);
			titleWrapper.innerHTML = currNotification.med_name;

			var now = moment();

			if (now.format('MM/DD/YYYY') === currNotification.date) {
				timeWrapper.innerHTML = currNotification.time
			} else {
				var daysUntilNotification = Math.abs(now.diff(new Date(currNotification.date), 'days') - 1); 
				// abs because diff is being calculated backwards. -1 bc date will be 0 offset
				// 
				timeWrapper.innerHTML =  daysUntilNotification + (daysUntilNotification > 1 ? ' Days' : ' Day');
			}

			titleWrapper.className = "title";
			timeWrapper.className = "time bright";

			row.appendChild(titleWrapper);
			row.appendChild(timeWrapper);

			table.appendChild(row);

			// Create fade effect.
			if (self.config.fade && self.config.fadePoint < 1) {
				if (self.config.fadePoint < 0) {
					self.config.fadePoint = 0;
				}
				var startingPoint = (self.regimenQueue.length < self.config.maximumEntries ? self.regimenQueue.length : self.config.maximumEntries) * self.config.fadePoint;
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
		var self = this;

		console.log('DELAY IS');
		console.log(delay);

		var nextLoad = self.config.updateInterval; // 30 min
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		console.log('NEXT LOAD');
		console.log(nextLoad);

		var expectedEnd = new Date(Date.now() + nextLoad);
		
		self.currentTimerExpectedEnd = expectedEnd;

		console.log('EXPECTED UPDATE TIME');
		console.log(expectedEnd);
		console.log(self.currentTimerExpectedEnd);

		setTimeout(function() {
			self.updateRegimen(); // updateRegimen
		}, nextLoad);
	},

	updateRegimen: function() {

		var self = this;

		var url = 'modules/default/regimenqueue/tests/sample_regimens.json';

		var retry = false;

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

	notificationReceived: function(notification, payload, sender) {
		var self = this;

		if (notification === 'REGIMEN_QUEUE_POP') {
			// payload is 'YES' or 'NO' or 'MISS'
			var reg_notification = self.regimenQueue.shift();
			// console.log(self.regimenQueue);
			var now = new Date();
			console.log('NOW MINUS EXPECTED DOM REFRESH');
			console.log(self.currentTimerExpectedEnd - now);

			if (self.currentTimerExpectedEnd - now < 10000) {
				console.log('10 seconds from updating anyway');
				self.waitingReports++;
				setTimeout(function() {self.updateReports(reg_notification, payload);}, (self.waitingReports * 10000));
			} else {
				self.updateDom();
				self.updateReports(reg_notification, payload);
			}

		}
	},

	updateReports: function(reg_notification, response) {
		var self = this;

		console.log('notificaiton instance to report on');
		console.log(reg_notification);
		console.log(response);

		if (response === 'YES') {
			console.log('response is yes');
		} else if (response === 'NO') {
			console.log('response is no');
		} else if (response === 'MISS') {
			console.log('response is miss')
			self.sendNotification('MISSED_REGIMEN', reg_notification);
		}

		// go to the corresponding regimen index of self.regimens
		// go into the reports field of that
		// find the matching medication-date-time
		// overwrite it with the corresponding response stamp

		// self.waitingReports--
	},

	processRegimens: function(data) {
		// map containing each date of a patients overall regimen (key), paired
		// with all regimen instances that have a timeslots for that day (values)
		if (!data.regimens) return;

		var self = this;
		var regimenQueue = [];

		self.regimens = data.regimens;

		for (var i = 0; i < self.regimens.length; i++) {
			var reg_date_time_combos = self.regimens[i].date_time_combos;

			for (var key in reg_date_time_combos) {
				if (!reg_date_time_combos.hasOwnProperty(key)) continue;

				var curr_date = key;
				console.log(new Date(curr_date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0));
				// skip the date if it already occured
				if (new Date(curr_date).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) continue;

				var timeslots = reg_date_time_combos[key];
				for (var j = 0; j < timeslots.length; j++) {

					var notificationTime_split = timeslots[j].split(":");

					var hour = parseInt(notificationTime_split[0]);
					var minutes = parseInt(notificationTime_split[1].substring(0,2));
					var period = notificationTime_split[1].substring(2,4);

					if (period === 'am' && hour === 12) hour = 0;
					else if (period === 'pm' && hour !== 12) hour += 12;

					if (new Date(curr_date).setHours(hour, minutes) < new Date()) continue;

					var reg_notification = new Object();
					reg_notification.med_name  = self.regimens[i].med_name;
					reg_notification.date      = curr_date;
					reg_notification.time      = timeslots[j];
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
		console.log('REGIMEN QUEUE AFTER CREATION');
		console.log(regimenQueue);
		this.sendNotification('REGIMEN_QUEUE_CREATED', {data : regimenQueue});
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
		this.scheduleUpdate();
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