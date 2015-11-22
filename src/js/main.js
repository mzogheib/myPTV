// Some variables  
var baseURL = 'http://timetableapi.ptv.vic.gov.au';
var apiVersion = '/v2';

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

	console.log("Doing Health Check");
  // Call the API and provide a callback to handle the return data
  callPTVAPI(finalURL, healthCheckCallback);
}

// Callback to handle the data returned from Health Check API
function healthCheckCallback(data) {
	var healthCheckStatus = true;
	var healthJSON = JSON.parse(data);
	
	// If any of the helth check JSON members are false the health is not ok, i.e. false
  for(var member in healthJSON) {
		console.log(member + ": " + healthJSON[member]);
  	if(healthJSON[member]===false) {
  		healthCheckStatus = false;
  	}
  }
	
	console.log("Health Check: " + healthCheckStatus);
}

// Callback to handle the data returned from the Specific Next Departures API
function specificNextDeparturesCallback(data) {
	var sndJSON = JSON.parse(data);

	// If realtime data is 0 then revert to scheduled time and send a disclaimer
  
	var time1 = new Date(sndJSON.values[0]["time_realtime_utc"]);
	var time2 = new Date(sndJSON.values[1]["time_realtime_utc"]);
	var time3 = new Date(sndJSON.values[2]["time_realtime_utc"]);
	
	console.log(time1.getTime()/1000);
	console.log(time2.getTime()/1000);
	console.log(time3.getTime()/1000);
	
	
	// Assemble dictionary
  var dictionary = {
    "KEY_ROUTE": "86",
		"KEY_TIME1": time1.getTime()/1000,
		"KEY_TIME2": time2.getTime()/1000,
		"KEY_TIME3": time3.getTime()/1000
  };
  // Send to Pebble
  Pebble.sendAppMessage(dictionary,
    function(e) { console.log("Message sent to Pebble successfully!"); },
    function(e) { console.log("Error sending weather info to Pebble!"); }
  );

		
		
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

Pebble.addEventListener('ready', function (e) {
  console.log('JS connected!');

	// Check the PTV api on start up
	healthCheck();
	

	
});

Pebble.addEventListener('appmessage', function (e) {
  console.log('Message received from Pebble!');
	// Get next tram
	specificNextDepartures(1, 1881, 2075, 27, 3);
	
});