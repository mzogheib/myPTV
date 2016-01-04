<?php
include('dbConnect.php');

$modeID = $_GET["modeID"];
$routeID = $_GET["routeID"];

// Get all routes for this modeID
$result = mysqli_query($db, "SELECT DISTINCT * FROM trips" . $modeID . " WHERE route_id = " . $routeID);

// get distinct trip_headsigns from trips table. Then get the text after the 'to'.
// Each table may have to be handled differently

// Save rows into an array
while ($row = mysqli_fetch_object($result)) {
	$directions[$row->direction_id] = $row->trip_headsign;
	
}
// Encode as a JSON
$jsonDirections = json_encode($directions);

//echo "<script>console.log(\"Query result: \"" . $jsonDirections . ");</script>";

// Free results and close the DB
mysqli_free_result($result);
include('dbDisconnect.php');

echo $jsonDirections;
?>