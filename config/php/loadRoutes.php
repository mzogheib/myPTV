<?php
include('dbConnect.php');

$modeID = $_GET["modeID"];

// Get all routes for this modeID
$result = mysqli_query($db, "SELECT * FROM routes" .$modeID);
// Save rows into an array
while ($row = mysqli_fetch_object($result)) {
	$routes[$row->route_id] = $row->route_short_name; 
}
// Encode as a JSON
$jsonRoutes = json_encode($routes);

// Free results and close the DB
mysqli_free_result($result);
include('dbDisconnect.php');

// Display for someone to use
echo $jsonRoutes;

?>