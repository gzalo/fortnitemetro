<?php

$strIn = file_get_contents('php://input');
$strOut = "";

// UCS-2LE to ASCII dummy decoder

for($i=4;$i<strlen($strIn);$i+=2){
	$strOut .= $strIn[$i];
}

$lines = explode("\n", $strOut);

foreach($lines as $line){
	if(preg_match("/SecondsPlayed=(\d+)/",$line,$matches)){
		$seconds = $matches[1];
		echo "Jugaste " . $seconds . " segundos = " . floor($seconds/3600) . " horas, " . floor(($seconds%3600)/60) . " minutos";
		exit();
	}
}


echo "No puedo parsear el archivo\n";

