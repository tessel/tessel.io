window.d3 = require('d3');
require('nvd3');

var Temperature_graph = function(){
  this.sensordata = null;
  this.chart = null;
  this.init();
}

Temperature_graph.prototype.init = function() {
  var self = this;

  self.sensordata = [];
  for (var i = 0; i <= 10; i++) {
    self.sensordata.push({
      x: i, // time
      y: 0.3 // temperature
    })
  };

  nv.addGraph(function() {
    self.chart = nv.models.lineChart()
      .interactive(false)
      .duration(350)
      .showLegend(true)
      .showYAxis(true)
      .showXAxis(true)
      .forceY([0, 0.8]);

    self.chart.xAxis
      .axisLabel('Time (s)')
      .tickFormat(d3.format(',f'));

    self.chart.yAxis
      .tickFormat(d3.format(',2f'));

    d3.select('.js-data-graph > svg')
      .datum([{
        values: self.sensordata,
        key: "sound levels",
        color: ""
      }])
      .call(self.chart);
    nv.utils.windowResize(self.chart.update);
    self.chart.update();
  });
};

Temperature_graph.prototype.calculate_new_point = function() {
  var data = this.sensordata;
  var lastDatum = data[data.length - 1];
  var oldTemp = lastDatum.y;
  var plusOrMinus = Math.floor(Math.random() * 10.5 % 2) ? -1 : 1;
  var newTemp = plusOrMinus * Math.random()*0.1 + oldTemp;
  newTemp = newTemp < 0 ? 0 : newTemp;
  newTemp = newTemp > 0.8 ? 0.8 : newTemp;

  data.push({
    x: lastDatum.x + 1,
    y: newTemp,
  });
  if (data.length <= 10) {
    this.chart.update();
    return;
  }
  data.shift();
  this.chart.update();
  return;
};

Temperature_graph.prototype.simulate_data = function() {
  this.calculate_new_point();
  setInterval(this.calculate_new_point.bind(this), 1500);
};


module.exports = Temperature_graph;
