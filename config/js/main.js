// Some variables
var selectObjMode = document.getElementById('select-mode-id');
var selectObjRoute = document.getElementById('select-route-id');
var selectObjDirection = document.getElementById('select-direction-id');
var submitButton = document.getElementById('submit-button');
var storedOptions;

var allStops = [];

// Run this on open.
(function() {
	// Disable the submit button until all options have been selected
	disableSubmit();
	//localStorage.clear();

	if(localStorage.getItem('options')) {
  	// Load any previously saved configuration, if available		
		storedOptions = JSON.parse(localStorage.getItem('options'));
		console.log('Stored options: ', storedOptions);	
   
		// Load all options and select the stored option. 
		// Doing this to improve performance (i.e. no db query) but if the list in the db changes in future then this local list will not be aligned
		loadOptions((localStorage.getItem('options_list_mode')), selectObjMode);
		loadOptions((localStorage.getItem('options_list_route')), selectObjRoute);
		loadOptions((localStorage.getItem('options_list_direction')), selectObjDirection);
		
		selectObjMode.value = storedOptions['modeID'];
		selectObjRoute.value = storedOptions['routeID'];
		selectObjDirection.value = storedOptions['directionID'];
		
		enableSubmit();
	} else {
		// Otherwise just load the modes and the user will begin selecting
		loadModes();
	}
	
})();

// Get the list of modes and populate
function loadModes() {
	console.log("Loading routes...");
	callScript('./php/loadModes.php', loadModesCallback);
}
function loadModesCallback(data) {
	loadOptions(data, selectObjMode);

	// Reset routes & directions selectors
	resetOptions(selectObjRoute);
	resetOptions(selectObjDirection);
}

// Get the list of routes for this mode and populate
function loadRoutes(modeID) {
	disableSubmit();
	
	console.log('Mode is: ' + modeID);
	callScript('./php/loadRoutes.php?modeID=' + modeID, loadRoutesCallback);
}
function loadRoutesCallback(data) {
	console.log("Route data received is type: " + typeof(data) + ", and value: " + data);
	
	loadOptions(data, selectObjRoute);

	// Reset directions selector
	resetOptions(selectObjDirection);
}

function loadDirections(modeID, routeID) {
	disableSubmit();
	
	console.log('Route is: ' + routeID);
	callScript('./php/loadDirections.php?modeID=' + modeID + '&routeID=\'' + routeID + '\'', loadDirectionsCallback);	
}
function loadDirectionsCallback(data) {
	console.log("Direction data received is type: " + typeof(data) + ", and value: " + data);

	loadOptions(data, selectObjDirection);
}

// The stop object
function Stop(stopID, stopLat, stopLon) {
	this.stopID = stopID;
	this.stopLat = stopLat;
	this.stopLon = stopLon;
}

// Gets all the stops for a mode, route and direction. Saves into an array that will be passed back to the phone when submit is pressed (below)
function loadStops(modeID, routeID, directionID) {
	disableSubmit();
	
	console.log('Direction is: ' + directionID);		
	callScript('./php/loadStops.php?modeID=' + modeID + '&routeID=\'' + routeID + '\'&directionID=' + directionID, loadStopsCallback);
}
function loadStopsCallback(data) {
	console.log("Stop data received is type: " + typeof(data) + ", and value: " + data);

	var allStopsObj = JSON.parse(data);
	//console.log(allStopsObj);
	for(var stopID in allStopsObj) {
		var lat = allStopsObj[stopID].stop_lat;
		var lon = allStopsObj[stopID].stop_lon;
		//console.log("Lat: " + lat + " Lon: " + lon);
		allStops.push(new Stop(stopID, lat, lon));
	}

	enableSubmit();
}

// Disable all selectors. They eventually get enabled after the data for each is loaded.
function disableSelector(sel) {
	sel.disabled = true;
}

function enableSelector(sel) {
	sel.disabled = false;
}

// Enables the submit button and colours it. This runs when a stop is selected or after loading all localstorage.
function enableSubmit() {
	console.log("Checking direction selection: " + selectObjDirection.value);
	if(selectObjDirection.value==-1) {
		disableSubmit();
	} else {
		console.log("Enabling Submit");
		submitButton.disabled = false;
		submitButton.style.backgroundColor = '#FF4700'; 
	}
}

// Disables the submit button and greys it out.
function disableSubmit() {
	console.log("Disabling Submit");
	submitButton.disabled = true;
	submitButton.style.backgroundColor = 'rgb(136, 136, 136)'; 
}

// Deletes existing options and adds a prompting 'Select' at the start
function resetOptions(select) {
	select.options.length=0;
	select.options[0] = new Option("Select", -1);
}

// Generic function to load the contents of the data variable (returned from a PHP script) into the select element
function loadOptions(data, select) {
	var json = JSON.parse(data);
	// Reset the selector
	resetOptions(select);
	// Add new options after the 'Select' value
	var i = 1;
	// Create new options from the JSON
	for (var memberID in json) {
		select.options[i] = new Option(json[memberID], memberID)
		i++;
	}
	console.log("Loaded options: " + data);
	// Select the 'Select' option as default
	select.value = -1;
}

// Takes the options from a select object and creates an object out of them
function objectifyOptions(select) {
	var opts = select.getElementsByTagName('option');
	var len = opts.length;
	
	var optionsObj = {};
	var optionValue, optionText;
	
	// Start at the second option since the first (0) is 'Select'
	for(var i = 1; i<len; i++) {
		console.log(opts[i]);
		optionValue = opts[i].value;
		optionText = opts[i].text;
		optionsObj[optionValue] = optionText;
	}
	
	return optionsObj;
}

// Calls the PHP script at the specified URL
function callScript(finalURL, callback) {
 var xhr = new XMLHttpRequest();
  xhr.open("GET", finalURL, true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4 && xhr.status == 200) {
      callback(xhr.responseText);
    } 
  }
  xhr.send();
}

// Runs after the submit button is pressed to grab all the selected options
function getConfigData() {
 	// Construct the dictionary to pass back to the watch
  var options = {
    'modeID': selectObjMode.options[selectObjMode.selectedIndex].value,
		'routeID': selectObjRoute.options[selectObjRoute.selectedIndex].value,
    'directionID': selectObjDirection.options[selectObjDirection.selectedIndex].value,
		'allStops': allStops, 
		'limit': 3 /* hard coded for now */
  };

  // Clear existing local storage and save for next launch
	localStorage.clear();
	
	localStorage.setItem('options', JSON.stringify(options));
	localStorage.setItem('options_list_mode', JSON.stringify(objectifyOptions(selectObjMode)));
	localStorage.setItem('options_list_route', JSON.stringify(objectifyOptions(selectObjRoute)));
	localStorage.setItem('options_list_direction', JSON.stringify(objectifyOptions(selectObjDirection)));

  console.log('Got options: ' + JSON.stringify(options));
  return options;
}

function getQueryParam(variable, defaultValue) {
  var query = location.search.substring(1);
  var vars = query.split('&');
  for (var i = 0; i < vars.length; i++) {
    var pair = vars[i].split('=');
    if (pair[0] === variable) {
      return decodeURIComponent(pair[1]);
    }
  }
  return defaultValue || false;
}

// Send the config values after the submit button is pressed
var submitButton = document.getElementById('submit-button');
submitButton.addEventListener('click', function() {
  console.log('Submit');
  // Set the return URL depending on the runtime environment
  var return_to = getQueryParam('return_to', 'pebblejs://close#');
  document.location = return_to + encodeURIComponent(JSON.stringify(getConfigData()));
});
