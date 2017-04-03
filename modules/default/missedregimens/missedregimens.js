


Module.register("missedregimens", {
	
	// module defaults
	defaults: {
		maximumEntries: 10,
		maxTitleLength: 25,
		animationSpeed: 1000,
		fade: true,
		fadePoint: 0.25,
		initialLoadDelay: 0,
		expirationLength: 10 * 60 * 1000 // 12 hrs
	},

	// getHeader: function() {
	// 	return this.data.header;
	// },

	// required modules scripts
	getScripts: function() {
		return ["moment.js"]
	},

	// module-specific start method (Override)
	start: function() {
		Log.log("Starting module: " + this.name);

		moment.locale(config.language); // set the locale (english)

		this.loaded = false;
		this.missedRegimens = null;
	},

	getDom: function() {

		var self = this;

		var wrapper = document.createElement('div');

		if (self.missedRegimens) {
			console.log('creating missed regimens table');
			var header = document.createElement('header');
			header.innerHTML = 'Missed Regimens';
			header.className = 'header-small';

			var table = document.createElement('table');
			table.className = 'small';

			for (var i = 0; i < self.missedRegimens.length; i++) {
				var currMissed = self.missedRegimens[i].notification;

				var row = document.createElement('tr');
				var titleWrapper = document.createElement('td');
				var expirationDateWrapper = document.createElement('td');

				titleWrapper.innerHTML = currMissed.med_name;
				titleWrapper.className = 'title';

				expirationDateWrapper.innerHTML = self.missedRegimens[i].expirationDate.format('h:mma');
				expirationDateWrapper.className = 'bright';

				row.appendChild(titleWrapper);
				row.appendChild(expirationDateWrapper);

				table.appendChild(row);

				// create fade effect
				if (self.config.fade && self.config.fadePoint < 1) {
					if (self.config.fadePoint < 0) {
						self.config.fadePoint = 0;
					}
					var startingPoint = (self.missedRegimens.length < self.config.maximumEntries ? self.missedRegimens.length : self.config.maximumEntries) * self.config.fadePoint;
					var steps = (self.missedRegimens.length < self.config.maximumEntries ? self.missedRegimens.length : self.config.maximumEntries) - startingPoint;
					if (i >= startingPoint) {
						var currentStep = i - startingPoint;
						row.style.opacity = 1 - (1 / steps * currentStep);
					}
				}

			}

			wrapper.appendChild(header);
			wrapper.appendChild(table);
		}

		return wrapper;
	},

	removeExpiredMissedRegimen: function(missed) {
		console.log('REMOVING EXPIRED REGIMEN');
		var self = this;

		for (var i = 0; i < self.missedRegimens.length; i++) {
			if (self.missedRegimens[i].notification === missed) {
				console.log(missed);
				var missed_notif = self.missedRegimens.splice(i, 1)[0].notification;  					  // remove the missed regimen instance
				console.log(self.missedRegimens);

				if (self.missedRegimens.length === 0) self.missedRegimens = null;
				self.updateDom(self.config.animationSpeed);
				self.sendNotification('MISSED_REGIMEN_AMEND', {notification: missed_notif, response: 'MISSP'});
				return;
			}
		}
	},

	notificationReceived(notification, payload, sender) {
		var self = this;

		if (notification === 'NEW_MISSED_REGIMEN') {
			if (!self.missedRegimens) self.missedRegimens = [];

			// var now = moment();
			// now.add(12, 'hour');

			var missedInstance = {
				notification: payload.notification,
				expirationTimer: setTimeout(function(){
					self.removeExpiredMissedRegimen(payload.notification);
				}, self.config.expirationLength), // change to expirationLength eventually
				expirationDate: moment().add(12, 'hour')
			};

			self.missedRegimens.push(missedInstance);
			self.updateDom(self.config.animationSpeed);
		}

		else if (notification === 'VOICE_COMMAND') {
			if (payload.command === 'VIEW MISSED REGIMEN') {
				// send notification to regimenNotification ('DISPLAY_MISSED_REGIMEN')
				if (self.missedRegimens && self.missedRegimens.length > 0) {
					clearTimeout(self.missedRegimens[0].expirationTimer); // clear the timer
					self.sendNotification('DISPLAY_MISSED_REGIMEN', {notification: self.missedRegimens[0].notification})
				}
			}
		}

		else if (notification === 'MISSED_REGIMEN_POP') {
			console.log('POPPING MISSED REGIMEN');
			var missed_notif = self.missedRegimens.shift();
			payload['notification'] = missed_notif.notification; // add the regimen to update to the payload

			if (self.missedRegimens.length === 0) self.missedRegimens = null;
			self.updateDom(self.config.animationSpeed);
			self.sendNotification('MISSED_REGIMEN_AMEND', payload); // keep payload from params -> contains the response & response time
		}

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