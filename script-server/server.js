/**
 * 油猴调试脚本 - 远程执行服务端
 * 1. WebSocket 服务：注入脚本的页面连接到此，形成 1 对多
 * 2. HTTP API：当前 shell 可查询活跃 tab、向指定 tab 或全体下发执行命令
 *
 * 启动: npm run remote-exec-server  或  node script-server/server.js
 * 默认: WS + HTTP 同端口 18080，WS 路径 /ws
 */

const http = require('http')
const { WebSocketServer } = require('ws')
const { URL } = require('url')

const PORT = Number(process.env.REMOTE_EXEC_PORT) || 18080
const WS_PATH = '/ws'

// tabId -> { ws, url, title, connectedAt }
const tabs = new Map()
let nextTabId = 1

// requestId -> { resolve, reject, timeout }
const pendingExec = new Map()
const EXEC_TIMEOUT_MS = 30000

function createId() {
  return String(Date.now()) + '-' + Math.random().toString(36).slice(2, 10)
}

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url || '', 'http://localhost')
  const pathname = parsed.pathname

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // GET /tabs - 列出所有已连接的 tab
  if (req.method === 'GET' && pathname === '/tabs') {
    const list = Array.from(tabs.entries()).map(([id, t]) => ({
      id,
      url: t.url,
      title: t.title,
      connectedAt: t.connectedAt
    }))
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ tabs: list }))
    return
  }

  // POST /exec - 在指定 tab 或全部执行代码
  if (req.method === 'POST' && pathname === '/exec') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const { tabId, code } = JSON.parse(body || '{}')
        if (!code || typeof code !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing or invalid "code" string' }))
          return
        }
        const targets = tabId === 'broadcast' || !tabId
          ? Array.from(tabs.keys())
          : [tabId]
        const missing = targets.filter((id) => !tabs.has(id))
        if (missing.length === targets.length) {
          res.writeHead(404, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'No matching tabs', tabs: Array.from(tabs.keys()) }))
          return
        }
        const requestId = createId()
        const results = []
        let done = 0
        const total = targets.length
        function onResult(err, data) {
          results.push(err ? { error: String(err) } : data)
          done++
          if (done === total) {
            clearTimeout(to)
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ requestId, results }))
          }
        }
        const to = setTimeout(() => {
          if (done < total) {
            for (let i = done; i < total; i++) results.push({ error: 'timeout' })
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ requestId, results }))
          }
        }, EXEC_TIMEOUT_MS)
        targets.forEach((id) => {
          const t = tabs.get(id)
          if (!t || !t.ws || t.ws.readyState !== 1) {
            onResult('tab not connected', null)
            return
          }
          const reqId = requestId + '#' + id
          pendingExec.set(reqId, {
            resolve: (r) => onResult(null, r),
            reject: (e) => onResult(e, null),
            timeout: setTimeout(() => {
              if (pendingExec.has(reqId)) {
                pendingExec.delete(reqId)
                onResult('timeout', null)
              }
            }, EXEC_TIMEOUT_MS)
          })
          t.ws.send(JSON.stringify({ type: 'exec', requestId: reqId, code }))
        })
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(e.message) }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end('Not found')
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  const parsed = new URL(request.url || '', 'http://localhost')
  if (parsed.pathname !== WS_PATH) {
    socket.destroy()
    return
  }
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request)
  })
})

wss.on('connection', (ws, request) => {
  const id = String(nextTabId++)
  let meta = { url: '', title: '' }

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString())
      if (msg.type === 'register') {
        meta = { url: msg.url || '', title: msg.title || '' }
        tabs.set(id, { ws, url: meta.url, title: meta.title, connectedAt: new Date().toISOString() })
        ws.send(JSON.stringify({ type: 'registered', tabId: id }))
        return
      }
      if (msg.type === 'execResult') {
        const reqId = msg.requestId
        const p = pendingExec.get(reqId)
        if (p) {
          clearTimeout(p.timeout)
          pendingExec.delete(reqId)
          p.resolve({ result: msg.result, error: msg.error })
        }
      }
    } catch (_) {}
  })

  ws.on('close', () => {
    tabs.delete(id)
  })

  ws.on('error', () => {
    tabs.delete(id)
  })
})

server.on('error', (e) => {
  console.error('[remote-exec-server] listen error:', e.message || e)
  process.exit(1)
})

server.listen(PORT, () => {
  console.log(`[remote-exec-server] HTTP + WS on http://localhost:${PORT}`)
  console.log(`  GET  /tabs  -> list connected tabs`)
  console.log(`  POST /exec  -> body: { "tabId": "<id>|broadcast", "code": "..." }`)
  console.log(`  WS   ${WS_PATH} -> browser tabs connect here`)
})
