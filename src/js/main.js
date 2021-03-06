// Some variables  
var baseURL = 'http://timetableapi.ptv.vic.gov.au';
var apiVersion = '/v2';

// PT to look up
var localConfig1 = {};
var stopDistances1 = [];

var dictionary = {};
var healthCheckStatus = true;
var routeShortName, routeLongName;
var stopName;
var directionName1, directionName2;
var departureTime1, departureTime2, departureTime3;

var healthCheckComplete = false;

// Send a dictionary of data to the Pebble
function sendDict() {
	// Send
  Pebble.sendAppMessage(dictionary,
    function(e) { console.log("Message sent to Pebble successfully!"); },
    function(e) { console.log("Error sending message to Pebble!"); }
  );	
	dictionary = {};
}

// Returns the complete API URL with calculated signature
function getURLWithSignature(baseURL, params, devID, key) {
  var endPoint = apiVersion + params + '&devid=' + devID;
  var signature = CryptoJS.HmacSHA1(endPoint, key);

  return baseURL + endPoint + '&signature=' + signature.toString();
}

// Calls the API specified in finalURL and uses callback to do something with the data
function callPTVAPI(finalURL, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", finalURL, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
            // console.log("responseText: " + xhr.responseText);
			var responseJSON = JSON.parse(xhr.responseText);
			if(responseJSON.values == "") {
				console.log("No data");
			} else {
      	callback(xhr.responseText);
			}
    } 
  }
  xhr.send();
}

// Function to conduct a health check on the PTV callPTVAPI
function healthCheck() {
  var date = new Date();
  var params = '/healthcheck?timestamp=' + date.toISOString();
  var finalURL = getURLWithSignature(baseURL, params, devID, key);

	//console.log("Doing Health Check");
  // Call the API and provide a callback to handle the return data
  callPTVAPI(finalURL, healthCheckCallback);
}

// Callback to handle the data returned from Health Check API
function healthCheckCallback(data) {
	healthCheckStatus = true;
	var healthJSON = JSON.parse(data);
	
	// If any of the helth check JSON members are false the health is not ok, i.e. false
  for(var member in healthJSON) {
  	if(healthJSON[member]===false) {
			console.log(member + ": " + healthJSON[member]);
  		healthCheckStatus = false;
  	}
  }
	//console.log("Health Check: " + healthCheckStatus);
	
	// Handle the health check status
	if(healthCheckStatus) {
		// Carry on with getting PTV data
		console.log("Getting new PTV data for " + localConfig1.modeID + " " + localConfig1.routeID + " " + localConfig1.directionID + " " + localConfig1.allStops[0].stopID);
		specificNextDepartures(localConfig1.modeID,  localConfig1.routeID, localConfig1.allStops[0].stopID, localConfig1.directionID, localConfig1.limit);
	} else {
		// Return a bad health check result to the watch
		dictionary = {
			"KEY_HEALTH": healthCheckStatus
		};
		sendDict();
	}
}

// Callback to handle the data returned from the Specific Next Departures API
function specificNextDeparturesCallback(data) {
	var sndJSON = JSON.parse(data);
	
	// Use objects and loops for this.
	routeShortName = sndJSON.values[0]["platform"]["direction"]["line"]["line_number"];
	routeLongName = sndJSON.values[0]["platform"]["direction"]["direction_name"];
	stopName = sndJSON.values[0]["platform"]["stop"]["location_name"];
	stopName = stopName.replace("/", " / ");
	
	// Strip off the stop number if tram
	/*if(sndJSON.values[0]["platform"]["stop"]["transport_type"]==="tram") {
		stopName = stopName.substring(0, stopName.indexOf('#')-1);
	}*/

		
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
	
	//console.log(departureTime1);
	//console.log(departureTime2);
	//console.log(departureTime3);
	
	// Convert to ms sice epoch
	departureTime1 = departureTime1.getTime()/1000;
	departureTime2 = departureTime2.getTime()/1000;
	departureTime3 = departureTime3.getTime()/1000;
	
	// Add to a dictionary for the watch
	dictionary["KEY_ROUTE_SHORT"] = routeShortName;
	dictionary["KEY_ROUTE_LONG"] = routeLongName;
	dictionary["KEY_STOP"] = stopName;
	dictionary["KEY_DEPARTURE_1"] = departureTime1;
	dictionary["KEY_DEPARTURE_2"] = departureTime2;
	dictionary["KEY_DEPARTURE_3"] = departureTime3;

	console.log("Sending long route name: " + routeLongName);
	console.log("Sending long route name in dict: " + dictionary["KEY_ROUTE_LONG"]);
	

	sendDict();
}

