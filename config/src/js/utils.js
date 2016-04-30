// Disable all selectors. They eventually get enabled after the data for each is loaded.
function disableSelector(sel) {
	sel.disabled = true;
}

function enableSelector(sel) {
	sel.disabled = false;
}

// Enables the submit button and colours it. This runs when a stop is selected or after loading all localstorage.
function enableSubmit() {    
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

// Generic function to load the contents of the data variable into the select element
function loadOptions(options, select) {
    // Reset the selector
	resetOptions(select);

	// Create new options from the JSON
	for (var i = 0; i < options.length; i++) {
		select.options[i+1] = options[i];
	}

	// Select the 'Select' option as default
	select.value = -1;
	enableSelector(select);
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

// Gets what ever is at that URL
function xhr(finalURL, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", finalURL, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            callback(xhr.responseText);
        }
    }
    xhr.send();
}