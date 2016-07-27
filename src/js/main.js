// PT to look up
var localConfig1 = {};

var stopIndex, stopIndexIncrement;

const ON_LAUNCH = 0;
const ON_TICK = 1;
const ON_UP_SINGLE = 10;
const ON_SELECT_SINGLE = 20;
const ON_SELECT_DOUBLE = 21;
const ON_SELECT_LONG = 22;
const ON_DOWN_SINGLE = 30;
const ON_TAP = 40;

const ERR_LOC = 90;
const ERR_TIMEOUT = 91;
const ERR_HEALTH = 93;

// Send a dictionary of data to the Pebble
function sendDict(dictionary) {
    // Send
    Pebble.sendAppMessage(
        dictionary,
        function(e) {},
        function(e) {}
    );
}

// Returns the complete API URL with calculated signature
function getURLWithSignature(params, devID, key) {
    var baseURL = 'http://timetableapi.ptv.vic.gov.au';
    var apiVersion = '/v2';
    var endPoint = apiVersion + params + '&devid=' + devID;
    var signature = CryptoJS.HmacSHA1(endPoint, key);

    return baseURL + endPoint + '&signature=' + signature.toString();
}

// Calls the API specified in finalURL and uses callback to do something with the data
function callPTVAPI(finalURL, callback) {
    var xhr = new XMLHttpRequest();
    // console.log(finalURL);

    xhr.open("GET", finalURL, true);
    xhr.timeout = 20000;

    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            callback(xhr.responseText);
        }
    }

    xhr.ontimeout = function () {
        // Return a bad health check result to the watch
        var dictionary = {
            "KEY_ALERT": ERR_TIMEOUT
        };
        sendDict(dictionary);
    }

    xhr.send();
}

// Function to conduct a health check on the PTV callPTVAPI
function healthCheck() {
    var date = new Date();
    var params = '/healthcheck?timestamp=' + date.toISOString();
    var finalURL = getURLWithSignature(params, devID, key);

    // Call the API and provide a callback to handle the return data
    callPTVAPI(finalURL, healthCheckCallback);
}

// Callback to handle the data returned from Health Check API
function healthCheckCallback(data) {
    var healthCheckStatus = true;
    var healthJSON = JSON.parse(data);

    // If any of the health check JSON members are false the health is not ok, i.e. false
    for(var member in healthJSON) {
        if(healthJSON[member]===false) {
            console.log(member + ": " + healthJSON[member]);
            healthCheckStatus = false;
        }
    }

    // Handle the health check status
    if(healthCheckStatus) {
        // Carry on with getting PTV data
        var d = localStorage['direction'];
        specificNextDepartures(
            localConfig1.modeID,
            localConfig1.routeID,
            localConfig1.allStops[stopIndex].stopID,
            localConfig1.directionID[d],
            localConfig1.limit
        );
    } else {
        // Return a bad health check result to the watch
        var dictionary = {
            "KEY_ALERT": ERR_HEALTH
        };
        sendDict(dictionary);
    }
}

// Callback to handle the data returned from the Specific Next Departures API
function specificNextDeparturesCallback(data) {
    var sndJSON = JSON.parse(data);

    if(sndJSON.values == '') {
        // Nothing at this stop. Try the next/prev nearest.
        if (stopIndex == 0) {
            // Tried all the way to the nearest stop.
            // Ensure we don't go out of the array bounds
            stopIndexIncrement = 1;
        } else if (stopIndex == localConfig1.allStops.length - 1) {
            // Tried all the way to the furthest stop.
            // Ensure we don't go out of the array bounds
            stopIndexIncrement = -1;
        }

        stopIndex += 1 * stopIndexIncrement;
        var d = localStorage['direction'];
        specificNextDepartures(localConfig1.modeID,
            localConfig1.routeID,
            localConfig1.allStops[stopIndex].stopID,
            localConfig1.directionID[d],
            localConfig1.limit
        );
    } else {
        // Found departures. Send to watch.
        var routeShortName, routeLongName;
        var departureTime1, departureTime2, departureTime3;
        var stopName;

        // Use objects and loops for this.
        routeShortName = sndJSON.values[0]["platform"]["direction"]["line"]["line_number"];
        routeLongName = sndJSON.values[0]["platform"]["direction"]["direction_name"];
        stopName = sndJSON.values[0]["platform"]["stop"]["location_name"];
        stopName = stopName.replace("/", " / ");

        // Get the realtime departures
        departureTime1 = sndJSON.values[0]["time_realtime_utc"];
        departureTime2 = sndJSON.values[1]["time_realtime_utc"];
        departureTime3 = sndJSON.values[2]["time_realtime_utc"];

        // If a realtime departure is null then revert to scheduled
        departureTime1 = ((departureTime1==null) ? sndJSON.values[0]["time_timetable_utc"] : departureTime1);
        departureTime2 = ((departureTime2==null) ? sndJSON.values[1]["time_timetable_utc"] : departureTime2);
        departureTime3 = ((departureTime3==null) ? sndJSON.values[2]["time_timetable_utc"] : departureTime3);

        // Convert to local time
        departureTime1 = new Date(departureTime1);
        departureTime2 = new Date(departureTime2);
        departureTime3 = new Date(departureTime3);

        // Convert to ms sice epoch
        departureTime1 = departureTime1.getTime()/1000;
        departureTime2 = departureTime2.getTime()/1000;
        departureTime3 = departureTime3.getTime()/1000;

        // Add to a dictionary for the watch
        var dictionary = {};
        dictionary["KEY_ROUTE_SHORT"] = routeShortName;
        dictionary["KEY_ROUTE_LONG"] = routeLongName;
        dictionary["KEY_STOP"] = stopName;
        dictionary["KEY_DEPARTURE_1"] = departureTime1;
        dictionary["KEY_DEPARTURE_2"] = departureTime2;
        dictionary["KEY_DEPARTURE_3"] = departureTime3;

        sendDict(dictionary);
    }
}

