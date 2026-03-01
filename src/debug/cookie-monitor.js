/**
 * 监控 document.cookie 变化：实时拦截 setter + 轮询兜底
 * 细化到单条 cookie 的增/删/改，黄色高亮，输出完整调用栈（多行）
 * 在「定义 cookie 的 prototype」上 hook，被其他脚本覆盖时自动重新挂载
 * 开关：注入由 inject-flags.cookieMonitor 控制
 */
import { monkeyLog } from './logger.js'

const YELLOW_STYLE = 'color: #b8860b; font-weight: bold; background: #fffacd; padding: 2px 4px;'
const COOKIE_HOOK_MARKER = '__cookieMonitorSet'

function parseCookieMap(str) {
  const map = {}
  if (!str || typeof str !== 'string') return map
  str.split(';').forEach(part => {
    const eq = part.indexOf('=')
    if (eq === -1) return
    const name = decodeURIComponent(part.slice(0, eq).trim())
    const value = decodeURIComponent(part.slice(eq + 1).trim())
    if (name) map[name] = value
  })
  return map
}

function diffCookieMaps(oldMap, newMap) {
  const added = []
  const deleted = []
  const modified = []
  const allKeys = new Set([...Object.keys(oldMap), ...Object.keys(newMap)])
  allKeys.forEach(name => {
    const had = Object.prototype.hasOwnProperty.call(oldMap, name)
    const has = Object.prototype.hasOwnProperty.call(newMap, name)
    if (!had && has) added.push({ name, value: newMap[name] })
    else if (had && !has) deleted.push({ name, value: oldMap[name] })
    else if (had && has && oldMap[name] !== newMap[name]) modified.push({ name, oldValue: oldMap[name], newValue: newMap[name] })
  })
  return { added, deleted, modified }
}

function getFullStack() {
  try {
    const stack = new Error().stack
    if (!stack) return []
    return stack.split('\n').slice(2).map(line => line.trim()).filter(Boolean)
  } catch (e) {
    return []
  }
}

function logCookieDiff(diff, stackLines) {
  const hasChange = diff.added.length || diff.deleted.length || diff.modified.length
  if (!hasChange) return

  const time = new Date().toLocaleTimeString()
  if (typeof console === 'undefined' || !console.log) return

  const summary = `+${diff.added.length} -${diff.deleted.length} ~${diff.modified.length}`
  monkeyLog.infoYellow('cookie 变化', summary)

  if (diff.added.length) {
    console.log('%c  新增:', YELLOW_STYLE)
    diff.added.forEach(item => console.log('%c    ' + item.name + ' = ' + item.value, YELLOW_STYLE))
  }
  if (diff.deleted.length) {
    console.log('%c  删除:', YELLOW_STYLE)
    diff.deleted.forEach(item => console.log('%c    ' + item.name + ' (原值: ' + item.value + ')', YELLOW_STYLE))
  }
  if (diff.modified.length) {
    console.log('%c  修改:', YELLOW_STYLE)
    diff.modified.forEach(item => console.log('%c    ' + item.name + ': ' + item.oldValue + ' → ' + item.newValue, YELLOW_STYLE))
  }

  if (stackLines && stackLines.length) {
    console.log('%c  调用栈:', YELLOW_STYLE)
    stackLines.forEach((line, i) => console.log('    ' + (i + 1) + '. ' + line))
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('navigationDebug', {
        detail: {
          category: 'cookie',
          action: 'change',
          description: `Cookie 变化: +${diff.added.length} -${diff.deleted.length} ~${diff.modified.length}`,
          timestamp: time,
          args: [diff],
          stackTrace: (stackLines && stackLines.length) ? stackLines.map((line, i) => ({ functionName: line, fileName: '', lineNumber: i, columnNumber: 0 })) : [],
          url: window.location.href,
          suspicious: false
        }
      }))
    } catch (_) {}
  }
}

let lastCookieMap = {}
let intervalId = null
let checkIntervalId = null
let installed = false
let originalDescriptor = null
let cookieProto = null // 定义 cookie 的 prototype（Document.prototype 或子类）
let ourSetRef = null   // 我们的 setter 引用，用于检测是否被覆盖
let useFallbackPolling = false

