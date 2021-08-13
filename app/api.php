<?php

require_once 'vendor/autoload.php';
require_once 'config.php';

date_default_timezone_set('America/Argentina/Buenos_Aires'); 

use Fortnite\Auth;
use Fortnite\PlayablePlatform;
use Fortnite\Mode;
use Fortnite\Language;
use Fortnite\NewsType;
use Fortnite\Platform;
use InfluxDB\Point;

header('Access-Control-Allow-Origin: *');

function updateNow(){
	// Authenticate
	$auth = Auth::login(getenv("GAME_USERNAME"),getenv("GAME_PASSWORD"));
	
	$fetchData = Config::FETCH_DATA;
	
	$retData = array();
	foreach($fetchData as $userdata)
		$retData[$userdata['displayName']]= $auth->profile->stats->lookup($userdata);
	
	/*echo '<pre>';
	print_r($retData);
	echo '</pre>';
	exit();*/
	
	//Insert data into influxDB
	
	$client = new InfluxDB\Client(Config::DB_HOST, Config::DB_PORT);
	$database = $client->selectDB(Config::DB_NAME);		
	
	$points = array();
	$currTime = time();
	
	foreach($fetchData as $userdata){
		
		$userData = $retData[$userdata['displayName']];
		$platforms = array("ps4", "pc", "xb1");
		$modes = array("solo", "duo", "squad");
			
		foreach($platforms as $platform){
			if(!isset($userData->$platform) || !is_object($userData->$platform))
				continue;
					
			foreach($modes as $mode){
				if(!isset($userData->$platform->$mode) || !is_object($userData->$platform->$mode))
					continue;
									
				$points[] = new Point(
					'stats', 
					null,
					['name' => $userdata['displayName'],
					'mode' => $mode,
					'platform' => $platform],

					["wins" => $userData->$platform->$mode->wins,
					"top3" => $userData->$platform->$mode->top3,
					"top5" => $userData->$platform->$mode->top5,
					"top6" => $userData->$platform->$mode->top6,
					"top10" => $userData->$platform->$mode->top10,
					"top12" => $userData->$platform->$mode->top12,
					"top25" => $userData->$platform->$mode->top25,
					"kills" => $userData->$platform->$mode->kills,
					"matches_played" => $userData->$platform->$mode->matches_played,
					"minutes_played" => $userData->$platform->$mode->minutes_played,
					"score" => $userData->$platform->$mode->score,
					"kill_death_ratio" => (int)$userData->$platform->$mode->kill_death_ratio,
					"kill_death_per_game" => $userData->$platform->$mode->kills_per_match,
					"score_per_match" => $userData->$platform->$mode->score_per_match,
					"win_loss_ratio" => $userData->$platform->$mode->wins_ratio
					],
					$currTime
					
				);
				
			}
		}
	}
	
	/*echo '<pre>';
	print_r($points);
	echo '</pre>';*/
	
	if(count($points) != 0)
		$result = $database->writePoints($points, InfluxDB\Database::PRECISION_SECONDS);
	
	return $retData;
}

function updateData(){
	return;
	$client = new InfluxDB\Client(Config::DB_HOST, Config::DB_PORT);
	$database = $client->selectDB(Config::DB_NAME);		

	// Check when the last measurement was made
	
	$result = $database->query("SELECT * FROM \"sampler\" WHERE type = 'update' ORDER BY time DESC LIMIT 1");
	$points = $result->getPoints();
	
	$startTime = time();
	
	// If there was at least one measurement
	if(count($points) != 0){
		$delta = $startTime - strtotime($points[0]['time']);
				
		// Check if the last measurement was made at least CACHE_TTL seconds ago
		if($delta < Config::CACHE_TTL){
			//return "SKIPPED (CACHE $delta < " . Config::CACHE_TTL . ")";
		}
	}

	$status = "OK";
	
	try{
		updateNow();
	}catch(Exception $e){
		$status = "ERR - " . $e->getMessage();
	}
	
	// Store current measurement time and status
	$currTime = time();
	$point = new Point(
		'sampler', 
		null,
		['type' => "update"],
		["status" => $status,
		"startTime" => $startTime],
		$currTime
	);
	$result = $database->writePoints([$point], InfluxDB\Database::PRECISION_SECONDS);
	
	return $status;
}

