/**
 * 反调试检测：拦截 console.debugger/clear、Function#toString、定时器、defineProperty、F12、window.open、__defineGetter__ 等
 * 开关：注入由 inject-flags.antiDebug 控制；也可通过 window.enableAntiDebug() 手动开启
 */
let installed = false
const restorables = []

function install() {
  if (installed || typeof window === 'undefined') return

  // 1. console.debugger/clear/profile 等
  ;['debugger', 'clear', 'profile', 'profileEnd', 'table', 'trace'].forEach(fn => {
    if (typeof console[fn] !== 'function') return
    try {
      const desc = Object.getOwnPropertyDescriptor(console, fn)
      if (desc && !desc.writable && !desc.configurable) return
      const original = console[fn]
      console[fn] = function (...args) {
        console.log(`[anti-debug] console.${fn} 被调用`, args, new Error().stack)
        return original.apply(this, args)
      }
      restorables.push({ type: 'console', key: fn, original })
    } catch (_) {}
  })

  // 2. Function.prototype.toString
  const originalToString = Function.prototype.toString
  Function.prototype.toString = function () {
    const result = originalToString.apply(this, arguments)
    if (result.includes('[native code]') && result.includes('debugger')) {
      console.log('[anti-debug] Function.prototype.toString 检测到 debugger', this, new Error().stack)
    }
    return result
  }
  restorables.push({ type: 'toString', original: originalToString })

  // 3. setInterval/setTimeout 含 debugger 的回调
  ;['setInterval', 'setTimeout'].forEach(fn => {
    const original = window[fn]
    window[fn] = function (cb, delay, ...args) {
      if (typeof cb === 'function' && cb.toString().includes('debugger')) {
        console.log(`[anti-debug] ${fn} 检测到包含 debugger 的回调`, cb, new Error().stack)
      }
      return original.apply(this, [cb, delay, ...args])
    }
    restorables.push({ type: 'timer', key: fn, original })
  })

  // 4. outerWidth/outerHeight 检测
  let lastW = window.outerWidth, lastH = window.outerHeight
  const sizeInterval = setInterval(() => {
    if (window.outerWidth !== lastW || window.outerHeight !== lastH) {
      console.log('[anti-debug] DevTools 窗口尺寸变化', window.outerWidth, window.outerHeight)
      lastW = window.outerWidth
      lastH = window.outerHeight
    }
  }, 500)
  restorables.push({ type: 'interval', id: sizeInterval })

  // 5. Object.defineProperty
  const originalDefineProperty = Object.defineProperty
  Object.defineProperty = function (obj, prop, descriptor) {
    if (prop === 'isDebuggerPresent' || prop === '__debug__') {
      console.log('[anti-debug] Object.defineProperty 检测到 debug 相关属性', prop, new Error().stack)
    }
    return originalDefineProperty.apply(this, arguments)
  }
  restorables.push({ type: 'defineProperty', original: originalDefineProperty })

  // 6. F12 / Ctrl+Shift+I
  const keyHandler = function (e) {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
      console.log('[anti-debug] DevTools 快捷键', e)
    }
  }
  document.addEventListener('keydown', keyHandler, true)
  restorables.push({ type: 'keydown', handler: keyHandler })

  // 7. window.open（仅打日志，不阻止）
  const originalOpen = window.open
  window.open = function (...args) {
    console.log('[anti-debug] window.open 被调用', args, new Error().stack)
    return originalOpen.apply(this, args)
  }
  restorables.push({ type: 'open', original: originalOpen })

  // 8. __defineGetter__
  if (typeof Object.prototype.__defineGetter__ === 'function') {
    const originalDG = Object.prototype.__defineGetter__
    Object.prototype.__defineGetter__ = function (prop, fn) {
      if (typeof prop === 'string' && prop.toLowerCase().includes('debug')) {
        console.log('[anti-debug] __defineGetter__ 检测到 debug 相关属性', prop, new Error().stack)
      }
      return originalDG.apply(this, arguments)
    }
    restorables.push({ type: 'defineGetter', original: originalDG })
  }

  installed = true
}

function uninstall() {
  if (!installed) return
  restorables.reverse().forEach(r => {
    try {
      if (r.type === 'console' && console[r.key] !== undefined) console[r.key] = r.original
      if (r.type === 'timer') window[r.key] = r.original
      if (r.type === 'interval' && r.id) clearInterval(r.id)
      if (r.type === 'defineProperty') Object.defineProperty = r.original
      if (r.type === 'keydown' && r.handler) document.removeEventListener('keydown', r.handler, true)
      if (r.type === 'open') window.open = r.original
      if (r.type === 'defineGetter') Object.prototype.__defineGetter__ = r.original
      if (r.type === 'toString') {
        Function.prototype.toString = r.original
      }
    } catch (_) {}
  })
  restorables.length = 0
  installed = false
}

export { install, uninstall }

// 挂到 window 供控制台手动调用
if (typeof window !== 'undefined') {
  window.enableAntiDebug = install
  window.disableAntiDebug = uninstall
}
