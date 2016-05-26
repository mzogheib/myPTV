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

// Gets what ever is at that URL
function xhr(finalURL) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", finalURL);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function () {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
    });
}