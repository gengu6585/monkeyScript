# 🐒 Monkey Debug - 油猴脚本开发脚手架

> 专业的油猴脚本开发环境，专为爬虫 JS 逆向和网站功能增强而设计

## 🚀 项目特色

- **🕷️ 爬虫友好**: 专为数据抓取和 JS 逆向设计
- **🐒 油猴集成**: 完整的油猴脚本开发和调试环境
- **⚡ 热重载**: 实时预览和调试，快速迭代开发
- **🔧 专业调试**: VS Code + Chrome DevTools 完整调试支持
- **📦 一键打包**: 自动生成可直接使用的油猴脚本

## 🛠️ 技术栈

- **构建工具**: Webpack 5 + 热重载
- **前端框架**: Vue.js 2.7
- **样式处理**: Less + CSS Loader
- **调试环境**: Chrome DevTools + VS Code 调试
- **目标输出**: 单文件 JS 油猴脚本

## 📁 项目结构

```
monkey_debug/
├── src/                    # 源码目录
│   ├── index.js           # 应用入口
│   ├── app.vue            # 主 Vue 组件
│   └── app.less           # 样式文件
├── public/                 # 静态资源
├── scripts/                # 调试脚本
├── .vscode/                # VS Code 调试配置
├── tampermonkey.js         # 油猴脚本模板
├── webpack.config.*.js     # Webpack 配置
└── package.json            # 项目配置
```

## 🚀 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm start
```

### 3. 启动 Chrome 调试实例
```bash
./scripts/start-debug-chrome-instance.sh
```

### 4. 安装油猴脚本
将 `tampermonkey.js` 复制到油猴扩展中

### 5. 开始调试
在 VS Code 中按 `F5`，选择 "Attach to Chrome"

## 🔧 开发流程

### 开发阶段
在 `src/` 目录下编写 Vue 组件和逻辑：
- `app.vue`: 主界面组件
- `index.js`: 应用入口逻辑
- `app.less`: 样式定义

### 调试阶段
- 使用 `npm start` 启动开发服务器
- 实时预览和热重载
- 在目标网站上测试油猴脚本

### 打包阶段
```bash
npm run build
```
生成最终的油猴脚本文件

## 🐛 调试配置

### VS Code 调试
- **Attach to Chrome**: 连接到运行中的 Chrome 实例
- **Launch Chrome**: 自动启动新的 Chrome 调试实例
- **源码映射**: 支持断点调试和源码查看

### Chrome DevTools
- 远程调试端口: 9222
- 源码映射支持
- 网络请求监控

## 🎯 使用场景

### 网站数据抓取
- 实时提取网页数据
- 自动化数据收集
- 批量信息处理

### 页面功能增强
- 添加新功能按钮
- 优化用户界面
- 增强用户体验

### 自动化操作
- 自动填写表单
- 批量操作页面元素
- 定时任务执行

### JS 逆向研究
- 分析网站逻辑
- 调试前端代码
- 研究加密算法

## 📋 开发注意事项

1. **跨域限制**: 注意油猴脚本的跨域限制
2. **DOM 时机**: 确保在页面 DOM 加载完成后执行
3. **错误处理**: 添加适当的错误处理机制
4. **性能优化**: 避免阻塞页面渲染
5. **兼容性**: 考虑不同浏览器的兼容性

## 🔍 调试技巧

- 在源码中设置断点
- 使用 `console.log()` 输出调试信息
- 通过 Chrome DevTools 查看网络请求
- 利用 Vue DevTools 调试组件状态
- 监控油猴脚本的执行情况

## 📦 最终输出

项目最终会生成一个独立的 JS 文件，包含：
- 完整的 Vue 应用
- 所有依赖和样式
- 可直接在油猴扩展中使用

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**Monkey Debug** - 让油猴脚本开发更简单、更专业！ 🐒✨
