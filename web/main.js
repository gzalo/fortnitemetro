const tipUrl = 'https://fortnite-tips.cgi-bin.workers.dev';
const apiUri = 'https://fortnite.gzalo.com/api.php';
const hourInMilliseconds = 3.6e6;

// Find maximums of these columns
const colsMax = ['matches_played_total', 'wins_total', 'kills_total', 'kdr_total', 'score_total', 'momentum', 'dmomentum'];
const categories = ['Malísimos', 'Mejores jugadores'];
const categsPerUser = {
  'gzalo.com': 1,
  NikAwEsOmE81: 1,
  DeSartre: 1,
  dadperez: 1,
  Nachox86: 1,
  XulElan: 1,
  L0VEMACHiNEtw: 1,
  SypherPK: 0,
  ninja: 0,
  Muselk: 0,
};

const userIds = {
  'gzalo.com': 0,
  NikAwEsOmE81: 1,
  DeSartre: 2,
  dadperez: 3,
  Nachox86: 4,
  SypherPK: 5,
  ninja: 6,
  Muselk: 7,
  XulElan: 8,
  L0VEMACHiNEtw: 9,
};

const titleTranslation = {
  matches_played_total: 'Partidas jugadas',
  wins_total: 'Partidas ganadas',
  kills_total: 'Asesinatos',
  kdr_total: 'A/M',
  score_total: 'Puntaje',
};

const modes = ['solo', 'squad', 'duo'];

let data;
let currentGraph = {};
let db;

const endDate = new Date();
const day = 60 * 60 * 24 * 1000;
const startDate = new Date(endDate.getTime() - 5 * day);

let statsTable;

Date.prototype.toDateInputValue = function () {
  const local = new Date(this);
  local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
  return local.toJSON().slice(0, 10);
};

document.getElementById('timeStart').value = startDate.toDateInputValue();
document.getElementById('timeEnd').value = endDate.toDateInputValue();

const roundToThree = (num) => +(Math.round(num + 'e+3') + 'e-3');

const printCellInfo = (cell, formatterParams) => {
  const idx = cell.getRow().getIndex();
  const fieldName = cell.getColumn().getField();
  let val = '';

  if (fieldName != 'name') {
    if (typeof data.stats[idx][fieldName + '_color'] != 'undefined') val = data.stats[idx][fieldName + '_color'];
  }

  switch (val) {
    case 'max':
      cell.getElement().style.backgroundColor = '#9fdaac';
      cell.getElement().style.fontWeight = 'bold';
      break;
    case 'min':
      cell.getElement().style.backgroundColor = '#da9f9f';
      cell.getElement().style.fontWeight = 'bold';
      break;
    case 'out':
      cell.getElement().style.backgroundColor = '#9fb8da';
      cell.getElement().style.fontWeight = 'bold';
      break;
  }

  if (typeof data.stats[idx][fieldName + '_old'] != 'undefined' && fieldName != 'score_total' && fieldName != 'dmomentum') {
    const oldValue = data.stats[idx][fieldName + '_old'];
    const useAbs = fieldName === 'kdr_total' ? false : true;

    let diff, diffTxt;
    if (useAbs) {
      //Absolute diff
      diff = cell.getValue() - oldValue;
      diffTxt = (diff < 0 ? '-' : '+') + Math.abs(roundToThree(diff));
    } else {
      //Relative diff
      diff = oldValue == 0 ? 0 : ((cell.getValue() - oldValue) / oldValue) * 100;
      diffTxt = (diff < 0 ? '-' : '+') + Math.abs(roundToThree(diff)) + '%';
    }

    let outTxt;
    if (diff > 0) {
      outTxt = ` <span class='higher'></span> <span class='oldValue'>${roundToThree(oldValue)}(${diffTxt})</span>`;
    } else if (diff < 0) {
      outTxt = ` <span class='lower'></span> <span class='oldValue'>${roundToThree(oldValue)}(${diffTxt})</span>`;
    } else {
      outTxt = ` <span class='same'></span></span>`;
    }
    return cell.getValue() + outTxt;
  } else {
    return cell.getValue();
  }
};

const showGraph = (e, cell) => {
  const field = cell.getColumn().getField();
  const username = cell.getRow().getData().name;
  currentGraph = { field, username };
  updatePlot();
};

