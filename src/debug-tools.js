/**
 * 页面跳转调试工具
 * 用于逆向分析网页跳转逻辑和调用栈
 */

class NavigationDebugger {
  constructor() {
    this.logs = []
    this.isActive = false
    this.originalMethods = {}
    this.originalEventListeners = new Map()
    this.redirectPatterns = []
    this.suspiciousUrls = []
    this.monitoringInterval = null
    
    // 初始化配置
    this.config = {
      maxLogs: 200,
      logToConsole: true,
      logToUI: true,
      captureStackTraces: true,
      monitorNetwork: true,
      monitorHistory: true,
      monitorForms: true,
      monitorClicks: true,
      suspiciousPatterns: [
        /redirect/i,
        /jump/i,
        /go\s*to/i,
        /navigate/i,
        /location\.href/i,
        /window\.open/i,
        /location\.replace/i,
        /location\.assign/i
      ]
    }

    // 绑定事件回调
    this.boundEventHandlers = {
      beforeunload: this.handleBeforeUnload.bind(this),
      unload: this.handleUnload.bind(this),
      popstate: this.handlePopState.bind(this),
      visibilitychange: this.handleVisibilityChange.bind(this),
      submit: this.handleFormSubmit.bind(this),
      click: this.handleClick.bind(this)
    }
  }

  /**
   * 启动调试器
   */
  start() {
    if (this.isActive) return
    
    this.isActive = true
    console.log('🚀 页面跳转调试器已启动')
    
    // this.interceptHistoryAPI()
    this.interceptLocationAPI()
    // this.interceptWindowAPI()
    // this.monitorNetworkRequests()
    // this.monitorFormSubmissions()
    // this.monitorClickEvents()
    // this.monitorUrlChanges()
    // this.monitorPageVisibility()
    
    // 定期检查 URL 变化
    this.startUrlMonitoring()
    
    // 监听页面跳转，自动清空 console
    this.setupConsoleClear()
  }

  /**
   * 停止调试器
   */
  stop() {
    if (!this.isActive) return
    
    this.isActive = false
    console.log('⏹️ 页面跳转调试器已停止')
    
    // 清理定时器
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    this.restoreOriginalMethods()
    this.removeEventListeners()
  }

  /**
   * 拦截 History API
   */
  interceptHistoryAPI() {
    const methods = ['pushState', 'replaceState', 'go', 'back', 'forward']
    
    methods.forEach(method => {
      if (history[method]) {
        this.originalMethods[`history.${method}`] = history[method]
        
        history[method] = (...args) => {
          this.logNavigation('history', method, args, 'History API 调用')
          return this.originalMethods[`history.${method}`].apply(history, args)
        }
      }
    })
  }

  /**
   * 拦截 Location API
   */
  interceptLocationAPI() {
    // 只拦截 location.href setter
    const proto = Object.getPrototypeOf(window.location);
    const originalHref = Object.getOwnPropertyDescriptor(proto, 'href');
    if (originalHref && originalHref.set) {
      this.originalMethods['location.href.set'] = originalHref.set;
      Object.defineProperty(window.location, 'href', {
        set: (value) => {
          // 打印调用栈
          console.log('location.href.set 调用栈:', new Error().stack);
          this.logNavigation('location', 'href.set', [value], 'Location.href 被设置');
          this.originalMethods['location.href.set'].call(window.location, value);
        },
        get: originalHref.get,
        configurable: true
      });
    }
    // 不再 wrap assign/replace/reload，避免报错
  }

  /**
   * 拦截 Window API
   */
  interceptWindowAPI() {
    if (window.open) {
      this.originalMethods['window.open'] = window.open
      
      window.open = (...args) => {
        this.logNavigation('window', 'open', args, 'Window.open 调用')
        return this.originalMethods['window.open'].apply(window, args)
      }
    }
    
    if (window.close) {
      this.originalMethods['window.close'] = window.close
      
      window.close = (...args) => {
        this.logNavigation('window', 'close', args, 'Window.close 调用')
        return this.originalMethods['window.close'].apply(window, args)
      }
    }
  }

