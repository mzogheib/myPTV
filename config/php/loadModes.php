<?php
include('dbConnect.php');

$modes['3'] = "Tram";
$modes['4'] = "Bus";
$modes['7'] = "Tele Bus";
$modes['8'] = "Night Rider";

// Encode as a JSON
$jsonModes = json_encode($modes);

include('dbDisconnect.php');


echo $jsonModes;
?>