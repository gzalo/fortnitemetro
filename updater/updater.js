// SELECT * FROM sampler WHERE type = 'update' ORDER BY time DESC LIMIT 1

$delta = $startTime - strtotime($points[0]['time']);
				
// Check if the last measurement was made at least CACHE_TTL seconds ago
if($delta < Config::CACHE_TTL){
    //return "SKIPPED (CACHE $delta < " . Config::CACHE_TTL . ")";
}

$currTime = time();
$point = new Point(
    'sampler', 
    null,
    ['type' => "update"],
    ["status" => $status,
    "startTime" => $startTime],
    $currTime
);

// Authenticate
$auth = Auth::login(getenv("GAME_USERNAME"),getenv("GAME_PASSWORD"));
	
$retData = array();
foreach($usernames as $userdata)
    $retData[$userdata['displayName']]= $auth->profile->stats->lookup($userdata);

$points = array();
$currTime = time();

foreach($usernames as $userdata){
    
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
    
if(count($points) != 0)
    $result = $database->writePoints($points, InfluxDB\Database::PRECISION_SECONDS);
