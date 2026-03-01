# Tampermonkey Dynamic Debug Script Skill

This skill sets standards and best practices for building modern Tampermonkey (user-script) based dynamic debug/inject scripts, with support for hot-reload development, network interception, cookie/storage monitoring, dynamic breakpoints, and debug panels injected via the IDE.

## Usage
- Use this skill for any task involving script injection, live code updates, monitoring XHR/cookie/storage, logging to debug panels, or reverse engineering web pages with dynamic UI/debug helpers.
- Follow the conventions and code examples below. Adapt all logic to stay hot-reload friendly and robust in browser runtime.

## Standards

- **Dynamic Injection**: Safely and robustly inject scripts into the page DOM via Tampermonkey, using compatible workflow with `tampermonkey.js:31-34` (safe `head.insertBefore/appendChild` etc).
- **IDE Live Update**: Ensure code under `src/` or the UI debug panel is always up to date with dev server (hot reload workflow).
- **Network Interception**:
  - Intercept/mod/log all XHR or fetch on the page;
  - Expose configuration hooks to enable/disable logging, filter by path/domain, and to override request/response bodies.
- **Cookie & Storage Monitoring**:
  - Listen to changes on cookies/localStorage/sessionStorage;
  - Allow registration of change listeners;
  - Funnel all changes to the floating debug panel with full event log.
- **Debug Breakpoints**:
  - Enable dynamic breakpoint injection (including conditional expressions and hit counters);
  - All breakpoints must be dynamically removable without reload.
- **Debug Panel**:
  - Must float above the page, allow undocking, copy/export logs, and manual trigger (breakpoints, custom eval etc.);
  - Panel must expose logs from network/cookie/XHR/debug events, with filtering and search.
- **Safe DOM Operations**:
  - Always wait for DOM ready before manipulations;
  - All DOM ops must be wrapped in try/catch; errors are logged to debug panel and console.
- **Performance**:
  - Never block the main thread; all log/events aggregation and heavy logic are async/debounced.

## Example: Safe Script Injection

```javascript
// BAD: naive injection
document.head.appendChild(script);

// GOOD: robust, error-handled, fallback-compatible
const head = document.head || document.getElementsByTagName('head')[0];
if (head) {
  try {
    head.insertBefore(script, head.firstChild || null);
  } catch (e) {
    head.appendChild(script);
    console.error('Script injected with fallback, error:', e);
  }
}
```

## 功能模块与注入开关

各 debug 功能已拆分为独立脚本，**无统一配置类**；是否注入由 `window.MONKEY_DEBUG_INJECT` 控制（在油猴脚本或页面脚本中、在加载 app.bundle.js 之前设置即可）。

| 开关键 | 说明 | 默认 |
|--------|------|------|
| `locationIntercept` | 拦截 `location.href` 并打栈 / 可选 breakOnContain | `true` |
| `historyIntercept` | 拦截 History API（pushState/replaceState/go/back/forward） | `false` |
| `windowIntercept` | 拦截 `window.open` / `window.close` | `false` |
| `networkMonitor` | 监控 XHR/Fetch 并拒绝 webpack-dev-server 等请求 | `true` |
| `formClickMonitor` | 监控表单提交与可疑点击 | `false` |
| `cookieMonitor` | 监控 cookie 变化，黄色高亮日志含新旧 cookie 与调用栈 | `true` |
| `antiDebug` | 反调试检测（console/Function#toString/定时器/F12 等） | `true` |
| `remoteExec` | 连接远程执行服务端，接受 shell 下发的代码并在页面内执行 | `true` |
| `logIntercept` | 劫持 console.log/info/warn/error/debug，写入缓冲区，供远程拉取 | `true` |

### 远程执行（Shell ↔ 注入页 1 对多）

- **服务端**：`npm start` 会同时启动远程执行服务端与 webpack（推荐）；或单独 `npm run remote-exec-server`（默认端口 18080，同端口提供 HTTP + WebSocket）。
- **注入页**：开启 `remoteExec` 后自动连接 `ws://localhost:18080/ws`，注册当前页 `url`/`title`。
- **Shell 用法**：
  - 查活跃 tab：`curl -s http://localhost:18080/tabs`
  - 在指定 tab 执行代码：`curl -s -X POST http://localhost:18080/exec -H "Content-Type: application/json" -d '{"tabId":"1","code":"return location.href"}'`
  - 在全部 tab 执行：`tabId` 传 `"broadcast"`。
- **可选**：`window.MONKEY_DEBUG_REMOTE_EXEC_HOST` / `window.MONKEY_DEBUG_REMOTE_EXEC_PORT` 覆盖服务端地址；页面内 `window.monkeyDebugRemoteExecConnect()` / `window.monkeyDebugRemoteExecDisconnect()` 手动连/断。
- **远程查看控制台日志**：开启 `logIntercept` 后，远程执行 `return window.monkeyDebugGetConsoleLogs()` 可拉取当前页劫持到的 console 输出（含 level、time、args）；`return window.monkeyDebugGetConsoleLogs({ limit: 50, since: Date.now()-60000 })` 可限制条数或仅最近 1 分钟；`window.monkeyDebugClearConsoleLogs()` 清空缓冲区。

示例（在油猴脚本或目标页最前执行）：

```javascript
window.MONKEY_DEBUG_INJECT = {
  locationIntercept: true,
  networkMonitor: true,
  cookieMonitor: true,
  antiDebug: true,
  formClickMonitor: false
};
```

各模块内部另有细粒度开关（如 `window.MONKEY_DEBUG_LOCATION_OPT = { breakOnContain: 'home' }`），见对应脚本注释。入口会调用 `window.monkeyDebugInstall()` 按当前开关重新注入；`window.monkeyDebugUninstall()` 可卸载全部模块。

## Checklist
- [ ] All features (network/cookie/debug panel) hot-reload friendly
- [ ] Avoid main thread blocking
- [ ] Robust to arbitrary page states (DOM loaded/partially loaded/etc)
- [ ] All log/panel features accessible via Tampermonkey UI

---

Edit/extend this skill as the project evolves.
