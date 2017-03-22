


Module.register("missedregimens", {
	
	// module defaults
	defaults: {
		maximumEntries: 10,
		maxTitleLength: 25,
		animationSpeed: 1000,
		fade: true,
		fadePoint: 0.25,
		initialLoadDelay: 0,
	},

	// getHeader: function() {
	// 	return this.data.header;
	// },

	// required modules scripts
	getScripts: function() {
		return ["moment.js"]
	},

	getStyles: function() {
		return ["missedregimens.css"];
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
				var currMissed = self.missedRegimens[i];

				var row = document.createElement('tr');
				var titleWrapper = document.createElement('td');

				titleWrapper.innerHTML = currMissed.med_name;
				titleWrapper.className = 'title';

				row.appendChild(titleWrapper);

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

	notificationReceived(notification, payload, sender) {
		var self = this;

		if (notification === 'MISSED_REGIMEN') {
			if (!self.missedRegimens) self.missedRegimens = [];

			self.missedRegimens.push(payload);
			self.updateDom();
		}

		if (notification === 'VOICE_COMMAND') {
			if (payload.data === 'SHOW MISSED REGIMENS') {
				// send notification to regimenNotification ('DISPLAY_MISSED_REGIMEN')
			}
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