function specificNextDepartures(mode, line, stop, direction, limit) {
	var params = '/mode/' + mode + '/line/' + line + '/stop/' + stop + '/directionid/' + direction + '/departures/all/limit/' + limit + '?';
	var finalURL = getURLWithSignature(baseURL, params, devID, key);
	console.log("Specific: " + finalURL);
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
		
    var angle = 2 * Math.asin( Math.sqrt(
        Math.pow(Math.sin(deltaLat/2), 2) + 
        Math.cos(fromLat) * Math.cos(toLat) * 
        Math.pow(Math.sin(deltaLon/2), 2) ) );
    return radius * angle;
}

// If can get location then do things
function locationSuccess(pos) {
  var coordinates = pos.coords;
	console.log("Current location: " + coordinates.latitude + " " + coordinates.longitude);
	
	// Calculate and save the distance from current location to each stop
	// Config string is not being returned correctly
	var stops = localConfig1.allStops;
	for(var i=0; i<stops.length; i++) {
		var lat = stops[i].stopLat;
		var lon = stops[i].stopLon;
		stops[i].distance =  distance(coordinates.latitude, coordinates.longitude, lat, lon);
        // console.log("Stored stop [" + stops[i].stopID + "]: " + lat + " " + lon + " " + stops[i].distance);
	}
	
	// Sort the stop list based on closest distance
	stops.sort(function(a, b){return a.distance-b.distance});
	for(var i=0; i<stops.length; i++) {
		var lat = stops[i].stopLat;
		var lon = stops[i].stopLon;
        // console.log("Stored sorted stop [" + stops[i].stopID + "]: " + lat + " " + lon + " " + stops[i].distance);
	}
		
	// Get departures for this stop 
	console.log("Nearest stop is: " + localConfig1.allStops[0].stopID + " " + localConfig1.allStops[0].distance);
	// Check API health then either call the other APIs or send alert back to Pebble
	healthCheck();
	
}

// If cannot get location then don't send anything back. 
function locationError(err) {
  console.warn('location error (' + err.code + '): ' + err.message);
	// Send a location timeout error message back to display default text
	dictionary = {
		"KEY_MSG_TYPE": 90
	};
	sendDict();
}

var locationOptions = {
  'timeout': 15000,
  'maximumAge': 60000
};

function getPTVData() {
	// Load the config data.
	var haveConfig = false;
	if(Object.keys(localConfig1).length>0) {
		// Have config from an active session
		haveConfig = true;
	} else if(localStorage.getItem('localConfig1')!=null) {
		// Have locally stored config
		console.log("Will parse: " + localStorage.getItem('localConfig1'));
		localConfig1 = JSON.parse(localStorage.getItem('localConfig1'));
		console.log("Stored config string is: " + localConfig1);
		haveConfig = true;
	} else {
		// Don't have any config. Keep false
	}
	
	// Check for stored config data
	if(haveConfig) {
		// Find the current position. Get the closest stop and departures within the locationSuccess callback
	  window.navigator.geolocation.getCurrentPosition(locationSuccess, locationError, locationOptions);
	} else {
		console.log("No local storage");
	}
}

// Event listeners
Pebble.addEventListener('ready', function (e) {
  console.log('JS connected!');
    // localStorage.clear();
	getPTVData();
});

// Message from the watch to get the PT data from the API
Pebble.addEventListener('appmessage', function (e) {
	getPTVData()
});

// User has launched the config page
Pebble.addEventListener('showConfiguration', function() {
    console.log('Showing configuration page: ' + configURL);

    Pebble.openURL(configURL);
});

// User has submitted the config. Store the config and call the API.
Pebble.addEventListener('webviewclosed', function(e) {
  if(e.response!='') {	
	  console.log('Config uri returned: ' + e.response);
		// First, decode the uri
		var configString1 = decodeURIComponent(e.response);
		
		// Clear the local storage then save the incoming config
        localStorage.clear();
		localStorage.setItem('localConfig1', configString1);
		
		// Then, parse the string into an object
		localConfig1 = JSON.parse(configString1);
		
		// Get and send the PTV data
		getPTVData();
	} else {
		console.log("Config cancelled");
	}
});