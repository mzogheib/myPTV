<?php



// Function that returns a list of lines for a given mode
function linesByMode($modeID) {
	// Construct the url
	$params = "/lines/mode/" . $modeID . "?";
	$signedURL = getURLWithSignature($params);
		
	//echo $signedURL;
	
	// Call the API
	$response = file_get_contents($signedURL);
	
	return $response;
}

// Function that returns the two directions for a given mode and line
function directionsByLine($modeID, $lineID) {
	// Get all the stops on a line
	$stops = stopsForLine($modeID, $lineID);
		
	// For each stop, starting from the second (the first will unlikely service both directions)
	for($i=1; $i<count($stops); $i++) {
		// Call 10 broad next departures
		$stopID = $stops[$i]->stop_id;
		$bnd = json_decode(broadNextDepartures($modeID, $stopID, 10));
		// For each departure
		for($j=0; $j<count($bnd->values); $j++) {
			// If it's on the line we want, record the direction
			if($lineID == $bnd->values[$j]->platform->direction->line->line_id) {
				$dirArray[$bnd->values[$j]->platform->direction->direction_id] = $bnd->values[$j]->platform->direction->direction_name;
			}
		}
		// Get the unique values of the dirArray
		$dirArray = array_unique($dirArray);
		// If two, distinct directions are found, the break from the loop, otherwise try the next stop
		if(count($dirArray)==2 && $dirArray[0]!=$dirArray[1]) {
			break;
		}
	}
	
	return $dirArray;
}

// Function that returns an array of stop objects for a given line and mode
function stopsForLine($modeID, $lineID) {
	// Construct the url
	$params = "/mode/" . $modeID . "/line/" . $lineID . "/stops-for-line?";
	$signedURL = getURLWithSignature($params);
	//	echo $signedURL;
	
	// Call the API
	$response = json_decode(file_get_contents($signedURL));
	
	return $response;
}

function broadNextDepartures($modeID, $stopID, $limit) {
	// Construct the url
	$params = '/mode/' . $modeID . '/stop/' . $stopID . '/departures/by-destination/limit/' . $limit . '?';
	$signedURL = getURLWithSignature($params);
	
	//echo $signedURL;
	
	// Call the API
	$response = file_get_contents($signedURL);
	
	return $response;
}

// Credit: Marcus Wong, https://github.com/wongm/ptv-api-php-test-harness/blob/master/testharness.php
function getURLWithSignature($params) {
	$key = '';
	$devID = '';

	$baseURL = "http://timetableapi.ptv.vic.gov.au";
	$apiVersion = "/v2";
	
	$endPoint = $apiVersion . $params . "devid=" . $devID;
	$signature = strtoupper(hash_hmac("sha1", $endPoint, $key, false));
 
	// add API endpoint, base URL and signature together
	return $baseURL . $endPoint . "&signature=" . $signature;
}
	
?>