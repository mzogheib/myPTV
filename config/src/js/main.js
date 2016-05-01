/* Global Variables */
var selectObjMode = document.getElementById('select-mode-id');
var selectObjRoute = document.getElementById('select-route-id');
var selectObjDirection = document.getElementById('select-direction-id');
var submitButton = document.getElementById('submit-button');

var storedOptions;

var allStops = [];
var allStopsTemp = [];
var allDirections = [];

/* 
** PTV API specific functions 
*/

var baseURL = 'http://timetableapi.ptv.vic.gov.au';
var apiVersion = '/v2';

// Returns the complete API URL with calculated signature
function getURLWithSignature(baseURL, params, devID, key) {
    var endPoint = apiVersion + params + 'devid=' + devID;
    var signature = CryptoJS.HmacSHA1(endPoint, key);
    
    return baseURL + endPoint + '&signature=' + signature.toString();
}

// Health Check
function healthCheckURL() {
    var date = new Date();
    var params = '/healthcheck?timestamp=' + date.toISOString();
    var finalURL = getURLWithSignature(baseURL, params, devID, key);
    
    // console.log("Health Check URL: " + finalURL);
    
    return finalURL;
}

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
    	console.log("Health check passed.")
    } else {
    	console.log("Health check failed.")
    }
}

// Lines by Mode. Using the term 'line' in the function name for consitency but will use 'route' elsewhere
function linesByModeURL(modeID) {
    var params = '/lines/mode/' + modeID + '?';
    var finalURL = getURLWithSignature(baseURL, params, devID, key);
    console.log(finalURL);

    return finalURL;	
}

function linesByModeCallback(data) {
    // Hard coding the metro bus IDs because the PTV API combines these with regional busses, which we want to separate
    var metroBusIDs = [6851, 8485, 8490, 8488, 8486, 8489, 8484, 8483, 8452, 8462, 8482, 8457, 8507, 8487, 8114, 8142, 7440, 7472, 8272, 7441, 7442, 8122, 8118, 8174, 8263, 8177, 8074, 8135, 8139, 8128, 8399, 7445, 7446, 7462, 8275, 10870, 7461, 8080, 8243, 7522, 8084, 8700, 8681, 8682, 8680, 8677, 8615, 8606, 10830, 10836, 10842, 7891, 8125, 8132, 8308, 1657, 8767, 784, 785, 786, 8077, 5539, 789, 790, 10900, 791, 6945, 5671, 3469, 8269, 8305, 8710, 8278, 8281, 8284, 8290, 8306, 8307, 1664, 1665, 8708, 8224, 8517, 4757, 4758, 8532, 4761, 4748, 4769, 10833, 8311, 5660, 5663, 821, 822, 823, 825, 1666, 827, 10827, 8091, 8676, 8302, 8185, 4780, 8095, 834, 835, 4786, 4789, 4792, 4795, 4798, 1667, 8514, 8493, 8430, 8494, 8508, 841, 842, 5607, 5456, 844, 845, 8988, 847, 848, 5812, 850, 851, 5785, 854, 855, 4752, 7716, 1671, 857, 4755, 7719, 1673, 860, 7720, 861, 862, 8179, 6572, 5589, 865, 5540, 867, 869, 870, 8882, 8883, 8871, 7907, 8888, 8878, 8887, 8879, 8986, 5771, 5770, 5751, 884, 885, 5768, 8890, 5773, 5769, 8880, 8881, 1927, 1928, 894, 2819, 7453, 5627, 3048, 5664, 2913, 8907, 8908, 8909, 8910, 8911, 907, 908, 5728, 5729, 7849, 5731, 5732, 1507, 919, 1137, 1138, 7852, 5734, 923, 924, 925, 1935, 927, 928, 929, 4805, 931, 932, 5735, 5736, 935, 1632, 2916, 4802, 937, 939, 4547, 943, 944, 945, 2517, 946, 5214, 948, 949, 950, 3483, 952, 953, 954, 955, 8912, 957, 1173, 1174, 1175, 1176, 959, 960, 961, 962, 963, 964, 965, 8915, 4801, 3365, 2813, 970, 971, 972, 973, 974, 1150, 2808, 975, 977, 7797, 979, 980, 7700, 1143, 4663, 1516, 982, 983, 985, 986, 2342, 988, 8360, 8236, 3316, 8923, 8924, 8934, 5746, 5747, 999, 1000, 1001, 1003, 8913, 1005, 1006, 1007, 5510, 5379, 1013, 1926, 5480, 5481, 5378, 5368, 1015, 5369, 4664, 5460, 1019, 5330, 5331, 5332, 5385, 5380, 1023, 5333, 5334, 1026, 4543, 5335, 8922, 1030, 2505, 5381, 7604, 1034, 5370, 5371, 5501, 5502, 5388, 8914, 7531, 7464, 8925, 8602, 8596, 8591, 8590, 7455, 7456, 5382, 7617, 5375, 7613, 5377];
    // Data will be parsed as an array of line objects
    var routes = JSON.parse(data);

    // Create options for each route.
    var options = [];
    for(var i=0; i<routes.length; i++) {	
        // For busses, only add metro busses
        if(routes[i].route_type == 2) {
            if(metroBusIDs.indexOf(routes[i].line_id)>=0) {
                options.push(new Option(routes[i].line_number, routes[i].line_id));
            }
        } else {
            options.push(new Option(routes[i].line_number, routes[i].line_id));
        }
    }

    // Load the line options into the selector
    loadOptions(options, selectObjRoute);

    // If there is a stored route selection then preselect it and load its directions
    if(storedOptions) {
        selectObjRoute.value = storedOptions['routeID'];
        loadDirections(selectObjMode.value, selectObjRoute.value);
    }

    // Reset directions selector
    resetOptions(selectObjDirection);
}

