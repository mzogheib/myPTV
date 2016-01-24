<?php

$modes[0] = "Train";

$modes[1] = "Tram";

$modes[2] = "Bus";

$modes[3] = "V/Line";

$modes[4] = "Nightrider";

// Encode as a JSON
$jsonModes = json_encode($modes);

echo $jsonModes;
?>