function getPlayerHistoricInfo($database, $time, &$cacheTime){
	if(!is_numeric($time))
		$time = 0;
	
	if($time == 0){ //Time = 0 => current data
		$query = 'SELECT * from "stats" group by * order by time desc limit 1 ';
	}else{
		// Get older data
		$query = 'SELECT * from "stats" where time < NOW() - '.$time.'h group by * order by time desc limit 1 ';
	}

	$result = $database->query($query);
	$series = $result->getSeries();
	
	$playerInfo = array();
	
	foreach($series as $serie){
		$username = $serie['tags']['name'];

		//Ignore certain usernames to avoid bugs
		if(in_array($username, Config::IGNORE_USERNAMES)) 
			continue;
		
		if(!isset($playerInfo[$username]))
			$playerInfo[$username] = array();
		
		$fullName = $serie['tags']['mode']."_".$serie['tags']['platform'];
		$playerInfo[$username][$fullName] = array();
		
		foreach($serie['columns'] as $colIdx=>$colName){
			$playerInfo[$username][$fullName][$colName] = $serie['values'][0][$colIdx];
		}
		
	}
	
	ksort($playerInfo);
	
	$rowData = array();
	//$cacheTime = 0;
	foreach($playerInfo as $userName=>$userData){
		
		$matches_played_total = 0;
		$wins_total = 0;
		$kills_total = 0;
		$kdr_total = 0;
		$score_total = 0;
		
		$matches_played_text = "";
		$wins_text = "";
		$kills_text = "";
		$kdr_text = "";
		$score_text = "";
	  
		foreach($userData as $mode=>$modeData){
			$cacheTime = max($cacheTime, $modeData['time']);
			$matches_played_total += $modeData['matches_played'];
			$matches_played_text .= $mode. ": " . $modeData['matches_played'] . "\n";

			$wins_total += $modeData['wins'];
			$wins_text .= $mode. ": " . $modeData['wins'] . "\n";

			$kills_total += $modeData['kills'];
			$kills_text .= $mode. ": " . $modeData['kills'] . "\n";

			$kdr_text .= $mode. ": " . $modeData['kill_death_per_game'] . "\n";
			
			$score_total += $modeData['score'];
			$score_text .= $mode. ": " . $modeData['score'] . "\n";
			
		}
		$kdr_total = $kills_total / ($matches_played_total - $wins_total);
		$kdr_total = round($kdr_total,3);
		
		  $rowData[$userName] = array(
			"id" => count($rowData),
			'name'=>$userName,
			"matches_played_total"=>$matches_played_total, 
			"matches_played"=>$matches_played_text,
			"wins_total"=>$wins_total,
			"wins"=>$wins_text,
			"kills_total"=>$kills_total,
			"kills"=>$kills_text,
			"kdr_total"=>$kdr_total,
			"kdr"=>$kdr_text,
			"score_total"=>$score_total,
			"score"=>$score_text,
			"categ"=>Config::CATEG_NAMES[Config::CATEG_USERS[$userName]],
		);

	}
	return $rowData;
}

