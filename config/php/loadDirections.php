<?php
include('PTVAPI.php');



$modeID = $_GET["modeID"];
$routeID = $_GET["routeID"];

// Get all directions for this modeID and routeID
//$results = json_decode(directionsByLine($modeID, $routeID), true);

$directions = directionsByLine($modeID, $routeID);



// get distinct trip_headsigns from trips table. Then get the text after the 'to'.
// Each table may have to be handled differently

// Save rows into an array

// Encode as a JSON
$jsonDirections = json_encode($directions);

echo $jsonDirections;

?>