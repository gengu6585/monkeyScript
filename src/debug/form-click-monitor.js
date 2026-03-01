/**
 * 监控表单提交与可疑点击（链接、带 redirect 等 onclick 的按钮）
 * 开关：注入由 inject-flags.formClickMonitor 控制
 */
import { logNavigation } from './navigation-logger.js'

const SUSPICIOUS_PATTERNS = [
  /redirect/i, /jump/i, /go\s*to/i, /navigate/i,
  /location\.href/i, /window\.open/i, /location\.replace/i, /location\.assign/i
]
const SUSPICIOUS_FIELDS = ['redirect', 'jump', 'goto', 'next', 'target']

let boundSubmit = null
let boundClick = null
let installed = false

function handleSubmit(e) {
  const form = e.target
  const action = form.action || window.location.href
  const method = (form.method || 'GET').toUpperCase()
  logNavigation('form', 'submit', [action, method], '表单提交', true)
  try {
    const fd = new FormData(form)
    for (const [k, v] of fd.entries()) {
      if (SUSPICIOUS_FIELDS.some(f => k.toLowerCase().includes(f))) {
        logNavigation('form', 'suspicious_field', [k, v], '可疑表单字段', false)
      }
    }
  } catch (_) {}
}

function handleClick(e) {
  const target = e.target
  if (target.tagName === 'A' && target.href) {
    logNavigation('click', 'link', [target.href], '链接点击', true)
  }
  if (target.tagName === 'BUTTON') {
    const onclick = target.getAttribute('onclick')
    if (onclick && SUSPICIOUS_PATTERNS.some(p => p.test(onclick))) {
      logNavigation('click', 'suspicious_button', [onclick], '可疑按钮点击', true)
    }
  }
}

export function install() {
  if (installed || typeof document === 'undefined') return
  boundSubmit = handleSubmit
  boundClick = handleClick
  document.addEventListener('submit', boundSubmit)
  document.addEventListener('click', boundClick)
  installed = true
}

export function uninstall() {
  if (!installed) return
  document.removeEventListener('submit', boundSubmit)
  document.removeEventListener('click', boundClick)
  installed = false
}
