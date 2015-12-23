// Some variables  
var baseURL = 'http://timetableapi.ptv.vic.gov.au';
var apiVersion = '/v2';

// PT to look up
var localConfig1 = {};

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