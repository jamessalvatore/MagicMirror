/* Magic Mirror
 * Default Modules List
 *
 * By Michael Teeuw http://michaelteeuw.nl
 * MIT Licensed.
 */

// Modules listed below can be loaded without the 'default/' prefix. Omitting the default folder name.

var defaultModules = [
	"alert",
	// "calendar",
	"regimenqueue",
	"clock",
	"regimennotification",
	"currentweather",
	"helloworld",
	"newsfeed",
	"weatherforecast",
	"updatenotification",
	"missedregimens"
];

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") {module.exports = defaultModules;}
