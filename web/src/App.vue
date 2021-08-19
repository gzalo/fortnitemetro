<template>
  <header>
    <nav class="navbar navbar-expand-md navbar-dark fixed-top bg-dark">
      <img src="img/logo.png" alt="Fortnitemetro - Estadísticas de Fortnite" />
    </nav>
  </header>

  <main role="main" class="container">
    <div ref="plot"></div>
    <div ref="statsTable"></div>
    <div>
      Intervalo de tiempo:
      <select v-model="range" @change="updateRange">
        <option value="0" selected="selected">Todos los datos</option>
        <option value="730">Último mes</option>
        <option value="168">Última semana</option>
        <option value="24">Último día</option>
        <option value="1">Última hora</option>
        <option value="-1">Personalizar...</option>
      </select>
    </div>
    <div class="d-flex">
      <datepicker v-model="dateStart" :disabled="range != -1" @update:modelValue="updateRange" /> &rarr;
      <datepicker v-model="dateEnd" :disabled="range != -1" @update:modelValue="updateRange" />
    </div>
    <div>
      <p>
        <strong>MuaveTip #{{ tipId }} <a href="#" @click.prevent="loadMuaveTip">(pedir otro)</a>:</strong> {{ tips[tipId] }}
      </p>
    </div>
  </main>

  <footer class="footer">
    <div class="container">
      <span class="text-muted">2018-2021 - Fortnitemetro by Gzalo | Última actualización: {{ lastUpdateDate }}</span>
    </div>
  </footer>

  <transition name="fade">
    <div id="loader" v-if="loading">
      <div class="rect1"></div>
      <div class="rect2"></div>
      <div class="rect3"></div>
      <div class="rect4"></div>
      <div class="rect5"></div>
    </div>
  </transition>
</template>

<script>
import tips from './tips';
import dataset from './dataset';
import Plotly from 'plotly.js-dist';
import Tabulator from 'tabulator-tables';
import Datepicker from 'vue3-datepicker';

const roundToThree = (num) => +(Math.round(num + 'e+3') + 'e-3');
const modes = ['solo', 'squad', 'duo'];

