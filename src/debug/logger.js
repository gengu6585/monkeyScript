/**
 * 统一日志：包含时间、level、注入 env 前缀
 * env 与 tampermonkey.js 注入时一致（window.top / iframe/frame / no-window，可选 window.name）
 */
const PREFIX = '[monkey_debug]'

function now() {
  const d = new Date()
  const t = d.toTimeString().slice(0, 12) // HH:mm:ss
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${t}.${ms}`
}

function getEnv() {
  if (typeof window === 'undefined') return 'no-window'
  if (window.MONKEY_DEBUG_ENV != null) return String(window.MONKEY_DEBUG_ENV)
  let env = 'window.top'
  if (window.parent && window.parent !== window) env = 'iframe/frame'
  if (window.name) env += `, window.name: ${window.name}`
  return env
}

function format(level, args) {
  const time = now()
  const env = getEnv()
  const msg = args.map(a => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a))).join(' ')
  return `${time} [${level}] ${PREFIX}[${env}] ${msg}`
}

function log(level, ...args) {
  if (typeof console === 'undefined') return
  const line = format(level, args)
  if (level === 'ERROR') {
    console.error(line)
    if (args.length && args[args.length - 1] instanceof Error) console.error(args[args.length - 1])
  } else if (level === 'WARN') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export function getLogEnv() {
  return getEnv()
}

const YELLOW_STYLE = 'color: #b8860b; font-weight: bold; background: #fffacd; padding: 2px 4px;'

/** 与 info 相同格式（时间、level、env 前缀），但控制台输出为黄色 */
function logYellow(level, ...args) {
  if (typeof console === 'undefined') return
  const line = format(level, args)
  console.log('%c' + line, YELLOW_STYLE)
}

export const monkeyLog = {
  info(...args) { log('INFO', ...args) },
  warn(...args) { log('WARN', ...args) },
  error(...args) { log('ERROR', ...args) },
  log(level, ...args) { log(level, ...args) },
  /** 规范格式 + 黄色，用于 cookie 等需高亮的单行 */
  infoYellow(...args) { logYellow('INFO', ...args) }
}