  /**
   * 监控网络请求
   */
  monitorNetworkRequests() {
    if (!this.config.monitorNetwork) return
    
    const self = this // 保存 NavigationDebugger 实例的引用
    
    // 需要拒绝的 URL 模式（webpack-dev-server、热重载等）
    const rejectPatterns = [
      /sockjs-node/,
      /hot-update/,
      /__webpack_hmr/,
      /webpack-dev-server/,
      /localhost:8080.*\.(js|css|map)$/
    ]
    
    // 检查是否应该拒绝该 URL
    const shouldRejectUrl = (url) => {
      if (!url || typeof url !== 'string') return false
      return rejectPatterns.some(pattern => pattern.test(url))
    }
    
    // 拦截 XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      // 如果是需要拒绝的 URL，直接阻止请求
      if (shouldRejectUrl(url)) {
        // console.log(`🚫 阻止 webpack-dev-server 请求: ${url}`)
        // 创建一个被拒绝的 Promise
        this._debugRejected = true
        this._debugUrl = url
        return
      }
      
      this._debugMethod = method
      this._debugUrl = url
      this._debugRejected = false
      return originalXHROpen.apply(this, [method, url, ...args])
    }
    
    XMLHttpRequest.prototype.send = function(...args) {
      // 如果是被拒绝的请求，直接返回，不执行
      if (this._debugRejected) {
        // console.log(`🚫 阻止发送被拒绝的请求: ${this._debugUrl}`)
        // 模拟请求失败
        setTimeout(() => {
          this.dispatchEvent(new Event('error'))
          this.dispatchEvent(new Event('abort'))
        }, 0)
        return
      }
      
      if (this._debugUrl) {
        this.addEventListener('readystatechange', function() {
          if (this.readyState === 4) {
            // 检查是否是页面跳转相关的请求
            if (this.responseURL && this.responseURL !== this._debugUrl) {
              self.logNavigation('xhr', 'redirect', [this._debugUrl, this.responseURL], 'XHR 重定向')
            }
          }
        })
      }
      return originalXHRSend.apply(this, args)
    }
    
