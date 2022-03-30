<template>
  <div id="app">
    <SimpleMain/>
  </div>
</template>

<script>
import Main from './components/Main';
import SimpleMain from './components/SimpleMain';
export default {
  
  name: 'App',
  components: {
    SimpleMain
  }
}
</script>

<style>
body {
  margin: 0
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>
