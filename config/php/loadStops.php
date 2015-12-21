<?php
include('dbConnect.php');

// Not doing anything with this for now
$modeID = $_GET["modeID"];
$routeID = $_GET["routeID"];
$directionID = $_GET["directionID"];

// The query to get all stops on this route in this direction
$stops = "stops".$modeID;
$stop_times = "stop_times".$modeID;
$trips = "trips".$modeID;

$query = "
	SELECT DISTINCT ".$stops.".stop_id, ".$stops.".stop_name, ".$stops.".stop_lat, ".$stops.".stop_lon 
	FROM ".$stops."
	INNER JOIN ".$stop_times."
	ON ".$stops.".stop_id = ".$stop_times.".stop_id
	INNER JOIN ".$trips."
	ON ".$stop_times.".trip_id = ".$trips.".trip_id
	WHERE ".$stop_times.".trip_id = ".$trips.".trip_id
	AND ".$trips.".route_id = ".$routeID."
	AND ".$trips.".direction_id = 0
	ORDER BY ".$stops.".stop_name
	";

	//echo $query.'<br><br>';

// Get all routes for this modeID
$result = mysqli_query($db, $query);

// get distinct trip_headsigns from trips table. Then get the text after the 'to'.
// Each table may have to be handled differently

// Save rows into an array
while ($row = mysqli_fetch_object($result)) {
	$stop_list[$row->stop_id] = $row->stop_name;
	
}
// Encode as a JSON
$jsonStop_list = json_encode($stop_list);

//echo "<script>console.log(\"Query result: \"" . $jsonDirections . ");</script>";

// Free results and close the DB
mysqli_free_result($result);
include('dbDisconnect.php');

echo $jsonStop_list;
?>