function getData($range){
	$client = new InfluxDB\Client(Config::DB_HOST, Config::DB_PORT);
	$database = $client->selectDB(Config::DB_NAME);		
	
	$cacheTime = 0;
	
	if($range != 0){
		$rowDataOld = getPlayerHistoricInfo($database, $range, $cacheTime);
		$rowDataOlder = getPlayerHistoricInfo($database, $range*2, $cacheTime);
	}
	
	$rowData = getPlayerHistoricInfo($database, 0, $cacheTime);

	//Find maximum of specified columns
	$colsMax = Config::COLS_STATS_COLOR;
	
	foreach($rowData as $rowIdx=>$row){
		$rowData[$rowIdx]["momentum"] = 0;
		$rowData[$rowIdx]["dmomentum"] = 0;
		$rowData[$rowIdx]["momentum_old"] = 0;
		
		if($range != 0 && isset($rowDataOld[$rowIdx])){
			$denum = ($rowData[$rowIdx]['matches_played_total'] - $rowDataOld[$rowIdx]['matches_played_total'] - ($rowData[$rowIdx]['wins_total'] - $rowDataOld[$rowIdx]['wins_total']));
			$momentum = $rowData[$rowIdx]['kills_total'] - $rowDataOld[$rowIdx]['kills_total'];
			
			if($denum != 0)
				$momentum = round($momentum/$denum,3);
			else
				$momentum = 0;
				
			
			$rowData[$rowIdx]["momentum"] = $momentum;
			
			if(isset($rowDataOlder[$rowIdx])){
				
				$oldDenum = ($rowDataOld[$rowIdx]['matches_played_total'] - $rowDataOlder[$rowIdx]['matches_played_total'] - ($rowDataOld[$rowIdx]['wins_total'] - $rowDataOlder[$rowIdx]['wins_total']));
				$oldMomentum = $rowDataOld[$rowIdx]['kills_total'] - $rowDataOlder[$rowIdx]['kills_total'];
					
				if($oldDenum != 0)
					$oldMomentum = round($oldMomentum/$oldDenum,3);
				else
					$oldMomentum = 0;
				
				
				$rowData[$rowIdx]["momentum_old"] = $oldMomentum;
				
				$rowData[$rowIdx]["dmomentum"] = round(24*($momentum-$oldMomentum)/$range, 3);
			}
			
		}
	}
	
	for($colIdx=0;$colIdx<count($colsMax);$colIdx++){
		$max = 0;
		$min = 999999;
		foreach($rowData as $rowIdx=>$row){
			if(in_array($row['name'], Config::IGNORE_STATS_COLOR))
				continue;
			
			$textAsFloat = (float)$row[$colsMax[$colIdx]];
			if($textAsFloat > $max)
				$max = $textAsFloat;
			if($textAsFloat < $min)
				$min = $textAsFloat;
			
		}
		foreach($rowData as $rowIdx=>$row){
			$textAsFloat = (float)$row[$colsMax[$colIdx]];
			
			if(in_array($row['name'], Config::IGNORE_STATS_COLOR))
				$rowData[$rowIdx][$colsMax[$colIdx]."_color"] = "out";
			
			if($textAsFloat == $max)
				$rowData[$rowIdx][$colsMax[$colIdx]."_color"] = "max";
			if($textAsFloat == $min)
				$rowData[$rowIdx][$colsMax[$colIdx]."_color"] = "min";
			
			
			// Only include old data if range is not zero
			if($range != 0 && isset($rowDataOld[$rowIdx]) && $colsMax[$colIdx] != 'momentum')
				$rowData[$rowIdx][$colsMax[$colIdx]."_old"] = $rowDataOld[$rowIdx][$colsMax[$colIdx]];
			
						
		}
	}
	
	$dataLastUpdate = date("Y-m-d H:i:s", strtotime($cacheTime));
	
	return json_encode(array(
		"stats"=>array_values($rowData),   //Convert back to an integer indexed array
		"dataLastUpdate" => $dataLastUpdate, 
		"lastChanges"=>	getExtraInfo()
	));
		
}
	
function getExtraInfo(){
	exec("uptime -p", $commandOutput);				
	exec("df -h / | tail -1 | awk '{printf \"Disk %s (Free %s)\",$5, $4}'", $spaceCommandOutput);
	return $commandOutput[0] . " | ". $spaceCommandOutput[0];
}


