<?php
include('dbConnect.php');

$modeID = $_GET["modeID"];
//echo "ModeID: " . $modeID . "\n";

// Choose the table based on the modeID
switch ($modeID) {
    case '3':
        $table = 'routes3';
        break;
    case '4':
    		$table = 'routes4';
        break;
    case '7':
    		$table = 'routes7';
        break;
    case '8':
   	 		$table = 'routes8';
        break;
}

// Get all routes for this modeID
$result = mysqli_query($db, "SELECT * FROM " . $table);
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