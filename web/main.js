const tipUrl = 'https://fortnite-tips.cgi-bin.workers.dev';
const hourInMilliseconds = 3.6e6;

// Find maximums of these columns
const colsMax = ['matches_played_total', 'wins_total', 'kills_total', 'kdr_total', 'momentum', 'dmomentum'];
const categories = ['Malísimos', 'Mejores jugadores'];
const categsPerUser = [1, 1, 1, 1, 1, 0, 0, 0, 1, 1];

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

const userNamesPerId = ['gzalo.com', 'NikAwEsOmE81', 'DeSartre', 'dadperez', 'Nachox86', 'SypherPK', 'ninja', 'Muselk', 'XulElan', 'L0VEMACHiNEtw'];

const titleTranslation = {
  matches_played_total: 'Partidas jugadas',
  wins_total: 'Partidas ganadas',
  kills_total: 'Asesinatos',
  kdr_total: 'A/M',
};

const modes = ['solo', 'squad', 'duo'];
const currentGraph = { field: null, username: null };

let data;
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

  if (typeof data.stats[idx][fieldName + '_old'] != 'undefined' && fieldName != 'dmomentum') {
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
  currentGraph.field = cell.getColumn().getField();
  currentGraph.username = cell.getRow().getData().name;
  updatePlot(currentGraph.field, currentGraph.username);
};

const updatePlot = (field, username) => {
  if (!field || !username) return;

  const range = document.getElementById('range').value;
  if (range == -1) return;

  const fieldMapping = {
    matches_played_total: 'played',
    wins_total: 'wins',
    kills_total: 'kills',
    kdr_total: 'cast(kills as float)/cast(played as float)',
  };

  const now = Date.now();
  const dbField = fieldMapping[field];
  const $userId = userIds[username];
  const $startTime = now - range * hourInMilliseconds;

  let points, pointsPrev;

  if (range != 0) {
    points = db.exec(`SELECT time,${dbField},mode FROM stats WHERE username = $userId AND time BETWEEN $startTime and $end ORDER BY time ASC`, { $userId, $startTime, $endTime: now });
    pointsPrev = db.exec(`SELECT time,${dbField},mode FROM stats WHERE username = $userId AND time < $startTime GROUP BY mode ORDER BY time DESC`, { $userId, $startTime });
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

  const title = `${titleTranslation[field]} de ${username}`;
  Plotly.newPlot('plotDiv', plotData, { title });
};

const getPlayerHistoricInfo = (range) => {
  const now = Date.now();
  const $startTime = now - range * hourInMilliseconds;

  let points;
  if (range == 0) {
    //Time = 0 => current data
    points = db.exec('SELECT time,username,mode,played,wins,kills from stats where time in (select max(time) from stats group by username,mode)');
  } else {
    // Get older data
    points = db.exec('SELECT time,username,mode,played,wins,kills from stats where time in (select max(time) from stats where time < $startTime group by username,mode)', { $startTime });
  }

  const playerInfo = {};

  if (points.length !== 0)
    for (let i = 0; i < points[0].values.length; i++) {
      const point = points[0].values[i];

      const username = point[1];

      if (!(username in playerInfo)) playerInfo[username] = {};

      const fullName = point[2];
      playerInfo[username][fullName] = {};

      playerInfo[username][fullName].played = point[3];
      playerInfo[username][fullName].wins = point[4];
      playerInfo[username][fullName].kills = point[5];
    }

  const rowData = {};
  let idx = 0;
  for (userName in playerInfo) {
    let matches_played_total = 0;
    let wins_total = 0;
    let kills_total = 0;
    let kdr_total = 0;

    let matches_played_text = '';
    let wins_text = '';
    let kills_text = '';
    let kdr_text = '';

    for (mode in playerInfo[userName]) {
      const modeData = playerInfo[userName][mode];

      matches_played_total += modeData.played;
      matches_played_text += mode + ': ' + modeData.played + '\n';

      wins_total += modeData.wins;
      wins_text += mode + ': ' + modeData.wins + '\n';

      kills_total += modeData.kills;
      kills_text += mode + ': ' + modeData.kills + '\n';

      kdr_text += mode + ': ' + Math.round((modeData.kills / modeData.played) * 1000) / 1000 + '\n';
    }

    kdr_total = kills_total / (matches_played_total - wins_total);
    kdr_total = Math.round(kdr_total * 1000) / 1000;

    rowData[userName] = {
      id: idx++,
      name: userNamesPerId[userName],
      matches_played_total: matches_played_total,
      matches_played: matches_played_text,
      wins_total: wins_total,
      wins: wins_text,
      kills_total: kills_total,
      kills: kills_text,
      kdr_total: kdr_total,
      kdr: kdr_text,
      categ: categories[categsPerUser[userName]],
    };
  }
  return rowData;
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
        default:
          return '';
      }
    },
  });
};

