var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var hue = require("node-hue-api"),
    HueApi = hue.HueApi,
    lightState = hue.lightState;
var SunCalc = require("suncalc");

var routes = require('./routes/index');
var users = require('./routes/users');

var NLIGHT = {};
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

// logs
var displayResult = function(result) {
    console.log(JSON.stringify(result, null, 2));
};

var displayError = function(err) {
    console.error(err);
};

// main
nlight();
function nlight () {
    initialize();

    console.log("initiated heartbeat");

    var loopInterval = 1000*5;
    setInterval(heartbeat, loopInterval);
}

function bulb (bulbSpec) {
    var self = {};

    self.getName = function () {
        return bulbSpec.name;
    }

    return self;
};


function initialize () {
    // geolocation - Seattle, WA
    NLIGHT.geolocation = {
        latitude : 47.684075,
        longitude : -122.176295
    };

    NLIGHT.huebridge = {
        hostname : "192.168.254.42",
        username : "newdeveloper",
    };
    NLIGHT.huebridge.api = new HueApi(NLIGHT.huebridge.hostname, NLIGHT.huebridge.username);

    var lobbyBulb = bulb({name: "lobby"});
    NLIGHT.bulbs = [
        lobbyBulb
    ];
}

function heartbeat() {
    var now = new Date();

    var times = SunCalc.getTimes(now, 
        NLIGHT.geolocation.latitude, 
        NLIGHT.geolocation.longitude);

    times.now = now.toISOString();

    NLIGHT.times = times;
    console.log("hb-" + NLIGHT.times.now + "---" + NLIGHT.bulbs[0].getName());    
}

// lightLoop
module.exports = app;
