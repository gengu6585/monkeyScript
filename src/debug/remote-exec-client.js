/**
 * 远程执行客户端：当前页面连接脚本服务器，接收 shell 下发的代码并在页面上下文中执行
 * 需先启动 script-server: npm run remote-exec-server
 * 开关键: window.MONKEY_DEBUG_INJECT.remoteExec (默认 true，便于调试)
 */

const WS_PORT = 18080
const WS_PATH = '/ws'

function getServerWsUrl() {
  const host = typeof window !== 'undefined' && window.MONKEY_DEBUG_REMOTE_EXEC_HOST
    ? window.MONKEY_DEBUG_REMOTE_EXEC_HOST
    : 'localhost'
  const port = typeof window !== 'undefined' && window.MONKEY_DEBUG_REMOTE_EXEC_PORT != null
    ? Number(window.MONKEY_DEBUG_REMOTE_EXEC_PORT)
    : WS_PORT
  // 本地开发服务端仅支持 ws，对 localhost 统一用 ws 以便 http/https 页面都能连
  const useWs = !host || host === 'localhost' || host === '127.0.0.1'
  const protocol = useWs ? 'ws:' : ((typeof location !== 'undefined' && location.protocol === 'https:') ? 'wss:' : 'ws:')
  return `${protocol}//${host}:${port}${WS_PATH}`
}

let ws = null
let reconnectTimer = null
const RECONNECT_DELAY_MS = 3000

function safeStringify(value) {
  try {
    if (value === undefined) return undefined
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function runInPage(code) {
  try {
    const fn = new Function(code)
    const result = fn.call(window)
    return { result: safeStringify(result), error: null }
  } catch (e) {
    return { result: null, error: (e && e.message) || String(e) }
  }
}

const PREFIX = '[monkey_debug][remoteExec]'

function connect() {
  if (ws && ws.readyState === 1) return
  const url = getServerWsUrl()
  try {
    if (typeof console !== 'undefined' && console.log) {
      console.log(PREFIX, '连接中:', url)
    }
    const socket = new WebSocket(url)
    socket.onopen = () => {
      ws = socket
      socket.send(JSON.stringify({
        type: 'register',
        url: typeof location !== 'undefined' ? location.href : '',
        title: typeof document !== 'undefined' ? document.title : ''
      }))
      if (typeof console !== 'undefined' && console.log) {
        console.log(PREFIX, '已连接并发送 register')
      }
    }
    socket.onmessage = (event) => {
      let requestId = null
      try {
        const msg = JSON.parse(event.data)
        requestId = msg && msg.requestId
        if (msg.type === 'registered' && msg.tabId) {
          if (typeof console !== 'undefined' && console.log) {
            console.log(PREFIX, '已注册为 tab:', msg.tabId)
          }
        }
        if (msg.type === 'exec' && msg.requestId && msg.code != null) {
          const { result, error } = runInPage(msg.code)
          socket.send(JSON.stringify({
            type: 'execResult',
            requestId: msg.requestId,
            result,
            error
          }))
        }
      } catch (e) {
        try {
          socket.send(JSON.stringify({
            type: 'execResult',
            requestId,
            result: null,
            error: String(e && e.message)
          }))
        } catch (_) {}
      }
    }
    socket.onclose = () => {
      ws = null
      if (typeof console !== 'undefined' && console.log) {
        console.log(PREFIX, '连接关闭，' + RECONNECT_DELAY_MS + 'ms 后重连')
      }
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
    }
    socket.onerror = () => {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn(PREFIX, 'WebSocket 错误，请确认 npm start 已启动且端口 18080 可访问')
      }
      socket.close()
    }
  } catch (e) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(PREFIX, 'connect 异常:', e && e.message)
    }
    if (reconnectTimer) clearTimeout(reconnectTimer)
    reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
  }
}

function disconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    ws.close()
    ws = null
  }
}

export function install() {
  connect()
}

export function uninstall() {
  disconnect()
}

if (typeof window !== 'undefined') {
  window.monkeyDebugRemoteExecConnect = connect
  window.monkeyDebugRemoteExecDisconnect = disconnect
}
