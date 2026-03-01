/**
 * 拦截 History API：pushState / replaceState / go / back / forward
 * 开关：注入由 inject-flags.historyIntercept 控制
 */
import { logNavigation } from './navigation-logger.js'

const originals = {}
const methods = ['pushState', 'replaceState', 'go', 'back', 'forward']
let installed = false

export function install() {
  if (installed || typeof history === 'undefined') return
  methods.forEach(method => {
    if (typeof history[method] === 'function') {
      originals[method] = history[method]
      history[method] = function (...args) {
        logNavigation('history', method, args, `History.${method} 调用`, true)
        return originals[method].apply(history, args)
      }
    }
  })
  installed = true
}

export function uninstall() {
  if (!installed) return
  methods.forEach(method => {
    if (originals[method]) history[method] = originals[method]
  })
  installed = false
}
