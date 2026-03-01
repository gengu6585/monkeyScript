/**
 * 导航/跳转日志工具，供其他 debug 模块使用，无独立开关
 */
const SUSPICIOUS_PATTERNS = [
  /redirect/i, /jump/i, /go\s*to/i, /navigate/i,
  /location\.href/i, /window\.open/i, /location\.replace/i, /location\.assign/i
]

const MAX_LOGS = 200
const logs = []

function isSuspicious(category, action, args) {
  const argsStr = JSON.stringify(args || []).toLowerCase()
  return SUSPICIOUS_PATTERNS.some(p => p.test(argsStr) || p.test(String(action)))
}

export function getStackTrace() {
  try {
    const stack = new Error().stack
    const lines = (stack || '').split('\n').slice(2)
    return lines.map(line => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/)
      if (match) {
        return {
          functionName: match[1] || 'anonymous',
          fileName: match[2] || 'unknown',
          lineNumber: parseInt(match[3], 10) || 0,
          columnNumber: parseInt(match[4], 10) || 0
        }
      }
      return {
        functionName: line.trim().replace(/^at\s+/, '') || 'unknown',
        fileName: 'unknown',
        lineNumber: 0,
        columnNumber: 0
      }
    }).filter(frame =>
      frame.fileName !== 'unknown' &&
      !frame.fileName.includes('node_modules') &&
      !frame.fileName.includes('webpack') &&
      !frame.fileName.includes('debug/')
    )
  } catch (e) {
    return []
  }
}

export function logNavigation(category, action, args, description, captureStack = true) {
  const stackTrace = captureStack ? getStackTrace() : null
  const log = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toLocaleTimeString(),
    category,
    action,
    args: args || [],
    description,
    url: typeof window !== 'undefined' ? window.location.href : '',
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    stackTrace,
    suspicious: isSuspicious(category, action, args)
  }
  logs.unshift(log)
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS

  if (typeof console !== 'undefined' && console.group) {
    const emoji = log.suspicious ? '🚨' : '🔍'
    const color = log.suspicious ? '#ff4444' : '#007bff'
    console.group(`%c${emoji} ${log.description}`, `color: ${color}; font-weight: bold;`)
    console.log('类别:', log.category, '动作:', log.action, '参数:', log.args, 'URL:', log.url)
    if (stackTrace && stackTrace.length) console.log('调用栈:', stackTrace)
    console.groupEnd()
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('navigationDebug', { detail: log }))
    } catch (_) {}
  }
  return log
}

export function getLogs() {
  return [...logs]
}

export function clearLogs() {
  logs.length = 0
}

export function exportLogs() {
  const blob = new Blob([JSON.stringify({ exportTime: new Date().toISOString(), logs }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `navigation-debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function getLogStats() {
  const stats = { total: logs.length, byCategory: {}, byType: {}, suspicious: 0 }
  logs.forEach(log => {
    stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1
    stats.byType[log.action] = (stats.byType[log.action] || 0) + 1
    if (log.suspicious) stats.suspicious++
  })
  return stats
}

// 挂到 window 供 UI 或控制台使用
if (typeof window !== 'undefined') {
  window.navigationDebugLogs = { getLogs, clearLogs, exportLogs, getLogStats }
}
