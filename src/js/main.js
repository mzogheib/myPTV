// PT to look up
var localConfig = {};

var stopIndex, stopIndexIncrement;

const ON_LAUNCH = 0;
const ON_TICK = 1;
const ON_UP_SINGLE = 10;
const ON_SELECT_SINGLE = 20;
const ON_SELECT_DOUBLE = 21;
const ON_SELECT_LONG = 22;
const ON_DOWN_SINGLE = 30;
const ON_TAP = 40;

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
        sendDict({
            "KEY_ALERT": "URL Timeout"
        });
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
        getLocationAndDepartures();
    } else {
        sendDict({
            "KEY_ALERT": "PTV Unhealthy"
        });
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
        } else if (stopIndex == localConfig.allStops.length - 1) {
            // Tried all the way to the furthest stop.
            // Ensure we don't go out of the array bounds
            stopIndexIncrement = -1;
        }

        stopIndex += 1 * stopIndexIncrement;
        specificNextDepartures(localConfig);
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

        // Send to watch
        sendDict({
            "KEY_ROUTE_SHORT": routeShortName,
            "KEY_ROUTE_LONG": routeLongName,
            "KEY_STOP": stopName,
            "KEY_DEPARTURE_1": departureTime1,
            "KEY_DEPARTURE_2": departureTime2,
            "KEY_DEPARTURE_3": departureTime3
        });
    }
}

function specificNextDepartures(config) {
    var mode = config.modeID;
    var line = config.routeID;
    var stop = config.allStops[stopIndex].stopID;
    var direction = config.directionID[0];
    var limit = config.limit;
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

// Find the nearest stop and get the departures for it
function departuresAtNearestStop(pos) {
    var coordinates = pos.coords;

    // Calculate and save the distance from current location to each stop
    // Config string is not being returned correctly
    var stops = localConfig.allStops;
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

    // Get departures for the nearest stop
    stopIndex = 0;
    specificNextDepartures(localConfig);
}

// If cannot get location then don't send anything back.
function locationError(err) {
    sendDict({
        "KEY_ALERT": "Location error"
    });
}

var locationOptions = {
    'timeout': 15000,
    'maximumAge': 60000
};

function getLocationAndDepartures() {
    // Find the current position. Get the closest stop and departures within the locationSuccess callback
    window.navigator.geolocation.getCurrentPosition(departuresAtNearestStop, locationError, locationOptions);
}

// Event listeners
Pebble.addEventListener('ready', function (e) {
    console.log('JS connected!');
    stopIndexIncrement = 1;

    // localStorage.clear();

    // Load the config data.
    localConfig = JSON.parse(localStorage.getItem('localConfig'));
});

// Message from the watch to get the PT data from the API
Pebble.addEventListener('appmessage', function (e) {
    if(localConfig) {
        // If config exists then process incoming events
        switch(e.payload["KEY_EVENT"]) {
            case ON_LAUNCH:
                console.log("ON_LAUNCH: Get departures at nearest stop");
                // Health check, get location, get departures at nearest stop
                healthCheck();
                break;
            case ON_TICK:
                console.log("ON_TICK: Update departures at current stop");
                specificNextDepartures(localConfig);
                break;
            case ON_UP_SINGLE:
                console.log("ON_UP_SINGLE: Get departures in next direction at nearest stop");
                // Assume there will only ever be a max of 2 directions
                if(localConfig.directionID.length > 1) {
                    var dirTemp = localConfig.directionID[0];
                    localConfig.directionID[0] = localConfig.directionID[1];
                    localConfig.directionID[1] = dirTemp;
                }

                stopIndexIncrement = 1;

                getLocationAndDepartures();
                break;
            case ON_SELECT_SINGLE:
                console.log("ON_SELECT_SINGLE: Get departures at next stop");
                if(stopIndex < localConfig.allStops.length) {
                    stopIndex++;
                }
                stopIndexIncrement = 1;

                specificNextDepartures(localConfig);
                break;
            case ON_SELECT_DOUBLE:
                console.log("ON_SELECT_DOUBLE: Get departures at previous stop");
                if(stopIndex > 0) {
                    stopIndex--;
                }
                stopIndexIncrement = -1;

                specificNextDepartures(localConfig);
                break;
            case ON_SELECT_LONG:
                console.log("ON_SELECT_LONG: Get departures at nearest stop");
                stopIndex = 0;
                getLocationAndDepartures();
                break;
            case ON_DOWN_SINGLE:
                console.log("ON_DOWN_SINGLE: Update departures at current stop");
                specificNextDepartures(localConfig);
                break;
            case ON_TAP:
                console.log("ON_TAP: Get departures at nearest stop");
                getLocationAndDepartures();
                break;
        }
    } else {
        sendDict({
            "KEY_ALERT": "No config"
        });
    }
});

// User has launched the config page
Pebble.addEventListener('showConfiguration', function() {
    var params = '';

    localConfig = JSON.parse(localStorage.getItem('localConfig'));

    if(localConfig) {
        params = '?mode=' + localConfig.modeID + '&route=' + localConfig.routeID;
    }

    Pebble.openURL(configURL + params);
});

// User has submitted the config. Store the config and call the API.
Pebble.addEventListener('webviewclosed', function(e) {
    if(e.response!='') {
        // console.log('Config uri returned: ' + e.response);
        // First, decode the uri
        var configString = decodeURIComponent(e.response);

        // Clear the local storage then save the incoming config
        localStorage.clear();
        localStorage.setItem('localConfig', configString);

        // Then, parse the string into an object
        localConfig = JSON.parse(configString);

        // Get and send the PTV data
        console.log("ON_NEW_CONFIG: Get departures at nearest stop");
        getLocationAndDepartures();
    } else {
        console.log("Config cancelled");
    }
});