const getTableData = (range) => {
  let rowDataOld = {},
    rowDataOlder = {};
  if (range != 0) {
    rowDataOld = getPlayerHistoricInfo(range);
    rowDataOlder = getPlayerHistoricInfo(range * 2);
  }

  const rowData = getPlayerHistoricInfo(0);
  for (rowIdx in rowData) {
    const stat = rowData[rowIdx];
    stat.momentum = 0;
    stat.dmomentum = 0;
    stat.momentum_old = 0;

    if (range != 0 && rowIdx in rowDataOld) {
      const statOld = rowDataOld[rowIdx];
      denum = stat.matches_played_total - statOld.matches_played_total - (stat.wins_total - statOld.wins_total);
      momentum = stat.kills_total - statOld.kills_total;

      if (denum != 0) momentum = Math.round((momentum / denum) * 1000) / 1000;
      else momentum = 0;

      stat.momentum = momentum;

      if (rowIdx in rowDataOlder) {
        const statOlder = rowDataOlder[rowIdx];

        oldDenum = statOld.matches_played_total - statOlder.matches_played_total - (statOld.wins_total - statOlder.wins_total);
        oldMomentum = statOld.kills_total - statOlder.kills_total;

        if (oldDenum != 0) oldMomentum = Math.round((oldMomentum / oldDenum) * 1000) / 1000;
        else oldMomentum = 0;

        stat.momentum_old = oldMomentum;
        stat.dmomentum = Math.round(((24 * (momentum - oldMomentum)) / range) * 1000) / 1000;
      }
    }
  }

  for (colIdx = 0; colIdx < colsMax.length; colIdx++) {
    max = 0;
    min = 999999;
    for (rowIdx in rowData) {
      let textAsFloat = parseFloat(rowData[rowIdx][colsMax[colIdx]]);
      if (textAsFloat > max) max = textAsFloat;
      if (textAsFloat < min) min = textAsFloat;
    }
    for (rowIdx in rowData) {
      let textAsFloat = parseFloat(rowData[rowIdx][colsMax[colIdx]]);

      if (textAsFloat == max) rowData[rowIdx][colsMax[colIdx] + '_color'] = 'max';
      if (textAsFloat == min) rowData[rowIdx][colsMax[colIdx] + '_color'] = 'min';

      // Only include old data if range is not zero
      if (range != 0 && rowIdx in rowDataOld && colsMax[colIdx] != 'momentum') rowData[rowIdx][colsMax[colIdx] + '_old'] = rowDataOld[rowIdx][colsMax[colIdx]];
    }
  }

  const stats = [];
  for (rowIdx in rowData) {
    stats.push(rowData[rowIdx]);
  }

  return { stats };
};

const updateTable = () => {
  const range = document.getElementById('range').value;
  if (range == -1) return;

  data = getTableData(range);
  const loader = document.getElementById('loader');
  loader.classList.add('hide');
  loader.classList.remove('show');
  statsTable.setData(data.stats);

  if (db) {
    const lastUpdate = db.exec(`SELECT time FROM stats ORDER BY time DESC LIMIT 1`)[0].values[0][0];
    const lastUpdateDate = new Date(lastUpdate).toLocaleString('es-ES');
    document.getElementById('lastUpdate').innerHTML = `Última actualización: ${lastUpdateDate}`;
  }
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
    updatePlot(currentGraph.field, currentGraph.username);
  });
});

const loadMuaveTip = () => {
  fetch(tipUrl)
    .then((resp) => resp.json())
    .then((data) => {
      document.getElementById('muaveTip').innerHTML = `<p><strong>MuaveTip #${data.id} <a href="#" onclick="loadMuaveTip()">(pedir otro)</a>:</strong> ${data.tip}</p>`;
    });
  return false;
};

const sqlPromise = initSqlJs({ locateFile: (file) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.5.0/${file}` });
const dataPromise = fetch('db.sqlite3').then((res) => res.arrayBuffer());

Promise.all([sqlPromise, dataPromise]).then(([SQL, buf]) => {
  db = new SQL.Database(new Uint8Array(buf));
  initTable();
  updateTable();
  loadMuaveTip();
});
