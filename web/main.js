const tipUrl = 'https://fortnite-tips.cgi-bin.workers.dev';
const apiUri = 'https://fortnite.gzalo.com/api.php';

const titleTranslation = {
  matches_played_total: 'Partidas jugadas',
  wins_total: 'Partidas ganadas',
  kills_total: 'Asesinatos',
  kdr_total: 'A/M',
  score_total: 'Puntaje',
};

let data;
let currentGraph = {};

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

  const range = document.getElementById('range').value;
  if (range == -1) return;

  fetch(
    `${apiUri}?` +
      new URLSearchParams({
        action: 'plot',
        field: currentGraph.field,
        username: currentGraph.username,
        range: range,
      }),
  )
    .then((resp) => resp.json())
    .then((localData) => {
      const title = `${titleTranslation[currentGraph.field]} de ${currentGraph.username}`;
      Plotly.newPlot('plotDiv', localData, { title });
    });
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
      document.getElementById('lastUpdate').innerHTML = `Última actualización: ${data.dataLastUpdate} | ${data.lastChanges}`;
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