export default {
  name: 'Fortnitemetro',
  components: { Datepicker },
  mounted() {
    this.loadMuaveTip();

    const sqlPromise = require('sql.js')({
      locateFile: (file) => `https://sql.js.org/dist/${file}`,
    });

    const dataPromise = [];

    for (let i = 0; i < dataset.users.length; i++) {
      dataPromise.push(fetch(dataset.users[i].db).then((res) => res.arrayBuffer()));
    }

    this.initTable();
    this.updateRange();

    Promise.all([sqlPromise, ...dataPromise]).then(([SQL, ...buf]) => {
      for (let i = 0; i < buf.length; i++) {
        this.db.push(new SQL.Database(new Uint8Array(buf[i])));
      }
      this.updateTable();
      this.loading = false;
    });
  },
  data() {
    return {
      dateStart: new Date(),
      dateEnd: new Date(),
      loading: true,
      lastUpdateDate: new Date(dataset.lastUpdate).toLocaleString('es-ES'),
      tips,
      tipId: 0,
      range: 0,
      statsTable: null,
      plotField: null,
      plotUserId: null,
      db: [],
      data: null,
    };
  },
  methods: {
    loadMuaveTip() {
      this.tipId = Math.floor(Math.random() * tips.length);
    },
    updateTable() {
      this.data = this.getTableData();
      this.statsTable.setData(this.data.stats);
    },
    initTable() {
      this.statsTable = new Tabulator(this.$refs.statsTable, {
        layout: 'fitColumns', //fit columns to width of table (optional)
        columns: [
          //Define Table Columns
          { title: 'Nombre', field: 'name', width: 120 },
          {
            title: 'Partidas jugadas',
            field: 'matches_played_total',
            formatter: this.printCellInfo,
            cellClick: this.showGraph,
          },
          {
            title: 'Partidas ganadas',
            field: 'wins_total',
            formatter: this.printCellInfo,
            cellClick: this.showGraph,
          },
          {
            title: 'Asesinatos',
            field: 'kills_total',
            formatter: this.printCellInfo,
            cellClick: this.showGraph,
          },
          {
            title: "<span title='Asesinatos/(Partidas jugadas - Partidas ganadas)'>A/M</span>",
            field: 'kdr_total',
            formatter: this.printCellInfo,
            cellClick: this.showGraph,
          },
          {
            title: "<span title='A/M reciente'>Momento&trade;</span>",
            field: 'momentum',
            formatter: this.printCellInfo,
          },
          {
            title: "<span title='Tasa de cambios del A/M'>&#8706;Momento/&#8706;t</span>",
            field: 'dmomentum',
            formatter: this.printCellInfo,
          },
        ],
        groupBy: 'categ',
        initialSort: [{ column: 'name', dir: 'asc' }],
        tooltips: (cell) => {
          const idx = cell.getRow().getIndex();

          switch (cell.getColumn().getField()) {
            case 'matches_played_total':
              return this.data.stats[idx].matches_played;
            case 'wins_total':
              return this.data.stats[idx].wins;
            case 'kills_total':
              return this.data.stats[idx].kills;
            case 'kdr_total':
              return this.data.stats[idx].kdr;
            default:
              return '';
          }
        },
      });
    },
    updatePlot() {
      if (this.plotField === null || this.plotUserId === null) return;

      const fieldMapping = {
        matches_played_total: 'played',
        wins_total: 'wins',
        kills_total: 'kills',
        kdr_total: 'cast(kills as float)/cast(played as float)',
      };

      const dbField = fieldMapping[this.plotField];
      const $startTime = this.dateStart.getTime();
      const $endTime = this.dateEnd.getTime();

      let points, pointsPrev;

      points = this.db[this.plotUserId].exec(`SELECT time,${dbField},mode FROM stats WHERE time BETWEEN $startTime AND $endTime ORDER BY time ASC`, { $startTime, $endTime });
      pointsPrev = this.db[this.plotUserId].exec(`SELECT time,${dbField},mode FROM stats WHERE time in (select max(time) from stats where time < $startTime and mode = 0) or time in (select max(time) from stats where time < $startTime and mode = 1) or time in (select max(time) from stats where time < $startTime and mode = 2)`, {
        $startTime,
      });

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

          data[name].x.push(this.dateStart);
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
        //If there is at least one point for the data set, duplicate it at the end, with the last time
        if (data[name].y.length != 0) {
          let lastVal = data[name].y[data[name].y.length - 1];

          data[name].x.push(this.dateEnd);
          data[name].y.push(lastVal);
        }

        plotData.push(data[name]);
      }

      const titleTranslation = {
        matches_played_total: 'Partidas jugadas',
        wins_total: 'Partidas ganadas',
        kills_total: 'Asesinatos',
        kdr_total: 'A/M',
      };

      const userName = dataset.users[this.plotUserId].name;
      const title = `${titleTranslation[this.plotField]} de ${userName}`;

      Plotly.newPlot(this.$refs.plot, plotData, { title });
    },
    getTableData() {
      let rowDataOld = {},
        rowDataOlder = {};
      if (this.range != 0) {
        rowDataOld = this.getPlayerHistoricInfo(this.dateStart.getTime());
        rowDataOlder = this.getPlayerHistoricInfo(this.dateStart.getTime() - (this.dateEnd.getTime() - this.dateStart.getTime()));
      }

      const rowData = this.getPlayerHistoricInfo(this.dateEnd.getTime());
      for (let rowIdx in rowData) {
        const stat = rowData[rowIdx];
        stat.momentum = 0;
        stat.dmomentum = 0;
        stat.momentum_old = 0;

        if (this.range != 0 && rowIdx in rowDataOld) {
          const statOld = rowDataOld[rowIdx];
          const denum = stat.matches_played_total - statOld.matches_played_total - (stat.wins_total - statOld.wins_total);
          let momentum = stat.kills_total - statOld.kills_total;

          if (denum != 0) momentum = Math.round((momentum / denum) * 1000) / 1000;
          else momentum = 0;

          stat.momentum = momentum;

          if (rowIdx in rowDataOlder) {
            const statOlder = rowDataOlder[rowIdx];

            let oldDenum = statOld.matches_played_total - statOlder.matches_played_total - (statOld.wins_total - statOlder.wins_total);
            let oldMomentum = statOld.kills_total - statOlder.kills_total;

            if (oldDenum != 0) oldMomentum = Math.round((oldMomentum / oldDenum) * 1000) / 1000;
            else oldMomentum = 0;

            stat.momentum_old = oldMomentum;
            stat.dmomentum = Math.round(((24 * (momentum - oldMomentum)) / ((this.dateEnd.getTime() - this.dateStart.getTime()) / 3.6e6)) * 1000) / 1000;
          }
        }
      }

      // Find maximums of these columns
      const colsMax = ['matches_played_total', 'wins_total', 'kills_total', 'kdr_total', 'momentum', 'dmomentum'];

      for (let colIdx = 0; colIdx < colsMax.length; colIdx++) {
        let max = 0;
        let min = 999999;
        for (let rowIdx in rowData) {
          if ('ignore' in dataset.users[rowIdx]) continue;

          let textAsFloat = parseFloat(rowData[rowIdx][colsMax[colIdx]]);
          if (textAsFloat > max) max = textAsFloat;
          if (textAsFloat < min) min = textAsFloat;
        }
        for (let rowIdx in rowData) {
          let textAsFloat = parseFloat(rowData[rowIdx][colsMax[colIdx]]);

          if ('ignore' in dataset.users[rowIdx]) rowData[rowIdx][colsMax[colIdx] + '_color'] = 'out';
          if (textAsFloat == max) rowData[rowIdx][colsMax[colIdx] + '_color'] = 'max';
          if (textAsFloat == min) rowData[rowIdx][colsMax[colIdx] + '_color'] = 'min';

          // Only include old data if range is not zero
          if (this.range != 0 && rowIdx in rowDataOld && colsMax[colIdx] != 'momentum') rowData[rowIdx][colsMax[colIdx] + '_old'] = rowDataOld[rowIdx][colsMax[colIdx]];
        }
      }

      const stats = [];
      for (let rowIdx in rowData) {
        stats.push(rowData[rowIdx]);
      }

      return { stats };
    },
    showGraph(e, cell) {
      this.plotField = cell.getColumn().getField();
      this.plotUserId = cell.getRow().getData().id;
      this.updatePlot();
    },
    getPlayerHistoricInfo(time) {
      const $startTime = time;
      const query = 'SELECT time,mode,played,wins,kills from stats where time in (select max(time) from stats where time < $startTime and mode = 0) or time in (select max(time) from stats where time < $startTime and mode = 1) or time in (select max(time) from stats where time < $startTime and mode = 2)';

      const playerInfo = {};
      for (let i = 0; i < this.db.length; i++) {
        const points = this.db[i].exec(query, { $startTime });

        if (points.length !== 0)
          for (let p = 0; p < points[0].values.length; p++) {
            const point = points[0].values[p];

            if (!(i in playerInfo)) playerInfo[i] = {};

            playerInfo[i][point[1]] = { played: point[2], wins: point[3], kills: point[4] };
          }
      }

      const rowData = {};
      let idx = 0;
      for (let userId in playerInfo) {
        let matches_played_total = 0;
        let wins_total = 0;
        let kills_total = 0;
        let kdr_total = 0;

        let matches_played_text = '';
        let wins_text = '';
        let kills_text = '';
        let kdr_text = '';

        for (let mode in playerInfo[userId]) {
          const modeData = playerInfo[userId][mode];

          matches_played_total += modeData.played;
          matches_played_text += modes[mode] + ': ' + modeData.played + '\n';

          wins_total += modeData.wins;
          wins_text += modes[mode] + ': ' + modeData.wins + '\n';

          kills_total += modeData.kills;
          kills_text += modes[mode] + ': ' + modeData.kills + '\n';

          kdr_text += modes[mode] + ': ' + Math.round((modeData.kills / modeData.played) * 1000) / 1000 + '\n';
        }

        kdr_total = kills_total / (matches_played_total - wins_total);
        kdr_total = Math.round(kdr_total * 1000) / 1000;

        rowData[userId] = {
          id: idx++,
          name: dataset.users[userId].name,
          matches_played_total: matches_played_total,
          matches_played: matches_played_text,
          wins_total: wins_total,
          wins: wins_text,
          kills_total: kills_total,
          kills: kills_text,
          kdr_total: kdr_total,
          kdr: kdr_text,
          categ: dataset.users[userId].category,
        };
      }
      return rowData;
    },
    printCellInfo(cell) {
      const idx = cell.getRow().getIndex();
      const fieldName = cell.getColumn().getField();
      let val = '';

      if (fieldName != 'name') {
        if (typeof this.data.stats[idx][fieldName + '_color'] != 'undefined') val = this.data.stats[idx][fieldName + '_color'];
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

      if (typeof this.data.stats[idx][fieldName + '_old'] != 'undefined' && fieldName != 'dmomentum') {
        const oldValue = this.data.stats[idx][fieldName + '_old'];
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
    },
    updateRange() {
      if (this.range == -1) {
        this.updateTable();
        this.updatePlot();
        return;
      }

      if (this.range == 0) {
        this.dateEnd = new Date(dataset.lastUpdate);
        this.dateStart = new Date(dataset.firstUpdate);
      } else {
        this.dateEnd = new Date(dataset.lastUpdate);
        this.dateStart = new Date(this.dateEnd.getTime() - this.range * 3.6e6);
      }
      this.updateTable();
      this.updatePlot();
    },
    dateToYYYYMMDD(d) {
      return d && new Date(d.getTime() - d.getTimezoneOffset() * 60 * 1000).toISOString().split('T')[0];
    },
  },
};
</script>

<style>
html {
  position: relative;
  min-height: 100%;
}
body {
  margin-bottom: 60px;
}
.footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 60px;
  line-height: 60px;
  background-color: #f5f5f5;
}
body > .container {
  padding: 60px 15px 0;
}
.footer > .container {
  padding-right: 15px;
  padding-left: 15px;
}
.row-max {
  font-weight: bold;
  background-color: #9fdaac;
}