function onCookieChangeAfterSet() {
  const raw = typeof document !== 'undefined' ? document.cookie || '' : ''
  const newMap = parseCookieMap(raw)
  const diff = diffCookieMaps(lastCookieMap, newMap)
  const hasChange = diff.added.length || diff.deleted.length || diff.modified.length
  if (hasChange) {
    logCookieDiff(diff, getFullStack())
    lastCookieMap = newMap
  }
}

function pollAndDiff() {
  const raw = typeof document !== 'undefined' ? document.cookie || '' : ''
  const newMap = parseCookieMap(raw)
  const diff = diffCookieMaps(lastCookieMap, newMap)
  const hasChange = diff.added.length || diff.deleted.length || diff.modified.length
  if (hasChange) {
    logCookieDiff(diff, null)
    lastCookieMap = newMap
  }
}

/** 查找真正定义 cookie 的 prototype（沿 document 原型链） */
function findCookieDescriptor() {
  if (typeof document === 'undefined') return { desc: null, proto: null }
  let proto = document
  while (proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, 'cookie')
    if (desc && typeof desc.set === 'function') {
      return { desc, proto }
    }
    proto = Object.getPrototypeOf(proto)
  }
  return { desc: null, proto: null }
}

/** 当前 document.cookie 的 setter 是否还是我们挂的 */
function isOurHookStillActive() {
  if (!cookieProto || !ourSetRef) return false
  try {
    const current = Object.getOwnPropertyDescriptor(cookieProto, 'cookie')
    return current && current.set && current.set[COOKIE_HOOK_MARKER] === true
  } catch (e) {
    return false
  }
}

/** 在指定 prototype 上挂载/重新挂载 cookie setter */
function applyHook() {
  const { desc, proto } = findCookieDescriptor()
  if (!desc || !proto || desc.configurable === false) {
    return false
  }
  const originalSet = desc.set
  const originalGet = desc.get
  const wrappedSet = function (value) {
    originalSet.call(this, value)
    onCookieChangeAfterSet()
  }
  wrappedSet[COOKIE_HOOK_MARKER] = true
  ourSetRef = wrappedSet

  try {
    Object.defineProperty(proto, 'cookie', {
      get: originalGet,
      set: wrappedSet,
      configurable: true,
      enumerable: desc.enumerable !== false
    })
    originalDescriptor = desc
    cookieProto = proto
    return true
  } catch (e) {
    return false
  }
}

/** 定期检查 hook 是否被其他脚本覆盖，若被覆盖则重新挂载 */
function startHookGuard() {
  if (checkIntervalId) return
  checkIntervalId = setInterval(() => {
    if (!installed || useFallbackPolling) return
    if (isOurHookStillActive()) return
    if (cookieProto && originalDescriptor) {
      try {
        const ok = applyHook()
        if (ok && typeof window !== 'undefined' && window.monkeyLog) {
          window.monkeyLog.warn('[cookie-monitor] 检测到 document.cookie 被其他脚本覆盖，已重新挂载')
        }
      } catch (_) {}
    }
  }, 2000)
}

function stopHookGuard() {
  if (checkIntervalId) {
    clearInterval(checkIntervalId)
    checkIntervalId = null
  }
}

export function install() {
  if (installed || typeof document === 'undefined') return

  lastCookieMap = parseCookieMap(document.cookie || '')

  const ok = applyHook()
  if (!ok) {
    useFallbackPolling = true
    if (typeof window !== 'undefined' && window.monkeyLog) {
      window.monkeyLog.info('[cookie-monitor] document.cookie 不可劫持，使用定时轮询')
    }
  } else {
    startHookGuard()
  }

  if (useFallbackPolling) {
    intervalId = setInterval(pollAndDiff, 100)
  }

  installed = true
}

export function uninstall() {
  stopHookGuard()
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (cookieProto && originalDescriptor && typeof document !== 'undefined') {
    try {
      Object.defineProperty(cookieProto, 'cookie', {
        get: originalDescriptor.get,
        set: originalDescriptor.set,
        configurable: true,
        enumerable: originalDescriptor.enumerable !== false
      })
    } catch (_) {}
  }
  originalDescriptor = null
  cookieProto = null
  ourSetRef = null
  useFallbackPolling = false
  installed = false
}