// Stops on a Line
function stopsOnALineURL(modeID, lineID) {
    var params = '/mode/' + modeID + '/line/' + lineID + '/stops-for-line?';
    var finalURL = getURLWithSignature(baseURL, params, devID, key);
    console.log(finalURL);

    return finalURL;
}

function stopsOnALineCallback(data) {
    // Data will be parsed as an array of stop 
    var stops = JSON.parse(data);
    
    // Save to the global array, which will get passed back to the 
    for(var i=0; i<stops.length; i++) {
        allStops.push(new Stop(stops[i].stop_id, stops[i].lat, stops[i].lon));
        allStopsTemp.push(new Stop(stops[i].stop_id, stops[i].lat, stops[i].lon));
    }
    console.log("Stops: " + allStopsTemp);
	
    // Select a stop 
    // allStopsTemp.pop();
    console.log("Last stop: " + allStopsTemp[allStopsTemp.length-1].stopID);
    xhr(broadNextDeparturesURL(selectObjMode.options[selectObjMode.selectedIndex].value, allStopsTemp[allStopsTemp.length-1].stopID, 10), broadNextDeparturesCallback);
}

// Broad Next Departures
function broadNextDeparturesURL(modeID, stopID, limit) {
    var params = '/mode/' + modeID + '/stop/' + stopID + '/departures/by-destination/limit/' + limit + '?';
    var finalURL = getURLWithSignature(baseURL, params, devID, key);
    console.log(finalURL);
    
    return finalURL;
}

function broadNextDeparturesCallback(data) {
    // Data will be parsed as an object containing one array ('values') of nested objects
    var departures = JSON.parse(data);
    
    // Get all direction details for the departures on the selected route
    for(var i=0; i<departures.values.length; i++) {
        // If on the selected route
        if(selectObjRoute.options[selectObjRoute.selectedIndex].value == departures.values[i].platform.direction.line.line_id) {
            // Create a direction object
            var dir = new Option(departures.values[i].platform.direction.direction_name, departures.values[i].platform.direction.direction_id);
            console.log("Checking direction: " + dir.text);
            // If direction has not already been captured
            if(containsDirection(dir, allDirections)) {
                console.log("Already found direction: " + dir.text);
            } else {
                console.log("Adding direction: " + dir.text);
                allDirections.push(dir);
            }
        }
    }
    
    // If two directions were found then load to the selector. Else, try the next stop.
    if(allDirections.length == 2) {
        loadOptions(allDirections, selectObjDirection);
        
        // If there is a stored direction selection then preselect it
        if(storedOptions) {
            selectObjDirection.value = storedOptions['directionID'];
            directionSelected(selectObjDirection.value);
            // Clear local storage so that subsequent selections during this session don't try and reload saved options
            localStorage.clear();
        }
    } else {
        allStopsTemp.pop();
        // If we've checked all stops
        if(allStopsTemp.length==0) {
            // Either only one direction exists (e.g. circular route) or none
            loadOptions(allDirections, selectObjDirection);
        } else {
            // Keep checking other stops
            xhr(broadNextDeparturesURL(selectObjMode.options[selectObjMode.selectedIndex].value, allStopsTemp[allStopsTemp.length-1].stopID, 10), broadNextDeparturesCallback);
        }
    }
}

