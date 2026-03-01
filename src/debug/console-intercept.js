/**
 * 控制台日志拦截：劫持 console.log/info/warn/error/debug，写入环形缓冲区，
 * 供远程执行通过 window.monkeyDebugGetConsoleLogs() 拉取。
 * 开关键: window.MONKEY_DEBUG_INJECT.logIntercept（默认 true）
 */

const MAX_LOGS = 500
const buffer = []

function safeStringify(arg) {
  if (arg === null) return 'null'
  if (arg === undefined) return 'undefined'
  if (typeof arg !== 'object') return String(arg)
  if (arg instanceof Error) return arg.stack || arg.message || String(arg)
  try {
    return JSON.stringify(arg)
  } catch {
    try {
      return String(arg)
    } catch {
      return '[object]'
    }
  }
}

function capture(level, args) {
  const entry = {
    level,
    time: new Date().toISOString(),
    ts: Date.now(),
    args: Array.from(args).map(safeStringify)
  }
  buffer.push(entry)
  if (buffer.length > MAX_LOGS) buffer.shift()
}

let original = {}

function install() {
  if (original.log !== undefined) return
  const methods = ['log', 'info', 'warn', 'error', 'debug']
  methods.forEach((method) => {
    const fn = console[method]
    if (typeof fn !== 'function') return
    original[method] = fn
    console[method] = function (...args) {
      capture(method, args)
      try {
        original[method].apply(console, args)
      } catch (_) {}
    }
  })
}

function uninstall() {
  Object.keys(original).forEach((method) => {
    if (typeof original[method] === 'function') {
      console[method] = original[method]
    }
  })
  original = {}
}

/** 供远程 exec 拉取：return window.monkeyDebugGetConsoleLogs() */
function getLogs(opts = {}) {
  const { limit = 200, since } = opts
  let list = buffer
  if (since != null && typeof since === 'number') {
    list = buffer.filter((e) => e.ts >= since)
  }
  if (list.length > limit) {
    list = list.slice(-limit)
  }
  return list
}

function clearLogs() {
  buffer.length = 0
}

if (typeof window !== 'undefined') {
  window.monkeyDebugGetConsoleLogs = getLogs
  window.monkeyDebugClearConsoleLogs = clearLogs
}

export { install, uninstall, getLogs, clearLogs }
