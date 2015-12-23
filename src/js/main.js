// Some variables  
var baseURL = 'http://timetableapi.ptv.vic.gov.au';
var apiVersion = '/v2';

// PT to look up
var localConfig1 = {};

var dictionary = {};
var healthCheckStatus = true;
var routeName, routeNameTemp;
var stopName, stopNameTemp;
var directionName1, directionName2, directionNameTemp;
var routeTime1, routeTime2, routeTime3, routeTempTime1, routeTempTime2, routeTempTime3;

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
		console.log("Getting new PTV data for " + localConfig1['mode_id'] + " " + localConfig1['route_id'] + " " + localConfig1['direction_id'] + " " + localConfig1['stop_id'] + " ")	
		specificNextDeparturesGTFS(localConfig1['mode_id'], localConfig1['route_id'], localConfig1['stop_id'], localConfig1['direction_id'], localConfig1['limit']);
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
	routeName = sndJSON.values[0]["platform"]["direction"]["line"]["line_name"].substring(0,3) + " " + sndJSON.values[0]["platform"]["direction"]["direction_name"];
	stopName = sndJSON.values[0]["platform"]["stop"]["location_name"];
	// Strip off the stop number if tram
	/*if(sndJSON.values[0]["platform"]["stop"]["transport_type"]==="tram") {
		stopName = stopName.substring(0, stopName.indexOf('#')-1);
	}*/

		
  // Get the realtime departures
	routeTime1 = sndJSON.values[0]["time_realtime_utc"];
	routeTime2 = sndJSON.values[1]["time_realtime_utc"];
	routeTime3 = sndJSON.values[2]["time_realtime_utc"];
	
	// If a realtime departure is null then revert to scheduled
	routeTime1 = ((routeTime1==null) ? sndJSON.values[0]["time_timetable_utc"] : routeTime1);
	routeTime2 = ((routeTime2==null) ? sndJSON.values[1]["time_timetable_utc"] : routeTime2);
	routeTime3 = ((routeTime3==null) ? sndJSON.values[2]["time_timetable_utc"] : routeTime3);
	
	// Convert to local time
	routeTime1 = new Date(routeTime1);
	routeTime2 = new Date(routeTime2);
	routeTime3 = new Date(routeTime3);
	
	//console.log(routeTime1);
	//console.log(routeTime2);
	//console.log(routeTime3);
	
	// Convert to ms sice epoch
	routeTime1 = routeTime1.getTime()/1000;
	routeTime2 = routeTime2.getTime()/1000;
	routeTime3 = routeTime3.getTime()/1000;
	
	// Add to a dictionary for the watch
	dictionary["KEY_HEALTH"] = healthCheckStatus;
	dictionary["KEY_ROUTE"] = routeName;
	dictionary["KEY_STOP"] = stopName;
	dictionary["KEY_ROUTE_TIME1"] = routeTime1;
	dictionary["KEY_ROUTE_TIME2"] = routeTime2;
	dictionary["KEY_ROUTE_TIME3"] = routeTime3;

	sendDict();
}

function specificNextDeparturesGTFS(mode, line, stop, direction, limit) {
	var params = '/mode/' + mode + '/route_id/' + line + '/stop/' + stop + '/direction/' + direction + '/departures/all/limit/' + limit + '?';
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
}

// Event listeners
Pebble.addEventListener('ready', function (e) {
  console.log('JS connected!');
 	if(localStorage.getItem('localConfig1')!=null) {
		// Call the API for the stored config
		console.log("Loading local storage: " + localStorage.getItem('localConfig1'));	
		localConfig1 = JSON.parse(localStorage.getItem('localConfig1'));
		getPTVData();
	} else {
		console.log("No local storage");
	}
});

// Message from the watch to get the PT data from the API
Pebble.addEventListener('appmessage', function (e) {
	if(localStorage.getItem('localConfig1')!=null) {
		// Call the API for the stored config
		localConfig1 = JSON.parse(localStorage.getItem('localConfig1'));
		getPTVData();
	} else {
		console.log("No local storage");
	}

});

// User has launched the config page
Pebble.addEventListener('showConfiguration', function() {
  //var url = 'http://localhost:8888/'
	var url = 'http://www.marwanz.com/ptv_db/';
  console.log('Showing configuration page: ' + url);

  Pebble.openURL(url);
});

// User has submitted the config. Store the config and call the API.
Pebble.addEventListener('webviewclosed', function(e) {
  if(e.response!='') {	
		var receivedConfig = JSON.parse(decodeURIComponent(e.response));
	  console.log('Config returned: ' + JSON.stringify(receivedConfig));

		// Save the config ids for the API call
		localConfig1 = {
			'mode_id': receivedConfig['mode_id'],
			'route_id': receivedConfig['route_id'],
			'direction_id': receivedConfig['direction_id'],
			'stop_id': receivedConfig['stop_id'],
			'limit': "3"
		};
		localStorage.setItem('localConfig1', JSON.stringify(localConfig1));
	
		// Get and send the PTV data
		getPTVData();
	} else {
		console.log("Config cancelled");
	}
});