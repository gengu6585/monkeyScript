/**
 * Debug 功能入口：根据 inject-flags 按需注入各模块，无统一配置类
 */
import { getInjectFlags } from './inject-flags.js'
import { monkeyLog } from './logger.js'
import { install as installLocation, uninstall as uninstallLocation } from './location-intercept.js'
import { install as installHistory, uninstall as uninstallHistory } from './history-intercept.js'
import { install as installWindow, uninstall as uninstallWindow } from './window-intercept.js'
import { install as installNetwork, uninstall as uninstallNetwork } from './network-monitor.js'
import { install as installFormClick, uninstall as uninstallFormClick } from './form-click-monitor.js'
import { install as installCookieMonitor, uninstall as uninstallCookieMonitor } from './cookie-monitor.js'
import { install as installAntiDebug, uninstall as uninstallAntiDebug } from './anti-debug.js'
import { install as installRemoteExec, uninstall as uninstallRemoteExec } from './remote-exec-client.js'
import { install as installConsoleIntercept, uninstall as uninstallConsoleIntercept } from './console-intercept.js'
import { getLogs, clearLogs, exportLogs, getLogStats } from './navigation-logger.js'

const modules = [
  ['logIntercept', installConsoleIntercept, uninstallConsoleIntercept],
  ['locationIntercept', installLocation, uninstallLocation],
  ['historyIntercept', installHistory, uninstallHistory],
  ['windowIntercept', installWindow, uninstallWindow],
  ['networkMonitor', installNetwork, uninstallNetwork],
  ['formClickMonitor', installFormClick, uninstallFormClick],
  ['cookieMonitor', installCookieMonitor, uninstallCookieMonitor],
  ['antiDebug', installAntiDebug, uninstallAntiDebug],
  ['remoteExec', installRemoteExec, uninstallRemoteExec]
]

export function installDebugModules() {
  const flags = getInjectFlags()
  const installed = []
  modules.forEach(([key, install]) => {
    if (flags[key]) {
      try {
        install()
        installed.push(key)
        monkeyLog.info('安装模块:', key)
      } catch (e) {
        monkeyLog.error('模块安装失败:', key, e)
      }
    }
  })
  monkeyLog.info('安装完成，已注入模块:', installed.length ? installed.join(', ') : '(无)')
}

export function uninstallDebugModules() {
  const names = modules.map(([key]) => key)
  monkeyLog.info('开始卸载模块:', names.join(', '))
  modules.forEach(([key, , uninstall]) => {
    try {
      if (typeof uninstall === 'function') {
        uninstall()
        monkeyLog.info('卸载模块:', key)
      }
    } catch (e) {
      monkeyLog.error('模块卸载失败:', key, e)
    }
  })
  monkeyLog.info('卸载完成')
}

// 兼容旧 UI：暴露 navigationDebugger（start/stop/getLogs/clearLogs/exportLogs/getLogStats）
function createNavigationDebuggerCompat() {
  return {
    start() {
      installDebugModules()
    },
    stop() {
      uninstallDebugModules()
    },
    getLogs,
    clearLogs,
    exportLogs,
    getLogStats
  }
}

// 默认执行一次（可由 Tampermonkey 或页面在设置 window.MONKEY_DEBUG_INJECT 后提前执行）
installDebugModules()

if (typeof window !== 'undefined') {
  window.navigationDebugger = createNavigationDebuggerCompat()
  window.monkeyDebugInstall = installDebugModules
  window.monkeyDebugUninstall = uninstallDebugModules
  window.getMonkeyDebugInjectFlags = getInjectFlags
}

export { getInjectFlags }
export * from './navigation-logger.js'
