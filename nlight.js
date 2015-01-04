var nlight = function (nlightSpec) {
	var that = {};

	var events = require("./events");
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
		{name: "postDinner" }, // 9:30 pm - 65
		{name: "kidsInBed" },  // 10:00 pm - 50
		{name: "cruising" }, // 11:00 pm - 35
		{name: "windDown" } // 11:30 pm - 20
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
		    "goldenHour" : bulbStates.off,
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

		function astroMomentEvent (astroMoment) {
			console.log(self.id + "-" + self.name + " responded to " + astroMoment.name + " with action:");
			console.log(JSON.stringify(actions[astroMoment.name], null, 2));

			hueApi.setLightState(self.id, actions[astroMoment.name], function (err, result) {
				console.log("setLightStateCallback " + self.id + "-" + self.name + "err: " + err + " result: " + result);
			})
		}

		function subscribeToAstroMoments() {
			astroMoments.forEach(function (astroMoment, idx) {
				console.log(self.id + "-" + self.name + " subscribing to " + astroMoment.name);
				events.subscribe(astroMomentEventName(astroMoment), astroMomentEvent);
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
	    	subscribeToAstroMoments();
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

	function astroMomentEventName(astroMoment) {
		return "/astro/" + astroMoment.name;
	}

	function astroMomentCallback(astroMoment, idx) {
		console.log("astroMoment with name " + astroMoment.name + "at index " + idx + " fired at time " + nlightSpec.times[astroMoment.name]);
		astroMoment.callbackRegistered = false;

		// console.log(astroMoment.name + " @ " + nlightSpec.times[astroMoment.name]);
		events.publish(astroMomentEventName(astroMoment), astroMoment);
	}

	function heartbeat () {
	    var now = new Date();
	    var nextAstroMoment;
	    var nextAstroMomentIndex;

	    var times = SunCalc.getTimes(now, 
	        nlightSpec.geolocation.latitude, 
	        nlightSpec.geolocation.longitude);

	    var zeros = new Date();
	    zeros.setHours(0,0,0,0);
	    times.zeros = zeros;

	    var midnight = new Date();
	    midnight.setHours(24,0,0,0);
	    times.midnight = midnight;

	    nlightSpec.times = times;

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

	    if (nextAstroMoment.callbackRegistered == false) {
	    	nextAstroMoment.callbackRegistered = true;

	    	var timeout = nlightSpec.times[nextAstroMoment.name] - now;
	    	setTimeout(function(currentMoment, idx) {
	    		console.log("callback registered for " + currentMoment.name + " in " + timeout + " ms");
	    		return function() { 
	    			astroMomentCallback(currentMoment, idx); 
	    		}
	    	}(nextAstroMoment, nextAstroMomentIndex), 
	    	timeout);
	    }

	    var heartbeat = {
	    	now : now,
	    	initialized : nlightSpec.huebridge.apiInitialized,
	    	connected : nlightSpec.huebridge.apiConnected,
	    	nextAstroEvent : {
	    		name: nextAstroMoment.name,
	    		date: times[nextAstroMoment.name]
	    	},
	    	// time : nlightSpec.times,
	    	// bulbs : nlightSpec.bulbs
	    };

	    if (firstHeartBeat == true) {
	    	var prevAstroMoment = astroMoments[nextAstroMomentIndex - 1];
	    	prevAstroMoment = prevAstroMoment || {};

	    	astroMomentCallback(prevAstroMoment, nextAstroMomentIndex - 1)
	    	firstHeartBeat = false;
	    }
	    console.log("___heartbeat=" + JSON.stringify(heartbeat, null, 2));
	};
	that.heartbeat = heartbeat;

	return that;
};

module.exports = nlight;