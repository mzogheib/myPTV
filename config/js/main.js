// Run this on open.
// Loads all transport modes.
// Then, if there is local storage, preselect the stored mode, route & direction

var selectedMode = document.getElementById('select-mode-id');
var selectedRoute = document.getElementById('select-route-id');
var selectedDirection = document.getElementById('select-direction-id');
var selectedStop = document.getElementById('select-stop-id');
var storedOptions;

(function() {
  if(localStorage.getItem('options')) {
  	// Load any previously saved configuration, if available
		storedOptions = JSON.parse(localStorage.getItem('options'));
		console.log('Stored options: ', storedOptions);	
    
		// Load the mode options and select the stored mode
		loadModes();
		loadRoutes(storedOptions['mode_id']);
		loadDirections(storedOptions['mode_id'], storedOptions['route_id']);
		loadStops(storedOptions['mode_id'], storedOptions['route_id'], storedOptions['direction_id']);
	} 
	
})();

// Get the list of modes and populate
function loadModes() {
	console.log("Loading routes...");
	callScript('./php/loadModes.php', loadModesCallback);
}
function loadModesCallback(data) {
	loadOptions(data, selectedMode);
	if(storedOptions) {
		selectedMode.value = storedOptions['mode_id'];
	}
	// Reset routes & directions selectors
	resetOptions(selectedRoute);
	resetOptions(selectedDirection);
	resetOptions(selectedStop);
	
}

// Get the list of routes for this mode and populate
function loadRoutes(modeID) {
	console.log('Mode is: ' + modeID);
	callScript('./php/loadRoutes.php?modeID=' + modeID, loadRoutesCallback);
}
function loadRoutesCallback(data) {
	loadOptions(data, selectedRoute);
	if(storedOptions) {
		selectedRoute.value = storedOptions['route_id'];
	}
	// Reset directions selector
	resetOptions(selectedDirection);
	resetOptions(selectedStop);	
}

function loadDirections(modeID, routeID) {
	console.log('Route is: ' + routeID);
	callScript('./php/loadDirections.php?modeID=' + modeID + '&routeID=\'' + routeID + '\'', loadDirectionsCallback);	
}
function loadDirectionsCallback(data) {
	loadOptions(data, selectedDirection);
	if(storedOptions) {
		selectedDirection.value = storedOptions['direction_id'];
	}
	// Reset stops selector
	resetOptions(selectedStop);
}

function loadStops(modeID, routeID, directionID) {
	console.log('Direction is: ' + directionID);		
	callScript('./php/loadStops.php?modeID=' + modeID + '&routeID=\'' + routeID + '\'&directionID=' + directionID, loadStopsCallback);
}
function loadStopsCallback(data) {
	loadOptions(data, selectedStop);
	if(storedOptions) {
		selectedStop.value = storedOptions['stop_id'];
	}
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
	// Select the 'Select' option as default
	select.value = -1;
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
	
function getConfigData() {
	// These IDs correspond to those in the HTML tags
  var mode_id = document.getElementById('select-mode-id');
  var route_id = document.getElementById('select-route-id');
  var direction_id = document.getElementById('select-direction-id');
  var stop_id = document.getElementById('select-stop-id');
	  
 	// Construct the dictionary to pass back to the watch
  var options = {
    'mode_id': mode_id.options[mode_id.selectedIndex].value,
		'route_id': route_id.options[route_id.selectedIndex].value,
    'direction_id': direction_id.options[direction_id.selectedIndex].value,
		'stop_id': stop_id.options[stop_id.selectedIndex].value
  };

  // Save for next launch
	localStorage.setItem('options', JSON.stringify(options));

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
var submitButton = document.getElementById('submit_button');
submitButton.addEventListener('click', function() {
  console.log('Submit');
  // Set the return URL depending on the runtime environment
  var return_to = getQueryParam('return_to', 'pebblejs://close#');
  document.location = return_to + encodeURIComponent(JSON.stringify(getConfigData()));
});
