var nlight = function (nlightSpec) {
	var that = {};

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
			hue.locateBridges(function(err, result) {
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
					hueApi.connect(function(err, config) {
					    if (err) throw err;
					    // displayResult(config);

					    nlightSpec.huebridge.config = config;
					    nlightSpec.huebridge.apiConnected = true;
					    console.log("api connected to " + config.name);
					});
			    }
			});	
		};

		return self;
	};
	that.bridge = bridge;

	function initialize () {
	    // bridge
	    var accessBridge = bridge();
	    accessBridge.initialize();
		nlightSpec.huebridge.bridge = accessBridge;

	    var lobbyBulb = bulb({name: "lobby"});
	    nlightSpec.bulbs = [
	        lobbyBulb
	    ];
	};
	that.initialize = initialize;

	function heartbeat () {
	    var now = new Date();

	    var times = SunCalc.getTimes(now, 
	        nlightSpec.geolocation.latitude, 
	        nlightSpec.geolocation.longitude);

	    times.now = now.toISOString();

	    nlightSpec.times = times;
	    var currentState = {
	    	time : nlightSpec.times.now,
	    	initialized : nlightSpec.huebridge.apiInitialized,
	    	connected : nlightSpec.huebridge.apiConnected,
	    	bulbs : nlightSpec.bulbs
	    };
	    console.log("hb-" + JSON.stringify(currentState));
	};
	that.heartbeat = heartbeat;

	return that;
};

module.exports = nlight;