.row-min {
  font-weight: bold;
  background-color: #da9f9f;
}

.oldValue {
  font-size: 9px;
}
.higher:after {
  content: ' \f062';
  font-family: 'Font Awesome 5 Free' !important;
  font-weight: bold;
}
.lower:after {
  content: ' \f063';
  font-family: 'Font Awesome 5 Free' !important;
  font-weight: bold;
}
.same:after {
  content: ' \f52c';
  font-family: 'Font Awesome 5 Free' !important;
  font-weight: bold;
}

.tabulator {
  font-size: 13px !important;
}
.tabulator .tabulator-header {
  padding-left: 0px !important;
}
.tabulator-row {
  padding-left: 0px !important;
}

/* Loader styles from http://tobiasahlin.com/spinkit/*/
#loader {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 50px;
  height: 50px;
  margin-left: -25px;
  margin-top: -25px;
  text-align: center;
  font-size: 10px;
}

#loader > div {
  background-color: #000;
  height: 100%;
  width: 3px;
  display: inline-block;

  -webkit-animation: sk-stretchdelay 1.2s infinite ease-in-out;
  animation: sk-stretchdelay 1.2s infinite ease-in-out;
}

#loader .rect2 {
  -webkit-animation-delay: -1.1s;
  animation-delay: -1.1s;
  margin-left: 2px;
}

#loader .rect3 {
  -webkit-animation-delay: -1s;
  animation-delay: -1s;
  margin-left: 2px;
}

#loader .rect4 {
  -webkit-animation-delay: -0.9s;
  animation-delay: -0.9s;
  margin-left: 2px;
}

#loader .rect5 {
  -webkit-animation-delay: -0.8s;
  animation-delay: -0.8s;
  margin-left: 2px;
}

@-webkit-keyframes sk-stretchdelay {
  0%,
  40%,
  100% {
    -webkit-transform: scaleY(0.4);
  }
  20% {
    -webkit-transform: scaleY(1);
  }
}

@keyframes sk-stretchdelay {
  0%,
  40%,
  100% {
    transform: scaleY(0.4);
    -webkit-transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
    -webkit-transform: scaleY(1);
  }
}

.show {
  opacity: 1;
}
.hide {
  opacity: 0;
  transition: opacity 400ms;
  pointer-events: none;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

datepicker {
  display: inline;
}

.d-flex {
  display: flex;
}

.d-flex input {
  width: 100px;
  margin-right: 10px;
  margin-left: 10px;
}

@import '~tabulator-tables/dist/css/tabulator_modern.css';
</style>
