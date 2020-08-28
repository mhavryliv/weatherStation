<template>
  <div class="main">
    <h1>Mollymook Weather Station</h1>
    <!-- <h2>Current Weather</h2> -->
    <div v-if=currentWeather.loading>Loading...
      <loading-progress
        :indeterminate='true'
        :hide-background='false'
        shape="line"
        size="200"
        width="200"
        height="4"
      />
    </div>
    <div class="current_weather_display" v-else>
      <div class="current_date">{{currentDate}}</div>
      <div>
        <div class="atmos">
          <div class="item">
            <div class="label">Temperature:</div>
            <div class="value">{{currentWeather.temperature}}</div>
          </div>
          <div class="item">
            <div class="label">Humidity:</div>
            <div class="value">{{currentWeather.humidity}}</div>
          </div>
          <div class="item">
            <div class="label">Pressure:</div>
            <div class="value">{{currentWeather.pressure}}</div>
          </div>

        </div>
      </div>
    </div>

    <hr>
      <div class="historic_data_wrapper">
        <h3>Past 24 hours</h3>
        <button @click="reloadHistoricData">Reload</button>

        <div class="small">
          <line-chart :chart-data="datacollection" :options="chartOptions" :styles="myStyles"
          ></line-chart>

        </div>
      </div>

    <hr>

    <button @click="getCurrentData">Refresh</button>

  </div>
</template>

<script>
import axiosLib from 'axios'
var axios = axiosLib.create({
  'baseURL': 'https://weatherreporting.flyingaspidistra.net/events'
});
axios.defaults.headers.post['Content-Type'] = 'application/json';

import LineChart from './LineChart.js'


export default {
  name: 'Main',
  components: {
    LineChart
  },
  data() {
    return {
      currentWeather: {loading: false},
      historicData: {
        loading: false,
        count: 0,
        events: []
      },
      datacollection: {},
      chartOptions: {
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: true
            },
            gridLines: {
              display: true
            }
          }],
          xAxes: [ {
            gridLines: {
              display: false
            }
          }]
        },
        legend: {
          display: false
        },
        responsive: true,
        maintainAspectRatio: false
      },
      chartHeight: 300
    }
  },
  computed: {
    currentDate() {
      if(this.currentWeather.time) {
        const date = new Date(this.currentWeather.time);
        var options = 
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric'};
        return date.toLocaleDateString('en-AU', options);
      }
    },
    myStyles () {
      return {
        // height: this.chartHeight + 'px',
        // position: 'relative'
      }
    },
    historicDataTimeRange() {
      if(this.historicData.events.length < 2) {
        return undefined;
      }
      return {
        start: this.historicData.events[0].time,
        end: this.historicData.events[this.historicData.count - 1].time
      }
    }
  },
  methods: {
    async reloadHistoricData() {
      if(this.historicData.loading) {
        console.log("Already loading data");
        return;
      }
      this.historicData.loading = true;
      const data = await this.getEventHistory(86400);
      this.historicData.loading = false;
      if(!data) {
        console.log("No historic data!");
        this.historicData.count = 0;
        this.historicData.events = [];
        return;
      }
      this.historicData = data;
      console.log(this.historicData);
      const timerange = this.historicDataTimeRange;
      const start = new Date(timerange.start);
      const end = new Date(timerange.end);
      console.log(start);
      console.log(end);
      this.fillTempData();


    },
    async getEventHistory(numSecBack) {
      const postData = {
        getPastSeconds: numSecBack
      }
      const data = await this.doPostCall(postData);
      if(!data) {
        return console.log("Couldn't get event history");
      }
      return data;
      
    },
    async getCurrentData() {
      this.currentWeather.loading = true;
      const postData = {
        getCurrent: true
      }
      console.log("Making post request for most recent event...");
      const data = await this.doPostCall(postData);
      if(!data) {
        return console.log("Couldn't get most recent event");
      }
      const event = data.events[0];
      this.currentWeather = event;
      console.log("Got something for: " + new Date(event.time));
    },
    async doPostCall(postData) {
      try {
        const res = await axios.post('', postData);
        const data = res.data;
        return Promise.resolve(data);
       }
      catch(e) {
        console.log("Error requesting data " + e);
        return Promise.resolve();
      }
    },
    generateDateLabels(startTime, endTime, numToMake) {
      let labels = [];
      var options = {hour: 'numeric', minute: 'numeric'};
      const interval = Math.round((endTime - startTime) / numToMake);
      // let numToMake = Math.round((endTime - startTime) / interval);
      for(var i = 0; i < numToMake; ++i) {
        if(i === (numToMake - 1)) {
          options.minute = 'numeric'
        }
        else {
          options.minute = undefined;
        }
        const date = new Date(startTime + (interval * i));
        const dateStr = date.toLocaleTimeString('en-AU', options);
        labels.push(dateStr);
      }

      return labels;
    },
    fillTempData() {
      const timerange = this.historicDataTimeRange;
      if(!timerange) {
        return console.log("No time range to fill temperature data!");
      }
      const hourInMsec = 60 * 60 * 1000;
      const labels = this.generateDateLabels(timerange.start, timerange.end, 24);
      console.log(labels);
      this.datacollection = {
        labels: [1, 2, 3, 4, 5, 6],
        datasets: [
          {
            label: "Temp (c)",
            backgroundColor: 'rgba(0, 50, 100, 0.5)',
            data: [1, 2, 3, 4, 5, 6, 7, 8, 9]
          }
        ]
      }
    },
    fillData () {
      this.datacollection = {
        labels: [this.getRandomInt(), this.getRandomInt()],
        datasets: [
          {
            label: 'Data One',
            backgroundColor: '#f87979',
            data: [this.getRandomInt(), this.getRandomInt()]
          }, {
            label: 'Data One',
            backgroundColor: '#f87979',
            data: [this.getRandomInt(), this.getRandomInt()]
          }
        ]
      }
    },
    getRandomInt () {
      return Math.floor(Math.random() * (50 - 5 + 1)) + 5
    },
    increase () {
     this.chartHeight += 10
    }
  },
  mounted() {
    this.getCurrentData();
    this.fillTempData();
  }

}
</script>

<style lang="scss">
.current_weather_display {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  .atmos {
    display: flex;
    justify-content: space-around;
    margin: 20px 0 20px 0;
    .item {
      display: flex;
      .label {
        margin-right: 10px;
      }
      .value {
        font-weight: bold;
      }
    }
  }
}

.small {
  max-width: 600px;
  margin:  150px auto;
}
</style>