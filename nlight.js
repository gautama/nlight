var nlight = function (nlightSpec) {
	var that = {};

	var events = require("./events");
	var moment = require("moment");
	var hue = require("node-hue-api"),
	    HueApi = hue.HueApi,
	    lightState = hue.lightState;
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

	nlightSpec = nlightSpec || defaultSpec;

	var astroMoments = [
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

	astroMoments.forEach(function(astroMoment, idx) {
		astroMoment.callbackRegistered = false;
	});

	function start () {
	    var loopInterval = 1000*5;

	    initialize();
	    console.log("initiated heartbeat");

	    setInterval(heartbeat, loopInterval);
	};
	that.start = start;

	function bulb (bulbSpec) {
	    var self = {};

	    self.name = bulbSpec.name;

	    self.getName = function () {
	        return bulbSpec.name;
	    }

	    return self;
	};
	that.bulb = bulb;

	function bridge (bridgeSpec) {
		var self = {};
		var connectionInfo;
		var locateBridgesResponse;

		function lightsCallback(err, lightsResponse) {
		    if (err) throw err;

		    nlightSpec.bulbs = lightsResponse.lights;
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
		    	var hueApi = new HueApi(
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

	function astroMomentCallback(astroMoment, idx) {
		console.log("astroMoment with name " + astroMoment.name + "at index " + idx + " fired");
		astroMoment.callbackRegistered = false;
	}

	function heartbeat () {
	    var now = new Date();
	    var nextAstroMoment;
	    var nextAstroMomentIndex;

	    var times = SunCalc.getTimes(now, 
	        nlightSpec.geolocation.latitude, 
	        nlightSpec.geolocation.longitude);

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
	    console.log("___heartbeat=" + JSON.stringify(heartbeat, null, 2));

	};
	that.heartbeat = heartbeat;

	return that;
};

module.exports = nlight;