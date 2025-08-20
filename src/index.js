import Vue from 'vue'
import App from './app.vue'
import './debug-tools.js'

// 自动启动页面跳转监控
if (window.navigationDebugger) {
  window.navigationDebugger.start()
}

const wokooApp = document.createElement('div')
wokooApp.id = 'wokooApp-monkey_debug-98176'
document.body.appendChild(wokooApp)

new Vue({
  el: wokooApp,
  render: (h) => h(App),
})
