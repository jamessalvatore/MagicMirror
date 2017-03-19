/* Magic Mirror Config Sample
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

var config = {
	port: 8080,
	ipWhitelist: ["127.0.0.1", "::ffff:127.0.0.1", "::1"],

	language: 'en',
	timeFormat: 12,
	units: 'metric',

	modules: [
		{
			module: 'alert',
		},
		{
			module: "updatenotification",
			position: "top_bar"
		},
		{
			module: 'clock',
			position: 'top_left'
		},
		{
			module: 'regimenqueue', // calendar
			header: 'Upcoming Notifications',
			position: 'top_left',
			// config: {
			// 	calendars: [
			// 		{
			// 			symbol: 'calendar-check-o ',
			// 			url: 'webcal://www.calendarlabs.com/templates/ical/US-Holidays.ics'
			// 		}
			// 	]
			// }
		},
		// will this conflict with regimenqueue position?
		{
			module: 'missedregimens',
			// header: 'Missed Notifications',
			position: 'top_left'
		},

		{
			module: 'regimennotification', // compliments
			position: 'middle_center'
		},
		{
			module: 'currentweather',
			position: 'top_right',
			config: {
				// location: 'New York',
				// locationID: '5128581',  //ID from http://www.openweathermap.org
				appid: 'ed44dcd356dd34ddd7685793f597b2c7',
				units: 'imperial',
				roundTemp: true,
				lang: 'us'
			}
		},
		{
			module: 'weatherforecast',
			position: 'top_right',
			header: 'Weather Forecast',
			config: {
				location: 'New York',    // New York
				locationID: '5128581',  //ID from http://www.openweathermap.org  5128581
				appid: 'ed44dcd356dd34ddd7685793f597b2c7',
				units: 'imperial',
				roundTemp: true
			}
		},
		// {
		// 	module: 'newsfeed',
		// 	position: 'bottom_bar',
		// 	config: {
		// 		feeds: [
		// 			{
		// 				title: "New York Times",
		// 				url: "http://www.nytimes.com/services/xml/rss/nyt/HomePage.xml"
		// 			}
		// 		],
		// 		showSourceTitle: true,
		// 		showPublishDate: true
		// 	}
		// },
	],

	electronOptions: {width: 1080, height: 1920, fullscreen: false}

};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== 'undefined') {module.exports = config;}
