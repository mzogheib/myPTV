<?php 
// Login details
$username = "ptv_readonly";
$password = "password";
$username = "root";
$password = "root";
$hostname = 'localhost';
$dbname = "PTV_GTFS";

// Connect - move this to a file
$db = mysqli_connect($hostname,$username,$password, $dbname); 
if (mysqli_connect_errno()) {
	die("Database connection failed miserably. ");
}
?>