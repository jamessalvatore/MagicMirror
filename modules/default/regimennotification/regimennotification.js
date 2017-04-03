


Module.register("regimennotification", {
	
	// module defaults
	defaults: {
		maxTitleLength: 25,
		// updateInterval: 5000, // update every 30 min
		animationSpeed: 1000,
		retryDelay: 2500,
		maxDisplayTime:  5 * 60 * 1000 // (10 seconds) notifications display for a max of 10 minutes (before marking it as 'missed')
	},

	// getHeader
	// getScripts

	getScripts: function() {
		return ["jquery.js", "moment.js"];
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
		this.missedNotificationDisplayed = false;

		this.currentDisplayTimer = null;

		this.hidden = true; // risky trisquit here

		// this.acceptVoiceCommands = false;

		// this.showMedDetails = false;
		
	},

	notificationReceived: function(notification, payload, sender) {
		var self = this;
		if (notification === 'REGIMEN_QUEUE_CREATED') {
			// console.log('RECIEVED NOTIFICATION FROM REGIMEN QUEUE');
			// console.log(payload); // the regimen queue object (array)
			// console.log(sender);
			if (payload.data) self.processRegimenQueue(payload.data);

			// setTimeout(function(){self.sendNotification('SHOW_ALERT', {title: "Hi there", message: "it worked yo", timer: 5000})}, 5000);
			// setTimeout(function(){self.sendNotification('SHOW_ALERT', {title: "asdfff", message: "iasdayo", timer: 5000})}, 6000);

			// parse it, create timers for those that fall within 60 minutes of pop time

		}

		else if (notification === 'VOICE_COMMAND') {

			if (payload.command === 'YES' || payload.command === 'NO') {

				// displaying a missed regimen
				if (self.missedNotificationDisplayed && !self.displayTimeInput) {
					// need to check specific command when a missed regimen is displayed -> leads to separate UI actions
					if (payload.command === 'NO') {
						self.hide(self.config.animationSpeed, function(){
							var payloadToSend = self.constructPayload(payload.command);

							self.sendNotification('MISSED_REGIMEN_POP', payloadToSend);
							self.missedNotificationDisplayed = false;
							self.checkRegimenNotifications(self);
						}, {lockString: self.identifier});
					} else {
						self.displayTimeInput = true;
						self.updateDom(self.config.animationSpeed);
					}
				}
				// displaying a regular regimen
				else if (self.notificationDisplayed) {
					clearTimeout(self.currentDisplayTimer);
					var payloadToSend = self.constructPayload(payload.command);

					self.hide(self.config.animationSpeed, function(){
						self.sendNotification('REGIMEN_QUEUE_POP', payloadToSend);
						self.checkRegimenNotifications(self);
					}, {lockString: self.identifier});
				}					
			}

			// show the medication details 
			else if (payload.command === 'DETAILS') {
				// only show details when viewing a regular (not missed) regimen
				if (!self.missedNotificationDisplayed && self.notificationDisplayed) {
					self.showMedDetails = true;
					self.getMedDetails(self.regimenNotifications[0].med_name);
				}
			}

			// user replied YES when viewing a missed regimen and spoke the corrected time for when the medication was actually taken
			else if (self.missedNotificationDisplayed && payload.isTime && self.displayTimeInput) {
				self.timeInputVal = payload.command;
				self.updateDom(self.config.animationSpeed);
			}

			// user is done making changes to the time in which they took a missed medication
			else if (payload.command === 'FINALIZE') {
				if (self.timeInputVal) {
					clearTimeout(self.currentDisplayTimer);
					console.log('finalizing');
					console.log(self.timeInputVal);
					self.hide(self.config.animationSpeed, function(){
						self.sendNotification('MISSED_REGIMEN_POP', {response: 'YES', response_time: self.timeInputVal});
						self.missedNotificationDisplayed = false;
						self.displayTimeInput = false;
						self.timeInputVal = null;
						self.checkRegimenNotifications(self);
					}, {lockString: self.identifier});
				}
			}
		}

		// user wishes to display the most recently missed regimen (will NOT cause a continual display until the missed queue is finished the same way regular notifications do)
		else if (notification === 'DISPLAY_MISSED_REGIMEN') {

			if (!self.notificationDisplayed) { // dont allow the command to fire if something else (another missed or regular notification) is already displayed
				self.notificationDisplayed = true;
				self.missedNotificationDisplayed = true;

				self.regimenNotifications.push(payload.notification); // add the missed regimen to the display queue, allows for getDom code re-use
				self.displayRegimenNotification();
			}

		}
	},

	constructPayload: function(response) {
		var payload = new Object();
		payload['response'] = response;
		payload['response_time'] = moment().format('hh:mma');

		return payload;
	},

	processRegimenQueue: function(regQueue) {

		var self = this;

		// console.log('PROCESSING REGIMEN QUEUE');

		var now = new Date();
		for (var i = 0; i < regQueue.length; i++) {
			var notificationDate = new Date(regQueue[i].date);

			if (notificationDate.toDateString() === now.toDateString()) {
				// is the notification within 60 min of now?
				var timeslotFormatted = self.processTimeslot(regQueue[i].time);

				notificationDate.setHours(timeslotFormatted[0]);
				notificationDate.setMinutes(timeslotFormatted[1]);

				var millisecondOffset = notificationDate.getTime() - now.getTime();

				if (millisecondOffset <= 3600000 && millisecondOffset > 0) {
					// create a timeout for the notification
					(function(regNotif) {
						// console.log('notification to be set');
						// console.log(regNotif);
						// console.log('time in ms until its ready');
						// console.log(millisecondOffset);

						if (millisecondOffset > 5 * 61 * 1000) { // buy it an extra second (61)
							setTimeout(function() {
								self.sendNotification('SHOW_ALERT', {type: 'notification', title: 'Upcoming Notification in 5 minutes', message: 'Medication: ' + regNotif.med_name});
								// self.sendNotification('PLAY_SOUND', {sound: 'Ceres.wav', delay: 1000});
							}, (millisecondOffset + 1000) - 5 * 60 * 1000);
						}

						setTimeout(function() {
							if(!self.regimenNotifications) self.regimenNotifications = [];
							self.regimenNotifications.push(regNotif);
							if (!self.notificationDisplayed) {
								self.notificationDisplayed = true;
								self.displayRegimenNotification();
							}
						}, 2000); // millisecondOffset + 1000 (add 1000 to compensate for clock delay)
					})(regQueue[i]);

					

					// console.log('THIS TIMESTAMP IS ' + Math.floor((notificationDate.getTime() - now.getTime()) / 60000) + ' minutes away');
				}
			}
		}
	},

	processTimeslot: function(timeslotStr) {
		var notificationTime_split = timeslotStr.split(":");

		var hour = parseInt(notificationTime_split[0]);
		var minutes = parseInt(notificationTime_split[1].substring(0,2));
		var period = notificationTime_split[1].substring(2,4);

		if (period === 'am' && hour === 12) hour = 0;
		else if (period === 'pm' && hour !== 12) hour += 12;

		return [hour, minutes];
	},

	getDom: function() {

		console.log('UPDATING DOM !!!!!!!!!!!!!!!!!!!!');

		var self = this;
		var wrapper = document.createElement('div');

		if (!self.notificationDisplayed) {
			return wrapper;
		}
																	// self.maxDisplayTime / 60000
		// if (!self.timeToRespond) self.timeToRespond = moment().add(10, 'm').format('h:mm:ss a');

		var notificationToDisplay = self.regimenNotifications[0];

		wrapper.className = 'medium bright wrapper';

		var heading = document.createElement('div');
		heading.innerHTML = 'NOTIFICATION';
		heading.className = 'heading';

		var responseTimeContainer = document.createElement('div');
		responseTimeContainer.innerHTML = 'You have until <span class="dimmed">' + self.timeToRespond + '</span> to respond.';
		responseTimeContainer.className = 'options response-time-remaining';

		// ..notification content

		var contentContainer = document.createElement('div');
		contentContainer.className = 'content';

		// ....medication
		var medication = document.createElement('div');

		var medicationLabel = document.createElement('span');
		medicationLabel.innerHTML = 'Medication: ';
		medicationLabel.className = 'dimmed';
		medication.appendChild(medicationLabel);
		var medicationName = document.createElement('span');
		medicationName.innerHTML = notificationToDisplay.med_name; // 
		medication.appendChild(medicationName);

		// ....dosage instructions
		var dosage = document.createElement('div');

		var dosageLabel = document.createElement('span');
		dosageLabel.innerHTML = 'Instructions: ';
		dosageLabel.className = 'dimmed';
		dosage.appendChild(dosageLabel);
		var dosageAmount = document.createElement('span');
		dosageAmount.innerHTML = notificationToDisplay.instructions; // notificationToDisplay.dosageInstructions
		dosage.appendChild(dosageAmount);

		// ..options
		var optionsContainer = document.createElement('div');

		// ....response options (YES or NO)
		var responseOptionsLabel = document.createElement('div');
		responseOptionsLabel.innerHTML = 'Did you take your medication?';
		responseOptionsLabel.className = 'options';
		var responseOptions = document.createElement('div');
		responseOptions.innerHTML = 'YES&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;NO';		
		responseOptions.className = 'response'

		contentContainer.appendChild(medication);
		contentContainer.appendChild(dosage);

		optionsContainer.appendChild(responseOptionsLabel);
		optionsContainer.appendChild(responseOptions);

		wrapper.appendChild(heading);
		wrapper.appendChild(responseTimeContainer);
		wrapper.appendChild(contentContainer);
		wrapper.appendChild(optionsContainer);

		var footerContainer = document.createElement('div');

		if (self.showMedDetails) {
			self.createFooter_details(footerContainer);
		} else if (self.missedNotificationDisplayed) {
			
			// modify the header and content containers when displaying a missed regimen
			heading.innerHTML = 'MISSED NOTIFICATION';
			var originalDateTime = document.createElement('div');
			var dateTimeLabel = document.createElement('span');
			var notifDate = new Date(notificationToDisplay.date);
			dateTimeLabel.innerHTML = '<span class="dimmed">Expected On:&nbsp</span>' + notifDate.toString().split(' ')[0] + ', ' + notificationToDisplay.time;
			
			originalDateTime.appendChild(dateTimeLabel);
			contentContainer.prepend(originalDateTime);

			if (self.displayTimeInput) {
				self.createFooter_timeInput(footerContainer, notificationToDisplay.med_name);			
				$(optionsContainer).remove();
			}
			
		} else {
			footerContainer.innerHTML = 'Say <span class="dimmed">details</span> for more info about ' + '<span class="dimmed">' + notificationToDisplay.med_name + '</span>';
			footerContainer.className = 'options mt-20';
		}

		wrapper.appendChild(footerContainer);

		return wrapper;
	},

	createFooter_details: function(footerContainer) {
		var self = this;
		if (!self.medDetailsResult) {
			footerContainer.innerHTML = 'No details found';
			footerContainer.className = 'options dimmed';
		} else {
			
			var details = self.processMedDetailsResults(self.medDetailsResult);

			var purposeLabel = document.createElement('div');
			purposeLabel.innerHTML = '<span class="dimmed">Purpose: </span>' + details[0];

			var routeLabel = document.createElement('div');
			routeLabel.innerHTML = '<span class="dimmed">Route: </span>'+ details[1];

			var questionsLabel = document.createElement('div');
			questionsLabel.innerHTML = '<span class="dimmed">Questions: </span>' + details[2];

			footerContainer.appendChild(purposeLabel);
			footerContainer.appendChild(routeLabel);
			footerContainer.appendChild(questionsLabel);
			footerContainer.className = 'details';
		}
	},

	createFooter_timeInput: function(footerContainer, medName) {
		var self = this;

		var timeInstructions = document.createElement('div');
		var timeInput = document.createElement('div');

		timeInstructions.className = 'options';		
		timeInput.className = 'small bright time-input';

		if (self.timeInputVal) {

			timeInstructions.innerHTML = 'If the above time is correct, say <span class="dimmed">finalize</span>.<br>Otherwise, please re-state your response.';
			timeInput.innerHTML = self.timeInputVal;
			footerContainer.appendChild(timeInput);
			footerContainer.appendChild(timeInstructions);

		} else {

			timeInstructions.innerHTML = 'When did you take your <span class="dimmed">' + medName + '</span>?';
			footerContainer.appendChild(timeInstructions);
			footerContainer.appendChild(timeInput);
		}
		
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
		self.timeToRespond = moment().add(10, 'm').format('h:mm:ss a');

		console.log('DISPLAYING NOTIFICATION');
		// no notification currently being displayed, so we can now display one
		// if (!self.loaded) self.loaded = true;
		// self.hidden = false; // by-pass here ... show doesnt want to animate for some raisin

		// self.sendNotification('PLAY_SOUND', {sound: 'Rhea.wav', delay: 1000});
		self.updateDom();
		self.show(0, {lockString: self.identifier});

		// setTimeout(function() {self.getMedDetails(self.regimenNotifications[0].med_name)}, 5000);

		self.startNotificationTimeout();
	},

	startNotificationTimeout: function() {
		var self = this;

		console.log('SETTING TIME OUT NOW');
		console.log('Number of minutes on timeout ',self.config.maxDisplayTime / 60000);
		self.currentDisplayTimer = setTimeout(function() {
			console.log('HIDING NOTIFICATION');
			console.log(self.regimenNotifications);

			// disable voice activiation here

			self.hide(self.config.animationSpeed, function(){
				if (self.missedNotificationDisplayed) {
					self.missedNotificationDisplayed = false;
					self.displayTimeInput = false;
					self.timeInputVal = null;
						
					self.sendNotification('MISSED_REGIMEN_POP', {response: 'MISSP'});
					self.checkRegimenNotifications(self);
				}
				else {
					self.sendNotification('REGIMEN_QUEUE_POP', {response: 'MISST'});
					self.checkRegimenNotifications(self);
				}
			}, {lockString: self.identifier}); // callback, options .. callback would be checkDisplayQueue 

		},  (self.missedNotificationDisplayed ? self.config.maxDisplayTime : 2000) ); // hide the notification and log a MISS of no response is given in 10 min
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