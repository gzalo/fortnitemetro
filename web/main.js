$(document).ready(function () {
  $(document).ajaxStart(function () {
    $("html").addClass("wait");
  });
  $(document).ajaxStop(function () {
    $("html").removeClass("wait");
  });

  function roundToThree(num) {
    return +(Math.round(num + "e+3") + "e-3");
  }

  var printCellInfo = function (cell, formatterParams) {
    //plain text value

    var idx = cell.getRow().getIndex();
    var val = "";
    var fieldName = cell.getColumn().getField();

    if (fieldName != "name") {
      if (typeof data.stats[idx][fieldName + "_color"] != "undefined")
        val = data.stats[idx][fieldName + "_color"];
    }

    switch (val) {
      case "max":
        cell.getElement().style.backgroundColor = "#9fdaac";
        cell.getElement().style.fontWeight = "bold";
        break;
      case "min":
        cell.getElement().style.backgroundColor = "#da9f9f";
        cell.getElement().style.fontWeight = "bold";
        break;
      case "out":
        cell.getElement().style.backgroundColor = "#9fb8da";
        cell.getElement().style.fontWeight = "bold";
        break;
    }

    if (
      typeof data.stats[idx][fieldName + "_old"] != "undefined" &&
      fieldName != "score_total" &&
      fieldName != "dmomentum"
    ) {
      var oldValue = data.stats[idx][fieldName + "_old"];

      var useAbs = true;

      if (fieldName == "kdr_total") useAbs = false;

      if (useAbs) {
        //Absolute diff
        var diff = cell.getValue() - oldValue;
        var diffTxt = (diff < 0 ? "-" : "+") + Math.abs(roundToThree(diff));
      } else {
        //Relative diff
        var diff = ((cell.getValue() - oldValue) / oldValue) * 100;
        if (oldValue == 0) diff = 0;
        var diffTxt =
          (diff < 0 ? "-" : "+") + Math.abs(roundToThree(diff)) + "%";
      }

      if (diff > 0) {
        return (
          cell.getValue() +
          " <span class='higher'></span> <span class='oldValue'>" +
          roundToThree(oldValue) +
          " (" +
          diffTxt +
          ")</span>"
        );
      } else if (diff < 0) {
        return (
          cell.getValue() +
          " <span class='lower'></span> <span class='oldValue'>" +
          roundToThree(oldValue) +
          " (" +
          diffTxt +
          ")</span>"
        );
      } else {
        return cell.getValue() + " <span class='same'></span></span>";
      }
    } else {
      return cell.getValue();
    }
  };

  var titleTranslation = {
    matches_played_total: "Partidas jugadas",
    wins_total: "Partidas ganadas",
    kills_total: "Asesinatos",
    kdr_total: "A/M",
    score_total: "Puntaje",
  };

  var currentGraph = {};

  var showGraph = function (e, cell) {
    var field = cell.getColumn().getField();
    var username = cell.getRow().getData().name;

    currentGraph = { field: field, username: username };

    updatePlot();
  };

  function updatePlot() {
    if (!currentGraph.field || !currentGraph.username) return;

    if ($("#range").val() == -1) return;

    $.get(
      "https://fortnite.gzalo.com/api.php",
      {
        action: "plot",
        field: currentGraph.field,
        username: currentGraph.username,
        range: $("#range").val(),
      },
      function (dataJson) {
        var data = JSON.parse(dataJson);
        var title =
          titleTranslation[currentGraph.field] + " de " + currentGraph.username;

        var layout = {
          title: title,
        };

        Plotly.newPlot("plotDiv", data, layout);
      }
    );
  }

  Date.prototype.toDateInputValue = function () {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0, 10);
  };

  $("#rangeSelector").html(
    "Intervalo de tiempo: <select id='range'><option value='0'>Todos los datos</option><option value='730'>Último mes</option><option value='168'>Última semana</option><option value='24'  selected='selected'>Último día</option><option value='1'>Última hora</option><option value='-1'>Personalizar...</option></select> <span id='timeSelector' class='hide'><input type='date' id='timeStart'> al <input type='date' id='timeEnd'></span>"
  );

  var endDate = new Date();
  var day = 60 * 60 * 24 * 1000;
  var startDate = new Date(endDate.getTime() - 5 * day);

  $("#timeStart").val(startDate.toDateInputValue());
  $("#timeEnd").val(endDate.toDateInputValue());

  var data;

  var statsTable;

  function initTable() {
    statsTable = new Tabulator("#statsTable", {
      layout: "fitColumns", //fit columns to width of table (optional)
      columns: [
        //Define Table Columns
        { title: "Nombre", field: "name", width: 120 },
        {
          title: "Partidas jugadas",
          field: "matches_played_total",
          formatter: printCellInfo,
          cellClick: showGraph,
        },
        {
          title: "Partidas ganadas",
          field: "wins_total",
          formatter: printCellInfo,
          cellClick: showGraph,
        },
        {
          title: "Asesinatos",
          field: "kills_total",
          formatter: printCellInfo,
          cellClick: showGraph,
        },
        {
          title:
            "<span title='Asesinatos/(Partidas jugadas - Partidas ganadas)'>A/M</span>",
          field: "kdr_total",
          formatter: printCellInfo,
          cellClick: showGraph,
        },
        {
          title: "<span title='A/M reciente'>Momento&trade;</span>",
          field: "momentum",
          formatter: printCellInfo,
        },
        {
          title:
            "<span title='Tasa de cambios del A/M'>&#8706;Momento/&#8706;t</span>",
          field: "dmomentum",
          formatter: printCellInfo,
        },
      ],
      groupBy: "categ",
      initialSort: [{ column: "name", dir: "asc" }],
      tooltips: function (cell) {
        var idx = cell.getRow().getIndex();

        switch (cell.getColumn().getField()) {
          case "matches_played_total":
            return data.stats[idx].matches_played;
          case "wins_total":
            return data.stats[idx].wins;
          case "kills_total":
            return data.stats[idx].kills;
          case "kdr_total":
            return data.stats[idx].kdr;
          case "score_total":
            return data.stats[idx].score;
          default:
            return "";
        }

        //cell - cell component

        //function should return a string for the tooltip of false to hide the tooltip
        return cell.getColumn().getField() + " - " + cell.getValue(); //return cells "field - value";
      },
    });
  }

  function updateTable() {
    if ($("#range").val() == -1) return;

    $.get(
      "https://fortnite.gzalo.com/api.php",
      { action: "get", range: $("#range").val() },
      function (dataJson) {
        $("#loader").fadeOut("slow");
        //$("#extraInfo").html(dataJson);

        data = JSON.parse(dataJson);

        statsTable.setData(data.stats);

        $("#lastUpdate").html(
          "Última actualización: " +
            data.dataLastUpdate +
            " | " +
            data.lastChanges
        );
        console.log(data);
        //$('[data-toggle="tooltip"]').tooltip({html:true});
      }
    );
  }

  $("#range, #timeStart, #timeEnd").change(function () {
    if ($("#range").val() == -1) {
      $("#timeSelector").show();
    } else {
      $("#timeSelector").hide();
    }
    updateTable();
    updatePlot();
  });
  initTable();
  updateTable();
});

function loadMuaveTip() {
  $.getJSON(
    "https://fortnite.gzalo.com/api.php",
    { action: "getTip" },
    function (data) {
      $("#muaveTip").html(
        "<p><strong>MuaveTip #" +
          data.id +
          ' <a href="#" onclick="loadMuaveTip()">(pedir otro)</a>:</strong> ' +
          data.tip +
          "</p>"
      );
    }
  );
  return false;
}
loadMuaveTip();
