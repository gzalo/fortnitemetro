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

$result = $database->query('SELECT * from "stats" where "name" = \'ninja\'');
$points = $result->getPoints();
echo json_encode( $points, JSON_PRETTY_PRINT ) ;
exit();