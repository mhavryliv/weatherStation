<template>
  <div class="simple_main">
    <div v-show=currentWeather.loading>Loading...
      <loading-progress
        :indeterminate='true'
        :hide-background='false'
        shape="line"
        size="200"
        width="200"
        height="4"
      />
    </div>    
    <div v-show=!currentWeather.loading class="current_weather_display">
      <div id="currentTime">{{currentTime}}</div>
      <div id="windandcurtemp" :class="$mq">
        <div id="windandcurtempatmos">
          <h2>Temperature: {{currentWeather.temperature}} °C</h2>
          <h2>Humidity: {{currentWeather.humidity}}%</h2>
          <h2>Wind: {{liveWindSpeed}}</h2>
        </div>

      </div>



    </div>

  </div>
</template>

<script>
import axiosLib from 'axios'
var axios = axiosLib.create({
  'baseURL': 'https://weatherreporting.flyingaspidistra.net/events'
});
axios.defaults.headers.post['Content-Type'] = 'application/json';

import LineChart from './LineChart.js'

var self;
var ws;

export default {
  name: 'SimpleMain',
  components: {
    LineChart
  },
  watch: {
    numHoursForHistory(newVal) {
      if(newVal != 0) {
        this.reloadHistoricData(true)
      }
    }
  },
  data() {
    return {
      numTableItemsToShow: 10,
      hasUpdatedGauge: false,
      liveWindSpeed: 0,
      liveWindDir: "",
      currentWeather: {loading: false},
      historicData: {
        loading: false,
        count: 0,
        events: []
      },
      numHoursForHistory: 24,
      temperatureCollection: {},
      windCollection: {},
      waterCollection: {},
      currentTime: '',
    }
  },
  computed: {
    tableData() {
      const limit = this.numTableItemsToShow;
      let data = [];
      const toDo = Math.min(limit, this.historicData.events.length);
      const startPoint = this.historicData.events.length - toDo;
      const endPoint = startPoint + toDo;
      const dateOpt =
      {
      hour: 'numeric', minute: 'numeric'};

      for(var i = startPoint; i < endPoint; ++i) {
        let event = JSON.parse(JSON.stringify(this.historicData.events[i]));
        const eventTime = new Date(event.time);
        
        event.time = new Date(eventTime).toLocaleDateString('en-AU', dateOpt);
        event.displayTime = new Date(eventTime).toLocaleTimeString('en-AU',{hour12: false, hour: '2-digit', minute: '2-digit' })
        const windavg = this.averageOfArr(event.wind_speed);
        const windmax = this.maxOfArr(event.wind_speed);
        event.wind_avg = this.round(windavg, 1);
        event.wind_max = this.round(windmax, 1);
        event.water_mm = this.round(event.water_mm, 2);
        const mostCommonWindDir = this.mostCommonWindDir(event.wind_dir);
        event.main_wind_dir = mostCommonWindDir;
        data.push(event);
      }
      let result = [];
      for(var i = data.length - 1; i != -1; --i) {
        result.push(data[i]);
      }
      return result;
    },
    currentDate() {
      if(this.currentWeather.time) {
        const date = new Date(this.currentWeather.time);
        var options = 
        { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: 'numeric', minute: 'numeric'};
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
    setCurrentTime() {
      const now = new Date();
      const hours = (now.getHours() + '').padStart(2, '0');
      const minutes = (now.getMinutes() + '').padStart(2, '0');
      const seconds = (now.getSeconds() + '').padStart(2, '0');
      const ret = `${hours}:${minutes}:${seconds}`;
      this.currentTime = ret;
    },
    async reloadHistoricData(isReloading) {
      if(this.historicData.loading) {
        console.log("Already loading data");
        return;
      }
      if(!isReloading) {
        this.historicData.loading = true;
      }
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
    async getCurrentData(isReloading) {
      if(!isReloading) {
        this.currentWeather.loading = true;
      }
      const postData = {
        getCurrent: true
      }
      // console.log("Making post request for most recent event...");
      const data = await this.doPostCall(postData);
      if(!data) {
        return console.log("Couldn't get most recent event");
      }
      const event = data.events[0];
      this.currentWeather = event;
      // console.log("Got something for: " + new Date(event.time));
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
          date = this.roundTimeToMinutes(events[i].time, 30);
        }
        else {
          date = new Date(events[i].time);
        }
        const dateStr = date.toLocaleTimeString('en-AU', options);
        labels.push(dateStr);
      }
      return labels;
    },
    roundTimeToMinutes(time, minutes) {
      const date = new Date(time);
      var coeff = 1000 * 60 * minutes;
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
      if(closestIndex === undefined) {
        closestIndex = startPos;
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
      let numSamples = this.numHoursForHistory + 1; // add 1 so it rounds properly
      if(numSamples < 6) {
        numSamples = 4;
      }
      // numSamples = 4;
      const sampledEventsAndIndices
      = this.sampledEvents(this.historicData.events, timerange, numSamples);
      const events = sampledEventsAndIndices.events;
      const indices = sampledEventsAndIndices.indices;

      // Draw temperature, it just picks from the samples events
      this.drawTemperatureChart(events);

      // Calculate the wind data. It should be the maximum, average winds
      const windData = this.calculateWindAndWaterData(indices, this.historicData.events);
      this.drawWindChart(windData, events);
      this.drawWaterChart(windData.water, events);
    },
    calculateWindAndWaterData(indices, allEvents) {
      // Should return the same number of indices, but should take data from either 
      // side of each index and return average, and maximum.
      let avgs = [];
      let segmentGroupsWindSpeed = [];
      let segmentGroupsWindGust = [];
      let waterTotals = [];
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
        let waterSum = 0;
        for(var j = prevMidPoint; j < nextMidPoint; ++j) {
          thisSegmentWindSpeeds = thisSegmentWindSpeeds.concat(allEvents[j].wind_speed);
          thisSegmentWindGust = thisSegmentWindGust.concat(allEvents[j].max_gust);
          waterSum += allEvents[j].water_mm;
        }
        segmentGroupsWindSpeed.push(thisSegmentWindSpeeds);
        segmentGroupsWindGust.push(thisSegmentWindGust);
        waterTotals.push(waterSum);
      }
      // console.log(segmentGroupsWindSpeed);
      // Now create averages and max gusts
      let windAverages = [];
      let maxGusts = [];
      let waterCumulatives = [];
      for(var i = 0; i < indices.length; ++i) {
        const windAvg = this.averageOfArr(segmentGroupsWindSpeed[i]);
        windAverages.push(windAvg);
        const maxGust = this.maxOfArr(segmentGroupsWindSpeed[i]);
        maxGusts.push(maxGust);
        const water = waterTotals[i];
        if(i === 0) {
          waterCumulatives.push(water);
        }
        else {
          waterCumulatives.push(waterCumulatives[i-1] + water);
        }
      }
      return {
        speeds: windAverages,
        gusts: maxGusts,
        water: waterCumulatives
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
            // borderColor: 'rgba(255, 0, 0, 1)',
            data: windData.gusts,
            backgroundColor: 'rgba(0, 50, 100, 0.5)'
            // borderWidth: 2
          },
          {
            label: "Average (Km/h)",
            // borderColor: 'rgba(0, 100, 0, 1)',
            data: windData.speeds,
            backgroundColor: 'rgba(0, 100, 50, 0.5)'
          }
        ]
      }
    },
    drawWaterChart(waterData, events) {
      const labels = this.generateTimeLabelsFromEvents(events);
      this.waterCollection = {
        labels: labels,
        datasets: [
          {
            label: "Rainfall (mm)",
            backgroundColor: 'rgba(0, 50, 100, 0.5)',
            data: waterData
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
    mostCommonWindDir(arr) {
      let map = {};
      for(var i = 0; i < arr.length; ++i) {
        if(!map[arr[i]]) {
          map[arr[i]] = 1;
        }
        else {
          map[arr[i]] = map[arr[i]] + 1;
        }
      }
      const keys = Object.keys(map);
      let maxObj = keys[0];
      for(var i = 1; i < keys.length; ++i) {
        if(map[keys[i]] > map[maxObj]) {
          maxObj = keys[i];
        }
      }
      return maxObj;
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
    },
    windNames() {
      return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    },
    windNamesForGauge() {
      return ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE'];
    },
    windNumberFromDir(dir) {
      const data = {
        S: 0,
        SE: 45,
        E: 90,
        NE: 135,
        N: 180,
        NW: 225,
        W: 270,
        SW: 315
      }

      return data[dir];
    },
    reloadSelf(isReloading) {
      this.getCurrentData(isReloading);
      this.reloadHistoricData(isReloading);
      setTimeout(() => {
        this.reloadSelf(true);
      }, 60000);
    }
  },
  mounted() {
    self = this;
    this.reloadSelf(false);
    setInterval(self.setCurrentTime, 1000);
    
    // theGauge.data([0, 30]);
    if(ws) {
      console.log("Not creating another ws");
      return;
    }
    else {
      ws = new WebSocket('ws://realtimeweather-molly1.flyingaspidistra.net:8123');
      ws.onopen = () => {
        console.log("Opened websocket");
      }
      ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        let windDir = data.wdir;
        windDir = self.windNumberFromDir(windDir);
        const windSpeed = data.wspeed;
        self.liveWindSpeed = self.round(windSpeed, 2) + ` km/h (${data.wdir})`;
        self.liveWindDir = data.wdir;
      }
    }
  },
  beforeDestroy() {
    ws.close();
  }

}
</script>

<style lang="scss">
.simple_main {
  background: black;
  color: whitesmoke;

  font-weight: 200;
  height: 100vh;
  font-size: 1.3em;
}
.current_weather_display {  
  .atmos {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    margin: 10px 0 0px 0;
    // width: 100vw;
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

#container {
  height: 350px;
  min-width: 350px;
}

#currentTime {
  width: 100%;
  text-align: right;
  position: fixed;
  top: 10px;
  right: 10px;
  font-size: 1.5em;
}

#windandcurtemp {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  h2 {
    font-weight: 200;
    font-size: 1.75em;
  }
  text-align: center;
}
</style>