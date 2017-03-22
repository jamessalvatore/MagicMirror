


Module.register("regimennotification", {
	
	// module defaults
	defaults: {
		maxTitleLength: 25,
		// updateInterval: 5000, // update every 30 min
		animationSpeed: 1000,
		retryDelay: 2500,
		maxDisplayTime: 10 * 1000 // (10 seconds) notifications display for a max of 10 minutes (before marking it as 'missed')
	},

	// getHeader
	// getScripts

	getScripts: function() {
		return ["jquery.js"];
	},

	getStyles: function() {
		return ["regimennotification.css"];
	},
	
	getTranslations: function() {
		return false;
	},

	start: function() {
		Log.log("Starting module: " + this.name);

		this.regimenNotifications = null;

		this.notificationDisplayed = false;

		this.currentDisplayTimer = null;

		this.hidden = true; // risky trisquit here

		this.acceptVoiceCommands = false;

		// this.showMedDetails = false;
		
	},

	notificationReceived: function(notification, payload, sender) {
		var self = this;
		if (notification === 'REGIMEN_QUEUE_CREATED') {
			// console.log('RECIEVED NOTIFICATION FROM REGIMEN QUEUE');
			// console.log(payload); // the regimen queue object (array)
			// console.log(sender);
			if (payload.data) self.processRegimenQueue(payload.data);

			// parse it, create timers for those that fall within 60 minutes of pop time

		}

		else if (notification === 'VOICE_COMMAND') {

			if (self.acceptVoiceCommands) {
				if (payload.data === 'YES' || payload.data === 'NO') {
					clearTimeout(self.currentDisplayTimer);
					self.hide(self.config.animationSpeed, function(){
						self.sendNotification('REGIMEN_QUEUE_POP', {data: payload.data});
						self.checkRegimenNotifications(self);
					}, {lockString: self.identifier});
					
				}

				else if (payload.data === 'DETAILS') {
					self.showMedDetails = true;
					self.getMedDetails(self.regimenNotifications[0].med_name);
				}
			}
		}
	},

	processRegimenQueue: function(regQueue) {

		var self = this;

		console.log('PROCESSING REGIMEN QUEUE');

		var now = new Date();
		for (var i = 0; i < regQueue.length; i++) {
			var notificationDate = new Date(regQueue[i].date);

			if (notificationDate.toDateString() === now.toDateString()) {
				// is the notification within 60 min of now?
				var notificationTime_split = regQueue[i].time.split(":");

				var hour = parseInt(notificationTime_split[0]);
				var minutes = parseInt(notificationTime_split[1].substring(0,2));
				var period = notificationTime_split[1].substring(2,4);

				if (period === 'am' && hour === 12) hour = 0;
				else if (period === 'pm' && hour !== 12) hour += 12;

				notificationDate.setHours(hour);
				notificationDate.setMinutes(minutes);

				var millisecondOffset = notificationDate.getTime() - now.getTime();

				if (millisecondOffset <= 3600000 && millisecondOffset > 0) {
					// create a timeout for the notification
					(function(regNotif) {
						console.log('notification to be set');
						console.log(regNotif);
						console.log('time in ms until its ready');
						console.log(millisecondOffset);
						setTimeout(function() {
							if(!self.regimenNotifications) self.regimenNotifications = [];
							self.regimenNotifications.push(regNotif);
							console.log('PUSHING TO DISPLAY QUEUE');
							console.log(regNotif);
							console.log(self.regimenNotifications);
							// self.displayRegimenNotification();
							if (!self.notificationDisplayed) {
								self.notificationDisplayed = true;
								self.displayRegimenNotification();
							}
						}, millisecondOffset + 1000); // add 1000 to compensate for clock delay
					})(regQueue[i]);

					// console.log('THIS TIMESTAMP IS ' + Math.floor((notificationDate.getTime() - now.getTime()) / 60000) + ' minutes away');
				}
			}
		}
	},

	getDom: function() {

		console.log('UPDATING DOM !!!!!!!!!!!!!!!!!!!!');

		var self = this;
		var wrapper = document.createElement('div');

		if (!self.notificationDisplayed) {
			// console.log('NOT DISPLAYING A NOTIFICATION');
			// console.log('checking if hidden worked');
			// console.log(self.hidden);
			return wrapper;
		}

		var notificationToDisplay = self.regimenNotifications[0];
		// console.log('regimenNotifications after pop');
		// console.log(self.regimenNotifications);
		// console.log('notificaiton to display');
		// console.log(notificationToDisplay);

		wrapper.className = 'medium bright wrapper';

		var heading = document.createElement('div');
		heading.innerHTML = 'NOTIFICATION';
		heading.className = 'heading';

		var contentContainer = document.createElement('div');
		contentContainer.className = 'content';

		var medication = document.createElement('div');

		var medicationLabel = document.createElement('span');
		medicationLabel.innerHTML = 'Medication: ' + '&nbsp;';
		medicationLabel.className = 'dimmed';
		medication.appendChild(medicationLabel);

		var medicationName = document.createElement('span');
		medicationName.innerHTML = notificationToDisplay.med_name; // 
		medication.appendChild(medicationName);

		var dosage = document.createElement('div');

		var dosageLabel = document.createElement('span');
		dosageLabel.innerHTML = 'Instructions: ';
		dosageLabel.className = 'dimmed';
		dosage.appendChild(dosageLabel);

		var dosageAmount = document.createElement('span');
		dosageAmount.innerHTML = 'Take 2 Pills'; // notificationToDisplay.dosageInstructions
		dosage.appendChild(dosageAmount);

		var optionsContainer = document.createElement('div');

		var responseOptionsLabel = document.createElement('div');
		responseOptionsLabel.innerHTML = 'Did you take your medication?';
		responseOptionsLabel.className = 'options';

		var responseOptions = document.createElement('div');
		responseOptions.innerHTML = 'YES&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;NO';		
		responseOptions.className = 'response'

		var detailsContainer = document.createElement('div');

		if (self.showMedDetails) {
			console.log('SHOWING MEDICATION DETAILS');

			if (!self.medDetailsResult) {
				detailsContainer.innerHTML = 'No details found';
				detailsContainer.className = 'options dimmed';
			} else {
				
				var details = self.processMedDetailsResults(self.medDetailsResult);

				var purposeLabel = document.createElement('div');
				purposeLabel.innerHTML = '<span class="dimmed">Purpose: </span>' + details[0];

				var routeLabel = document.createElement('div');
				routeLabel.innerHTML = '<span class="dimmed">Route: </span>'+ details[1];

				var questionsLabel = document.createElement('div');
				questionsLabel.innerHTML = '<span class="dimmed">Questions: </span>' + details[2];

				detailsContainer.appendChild(purposeLabel);
				detailsContainer.appendChild(routeLabel);
				detailsContainer.appendChild(questionsLabel);
				detailsContainer.className = 'details';
			}
		} else {
			detailsContainer.innerHTML = 'Say <span class="dimmed">details</span> for more info about ' + 
									  	 '<span class="dimmed">' + notificationToDisplay.med_name + '</span>';
			detailsContainer.className = 'options';
		}

		contentContainer.appendChild(medication);
		contentContainer.appendChild(dosage);

		optionsContainer.appendChild(responseOptionsLabel);
		optionsContainer.appendChild(responseOptions);

		wrapper.appendChild(heading);
		wrapper.appendChild(contentContainer);
		wrapper.appendChild(optionsContainer);
		wrapper.appendChild(detailsContainer);

		return wrapper;
	},

	processMedDetailsResults: function(result) {
		var self = this;

		var purpose = '';
		if (result.purpose) {
			purpose = result.purpose[0];
			var purposeStrList = purpose.split(' ');

			if (purposeStrList[0].toLowerCase() === 'purpose') {
				purposeStrList.shift();
				purposeStrList[0] = purposeStrList[0].charAt(0).toUpperCase() + purposeStrList[0].slice(1);
				purpose = purposeStrList.join(' ');
			}

			purpose = self.shorten(purpose, 50);
		}

		var route = result.openfda.route ? result.openfda.route[0] : '';
		var questions = result.questions ? result.questions[0] : '';

		return [purpose, route, questions];
	},

	getMedDetails: function(medName) {
		var self = this;
		var url = 'https://api.fda.gov/drug/label.json?search=openfda.brand_name:' + medName;

		self.showMedDetails = true; // to be removed

		$.getJSON(url, function(data) {
			self.medDetailsResult = data.results[0];
			self.updateDom(self.config.animationSpeed);
		})
		.fail(function(event) {
			console.log('failed');
			console.log(event);
			self.medDetailsResult = null;
			self.updateDom(self.config.animationSpeed);
		});
	},

	displayRegimenNotification: function() {
		var self = this;

		console.log('DISPLAYING NOTIFICATION');
		// no notification currently being displayed, so we can now display one
		// if (!self.loaded) self.loaded = true;
		// self.hidden = false; // by-pass here ... show doesnt want to animate for some raisin
		self.updateDom();
		self.show(0, function(){console.log('SHOWED IT');}, {lockString: self.identifier});

		setTimeout(function() {self.getMedDetails(self.regimenNotifications[0].med_name)}, 5000);

		self.startNotificationTimeout();
	},

	startNotificationTimeout: function() {
		var self = this;
		self.currentDisplayTimer = setTimeout(function() {
			console.log('HIDING NOTIFICATION');
			console.log(self.regimenNotifications);

			// disable voice activiation here

			self.hide(self.config.animationSpeed, function(){
				self.sendNotification('REGIMEN_QUEUE_POP', 'MISS');
				self.checkRegimenNotifications(self);
			}, {lockString: self.identifier}); // callback, options .. callback would be checkDisplayQueue 

		}, self.config.maxDisplayTime);
	},

	// check if another notification is waiting to be displayed
	checkRegimenNotifications: function(module) {
		var self = module;

		self.showMedDetails = false;
		self.medDetailsResult = null;

		self.regimenNotifications.shift();

		// self.sendNotification('REGIMEN_QUEUE_POP', 'YES'); // to be removed

		console.log('CHECKING FOR NOTIFICATIONS TO DISPLAY');
		console.log(self.regimenNotifications);

		if (self.regimenNotifications.length !== 0) { // more notifications waiting to be displayed
			console.log('MORE NOTIFICATIONS TO DISPLAY');

			self.displayRegimenNotification();
			
		} else {
			self.notificationDisplayed = false;

		}
	},

	shorten: function (string, maxLength) {
		if (string.length > maxLength) {
			return string.slice(0, maxLength) + "&hellip;";
		}

		return string;
	},


})