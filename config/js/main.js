	// Run this on open.
	// Loads all transport modes.
	// Then, if there is local storage, preselect the stored mode, route & direction
  (function() {
		// Mode options will be loaded regardless of stored values
		console.log("Running scripts");
		loadModes();
    if(localStorage['mode_id']) {
    	// Load any previously saved configuration, if available
			var options = JSON.parse(localStorage.getItem('options'));
			console.log('Stored options: ', options);	
	    
			// Select the stored mode
			var mode_id = document.getElementById('select-mode-id');
			mode_id.value = options['mode_id'];
	    
			// Load the route options and select the stored route
			loadRoutes(mode_id);
			var route_id = document.getElementById('select-route-id');
			route_id.value = options['route_id'];	
			
			// Load the direction options and select the stored direction
			loadDirections(route_id);
	    var direction_id = document.getElementById('select-direction-id');
			direction_id.value = options['direction_id'];
		} 
		
  })();

	// Get the list of modes and populate
	function loadModes() {
		console.log("Loading routes...");
		callScript('./php/loadModes.php', loadModesCallback);
	}
	function loadModesCallback(data) {
		loadOptions(data, document.getElementById("select-mode-id"));
		// Reset routes & directions selectors
		resetOptions(document.getElementById("select-route-id"))
		resetOptions(document.getElementById("select-direction-id"))
		resetOptions(document.getElementById("select-stop-id"))
		
	}
	
	// Get the list of routes for this mode and populate
	function loadRoutes(sel) {
		console.log('Mode is: ' + sel.value);
		callScript('./php/loadRoutes.php?modeID=' + sel.value, loadRoutesCallback);
	}
	function loadRoutesCallback(data) {
		loadOptions(data, document.getElementById("select-route-id"));
		// Reset directions selector
		resetOptions(document.getElementById("select-direction-id"))
		resetOptions(document.getElementById("select-stop-id"))
		
	}
	
	function loadDirections(sel) {
		console.log('Route is: ' + sel.value);
		mode_id = document.getElementById('select-mode-id');
		console.log(mode_id.value);
		console.log(sel.value);
			
		callScript('./php/loadDirections.php?modeID=' + mode_id.value + '&routeID=\'' + sel.value + '\'', loadDirectionsCallback);
		
	}
	function loadDirectionsCallback(data) {
		console.log(data);
		loadOptions(data, document.getElementById("select-direction-id"));
		// Reset stops selector
		resetOptions(document.getElementById("select-stop-id"))
	}
	
	function loadStops(sel) {
		console.log('Direction is: ' + sel.value);
		mode_id = document.getElementById('select-mode-id');
		route_id = document.getElementById('select-route-id');
		console.log(mode_id.value);
		console.log(route_id.value);
		console.log(sel.value);
			
		callScript('./php/loadStops.php?modeID=' + mode_id.value + '&routeID=\'' + route_id.value + '\'&directionID=' + sel.value, loadStopsCallback);
		
	}
	function loadStopsCallback(data) {
		console.log(data);
		loadOptions(data, document.getElementById("select-stop-id"));
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
