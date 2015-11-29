// Some variables  
var baseURL = 'http://timetableapi.ptv.vic.gov.au';
var apiVersion = '/v2';

// PT to look up
var modeID1 = 1;
var lineID1 = 1881;
var stopID1 = 2075;
var directionID1 = 27;
var limit1 = 3;
var modeID2 = 1;
var lineID2 = 3343;
var stopID2 = 2966;
var directionID2 = 9;
var limit2 = 3;

var dictionary;
var healthCheckStatus;
var routeName1, routeName2, routeNameTemp;
var stopName1, stopName2, stopNameTemp;
var directionName1, directionName2, directionNameTemp;
var route1Time1, route1Time2, route2Time1, route2Time2, route2Time3, routeTempTime1, routeTempTime2, routeTempTime3;

var healthCheckComplete = false;
var sndComplete = false;


// Send a dictionary of data to the Pebble
function sendDict() {
	// Send
  Pebble.sendAppMessage(dictionary,
    function(e) { console.log("Message sent to Pebble successfully!"); },
    function(e) { console.log("Error sending weather info to Pebble!"); }
  );	
}

// Sends a dictionary with only a bad health check result
function sendBadHealthCheck() {
	console.log("Sending bad health check to Pebble");
	// Assemble dictionary
	dictionary = {
		"KEY_HEALTH": healthCheckStatus
	};
	sendDict();
}

// Send a dictionary of data to the Pebble
function sendPTVData() {
	// Assemble dictionary
	dictionary = {
		"KEY_HEALTH": healthCheckStatus,
		"KEY_ROUTE1": routeName1,
		"KEY_STOP1": stopName1,
		"KEY_ROUTE1_TIME1": route1Time1.getTime()/1000,
		"KEY_ROUTE1_TIME2": route1Time2.getTime()/1000,
		"KEY_ROUTE1_TIME3": route1Time3.getTime()/1000,
		"KEY_ROUTE2": routeName2,
		"KEY_STOP2": stopName2,
		"KEY_ROUTE2_TIME1": route2Time1.getTime()/1000,
		"KEY_ROUTE2_TIME2": route2Time2.getTime()/1000,
		"KEY_ROUTE2_TIME3": route2Time3.getTime()/1000
	};
	sendDict();
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
  xhr.open("GET", finalURL, false);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      callback(xhr.responseText);
    }
  }
  xhr.send();
}

// Function to conduct a health check on the PTV API
function healthCheck() {
  var date = new Date();
  var params = '/healthcheck?timestamp=' + date.toISOString();
  var finalURL = getURLWithSignature(baseURL, params, devID, key);

	console.log("Doing Health Check");
  // Call the API and provide a callback to handle the return data
  callPTVAPI(finalURL, healthCheckCallback);
}

// Callback to handle the data returned from Health Check API
function healthCheckCallback(data) {
	healthCheckStatus = true;
	var healthJSON = JSON.parse(data);
	
	// If any of the helth check JSON members are false the health is not ok, i.e. false
  for(var member in healthJSON) {
		console.log(member + ": " + healthJSON[member]);
  	if(healthJSON[member]===false) {
  		healthCheckStatus = false;
  	}
  }
	
	console.log("Health Check: " + healthCheckStatus);
	
	healthCheckComplete = true;

}

// Callback to handle the data returned from the Specific Next Departures API
function specificNextDeparturesCallback(data) {
	var sndJSON = JSON.parse(data);
	
	// Use objects and loops for this.
	
	routeNameTemp = sndJSON.values[0]["platform"]["direction"]["line"]["line_name"].substring(0,3) + sndJSON.values[0]["platform"]["direction"]["direction_name"];
	stopNameTemp = sndJSON.values[0]["platform"]["stop"]["location_name"];
	// Strip off the stop number if tram
	if(sndJSON.values[0]["platform"]["stop"]["transport_type"]==="tram") {
		stopNameTemp = stopNameTemp.substring(0, stopNameTemp.indexOf('#')-1);
	}
  // Get the realtime departures
	routeTempTime1 = sndJSON.values[0]["time_realtime_utc"];
	routeTempTime2 = sndJSON.values[1]["time_realtime_utc"];
	routeTempTime3 = sndJSON.values[2]["time_realtime_utc"];
	
	// If a realtime departure is null then revert to scheduled
	routeTempTime1 = ((routeTempTime1===null) ? sndJSON.values[0]["time_timetable_utc"] : routeTempTime1);
	routeTempTime2 = ((routeTempTime2===null) ? sndJSON.values[1]["time_timetable_utc"] : routeTempTime2);
	routeTempTime3 = ((routeTempTime3===null) ? sndJSON.values[2]["time_timetable_utc"] : routeTempTime3);
	
	// Convert to local time
	routeTempTime1 = new Date(routeTempTime1);
	routeTempTime2 = new Date(routeTempTime2);
	routeTempTime3 = new Date(routeTempTime3);
	
	
	console.log(routeTempTime1);
	console.log(routeTempTime2);
	console.log(routeTempTime3);
	

	sndComplete = true;
}

function specificNextDepartures(mode, line, stop, directionid, limit) {
	var params = '/mode/' + mode + '/line/' + line + '/stop/' + stop + '/directionid/' + directionid + '/departures/all/limit/' + limit + '?';
	var finalURL = getURLWithSignature(baseURL, params, devID, key);
	console.log(finalURL);
	callPTVAPI(finalURL, specificNextDeparturesCallback);
}


var locationOptions = {
  'timeout': 15000,
  'maximumAge': 60000
};

function getPTVData() {
	// Check API health then either call the other APIs or send alert back to Pebble
	healthCheck();
		
	if(healthCheckStatus) {
		// Get all data for the first 
		specificNextDepartures(modeID1, lineID1, stopID1, directionID1, limit1);
		routeName1 = routeNameTemp;
		stopName1 = stopNameTemp;
		route1Time1 = routeTempTime1;
		route1Time2 = routeTempTime2;
		route1Time3 = routeTempTime3;
		
		// Get all data for the second
		specificNextDepartures(modeID2, lineID2, stopID2, directionID2, limit2);
		routeName2 = routeNameTemp;
		stopName2 = stopNameTemp;
		route2Time1 = routeTempTime1;
		route2Time2 = routeTempTime2;
		route2Time3 = routeTempTime3;
		
		// Send dict
		sendPTVData();
		console.log("API data sent");
	} else {
		sendBadHealthCheck();
		console.log("No API data yet");
	}
}

Pebble.addEventListener('ready', function (e) {
  console.log('JS connected!');
	getPTVData();
		
});

Pebble.addEventListener('appmessage', function (e) {
  console.log('Message received from Pebble!');
	getPTVData();
});