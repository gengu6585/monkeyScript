# 远程执行服务端

注入油猴调试脚本的页面通过 WebSocket 连接到此服务，Shell 通过 HTTP 查询活跃 tab、下发代码执行。

## 安装与启动

**推荐**：一条命令同时启动「远程执行服务端 + 本地 webpack」：

```bash
npm install
npm start
```

（`npm start` 会并行跑 `remote-exec-server` 与 `webpack serve`，日志前缀分别为 `[remote]` / `[webpack]`。）

若只需单独启动远程执行服务端：

```bash
npm run remote-exec-server
```

若只需 webpack：`npm run start:webpack`。

默认端口 `18080`，可通过环境变量 `REMOTE_EXEC_PORT` 修改。

## HTTP API（供 Shell 使用）

- **GET /tabs** — 列出已连接的 tab  
  `curl -s http://localhost:18080/tabs`

- **POST /exec** — 在指定 tab 或全部执行代码  
  - Body: `{ "tabId": "<id>", "code": "return location.href" }`  
  - 或 `"tabId": "broadcast"` 表示所有 tab  
  - 返回: `{ "requestId", "results": [ { "result" | "error" } ] }`  

示例：

```bash
# 列出 tab
curl -s http://localhost:18080/tabs | jq .

# 在 tab 1 执行
curl -s -X POST http://localhost:18080/exec \
  -H "Content-Type: application/json" \
  -d '{"tabId":"1","code":"return document.title"}'

# 在所有 tab 执行
curl -s -X POST http://localhost:18080/exec \
  -H "Content-Type: application/json" \
  -d '{"tabId":"broadcast","code":"return location.href"}'
```

## 注入端

- 开关键：`window.MONKEY_DEBUG_INJECT.remoteExec`（默认 true）
- 可选：`window.MONKEY_DEBUG_REMOTE_EXEC_HOST`、`window.MONKEY_DEBUG_REMOTE_EXEC_PORT`
- 手动连/断：`window.monkeyDebugRemoteExecConnect()`、`window.monkeyDebugRemoteExecDisconnect()`

### 远程查看控制台日志

开启 `logIntercept`（默认开）后，页面内 `console.log/info/warn/error/debug` 会被劫持并写入缓冲区，远程执行可拉取：

```bash
# 拉取最近 200 条（默认）
curl -s -X POST http://localhost:18080/exec -H "Content-Type: application/json" \
  -d '{"tabId":"1","code":"return window.monkeyDebugGetConsoleLogs ? window.monkeyDebugGetConsoleLogs() : [];"}'

# 最近 50 条
curl -s -X POST http://localhost:18080/exec -H "Content-Type: application/json" \
  -d '{"tabId":"1","code":"return window.monkeyDebugGetConsoleLogs ? window.monkeyDebugGetConsoleLogs({ limit: 50 }) : [];"}'
```
