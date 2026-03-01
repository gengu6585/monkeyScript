/**
 * 拦截 location.href / assign / replace，用于逆向分析跳转
 * 开关：注入开关由 inject-flags.locationIntercept 控制；本模块内 breakOnContain 可配置
 */
import { logNavigation } from './navigation-logger.js'

let restored = false
let originalHrefSet = null

const DEFAULTS = {
  logToConsole: true,
  breakOnContain: '' // 例如 'home'：当 href 包含该字符串时触发 debugger
}

function getOpt() {
  const o = (typeof window !== 'undefined' && window.MONKEY_DEBUG_LOCATION_OPT) || {}
  return { ...DEFAULTS, ...o }
}

export function install() {
  if (typeof window === 'undefined') return
  if (originalHrefSet && !restored) return
  if (restored) restored = false
  const proto = Object.getPrototypeOf(window.location)
  const desc = Object.getOwnPropertyDescriptor(proto, 'href')
  if (!desc || !desc.set) return

  originalHrefSet = desc.set
  Object.defineProperty(window.location, 'href', {
    set: function (value) {
      const opt = getOpt()
      if (typeof value === 'string') {
        if (opt.breakOnContain && value.includes(opt.breakOnContain)) {
          debugger
        }
        if (opt.logToConsole !== false) {
          logNavigation('location', 'href', [value], 'location.href set', true)
        }
      }
      originalHrefSet.call(this, value)
    },
    get: desc.get,
    configurable: true
  })
}

export function uninstall() {
  if (!originalHrefSet || typeof window === 'undefined') return
  const proto = Object.getPrototypeOf(window.location)
  try {
    const desc = Object.getOwnPropertyDescriptor(proto, 'href')
    Object.defineProperty(window.location, 'href', {
      set: originalHrefSet,
      get: desc && desc.get ? desc.get : undefined,
      configurable: true
    })
  } catch (_) {}
  restored = true
}
