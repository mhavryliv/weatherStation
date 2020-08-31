import Vue from 'vue'
import App from './App.vue'
import 'vue-progress-path/dist/vue-progress-path.css'
import VueProgress from 'vue-progress-path'
import VueMq from 'vue-mq'
 
Vue.use(VueMq, {
  breakpoints: { // default breakpoints - customize this
    sm: 450,
    md: 1250,
    lg: Infinity,
  }
  // defaultBreakpoint: 'sm' // customize this for SSR
})

Vue.use(VueProgress, {
  // defaultShape: 'circle',
})
Vue.config.productionTip = false

new Vue({
  render: function (h) { return h(App) },
}).$mount('#app')
