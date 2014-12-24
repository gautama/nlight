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
	        bridge : "undefined"
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
			    }
				
				displayConnectionInfo();
			});	
		};

		return self;
	};
	that.bridge = bridge;

	function initialize () {
		// hue api
	    nlightSpec.huebridge.api = new HueApi(nlightSpec.huebridge.hostname, nlightSpec.huebridge.username);

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

	function heartbeat() {
	    var now = new Date();

	    var times = SunCalc.getTimes(now, 
	        nlightSpec.geolocation.latitude, 
	        nlightSpec.geolocation.longitude);

	    times.now = now.toISOString();

	    nlightSpec.times = times;
	    console.log("hb-" + nlightSpec.times.now + "---" + nlightSpec.bulbs[0].getName());    
	};
	that.heartbeat = heartbeat;

	return that;
};

module.exports = nlight;