// Some variables  
var baseURL = 'http://timetableapi.ptv.vic.gov.au';
var apiVersion = '/v2';

// PT to look up
var modeID;
var lineID;
var stopID;
var directionID;
var limit = 3;

var dictionary;
var healthCheckStatus = true;
var routeName, routeNameTemp;
var stopName, stopNameTemp;
var directionName1, directionName2, directionNameTemp;
var routeTime1, routeTime2, routeTime3, routeTempTime1, routeTempTime2, routeTempTime3;

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
		"KEY_ROUTE": routeName,
		"KEY_STOP": stopName,
		"KEY_ROUTE_TIME1": routeTime1,
		"KEY_ROUTE_TIME2": routeTime2,
		"KEY_ROUTE_TIME3": routeTime3
	};
	sendDict();
	// Reset all variables
	healthCheckStatus = "";
	routeName = "";
	stopName = "";
	routeTime1 = "";
	routeTime2 = "";
	routeTime3 = "";
	
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
	
	routeName = sndJSON.values[0]["platform"]["direction"]["line"]["line_name"].substring(0,3) + sndJSON.values[0]["platform"]["direction"]["direction_name"];
	stopName = sndJSON.values[0]["platform"]["stop"]["location_name"];
	// Strip off the stop number if tram
	if(sndJSON.values[0]["platform"]["stop"]["transport_type"]==="tram") {
		stopName = stopName.substring(0, stopName.indexOf('#')-1);
	}
  // Get the realtime departures
	routeTime1 = sndJSON.values[0]["time_realtime_utc"];
	routeTime2 = sndJSON.values[1]["time_realtime_utc"];
	routeTime3 = sndJSON.values[2]["time_realtime_utc"];
	
	// If a realtime departure is null then revert to scheduled
	routeTime1 = ((routeTime1===null) ? sndJSON.values[0]["time_timetable_utc"] : routeTime1);
	routeTime2 = ((routeTime2===null) ? sndJSON.values[1]["time_timetable_utc"] : routeTime2);
	routeTime3 = ((routeTime3===null) ? sndJSON.values[2]["time_timetable_utc"] : routeTime3);
	
	// Convert to local time
	routeTime1 = new Date(routeTime1);
	routeTime2 = new Date(routeTime2);
	routeTime3 = new Date(routeTime3);
	
	console.log(routeTime1);
	console.log(routeTime2);
	console.log(routeTime3);
	
	routeTime1 = routeTime1.getTime()/1000;
	routeTime2 = routeTime2.getTime()/1000;
	routeTime3 = routeTime3.getTime()/1000;
	

	sndComplete = true;
}

function specificNextDeparturesGTFS(mode, line, stop, directionid, limit) {
	var params = '/mode/' + mode + '/route_id/' + line + '/stop/' + stop + '/direction/' + directionid + '/departures/all/limit/' + limit + '?';
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
		// Get all data  
		specificNextDeparturesGTFS(modeID, lineID, stopID, directionID, limit);			
		// Send dict
		sendPTVData();
		console.log("API data sent");
	} else {
		sendBadHealthCheck();
		console.log("No API data yet");
	}
}

// Sends a dictionary with only a bad health check result
function sendRequestFor() {
	console.log("Sending bad health check to Pebble");
	// Assemble dictionary
	dictionary = {
		"KEY_HEALTH": healthCheckStatus
	};
	sendDict();
}

// Event listeners
Pebble.addEventListener('ready', function (e) {
  console.log('JS connected!');	
		
});

// Message from the watch to get the PT data from the API
Pebble.addEventListener('appmessage', function (e) {
	// Get the user selected PTV data
	var configData = JSON.stringify(e.payload);
	console.log("Config data sent from watch: " + configData);
	modeID = e.payload['KEY_MODE_ID'];
	lineID = e.payload['KEY_ROUTE_ID'];
	directionID = e.payload['KEY_DIRECTION_ID'];
	stopID = e.payload['KEY_STOP_ID'];
	
	getPTVData();
});

// User has launched the config page
Pebble.addEventListener('showConfiguration', function() {
  //var url = 'http://0.0.0.0:8080/'
	var url = 'http://gethektik.com/Pebble/myPTV/';
  console.log('Showing configuration page: ' + url);

  Pebble.openURL(url);
});

// User has submitted the config. Send it to the watch.
Pebble.addEventListener('webviewclosed', function(e) {
  var configData = JSON.parse(decodeURIComponent(e.response));
  console.log('Configuration page returned: ' + JSON.stringify(configData));

	// Create a dict from the configData passed by the user
  var dict = {};
  dict['KEY_MODE_ID'] = configData['mode_id'];
  dict['KEY_ROUTE_ID'] = configData['route_id'];
  dict['KEY_DIRECTION_ID'] = configData['direction_id'];
  dict['KEY_STOP_ID'] = configData['stop_id'];

  // Send to watchapp
  Pebble.sendAppMessage(dict, function() {
    console.log('Config sent successfully: ' + JSON.stringify(dict));
  }, function() {
    console.log('Config not sent!');
  });
});