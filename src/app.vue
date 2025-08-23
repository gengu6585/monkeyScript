<template>
  <div class="Wokoo" v-if="show">
    <span
      class="Wokoo-close-icon-fixed"
      @click="handleClose"
    >
      ×
    </span>
    <!-- 页面跳转日志面板 -->
    <div class="navigation-log-panel">
      <h3>🔍 页面跳转监控</h3>
      <div class="log-controls">
        <button @click="clearLogs" class="clear-btn">清空日志</button>
        <button @click="exportLogs" class="export-btn">导出日志</button>
        <button @click="toggleMonitoring" class="toggle-btn" :class="{ active: isMonitoring }">
          {{ isMonitoring ? '停止监控' : '开始监控' }}
        </button>
        <button @click="showStats" class="stats-btn">统计信息</button>
        <label class="auto-scroll">
          <input type="checkbox" v-model="autoScroll" />
          自动滚动
        </label>
      </div>
      <!-- 统计信息面板 -->
      <div v-if="showStatistics" class="stats-panel">
        <h4>📊 监控统计</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">总日志数:</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">可疑日志:</span>
            <span class="stat-value suspicious">{{ stats.suspicious }}</span>
          </div>
        </div>
        <div class="stats-categories">
          <h5>按类别统计:</h5>
          <div v-for="(count, category) in stats.byCategory" :key="category" class="stat-category">
            <span class="category-name">{{ getCategoryName(category) }}:</span>
            <span class="category-count">{{ count }}</span>
          </div>
        </div>
        <button @click="showStatistics = false" class="close-stats-btn">关闭统计</button>
      </div>
      <div class="log-container" ref="logContainer">
        <div 
          v-for="(log, index) in navigationLogs" 
          :key="index" 
          class="log-item"
          :class="[log.category, { suspicious: log.suspicious }]"
        >
          <div class="log-header">
            <span class="log-time">{{ log.timestamp }}</span>
            <span class="log-type">{{ getTypeText(log.category, log.action) }}</span>
            <span class="log-url">{{ log.url }}</span>
            <span v-if="log.suspicious" class="suspicious-badge">🚨</span>
          </div>
          <div class="log-description">{{ log.description }}</div>
          <div class="log-stack" v-if="log.stackTrace && log.stackTrace.length > 0">
            <details>
              <summary>调用栈 ({{ log.stackTrace.length }} 层)</summary>
              <div class="stack-trace">
                <div 
                  v-for="(frame, frameIndex) in log.stackTrace" 
                  :key="frameIndex"
                  class="stack-frame"
                >
                  <span class="frame-index">{{ frameIndex + 1 }}</span>
                  <span class="frame-function">{{ frame.functionName }}</span>
                  <span class="frame-file">{{ frame.fileName }}</span>
                  <span class="frame-line">{{ frame.lineNumber }}</span>
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="Wokoo-hide" @click="handleClose" v-else>
    open
  </div>
</template>
<script>
import './app.less'
import logo from '../public/icon.jpg'

export default {
  data: function() {
    return {
      logo,
      show: true,
      navigationLogs: [],
      autoScroll: true,
      isMonitoring: false,
      showStatistics: false,
      stats: {
        total: 0,
        byCategory: {},
        suspicious: 0
      }
    }
  },
  mounted() {
    // 延迟启动监控，确保组件完全加载
    this.$nextTick(() => {
      this.initDebugger()
    })
  },
  beforeDestroy() {
    this.cleanupDebugger()
  },
  methods: {
    handleClose() {
      this.show = !this.show
    },
    
    // 初始化调试器
    initDebugger() {
      if (window.navigationDebugger) {
        // 监听调试事件
        window.addEventListener('navigationDebug', this.handleNavigationDebug)
        
        // 启动监控
        this.startMonitoring()
      } else {
        console.error('❌ 调试器未找到，请确保 debug-tools.js 已加载')
      }
    },
    
    // 清理调试器
    cleanupDebugger() {
      if (window.navigationDebugger) {
        window.removeEventListener('navigationDebug', this.handleNavigationDebug)
        window.navigationDebugger.stop()
      }
    },
    
    // 处理导航调试事件
    handleNavigationDebug(event) {
      const log = event.detail
      
      // 转换日志格式以适配 UI
      const uiLog = {
        timestamp: log.timestamp,
        category: log.category,
        action: log.action,
        url: log.url,
        description: log.description,
        stackTrace: log.stackTrace,
        suspicious: log.suspicious
      }
      
      this.navigationLogs.unshift(uiLog)
      
      // 限制日志数量
      if (this.navigationLogs.length > 100) {
        this.navigationLogs = this.navigationLogs.slice(0, 100)
      }
      
      // 自动滚动
      this.$nextTick(() => {
        if (this.autoScroll && this.$refs.logContainer) {
          this.$refs.logContainer.scrollTop = 0
        }
      })
    },
    
    // 切换监控状态
    toggleMonitoring() {
      if (this.isMonitoring) {
        this.stopMonitoring()
      } else {
        this.startMonitoring()
      }
    },
    
    // 开始监控
    startMonitoring() {
      if (window.navigationDebugger) {
        window.navigationDebugger.start()
        this.isMonitoring = true
        console.log('🚀 页面跳转监控已启动')
      }
    },
    
    // 停止监控
    stopMonitoring() {
      if (window.navigationDebugger) {
        window.navigationDebugger.stop()
        this.isMonitoring = false
        console.log('⏹️ 页面跳转监控已停止')
      }
    },
    
    // 显示统计信息
    showStats() {
      if (window.navigationDebugger) {
        this.stats = window.navigationDebugger.getLogStats()
        this.showStatistics = true
      }
    },
    
    // 获取类别名称
    getCategoryName(category) {
      const categoryNames = {
        'history': '历史记录',
        'location': '地址栏',
        'window': '窗口操作',
        'url': 'URL变化',
        'visibility': '页面可见性',
        'form': '表单操作',
        'click': '点击事件',
        'xhr': 'AJAX请求',
        'fetch': 'Fetch请求'
      }
      return categoryNames[category] || category
    },
    
    // 获取类型文本
    getTypeText(category, action) {
      const typeMap = {
        'history': {
          'pushState': 'History.pushState',
          'replaceState': 'History.replaceState',
          'go': 'History.go',
          'back': 'History.back',
          'forward': 'History.forward'
        },
        'location': {
          'href': 'Location.href',
          'assign': 'Location.assign',
          'replace': 'Location.replace',
          'reload': 'Location.reload'
        },
        'window': {
          'open': 'Window.open',
          'close': 'Window.close'
        },
        'url': {
          'change': 'URL变化'
        },
        'visibility': {
          'hidden': '页面隐藏',
          'visible': '页面显示'
        },
        'form': {
          'submit': '表单提交',
          'suspicious_field': '可疑字段'
        },
        'click': {
          'link': '链接点击',
          'suspicious_button': '可疑按钮'
        }
      }
      
      return typeMap[category]?.[action] || `${category}.${action}`
    },
    
    // 清空日志
    clearLogs() {
      if (window.navigationDebugger) {
        window.navigationDebugger.clearLogs()
        this.navigationLogs = []
        console.log('🧹 已清空页面跳转日志')
      }
    },
    
    // 导出日志
    exportLogs() {
      if (window.navigationDebugger) {
        window.navigationDebugger.exportLogs()
      }
    }
  }
}
</script>
<style scoped>
</style>
