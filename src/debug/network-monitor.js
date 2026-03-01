/**
 * 监控 XHR / Fetch，并拒绝 webpack-dev-server 等开发请求
 * 屏蔽 sockjs-node 等请求，避免控制台出现 ERR_SSL_PROTOCOL_ERROR 等无意义报错
 * 开关：注入由 inject-flags.networkMonitor 控制
 */
import { logNavigation } from './navigation-logger.js'

const REJECT_PATTERNS = [
  /sockjs-node/,
  /hot-update/,
  /__webpack_hmr/,
  /webpack-dev-server/,
  /localhost:8080.*\.(js|css|map)$/
]

function shouldRejectUrl(url) {
  if (!url || typeof url !== 'string') return false
  return REJECT_PATTERNS.some(p => p.test(url))
}

let xhrOpenOriginal = null
let xhrSendOriginal = null
let fetchOriginal = null
let installed = false

export function install() {
  if (installed || typeof window === 'undefined') return

  xhrOpenOriginal = XMLHttpRequest.prototype.open
  xhrSendOriginal = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.open = function (method, url, ...args) {
    if (shouldRejectUrl(url)) {
      this._debugRejected = true
      this._debugUrl = url
      return
    }
    this._debugMethod = method
    this._debugUrl = url
    this._debugRejected = false
    return xhrOpenOriginal.apply(this, [method, url, ...args])
  }
  XMLHttpRequest.prototype.send = function (...args) {
    if (this._debugRejected) {
      setTimeout(() => {
        this.dispatchEvent(new Event('error'))
        this.dispatchEvent(new Event('abort'))
      }, 0)
      return
    }
    if (this._debugUrl) {
      this.addEventListener('readystatechange', function () {
        if (this.readyState === 4 && this.responseURL && this.responseURL !== this._debugUrl) {
          logNavigation('xhr', 'redirect', [this._debugUrl, this.responseURL], 'XHR 重定向', false)
        }
      })
    }
    return xhrSendOriginal.apply(this, args)
  }

  fetchOriginal = window.fetch
  window.fetch = function (...args) {
    const url = args[0]
    if (shouldRejectUrl(url)) {
      return Promise.reject(new Error(`Blocked dev request: ${url}`))
    }
    return fetchOriginal.apply(this, args).then(response => {
      if (response.redirected) {
        logNavigation('fetch', 'redirect', [url, response.url], 'Fetch 重定向', false)
      }
      return response
    })
  }

  installed = true
}

export function uninstall() {
  if (!installed) return
  XMLHttpRequest.prototype.open = xhrOpenOriginal
  XMLHttpRequest.prototype.send = xhrSendOriginal
  window.fetch = fetchOriginal
  installed = false
}
