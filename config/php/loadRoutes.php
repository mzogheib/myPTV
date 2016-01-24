<?php
include('PTVAPI.php');

$modeID = $_GET["modeID"];

// Get all routes for this modeID and decode into an array
$results = json_decode(linesByMode($modeID), true);

//echo $results[0]['line_id'];

$metroBusRouteIDs = [6851, 8485, 8490, 8488, 8486, 8489, 8484, 8483, 8452, 8462, 8482, 8457, 8507, 8487, 8114, 8142, 7440, 7472, 8272, 7441, 7442, 8122, 8118, 8174, 8263, 8177, 8074, 8135, 8139, 8128, 8399, 7445, 7446, 7462, 8275, 10870, 7461, 8080, 8243, 7522, 8084, 8700, 8681, 8682, 8680, 8677, 8615, 8606, 10830, 10836, 10842, 7891, 8125, 8132, 8308, 1657, 8767, 784, 785, 786, 8077, 5539, 789, 790, 10900, 791, 6945, 5671, 3469, 8269, 8305, 8710, 8278, 8281, 8284, 8290, 8306, 8307, 1664, 1665, 8708, 8224, 8517, 4757, 4758, 8532, 4761, 4748, 4769, 10833, 8311, 5660, 5663, 821, 822, 823, 825, 1666, 827, 10827, 8091, 8676, 8302, 8185, 4780, 8095, 834, 835, 4786, 4789, 4792, 4795, 4798, 1667, 8514, 8493, 8430, 8494, 8508, 841, 842, 5607, 5456, 844, 845, 8988, 847, 848, 5812, 850, 851, 5785, 854, 855, 4752, 7716, 1671, 857, 4755, 7719, 1673, 860, 7720, 861, 862, 8179, 6572, 5589, 865, 5540, 867, 869, 870, 8882, 8883, 8871, 7907, 8888, 8878, 8887, 8879, 8986, 5771, 5770, 5751, 884, 885, 5768, 8890, 5773, 5769, 8880, 8881, 1927, 1928, 894, 2819, 7453, 5627, 3048, 5664, 2913, 8907, 8908, 8909, 8910, 8911, 907, 908, 5728, 5729, 7849, 5731, 5732, 1507, 919, 1137, 1138, 7852, 5734, 923, 924, 925, 1935, 927, 928, 929, 4805, 931, 932, 5735, 5736, 935, 1632, 2916, 4802, 937, 939, 4547, 943, 944, 945, 2517, 946, 5214, 948, 949, 950, 3483, 952, 953, 954, 955, 8912, 957, 1173, 1174, 1175, 1176, 959, 960, 961, 962, 963, 964, 965, 8915, 4801, 3365, 2813, 970, 971, 972, 973, 974, 1150, 2808, 975, 977, 7797, 979, 980, 7700, 1143, 4663, 1516, 982, 983, 985, 986, 2342, 988, 8360, 8236, 3316, 8923, 8924, 8934, 5746, 5747, 999, 1000, 1001, 1003, 8913, 1005, 1006, 1007, 5510, 5379, 1013, 1926, 5480, 5481, 5378, 5368, 1015, 5369, 4664, 5460, 1019, 5330, 5331, 5332, 5385, 5380, 1023, 5333, 5334, 1026, 4543, 5335, 8922, 1030, 2505, 5381, 7604, 1034, 5370, 5371, 5501, 5502, 5388, 8914, 7531, 7464, 8925, 8602, 8596, 8591, 8590, 7455, 7456, 5382, 7617, 5375, 7613, 5377];

//echo ($metroBusRouteIDs);

// Go through the array, grab the line id & number, then pass back
foreach($results as $result) {
	if($modeID==2) {
		if(in_array($result['line_id'], $metroBusRouteIDs)) {
			$routes[$result['line_id']] = $result['line_number'];
		}
	}	else {
		$routes[$result['line_id']] = $result['line_number'];
	}
}

// Encode as a JSON
$jsonRoutes = json_encode($routes);

// Display for someone to use
echo $jsonRoutes;

?>