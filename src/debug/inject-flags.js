/**
 * 各功能模块是否注入的开关
 * 在 Tampermonkey 或页面脚本中可通过 window.MONKEY_DEBUG_INJECT 覆盖
 */
const defaultFlags = {
  locationIntercept: false,
  historyIntercept: false,
  windowIntercept: false,
  networkMonitor: false,
  formClickMonitor: false,
  cookieMonitor: true,
  antiDebug: false,
  remoteExec: true,
  logIntercept: true
}

export function getInjectFlags() {
  if (typeof window !== 'undefined' && window.MONKEY_DEBUG_INJECT && typeof window.MONKEY_DEBUG_INJECT === 'object') {
    return { ...defaultFlags, ...window.MONKEY_DEBUG_INJECT }
  }
  return { ...defaultFlags }
}
