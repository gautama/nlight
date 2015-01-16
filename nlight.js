var nlight = function (nlightSpec) {
	var that = {};

	var events = require("./events");
	var dates = require("./dates");
	var moment = require("moment");
	var hue = require("node-hue-api"),
	    HueApi = hue.HueApi,
	    lightState = hue.lightState;
	var hueApi;
	var SunCalc = require("suncalc");

	var defaultSpec = {
		// geolocation - Seattle, WA
		geolocation : {
	        latitude : 47.684075,
	        longitude : -122.176295
	    },
		huebridge : {
	        username : "newdeveloper",
	        api : "undefined",
	        bridge : "undefined",
	        apiInitialized : false,
	        apiConnected : false
	    },
	    bulbs : [],
	    times : "undefined"
	};

	var firstHeartBeat = true;

	nlightSpec = nlightSpec || defaultSpec;

	var astroMoments = [
		{name: "zeros"},
	    {name: "nadir"},
	    {name: "nightEnd"},
	    {name: "nauticalDawn"},
	    {name: "dawn"},
	    {name: "sunrise"},
	    {name: "sunriseEnd"},
	    {name: "goldenHourEnd"},
	    {name: "solarNoon"},
	    {name: "goldenHour"},
	    {name: "sunsetStart"},
	    {name: "sunset"},
	    {name: "dusk"},
	    {name: "nauticalDusk"},
	    {name: "night"},
	    {name: "midnight"}
	];

	var windDownMoments = [
		{
			name: "postDinner", // 9:30 pm - 65
			momentParams: [21, 30, 0, 0]
		}, 
		{
			name: "kidsInBed", // 10:00 pm - 50
			momentParams: [22, 0, 0, 0]
		}, 
		{
			name: "cruising", // 11:00 pm - 35
			momentParams: [23, 00, 0, 0]
		}, 
		{
			name: "windDown", // 11:30 pm - 20
			momentParams: [23, 30, 0, 0]
		} 
	];

	astroMoments.forEach(function(astroMoment, idx) {
		astroMoment.callbackRegistered = false;
	});

	windDownMoments.forEach(function(windDownMoment, idx) {
		windDownMoment.callbackRegistered = false;
	});

	function start () {
	    var loopInterval = 1000*5;

	    initialize();
	    console.log("initiated heartbeat");

	    setInterval(heartbeat, loopInterval);
	};
	that.start = start;

	function bulb (bulbSpec) {

		var bulbStates = {
			off: lightState.create().off(),
			on100: lightState.create().on().brightness(100),
			on90: lightState.create().on().brightness(90),
			on80: lightState.create().on().brightness(80),
			on70: lightState.create().on().brightness(70),
			on65: lightState.create().on().brightness(65),
			on60: lightState.create().on().brightness(60),
			on50: lightState.create().on().brightness(50),
			on40: lightState.create().on().brightness(40),
			on35: lightState.create().on().brightness(35),
			on30: lightState.create().on().brightness(30),
			on20: lightState.create().on().brightness(20),
			on10: lightState.create().on().brightness(10),
			on0: lightState.create().on().brightness(0)
		};

		var actions = {
			// earth cycle
			"zeros" : bulbStates.off,
		    "nadir" : bulbStates.off,
		    "nightEnd" : bulbStates.off,
		    "nauticalDawn" : bulbStates.on20,
		    "dawn" : bulbStates.on30,
		    "sunrise" : bulbStates.on40,
		    "sunriseEnd" : bulbStates.on50,
		    "goldenHourEnd" : bulbStates.off,
		    "solarNoon" : bulbStates.off,
		    "goldenHour" : bulbStates.on40,
		    "sunsetStart" : bulbStates.on40,
		    "sunset" : bulbStates.on40,
		    "dusk" : bulbStates.on60,
		    "nauticalDusk" : bulbStates.on70,
		    "night" : bulbStates.on80,
		    "midnight" : bulbStates.off,

		    // family cycle past night
			"postDinner" : bulbStates.on65, // 9:30 pm - 65
			"kidsInBed" : bulbStates.on50,  // 10:00 pm - 50
			"cruising" : bulbStates.on35, // 11:00 pm - 35
			"windDown" : bulbStates.on20 // 11:30 pm - 20

		};

		function momentEvent (cMoment) {
			console.log(self.id + "-" + self.name + " responded to " + cMoment.name + " with action:");
			console.log(JSON.stringify(actions[cMoment.name], null, 2));

			hueApi.setLightState(self.id, actions[cMoment.name], function (err, result) {
				console.log("setLightStateCallback " + self.id + "-" + self.name + "err: " + err + " result: " + result);
			})
		}

		function subscribeToMoments() {
			astroMoments.forEach(function (astroMoment, idx) {
				console.log(self.id + "-" + self.name + " subscribing to " + astroMoment.name);
				events.subscribe(momentEventName(astroMoment), momentEvent);
			});

			windDownMoments.forEach(function (wdMoment, idx) {
				console.log(self.id + "-" + self.name + " subscribing to " + wdMoment.name);
				events.subscribe(momentEventName(wdMoment), momentEvent);
			});
		}

	    var self = {};

	    self.name = bulbSpec.name;
	    self.getName = function () {
	        return bulbSpec.name;
	    }

	    self.id = bulbSpec.id;
	    self.getId = function () {
	    	return bulbSpec.id;
	    }

	    self.initialize = function () {
	    	subscribeToMoments();
	    }
	    self.initialize();

	    return self;
	};
	that.bulb = bulb;

	function bridge (bridgeSpec) {
		var self = {};
		var connectionInfo;
		var locateBridgesResponse;

		function lightsCallback(err, lightsResponse) {
		    if (err) throw err;

		    lightsResponse.lights.forEach(function (bulbSpec, idx) {
		    	var naturalBulb = bulb(bulbSpec);
		    	nlightSpec.bulbs.push(naturalBulb);
		    });

		    displayResult(nlightSpec.bulbs);
		}

		function connectCallback(err, config) {
		    if (err) throw err;
		    // displayResult(config);

		    nlightSpec.huebridge.config = config;
		    nlightSpec.huebridge.apiConnected = true;
		    console.log("api connected to " + config.name + ". querying bulbs");

			nlightSpec.huebridge.api.lights(lightsCallback);
		};

		function locateBridgesCallback(err, result) {
		    if (err) throw err;

		    locateBridgesResponse = result;
		    if (result.length > 0) {
		    	connectionInfo = result[0];
				displayConnectionInfo();

				// hue api
				var apiParams = {
					hostname: connectionInfo.ipaddress,
					username: nlightSpec.huebridge.username
				};

				console.log("initializing hueApi with " + JSON.stringify(apiParams));
		    	hueApi = new HueApi(
		    		apiParams.hostname, 
		    		apiParams.username);

			    nlightSpec.huebridge.api = hueApi;
			    nlightSpec.huebridge.apiInitialized = true;
			    console.log("api initialized. connecting");

				// --------------------------
				// Using a promise
				// api.connect().then(displayResult).done();

				// --------------------------
				// Using a callback
				hueApi.connect(connectCallback);
		    }
		};

		var displayBridges = function() {
		    console.log("Hue Bridges Found: " + JSON.stringify(locateBridgesResponse));
		};
		self.displayBridges = displayBridges;

		var displayConnectionInfo = function () {
			console.log("accessBridge = " + JSON.stringify(connectionInfo));
		};
		self.displayConnectionInfo;

		var displayResult = function(result) {
		    console.log(JSON.stringify(result, null, 2));
		};		
		self.displayResult = displayResult;

		self.initialize = function () {
			// --------------------------
			// Using a promise - todo: learn it
			// hue.locateBridges().then(displayBridges).done();

			// --------------------------
			// Using a callback
			hue.locateBridges(locateBridgesCallback);	
		};

		return self;
	};
	that.bridge = bridge;

	function initialize () {
	    // bridge
		var accessBridge = bridge();
	 	accessBridge.initialize();
		nlightSpec.huebridge.bridge = accessBridge;

	    // events test
	    var subscription = events.subscribe('/nlight/initialize', function(obj) {
	    	console.log(JSON.stringify(obj, null, 2));
	    });

	    events.publish('/nlight/initialize', nlightSpec);
	    subscription.remove();
	};
	that.initialize = initialize;

	function momentEventName(cMoment) {
		return "/astro/" + cMoment.name;
	}

	function momentCallback(cMoment) {
		console.log("moment with name " + cMoment.name + " fired at time " + nlightSpec.times[cMoment.name]);
		cMoment.callbackRegistered = false;

		// console.log(astroMoment.name + " @ " + nlightSpec.times[astroMoment.name]);
		events.publish(momentEventName(cMoment), cMoment);
	}

	function setWinddownTimes(times) {
		windDownMoments.forEach(function (wdMoment, idx) {
			times[wdMoment.name] = new Date();
			times[wdMoment.name].setHours.apply(times[wdMoment.name], wdMoment.momentParams);
		});
	}

	function heartbeat () {
	    var now = new Date();
	    var nextAstroMoment;
	    var nextAstroMomentIndex;

	    var nextWinddownMoment;
	    var nextWinddownMomentIndex;

	    // set this days times from various sources

	    // astronomical times
	    var times = SunCalc.getTimes(now, 
	        nlightSpec.geolocation.latitude, 
	        nlightSpec.geolocation.longitude);

	    // start at 00:00:00
	    var zeros = new Date();
	    zeros.setHours(0,0,0,0);
	    times.zeros = zeros;

	    // end at 00:00:00 the next day
	    var midnight = new Date();
	    midnight.setHours(24,0,0,0);
	    times.midnight = midnight;

	    // family winds down between night and midnight
	    setWinddownTimes(times);

	    nlightSpec.times = times;

	    // what is the next astro moment 
	    // verbose
	    astroMoments.forEach(function (astroMoment, idx) {
	    	console.log(astroMoment.name + " @ " + nlightSpec.times[astroMoment.name]);
	    });

	    astroMoments.some(function (astroMoment, idx) {
	    	if (times[astroMoment.name] > now) {
	    		nextAstroMoment = astroMoment;
	    		nextAstroMomentIndex = idx;
	    		return true;
	    	}

	    	return false;
	    });

	    nextAstroMoment = nextAstroMoment || {};

	    // what is the next winddown moment
	    // verbose
	    console.log("");
	    windDownMoments.forEach(function (wdMoment, idx) {
	    	console.log(wdMoment.name + " @ " + nlightSpec.times[wdMoment.name]);
	    })

	    windDownMoments.some(function (wdMoment, idx) {
	    	if (times[wdMoment.name] > now) {
	    		nextWinddownMoment = wdMoment;
	    		nextWinddownMomentIndex = idx;
	    		return true;
	    	}
	    	return false;
	    });

	    nextWinddownMoment = nextWinddownMoment || {};

		var nextMoment;	    
	    if (nextWinddownMoment &&
	    	nextWinddownMoment.name &&
	    	dates.compare(times[nextWinddownMoment.name], times[nextAstroMoment.name]) < 0) {
	    	nextMoment = nextWinddownMoment;
	    } else {
	    	nextMoment = nextAstroMoment;
	    }

	    if (nextMoment.callbackRegistered == false) {
	    	nextMoment.callbackRegistered = true;

	    	var timeout = nlightSpec.times[nextMoment.name] - now;
	    	setTimeout(function(currentMoment) {
	    		console.log("callback registered for " + currentMoment.name + " in " + timeout + " ms");
	    		return function() { 
	    			momentCallback(currentMoment); 
	    		}
	    	}(nextMoment), 
	    	timeout);
	    }

	    var heartbeat = {
	    	now : now,
	    	initialized : nlightSpec.huebridge.apiInitialized,
	    	connected : nlightSpec.huebridge.apiConnected,
	    	nextMoment : nextMoment,
	    	nextAstroMoment : nextAstroMoment,
	    	nextWinddownMoment : nextWinddownMoment
	    	// time : nlightSpec.times,
	    	// bulbs : nlightSpec.bulbs
	    };

	    if (firstHeartBeat == true) {
	    	var prevAstroMoment = astroMoments[nextAstroMomentIndex - 1];
	    	prevAstroMoment = prevAstroMoment || {};

	    	var prevWdMoment = windDownMoments[nextWinddownMomentIndex - 1];
	    	prevWdMoment = prevWdMoment || {};

	    	var prevMoment = prevAstroMoment;
	    	if (prevWdMoment && 
	    		prevWdMoment.name && 
	    		dates.compare(times[prevAstroMoment.name], times[prevWdMoment.name]) < 0) {
	    		prevMoment = prevWdMoment;
	    	}
		
		console.log("first heartbeat, callingBack for previous moment: " + prevMoment.name);
	    	momentCallback(prevMoment);
	    	firstHeartBeat = false;
	    }
	    console.log("___heartbeat=" + JSON.stringify(heartbeat, null, 2));
	};
	that.heartbeat = heartbeat;

	return that;
};

module.exports = nlight;
