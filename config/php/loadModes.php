<?php
include('dbConnect.php');

$modes['2'] = "Train";
$modes['3'] = "Tram";
$modes['4'] = "Bus";
$modes['8'] = "Night Rider";

$modes['1'] = "V/Line - Train";
$modes['5'] = "V/Line - Coach";

$modes['11'] = "Sky Bus";

$modes['6'] = "Regional Bus";
$modes['7'] = "Telebus";
$modes['10'] = "Overland";



// Encode as a JSON
$jsonModes = json_encode($modes);

include('dbDisconnect.php');


echo $jsonModes;
?>