<?php

require_once 'vendor/autoload.php';
require_once 'config.php';

date_default_timezone_set('America/Argentina/Buenos_Aires'); 
set_time_limit(99000);
ini_set('memory_limit','2048M');
 
use InfluxDB\Point;

$startTime = time();

$client = new InfluxDB\Client(Config::DB_HOST, Config::DB_PORT);
$database = $client->selectDB(Config::DB_NAME);		

//$result = $database->query('SELECT COUNT(*) from "stats" ');

$result = $database->query('SELECT * from "stats" where time > now() - 120d order by time desc ');

//Removed 2511 of 2775 points in 183 seconds
//Removed 15466 of 16167 points in 1339 seconds (10d)
// (30d)Removed 50373 of 52325 points in 5059 seconds
// (60d) Removed 75894 of 79226 points in 7997 seconds
// (80d) Removed 27446 of 31748 points in 3155 seconds
// (100d) Removed 51570 of 57453 points in 5607 seconds
// (120d) Removed 43054 of 50016 points in 4561 seconds
// (130d)  Removed 37167 of 44960 points in 4219 seconds
// (140d) Removed 38289 of 47028 points in 4334 seconds
// (160d) Removed 72548 of 82908 points in 8783 seconds
// (180d) Removed 76262 of 88178 points in 8812 seconds
// (210d) Removed 114414 of 129395 points in 14083 seconds
// (240d) (290d) Removed 290 of 19556 points in 29 seconds
//320d

echo '<pre>';
$serie = $result->getSeries()[0];

$timePos = array_search("time", $serie['columns']);
$namePos = array_search("name", $serie['columns']);
$platformPos = array_search("platform", $serie['columns']);
$modePos = array_search("mode", $serie['columns']);

$lastValues = [];
$total = 0;
$remove = 0;

foreach($serie['values'] as $val){
	$name = $val[$namePos];
	$platform = $val[$platformPos];
	$mode = $val[$modePos];
	$time = $val[$timePos];
	
	$key = "$name|$platform|$mode";
	
	$valFiltered = $val;
	unset($valFiltered[$timePos]);
	unset($valFiltered[$namePos]);
	unset($valFiltered[$platformPos]);
	unset($valFiltered[$modePos]);
	
	$valSerial = implode("|", $valFiltered);
	
	if(!isset($lastValues[$key])){
		echo $key . " " . $valSerial . "\n";
		
		$lastValues[$key] = $valSerial;
		
	}else{
		
		if($lastValues[$key] != $valSerial){
			echo $key . " " . $valSerial . "\n";
			$lastValues[$key] = $valSerial;	
		}else{
			//Remove this point
			
			$query = "DELETE FROM \"stats\" WHERE \"name\"='$name' AND \"platform\"='$platform' AND \"mode\"='$mode' AND time='$time'";
			echo $query . "\n";
			$database->query($query);
		
			
			$remove++;
		}
		
	}
	
	$total ++;
	//
}

	/*if($serie['tags']['name'] == "gzalo.com" && $serie['tags']['mode'] == 'duo'){
		print_r($serie['values'][0]);
	}*/
//}



$deltaT = time()-$startTime;
echo "Removed $remove of $total points in $deltaT seconds\n";

echo '</pre>';
		