/* 
** Convenience functions 
*/

function containsDirection(dir, list) {
    var i;

    console.log("Array length: " + list.length);
    for (i = 0; i < list.length; i++) {
        if (list[i].value == dir.value) {
            return true;
        }
    }

    return false;
}

// Mode
function Mode(modeID, modeName) {
    this.modeID = modeID;
    this.modeName = modeName;
}

// Route
function Route(routeID, routeName) {
    this.routeID = routeID;
    this.routeName = routeName;
}

// Direction
function Direction(directionID, directionName) {
    this.directionID = directionID;
    this.directionName = directionName;
}

// Stop
function Stop(stopID, stopLat, stopLon) {
    this.stopID = stopID;
    this.stopLat = stopLat;
    this.stopLon = stopLon;
}

// Run this on open.
(function() {
    // Disable the submit button until all options have been selected
    disableSubmit();
    // localStorage.clear();
    
    // Do a health check. 
    xhr(healthCheckURL(), healthCheckCallback);
    
    // Load any previously saved configuration, if available		
    storedOptions = JSON.parse(localStorage.getItem('options'));
    console.log('Stored options: ', storedOptions);
    
    loadModes();
})();


// Get the list of modes and populate. Called on page load.
function loadModes() {
    console.log("Loading modes...");
    var options = [];

    options[0] = new Option("Train", 0);
    options[1] = new Option("Tram", 1);
    options[2] = new Option("Bus", 2);
    options[3] = new Option("V/Line", 3);
    options[4] = new Option("Nightrider", 4);
    
    // Load the mode options into the selector
    loadOptions(options, selectObjMode);
    
    // If there is a stored mode selection then preselect it and load its routes
    if(storedOptions) {
        selectObjMode.value = storedOptions['modeID'];
        loadRoutes(selectObjMode.value);
    }
    
    // Reset routes & directions selectors
    resetOptions(selectObjRoute);
    resetOptions(selectObjDirection);
    disableSelector(selectObjRoute);
    disableSelector(selectObjDirection);	
}

// Get the list of routes for this mode and populate. Called when a mode is selected.
function loadRoutes(modeID) {
    disableSubmit();
    resetOptions(selectObjRoute);
    resetOptions(selectObjDirection);
    disableSelector(selectObjRoute);
    disableSelector(selectObjDirection);
    
    // If 'Select' is selected then reset everything below.
    if(modeID == -1) {
	
    } else {
        console.log('Mode is: ' + modeID);
        xhr(linesByModeURL(modeID), linesByModeCallback);
    }
}

// Get the list of directions for this mode and route and populate. Called when a route is selected.
function loadDirections(modeID, routeID) {
    disableSubmit();
    resetOptions(selectObjDirection);
    disableSelector(selectObjDirection);
    
    allStops = [];
    allStopsTemp = [];
    allDirections = [];
    
    // If 'Select' is selected then reset everything below.
    if(modeID == -1 || routeID == -1) {
        
    } else {
        console.log('Route is: ' + routeID);
        xhr(stopsOnALineURL(modeID, routeID), stopsOnALineCallback);
    }
}

// Direction has just been chosen, check if Submit should be enabled
function directionSelected(directionID) {
    directionID == -1 ? disableSubmit() : enableSubmit();
    getConfigData();
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
submitButton.addEventListener('click', function() {
    // Set the return URL depending on the runtime environment
    var return_to = getQueryParam('return_to', 'pebblejs://close#');
    
    document.location = return_to + encodeURIComponent(JSON.stringify(getConfigData()));
});