function getPlot($field, $username, $range){
	$client = new InfluxDB\Client(Config::DB_HOST, Config::DB_PORT);
	$database = $client->selectDB(Config::DB_NAME);		
	
	switch($field){
		case 'matches_played_total':
			$field = "matches_played";
			break;
		case 'wins_total':
			$field = "wins";
			break;
		case 'kills_total':
			$field = "kills";
			break;
		case 'kdr_total':
			$field = "kill_death_per_game";
			break;
		case 'score_total':
			$field = "score";
			break;
			
		default:exit();
	}
			
	if($range == 0){
		$rangeQuery = ' 1=1 ';
		$rangeQueryPrev = ' 0=1 '; //No points before start
	}else{
		$rangeQuery = ' time > NOW() - '.$range.'h ';
		$rangeQueryPrev = ' time < NOW() - '.$range.'h ';
	}
			
	//Fetch points in between range and current time
	$result = $database->query('SELECT '.$field.', mode,platform FROM "stats" WHERE "name" = \''.$username.'\' AND '.$rangeQuery.' GROUP BY mode,platform ORDER BY time ASC');
	$points = $result->getPoints();

	//Fetch the first point previous to the start of the range
	$result = $database->query('SELECT '.$field.', mode,platform FROM "stats" WHERE "name" = \''.$username.'\' AND '.$rangeQueryPrev.' GROUP BY mode,platform ORDER BY time DESC LIMIT 1');
	$pointsPrev = $result->getPoints();
	
	$out = array();

	// Add the first point of each trace, modified to have the start time of the range
	$startTime = date("Y-m-d H:i:s", time()-$range*3600);
	foreach($pointsPrev as $point){
		$name = $point['mode']."_".$point['platform'];

		if(!isset($out[$name]))
			$out[$name] = array("x"=>array(), "y"=>array(), "type"=>"scatter", "name"=>$name, "mode"=>"lines", "line" => ["shape"=>"hv"] );
		
		$out[$name]['x'][] = $startTime;
		$out[$name]['y'][] = $point[$field];
	}

	foreach($points as $point){
		$name = $point['mode']."_".$point['platform'];

		if(!isset($out[$name]))
			$out[$name] = array("x"=>array(), "y"=>array(), "type"=>"scatter", "name"=>$name, "mode"=>"lines", "line" => ["shape"=>"hv"] );
		
		$time = date("Y-m-d H:i:s", strtotime($point['time']));
		$out[$name]['x'][] = $time;
		$out[$name]['y'][] = $point[$field];
	}
	
	//Replicate last point of the range with curent time
	$currTime = date("Y-m-d H:i:s", time());

	foreach($out as $name=>&$data){
		//If there is at least one point for the data set, duplicate it at the end, with the current time
		if(count($data['y']) != 0){
			$val = $data['y'][count($data['y'])-1];

			$out[$name]['x'][] = $currTime;
			$out[$name]['y'][] = $val;

		}
	}

	return json_encode(array_values($out));
}


if(!isset($_GET['action']))
	die("Missing action");

$action = $_GET['action'];
	
if($action == 'update'){

	die(updateData());

}else if($action == 'drop'){

	$client = new InfluxDB\Client(Config::DB_HOST, Config::DB_PORT);
	$database = $client->selectDB(Config::DB_NAME);		
	//$database->query('DROP MEASUREMENT "stats"');
	die("DROP OK");

}else if($action == 'get'){

	if(!isset($_GET['range']))
		die("Missing range variable");

	$range = $_GET['range'];

	if(!is_numeric($range) || $range < 0)
		die("Range must be numeric and non-negative");

	die(getData($range));

}else if($action == 'plot'){

	if(!isset($_GET['field']))
		die("Missing field variable");

	$field = $_GET['field'];

	if(!isset($_GET['username']))
		die("Missing username variable");

	$username = $_GET['username'];

	if(!isset($_GET['range']))
		die("Missing range variable");

	$range = $_GET['range'];

	if(!is_numeric($range) || $range < 0)
		die("Range must be numeric and non-negative");

	die(getPlot($field, $username, $range));
}

die("Unknown action");