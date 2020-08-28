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

    <button @click="getCurrentData">Refresh</button>

  </div>
</template>

<script>
import axiosLib from 'axios'
var axios = axiosLib.create({
  'baseURL': 'https://weatherreporting.flyingaspidistra.net/events'
});
axios.defaults.headers.post['Content-Type'] = 'application/json';

export default {
  name: 'Main',
  data() {
    return {
      currentWeather: {loading: false}
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
    }
  },
  methods: {
    async getEventHistory(numSecBack) {
      const postData = {
        getPastSeconds: 86400
      }
      const data = await this.doPostCall(postData);
      if(!data) {
        return console.log("Couldn't get event history");
      }
      
    },
    async getCurrentData() {
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

    },
    async doPostCall(postData) {
      this.currentWeather.loading = true;
      try {
        const res = await axios.post('', postData);
        const data = res.data;
        return Promise.resolve(data);
       }
      catch(e) {
        console.log("Error requesting data " + e);
        return Promise.resolve();
      }
    }
  },
  mounted() {
    this.getCurrentData();
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
</style>