function specificNextDepartures(mode, line, stop, direction, limit) {
    var params = '/mode/' + mode + '/line/' + line + '/stop/' + stop + '/directionid/' + direction + '/departures/all/limit/' + limit + '?';
    var finalURL = getURLWithSignature(params, devID, key);
    callPTVAPI(finalURL, specificNextDeparturesCallback);
}

// Distance in meters between two coordinates.
// Adapted from http://stackoverflow.com/questions/5396286/sort-list-of-lon-lat-points-start-with-nearest
function distance(fromLat, fromLon, toLat, toLon) {
    var radius = 6378137;   // approximate Earth radius, *in meters*

    fromLat *= (Math.PI / 180);
    fromLon *= (Math.PI / 180);
    toLat *= (Math.PI / 180);
    toLon *= (Math.PI / 180);

    var deltaLat = toLat - fromLat;
    var deltaLon = toLon - fromLon;

    var angle = 2 *
        Math.asin(
            Math.sqrt(
                Math.pow(Math.sin(deltaLat/2), 2) +
                Math.cos(fromLat) * Math.cos(toLat) *
                Math.pow(Math.sin(deltaLon/2), 2)
            )
        );

    return radius * angle;
}

// If can get location then do things
function locationSuccess(pos) {
    var coordinates = pos.coords;

    // Calculate and save the distance from current location to each stop
    // Config string is not being returned correctly
    var stops = localConfig1.allStops;
    for(var i=0; i<stops.length; i++) {
        var lat = stops[i].stopLat;
        var lon = stops[i].stopLon;
        stops[i].distance =  distance(coordinates.latitude, coordinates.longitude, lat, lon);
    }
    // Sort the stop list based on closest distance
    stops.sort(function(a, b){return a.distance-b.distance});
    for(var i=0; i<stops.length; i++) {
        var lat = stops[i].stopLat;
        var lon = stops[i].stopLon;
    }

    stopIndex = 0;

    // Get departures for this stop
    // Check API health then either call the other APIs or send alert back to Pebble
    healthCheck();
}

// If cannot get location then don't send anything back.
function locationError(err) {
    console.warn('location error (' + err.code + '): ' + err.message);
    // Send a location timeout error message back to display default text
    var dictionary = {
        "KEY_ALERT": ERR_LOC
    };
    sendDict(dictionary);
}

var locationOptions = {
    'timeout': 15000,
    'maximumAge': 60000
};

function getPTVData() {
    // Load the config data.
    localConfig1 = JSON.parse(localStorage.getItem('localConfig1'));
    // Find the current position. Get the closest stop and departures within the locationSuccess callback
    window.navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
}

// Event listeners
Pebble.addEventListener('ready', function (e) {
    console.log('JS connected!');
    stopIndexIncrement = 1;
    // localStorage.clear();
});

// Message from the watch to get the PT data from the API
Pebble.addEventListener('appmessage', function (e) {
    switch(e.payload["KEY_EVENT"]) {
        case ON_LAUNCH:
            console.log("ON_LAUNCH: Update departures");
            getPTVData();
            break;
        case ON_TICK:
            console.log("ON_TICK: Update departures");
            getPTVData();
            break;
        case ON_UP_SINGLE:
            console.log("ON_UP_SINGLE: Next direction");
            var numDirections = localStorage['numDirections'];
            var d = localStorage['direction'];
            d = (numDirections - 1) - d;
            localStorage.setItem('direction', d);
            stopIndexIncrement = 1;

            getPTVData();
            break;
        case ON_SELECT_SINGLE:
            console.log("ON_SELECT_SINGLE: Next stop");
            if(stopIndex < localConfig1.allStops.length) {
                stopIndex++;
            }
            stopIndexIncrement = 1;

            healthCheck();
            break;
        case ON_SELECT_DOUBLE:
            console.log("ON_SELECT_DOUBLE: Prev stop");
            if(stopIndex > 0) {
                stopIndex--;
            }
            stopIndexIncrement = -1;

            healthCheck();
            break;
        case ON_SELECT_LONG:
            console.log("ON_SELECT_LONG: Nearest stop");
            stopIndex = 0;

            healthCheck();
            break;
        case ON_DOWN_SINGLE:
            console.log("ON_DOWN_SINGLE: Update departures");
            getPTVData();
            break;
        case ON_TAP:
            console.log("ON_TAP: Update departures");
            getPTVData();
            break;
    }
});

// User has launched the config page
Pebble.addEventListener('showConfiguration', function() {
    var params = '';

    localConfig1 = JSON.parse(localStorage.getItem('localConfig1'));

    if(localConfig1) {
        params = '?mode=' + localConfig1.modeID + '&route=' + localConfig1.routeID;
    }

    Pebble.openURL(configURL + params);
});

// User has submitted the config. Store the config and call the API.
Pebble.addEventListener('webviewclosed', function(e) {
    if(e.response!='') {
        // console.log('Config uri returned: ' + e.response);
        // First, decode the uri
        var configString1 = decodeURIComponent(e.response);

        // Clear the local storage then save the incoming config
        localStorage.clear();
        localStorage.setItem('localConfig1', configString1);

        // Then, parse the string into an object
        localConfig1 = JSON.parse(configString1);

        // Also save the total number of directions to toggle. Start off with 0
        localStorage.setItem('numDirections', localConfig1.directionID.length);
        localStorage.setItem('direction', 0);

        // Get and send the PTV data
        console.log("ON_NEW_CONFIG: Update departures");
        getPTVData();
    } else {
        console.log("Config cancelled");
    }
});