import Vue from 'vue'
import App from './app.vue'
import './debug/index.js'

function injectUI() {
  if (!document.body) {
    // body 还没生成，等待
    return setTimeout(injectUI, 10)
  }
  const wokooApp = document.createElement('div')
  wokooApp.id = 'wokooApp-monkey_debug-98176'
  document.body.appendChild(wokooApp)
  new Vue({
    el: wokooApp,
    render: (h) => h(App),
  })
}

injectUI()