    // 拦截 Fetch
    const originalFetch = window.fetch
    window.fetch = (...args) => {
      const [url, options] = args
      
      // 如果是需要拒绝的 URL，直接返回一个被拒绝的 Promise
      if (shouldRejectUrl(url)) {
        // console.log(`🚫 阻止 webpack-dev-server Fetch 请求: ${url}`)
        return Promise.reject(new Error(`Blocked webpack-dev-server request: ${url}`))
      }
      
      return originalFetch(...args).then(response => {
        if (response.redirected) {
          self.logNavigation('fetch', 'redirect', [url, response.url], 'Fetch 重定向')
        }
        return response
      })
    }
  }

  /**
   * 监控表单提交
   */
  monitorFormSubmissions() {
    if (!this.config.monitorForms) return
    
    document.addEventListener('submit', this.boundEventHandlers.submit)
  }

  /**
   * 处理表单提交事件
   */
  handleFormSubmit(event) {
    const form = event.target
    const action = form.action || window.location.href
    const method = form.method || 'GET'
    
    this.logNavigation('form', 'submit', [action, method], '表单提交')
    
    // 检查表单中的可疑字段
    this.checkSuspiciousFormFields(form)
  }

  /**
   * 检查可疑的表单字段
   */
  checkSuspiciousFormFields(form) {
    const suspiciousFields = ['redirect', 'jump', 'goto', 'next', 'target']
    const formData = new FormData(form)
    
    for (let [key, value] of formData.entries()) {
      if (suspiciousFields.some(field => key.toLowerCase().includes(field))) {
        this.logNavigation('form', 'suspicious_field', [key, value], '可疑表单字段')
      }
    }
  }

  /**
   * 监控点击事件
   */
  monitorClickEvents() {
    if (!this.config.monitorClicks) return
    
    document.addEventListener('click', this.boundEventHandlers.click)
  }

  /**
   * 处理点击事件
   */
  handleClick(event) {
    const target = event.target
    
    // 检查链接点击
    if (target.tagName === 'A' && target.href) {
      this.logNavigation('click', 'link', [target.href], '链接点击')
    }
    
    // 检查按钮点击
    if (target.tagName === 'BUTTON') {
      const onclick = target.getAttribute('onclick')
      if (onclick && this.config.suspiciousPatterns.some(pattern => pattern.test(onclick))) {
        this.logNavigation('click', 'suspicious_button', [onclick], '可疑按钮点击')
      }
    }
  }

  /**
   * 监控 URL 变化
   */
  monitorUrlChanges() {
    if (!this.config.monitorHistory) return
    
    let currentUrl = window.location.href
    
    this.monitoringInterval = setInterval(() => {
      if (window.location.href !== currentUrl) {
        this.logNavigation('url', 'change', [currentUrl, window.location.href], 'URL 地址变化')
        currentUrl = window.location.href
      }
    }, 100)
  }

  /**
   * 开始 URL 监控
   */
  startUrlMonitoring() {
    // 这里可以添加更多的监控逻辑
    console.log('📍 URL 监控已启动')
  }
  
  /**
   * 设置自动清空 console
   */
  setupConsoleClear() {
    let currentUrl = window.location.href
    
    // 监听 URL 变化
    setInterval(() => {
      if (window.location.href !== currentUrl) {
        // URL 发生变化时清空 console
        this.clearConsole()
        currentUrl = window.location.href
      }
    }, 100)
    
    // 监听页面可见性变化（页面切换时）
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // 页面重新可见时清空 console
        this.clearConsole()
      }
    })
    
    // 监听 beforeunload 事件
    window.addEventListener('beforeunload', () => {
      // 页面即将卸载时清空 console
      this.clearConsole()
    })
  }
  
  /**
   * 清空 console
   */
  clearConsole() {
    try {
      // 方法1: 使用 console.clear()
      console.clear()
      
      // 方法2: 如果 console.clear() 不可用，尝试其他方法
      if (typeof console.clear !== 'function') {
        // 输出大量空行来"清空" console
        for (let i = 0; i < 100; i++) {
          console.log('')
        }
      }
      
      // 输出新的标识信息
      console.log('🧹 Console 已清空 - 新页面加载')
      console.log('🔍 页面跳转监控器已启动')
      console.log('📍 当前页面:', window.location.href)
      console.log('⏰ 时间:', new Date().toLocaleString())
      
    } catch (error) {
      console.log('⚠️ 清空 console 失败:', error.message)
    }
  }

  /**
   * 监控页面可见性
   */
  monitorPageVisibility() {
    document.addEventListener('visibilitychange', this.boundEventHandlers.visibilitychange)
  }

  /**
   * 处理页面可见性变化
   */
  handleVisibilityChange() {
    if (document.hidden) {
      this.logNavigation('visibility', 'hidden', [], '页面隐藏')
    } else {
      this.logNavigation('visibility', 'visible', [], '页面显示')
    }
  }

  /**
   * 处理 beforeunload 事件
   */
  handleBeforeUnload(event) {
    this.logNavigation('beforeunload', window.location.href, '页面即将卸载')
  }

  /**
   * 处理 unload 事件
   */
  handleUnload(event) {
    this.logNavigation('unload', window.location.href, '页面已卸载')
  }

  /**
   * 处理 popstate 事件
   */
  handlePopState(event) {
    this.logNavigation('popstate', window.location.href, '浏览器导航变化')
  }

  /**
   * 记录导航日志
   */
  logNavigation(category, action, args, description) {
    const log = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleTimeString(),
      category,
      action,
      args,
      description,
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      stackTrace: this.config.captureStackTraces ? this.getStackTrace() : null,
      suspicious: this.isSuspicious(category, action, args)
    }
    
    this.logs.unshift(log)
    
    // 限制日志数量
    if (this.logs.length > this.config.maxLogs) {
      this.logs = this.logs.slice(0, this.config.maxLogs)
    }
    
    // 控制台输出
    if (this.config.logToConsole) {
      this.logToConsole(log)
    }
    
    // 触发自定义事件
    this.dispatchLogEvent(log)
    
    return log
  }

  /**
   * 检查是否可疑
   */
  isSuspicious(category, action, args) {
    const argsStr = JSON.stringify(args).toLowerCase()
    
    return this.config.suspiciousPatterns.some(pattern => 
      pattern.test(argsStr) || pattern.test(action)
    )
  }

  /**
   * 获取调用栈
   */
  getStackTrace() {
    try {
      const stack = new Error().stack
      const lines = stack.split('\n').slice(2)
      
      return lines.map(line => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/)
        if (match) {
          return {
            functionName: match[1] || 'anonymous',
            fileName: match[2] || 'unknown',
            lineNumber: parseInt(match[3]) || 0,
            columnNumber: parseInt(match[4]) || 0
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
        !frame.fileName.includes('debug-tools.js')
      )
    } catch (error) {
      return []
    }
  }

  /**
   * 控制台输出
   */
  logToConsole(log) {
    const emoji = log.suspicious ? '🚨' : '🔍'
    const color = log.suspicious ? '#ff4444' : '#007bff'
    
    console.group(`%c${emoji} ${log.description}`, `color: ${color}; font-weight: bold;`)
    console.log('类别:', log.category)
    console.log('动作:', log.action)
    console.log('参数:', log.args)
    console.log('URL:', log.url)
    console.log('时间:', log.timestamp)
    console.log('可疑:', log.suspicious)
    
    if (log.stackTrace && log.stackTrace.length > 0) {
      console.log('调用栈:', log.stackTrace)
    }
    
    console.groupEnd()
  }

  /**
   * 触发日志事件
   */
  dispatchLogEvent(log) {
    const event = new CustomEvent('navigationDebug', { detail: log })
    window.dispatchEvent(event)
  }

  /**
   * 移除事件监听器
   */
  removeEventListeners() {
    document.removeEventListener('submit', this.boundEventHandlers.submit)
    document.removeEventListener('click', this.boundEventHandlers.click)
    document.removeEventListener('visibilitychange', this.boundEventHandlers.visibilitychange)
    window.removeEventListener('beforeunload', this.boundEventHandlers.beforeunload)
    window.removeEventListener('unload', this.boundEventHandlers.unload)
    window.removeEventListener('popstate', this.boundEventHandlers.popstate)
  }

  /**
   * 恢复原始方法
   */
  restoreOriginalMethods() {
    Object.keys(this.originalMethods).forEach(key => {
      const [obj, method] = key.split('.')
      if (obj === 'history' && history[method]) {
        history[method] = this.originalMethods[key]
      } else if (obj === 'location' && location[method]) {
        location[method] = this.originalMethods[key]
      } else if (obj === 'window' && window[method]) {
        window[method] = this.originalMethods[key]
      }
    })
  }

  /**
   * 获取所有日志
   */
  getLogs() {
    return [...this.logs]
  }

  /**
   * 清空日志
   */
  clearLogs() {
    this.logs = []
    console.log('🧹 页面跳转调试日志已清空')
  }

  /**
   * 导出日志
   */
  exportLogs() {
    const exportData = {
      exportTime: new Date().toISOString(),
      config: this.config,
      logs: this.logs
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `navigation-debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click()
    
    URL.revokeObjectURL(url)
    console.log('📥 调试日志已导出')
  }

  /**
   * 设置配置
   */
  setConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 添加可疑模式
   */
  addSuspiciousPattern(pattern) {
    if (pattern instanceof RegExp) {
      this.config.suspiciousPatterns.push(pattern)
    } else if (typeof pattern === 'string') {
      this.config.suspiciousPatterns.push(new RegExp(pattern, 'i'))
    }
  }

  /**
   * 获取日志统计信息
   */
  getLogStats() {
    const stats = {
      total: this.logs.length,
      byCategory: {},
      byType: {},
      suspicious: 0
    }
    
    this.logs.forEach(log => {
      // 按类别统计
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1
      
      // 按动作统计
      stats.byType[log.action] = (stats.byType[log.action] || 0) + 1
      
      // 可疑日志统计
      if (log.suspicious) {
        stats.suspicious++
      }
    })
    
    return stats
  }
}

// 创建全局实例
window.navigationDebugger = new NavigationDebugger()

// 自动启动（可选）
// window.navigationDebugger.start()

export default NavigationDebugger
