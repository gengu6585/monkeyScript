/**
 * 拦截 window.open / window.close
 * 开关：注入由 inject-flags.windowIntercept 控制
 */
import { logNavigation } from './navigation-logger.js'

let openOriginal = null
let closeOriginal = null
let installed = false

export function install() {
  if (installed || typeof window === 'undefined') return
  if (typeof window.open === 'function') {
    openOriginal = window.open
    window.open = function (...args) {
      logNavigation('window', 'open', args, 'Window.open 调用', true)
      return openOriginal.apply(window, args)
    }
  }
  if (typeof window.close === 'function') {
    closeOriginal = window.close
    window.close = function (...args) {
      logNavigation('window', 'close', args, 'Window.close 调用', true)
      return closeOriginal.apply(window, args)
    }
  }
  installed = true
}

export function uninstall() {
  if (!installed) return
  if (openOriginal) window.open = openOriginal
  if (closeOriginal) window.close = closeOriginal
  installed = false
}
