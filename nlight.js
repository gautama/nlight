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
	        hostname : "192.168.254.42",
	        username : "newdeveloper",
	        api : "undefined"
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

	function initialize () {
	    nlightSpec.huebridge.api = new HueApi(nlightSpec.huebridge.hostname, nlightSpec.huebridge.username);
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