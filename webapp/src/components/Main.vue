<template>
  <div class="main">
    <h2>Mollymook Beach Weather</h2>
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
        <div class="atmos">
          <div class="item">
            <div class="label">Wind speed:</div>
            <div class="value">{{currentWindSpeed}}</div>
          </div>
          <div class="item">
            <div class="label">Wind gust:</div>
            <div class="value">{{currentWindGust}}</div>
          </div>
          <div class="item">
            <div class="label">Wind direction:</div>
            <div class="value">{{currentWindDir}}</div>
          </div>
        </div>
      </div>
    </div>

    <hr>
      <div class="historic_data_wrapper">
        <h3>Past {{numHoursForHistory}} hours</h3>
        <button @click="reloadHistoricData">Reload</button>

        <div class="small">
          <div>Temperature</div>
          <line-chart :chart-data="temperatureCollection" :options="chartOptions" />

          <div>Wind</div>
          <line-chart :chart-data="windCollection" :options="chartOptions" />

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
      numHoursForHistory: 12,
      temperatureCollection: {},
      windCollection: {},
      chartOptions: {
        scales: {
          yAxes: [{
            ticks: {
              beginAtZero: false
            },
            gridLines: {
              display: true
            }
          }],
          xAxes: [ {
            gridLines: {
              display: true
            }
          }]
        },
        legend: {
          display: false
        },
        responsive: true,
        maintainAspectRatio: false
      }
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
    currentWindSpeed() {
      if(this.currentWeather.wind_speed) {
        let avg = this.round(this.averageOfArr(this.currentWeather.wind_speed), 2);
        return avg;
      }
    },
    currentWindGust() {
      if(this.currentWeather.max_gust) {
        let max = this.round(this.maxOfArr(this.currentWeather.max_gust), 2);
        return max;
      }
    },
    currentWindDir() {
      if(this.currentWeather.wind_dir) {
        return this.currentWeather.wind_dir[this.currentWeather.wind_dir.length - 1];
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
      const numseconds = this.numHoursForHistory * 60 * 60;
      const data = await this.getEventHistory(numseconds);
      this.historicData.loading = false;
      if(!data) {
        console.log("No historic data!");
        this.historicData.count = 0;
        this.historicData.events = [];
        return;
      }
      this.historicData = data;
      const timerange = this.historicDataTimeRange;
      const start = new Date(timerange.start);
      const end = new Date(timerange.end);
      console.log("Historical range:");
      console.log(start);
      console.log(end);
      this.calculateAndChartData();
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
        const date = new Date(startTime + (interval * i));
        const dateStr = date.toLocaleTimeString('en-AU', options);
        labels.push(dateStr);
      }
      return labels;
    },
    generateTimeLabelsFromEvents(events, options) {
      let labels = [];
      var options = {hour: 'numeric', minute: 'numeric'};
      for(var i = 0; i < events.length; ++i) {
        // const date = new Date(events[i].time);
        let date;
        if(i !== (events.length - 1)) {
          date = this.roundTimeToHalfHour(events[i].time);
        }
        else {
          date = new Date(events[i].time);
        }
        const dateStr = date.toLocaleTimeString('en-AU', options);
        labels.push(dateStr);
      }
      return labels;
    },
    roundTimeToHalfHour(time) {
      const date = new Date(time);
      var coeff = 1000 * 60 * 30;
      var rounded = new Date(Math.round(date.getTime() / coeff) * coeff)
      return rounded;
    },
    getEventIndicesForTimes(eventsToSearch, start, end, numSamples) {
      let events = [];
      let hasFoundStart = false;
      const startIndex = this.findIndexClosestTo(start, eventsToSearch);
      const endIndex = this.findIndexClosestTo(end, eventsToSearch);
      // subtract 1 from numsamples, because we're manually taking care of the start
      // and end indices
      const interval = (end - start) / (numSamples - 1);
      let indices = [startIndex];
      // Loop through but miss the start and end
      for(var i = 1; i < (numSamples - 1); ++i) {
        const target = (start + (i*interval));
        let index = this.findIndexClosestTo(target, eventsToSearch, indices[i-1]);
        indices.push(index);
      }
      indices.push(endIndex);
      return indices;
    },
    // Helper function to find the array index of event with time closest to @time
    findIndexClosestTo(time, events, startPos = 0) {
      let closestTimeDiff;
      let closestIndex;
      for(var i = startPos; i < events.length; ++i) {
        const timeDiff = time - events[i].time;
        if(!closestTimeDiff) {
          closestTimeDiff = timeDiff;
          if(closestTimeDiff === 0) {
            closestIndex = i;
            break;
          }
          continue;
        }
        // If the previous time diff was positive and this one is negative,
        // we've crossed over the point. Just see which is smaller and we're done
        if(closestTimeDiff > 0 && timeDiff < 0) {
          if(Math.abs(closestTimeDiff) < Math.abs(timeDiff)) {
            closestIndex = i - 1;
          }
          else {
            closestIndex = i;
          }
          break;
        }
        // else, compare then abs and store the smallest
        if(Math.abs(timeDiff) < Math.abs(closestTimeDiff)) {
          closestTimeDiff = timeDiff;
          closestIndex = i;
        }
      }
      return closestIndex;
    },
    sampledEvents(allEvents, timerange, numEvents) {
      let eventsToSample = 
      this.getEventIndicesForTimes(allEvents, timerange.start, timerange.end, numEvents);
      let events = [];
      eventsToSample.forEach(index => {
        events.push(allEvents[index]);
      });
      return {
        events: events,
        indices: eventsToSample
      };
    },
    calculateAndChartData() {
      const timerange = this.historicDataTimeRange;
      let tempData = [];
      if(!timerange) {
        return console.log("No time range to fill temperature data!");
      }
      let numSamples = this.numHoursForHistory;
      // numSamples = 4;
      const sampledEventsAndIndices
      = this.sampledEvents(this.historicData.events, timerange, numSamples);
      const events = sampledEventsAndIndices.events;
      const indices = sampledEventsAndIndices.indices;

      // Draw temperature, it just picks from the samples events
      this.drawTemperatureChart(events);

      // Calculate the wind data. It should be the maximum, average winds
      const windData = this.calculateWindData(indices, this.historicData.events);
      this.drawWindChart(windData, events);

    },
    calculateWindData(indices, allEvents) {
      // Should return the same number of indices, but should take data from either 
      // side of each index and return average, and maximum.
      let avgs = [];
      let segmentGroupsWindSpeed = [];
      let segmentGroupsWindGust = [];
      // console.log("Looking from " + indices[0] + " to " + indices[indices.length-1]);
      // Loop till 2nd last element, and do last element individually after loop
      for(var i = 0; i < indices.length; ++i) {
        // each event will have an array of wind values. extract it, 
        let index = indices[i];
        // find the halfway points
        let prevMidPoint;
        if(i !== 0) {
          prevMidPoint = indices[i-1] + Math.floor((index-indices[i-1])/2);
        }
        else {
          prevMidPoint = index;
        }
        let nextMidPoint;
        if(i !== indices.length - 1) {
          const nextIndex = indices[i+1];
          nextMidPoint = index + Math.floor((nextIndex - index) / 2);
        }
        else {
          nextMidPoint = index;
        }
        // Get all the wind info from index to nextMidpoint
        let thisSegmentWindSpeeds = [];
        let thisSegmentWindGust = [];
        // console.log("On loop " + i + " which has index " + index);
        // console.log("Looking at index: " + prevMidPoint + " through to " + nextMidPoint);
        for(var j = prevMidPoint; j < nextMidPoint; ++j) {
          thisSegmentWindSpeeds = thisSegmentWindSpeeds.concat(allEvents[j].wind_speed);
          thisSegmentWindGust = thisSegmentWindGust.concat(allEvents[j].max_gust);
        }
        segmentGroupsWindSpeed.push(thisSegmentWindSpeeds);
        segmentGroupsWindGust.push(thisSegmentWindGust);
      }
      // console.log(segmentGroupsWindSpeed);
      // Now create averages and max gusts
      let windAverages = [];
      let maxGusts = [];
      for(var i = 0; i < indices.length; ++i) {
        const windAvg = this.averageOfArr(segmentGroupsWindSpeed[i]);
        windAverages.push(windAvg);
        const maxGust = this.maxOfArr(segmentGroupsWindGust[i]);
        maxGusts.push(maxGust);
      }
      return {
        speeds: windAverages,
        gusts: maxGusts
      }
    },
    drawTemperatureChart(events) {
      const labels = this.generateTimeLabelsFromEvents(events);
      let tempVals = events.map(event => event.temperature);
      this.temperatureCollection = {
        labels: labels,
        datasets: [
          {
            label: "Temp (Celcius)",
            backgroundColor: 'rgba(0, 50, 100, 0.5)',
            data: tempVals
          }
        ]
      }
    },
    drawWindChart(windData, events) {
      const labels = this.generateTimeLabelsFromEvents(events);
      this.windCollection = {
        labels: labels,
        datasets: [
          {
            label: "Gust (Km/h)",
            backgroundColor: 'rgba(255, 0, 0, 0.5)',
            data: windData.gusts
          },
          {
            label: "Average (Km/h)",
            backgroundColor: 'rgba(0, 250, 0, 0.55)',
            data: windData.speeds
          }
        ]
      }

    },
    fillData () {
      this.temperatureCollection = {
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
    averageOfArr(arr) {
      let sum = 0;
      for(var i = 0; i < arr.length; ++i) {
        sum += arr[i];
      }
      sum /= arr.length;
      return sum;
    },
    maxOfArr(arr) {
      let max = 0;
      for(var i = 0; i < arr.length; ++i) {
        if(arr[i] > max) {
          max = arr[i];
        }
      }
      return max;
    },
    round(number, decimalPlaces) {
      const factorOfTen = Math.pow(10, decimalPlaces)
      return Math.round(number * factorOfTen) / factorOfTen
    }
  },
  mounted() {
    this.getCurrentData();
    this.reloadHistoricData();
    
  }

}
</script>

<style lang="scss">
.current_weather_display {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  margin-left: 20px;
  text-align: left;
  
  .atmos {
    display: flex;
    justify-content: flex-start;
    margin: 10px 0 0px 0;
    .item {
      margin: 0 20px 0 0px;
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