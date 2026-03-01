// ==UserScript==
// @name         monkey_debug
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

;(function () {
  'use strict'
  if (location.href === 'http://localhost:8080/') return
  // 可选：在注入 app.bundle.js 前设置要启用的 debug 模块，例如：
  // window.MONKEY_DEBUG_INJECT = { locationIntercept: true, networkMonitor: true, urlMonitor: true, antiDebug: true };
  try {
    let env = 'window.top';
    if (typeof window !== 'object') {
      env = 'no-window';
    } else if (window.parent && window.parent !== window) {
      env = 'iframe/frame';
    }
    if (window.name) {
      env += ', window.name: ' + window.name;
    }
    window.MONKEY_DEBUG_ENV = env;
    function logLine(level, msg) {
      var t = new Date();
      var time = t.toTimeString().slice(0, 12) + '.' + String(t.getMilliseconds()).padStart(3, '0');
      console.log(time + ' [' + level + '] [monkey_debug][' + env + '] ' + msg);
    }
    logLine('INFO', '当前环境: ' + env);
    var script = document.createElement('script');
    script.src = 'http://localhost:8080/app.bundle.js';
    script.type = 'text/javascript';
    var head = document.head || document.getElementsByTagName('head')[0];
    var firstScript = head.querySelector('script');
    if (firstScript) {
      head.insertBefore(script, firstScript);
    } else {
      head.appendChild(script);
    }
    logLine('INFO', 'app.bundle.js 注入完成');
  } catch (e) {
    var t = new Date();
    var time = t.toTimeString().slice(0, 12) + '.' + String(t.getMilliseconds()).padStart(3, '0');
    var env = typeof window !== 'undefined' && window.MONKEY_DEBUG_ENV != null ? window.MONKEY_DEBUG_ENV : 'unknown';
    console.error(time + ' [ERROR] [monkey_debug][' + env + '] 注入 app.bundle.js 异常', e);
  }
}
})()
