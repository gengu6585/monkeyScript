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
  try {
    var xhr = new XMLHttpRequest()
    xhr.open('GET', 'http://localhost:8080/app.bundle.js', false) // 同步
    xhr.send(null)
    if (xhr.status === 200) {
      let env = 'window.top';
      if (typeof window !== 'object') {
        env = 'no-window';
      } else if (window.parent && window.parent !== window) {
        env = 'iframe/frame';
      }
      if (window.name) {
        env += `, window.name: ${window.name}`;
      }
      console.log(`[monkey_debug] 当前环境: ${env}`);
      try {
        eval(xhr.responseText);
        console.log('[monkey_debug] app.bundle.js 执行成功');
      } catch (e) {
        console.error('[monkey_debug] app.bundle.js 执行异常', e);
      }
    } else {
      console.error('monkey_debug: 加载 app.bundle.js 失败', xhr.status)
    }
  } catch (e) {
    console.error('monkey_debug: 加载 app.bundle.js 异常', e)
  }
})()

// 如果不需要提前注入，可以使用下面的方式
// if (location.href === 'http://localhost:8080/') return
// var script = document.createElement('script')
// script.src = 'http://localhost:8080/app.bundle.js'
// document.body.appendChild(script)