const updatePlot = () => {
  if (!currentGraph.field || !currentGraph.username) return;

  // const stmt = db.prepare('SELECT count(*) FROM stats WHERE time BETWEEN $start AND $end');
  // stmt.getAsObject({ $start: 1, $end: 1 });

  const range = document.getElementById('range').value;
  if (range == -1) return;

  const fieldMapping = {
    matches_played_total: 'played',
    wins_total: 'wins',
    kills_total: 'kills',
    kdr_total: 'cast(kills as float)/cast(played as float)',
  };

  const now = Date.now();
  const dbField = fieldMapping[currentGraph.field];
  const $userId = userIds[currentGraph.username];
  const $startTime = now - range * hourInMilliseconds;

  let points, pointsPrev;

  if (range != 0) {
    points = db.exec(`SELECT time,${dbField},mode FROM stats WHERE username = $userId AND time BETWEEN $startTime and $end ORDER BY time ASC`, { $userId, $startTime, $endTime: now });
    pointsPrev = db.exec(`SELECT time,${dbField},mode FROM stats WHERE username = $userId AND time < $startTime GROUP BY mode ORDER BY time ASC`, { $userId, $startTime });
  } else {
    points = db.exec(`SELECT time,${dbField},mode FROM stats WHERE username = $userId ORDER BY time ASC`, { $userId });
    pointsPrev = [];
  }

  const data = {};

  // Add the first point of each trace, modified to have the start time of the range
  if (pointsPrev.length !== 0)
    for (let i = 0; i < pointsPrev[0].values.length; i++) {
      const point = pointsPrev[0].values[i];
      let name = modes[point[2]];

      if (!(name in data))
        data[name] = {
          x: [],
          y: [],
          type: 'scatter',
          name: name,
          mode: 'lines',
          line: { shape: 'hv' },
        };

      data[name].x.push(new Date($startTime));
      data[name].y.push(point[1]);
    }

  if (points.length !== 0)
    for (let i = 0; i < points[0].values.length; i++) {
      const point = points[0].values[i];
      let name = modes[point[2]];
      let time = point[0];

      if (!(name in data))
        data[name] = {
          x: [],
          y: [],
          type: 'scatter',
          name: name,
          mode: 'lines',
          line: { shape: 'hv' },
        };

      data[name].x.push(new Date(time));
      data[name].y.push(point[1]);
    }

  //Replicate last point of the range with curent time

  const plotData = [];
  for (let name in data) {
    //If there is at least one point for the data set, duplicate it at the end, with the current time
    if (data[name].y.length != 0) {
      let lastVal = data[name].y[data[name].y.length - 1];

      data[name].x.push(new Date(now));
      data[name].y.push(lastVal);
    }

    plotData.push(data[name]);
  }

  const title = `${titleTranslation[currentGraph.field]} de ${currentGraph.username}`;
  Plotly.newPlot('plotDiv', plotData, { title });
};

const initTable = () => {
  statsTable = new Tabulator('#statsTable', {
    layout: 'fitColumns', //fit columns to width of table (optional)
    columns: [
      //Define Table Columns
      { title: 'Nombre', field: 'name', width: 120 },
      {
        title: 'Partidas jugadas',
        field: 'matches_played_total',
        formatter: printCellInfo,
        cellClick: showGraph,
      },
      {
        title: 'Partidas ganadas',
        field: 'wins_total',
        formatter: printCellInfo,
        cellClick: showGraph,
      },
      {
        title: 'Asesinatos',
        field: 'kills_total',
        formatter: printCellInfo,
        cellClick: showGraph,
      },
      {
        title: "<span title='Asesinatos/(Partidas jugadas - Partidas ganadas)'>A/M</span>",
        field: 'kdr_total',
        formatter: printCellInfo,
        cellClick: showGraph,
      },
      {
        title: "<span title='A/M reciente'>Momento&trade;</span>",
        field: 'momentum',
        formatter: printCellInfo,
      },
      {
        title: "<span title='Tasa de cambios del A/M'>&#8706;Momento/&#8706;t</span>",
        field: 'dmomentum',
        formatter: printCellInfo,
      },
    ],
    groupBy: 'categ',
    initialSort: [{ column: 'name', dir: 'asc' }],
    tooltips: (cell) => {
      const idx = cell.getRow().getIndex();

      switch (cell.getColumn().getField()) {
        case 'matches_played_total':
          return data.stats[idx].matches_played;
        case 'wins_total':
          return data.stats[idx].wins;
        case 'kills_total':
          return data.stats[idx].kills;
        case 'kdr_total':
          return data.stats[idx].kdr;
        case 'score_total':
          return data.stats[idx].score;
        default:
          return '';
      }
    },
  });
};

const updateTable = () => {
  const range = document.getElementById('range').value;
  if (range == -1) return;

  fetch(`${apiUri}?` + new URLSearchParams({ action: 'get', range: range }))
    .then((resp) => resp.json())
    .then((localData) => {
      data = localData;
      const loader = document.getElementById('loader');
      loader.classList.add('hide');
      loader.classList.remove('show');
      statsTable.setData(data.stats);
      document.getElementById('lastUpdate').innerHTML = `Última actualización: ${data.dataLastUpdate}`;
    });
};

document.querySelectorAll('#range, #timeStart, #timeEnd').forEach((item) => {
  item.addEventListener('change', (event) => {
    const range = document.getElementById('range').value;

    if (range == -1) {
      document.getElementById('timeSelector').style.display = '';
    } else {
      document.getElementById('timeSelector').style.display = 'none';
    }
    updateTable();
    updatePlot();
  });
});

initTable();
updateTable();

const loadMuaveTip = () => {
  fetch(tipUrl)
    .then((resp) => resp.json())
    .then((data) => {
      document.getElementById('muaveTip').innerHTML = `<p><strong>MuaveTip #${data.id} <a href="#" onclick="loadMuaveTip()">(pedir otro)</a>:</strong> ${data.tip}</p>`;
    });
  return false;
};
loadMuaveTip();

const sqlPromise = initSqlJs({ locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/${file}` });
const dataPromise = fetch('db.sqlite3').then((res) => res.arrayBuffer());

Promise.all([sqlPromise, dataPromise]).then(([SQL, buf]) => {
  db = new SQL.Database(new Uint8Array(buf));
});

/*

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
*/

/*

function getData($range){

	if(!is_numeric($range) || $range < 0)
	die("Range must be numeric and non-negative");

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
	*/
