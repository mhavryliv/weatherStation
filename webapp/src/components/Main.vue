<template>
  <div class="main">
    <h1>Mollymook Weather Station</h1>
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

    }
  },
  methods: {
    async getCurrentData() {
      const postData = {
        getCurrent: true
      }
      console.log("Making post request...");
      try {
        const res = await axios.post('', postData);
        const data = res.data;
        console.log(data);
      }
      catch(e) {
        console.log("Error requestion data " + e);
      }
    }
  }
}
</script>

<style lang="scss">

</style>