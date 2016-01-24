<?php
include('PTVAPI.php');

$modeID = $_GET["modeID"];
$routeID = $_GET["routeID"];
$directionID = $_GET["directionID"];

$results = stopsForLine($modeID, $routeID);

// Go through the array, grab the line id & number, then pass back
foreach($results as $result) {
	$stops[$result->stop_id] = array("stop_lat" => $result->lat, "stop_lon" => $result->lon);
}

$jsonStops = json_encode($stops);

echo $jsonStops;
?>