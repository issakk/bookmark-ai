# 项目结构说明

## 目录结构

```
bookmark-ai-extension/
├── manifest.json              # 扩展配置文件（必需）
├── background.js              # 后台服务脚本
├── package.json               # Node.js 依赖配置
├── .gitignore                 # Git 忽略文件
│
├── icons/                     # 图标文件夹
│   ├── icon.svg              # SVG 源文件
│   ├── icon16.png            # 16x16 图标
│   ├── icon32.png            # 32x32 图标
│   ├── icon48.png            # 48x48 图标
│   └── icon128.png           # 128x128 图标
│
├── utils/                     # 工具模块
│   ├── storage.js            # 存储管理
│   ├── bookmarks.js          # 书签管理
│   └── openai.js             # OpenAI API 集成
│
├── scripts/                   # 页面脚本
│   ├── sidebar.js            # 侧边栏逻辑
│   ├── options.js            # 配置页面逻辑
│   └── manage.js             # 管理页面逻辑
│
├── styles/                    # 样式文件
│   ├── sidebar.css           # 侧边栏样式
│   ├── options.css           # 配置页面样式
│   └── manage.css            # 管理页面样式
│
├── sidebar.html               # 侧边栏页面
├── options.html               # 配置页面
├── manage.html                # 书签管理页面
│
├── generate-icons.html        # 图标生成工具
├── generate-icons.sh          # 图标生成脚本
│
├── README.md                  # 项目说明
├── INSTALL.md                 # 安装指南
├── QUICKSTART.md              # 快速开始
├── PRODUCT_DESIGN.md          # 产品设计文档
└── PROJECT_STRUCTURE.md       # 本文件
```

## 核心文件说明

### manifest.json
Chrome 扩展的配置文件，定义了：
- 扩展名称、版本、描述
- 所需权限（bookmarks, storage, tabs, sidePanel）
- 后台脚本、侧边栏、配置页面
- 快捷键命令
- 图标资源

### background.js
后台服务 Worker，负责：
- 监听扩展安装/更新事件
- 处理快捷键命令
- 监听书签变化事件
- 提供消息通信接口
- 显示通知

## 工具模块 (utils/)

### storage.js - StorageManager
存储管理单例类，提供：
- `get(keys)` - 获取存储数据
- `set(data)` - 设置存储数据
- `getOpenAIKey()` / `setOpenAIKey(key)` - API Key 管理
- `getBookmarkData()` / `setBookmarkData(data)` - 书签元数据
- `getCategories()` / `getTags()` - 分类和标签
- `exportData()` / `importData()` - 导入导出

### bookmarks.js - BookmarkManager
书签管理单例类，提供：
- `getBookmarkTree()` - 获取书签树
- `getFlatBookmarks()` - 获取扁平化书签列表
- `searchBookmarks(query)` - 搜索书签
- `createBookmark(bookmark)` - 创建书签
- `updateBookmark(id, changes)` - 更新书签
- `deleteBookmark(id)` - 删除书签
- `findDuplicates()` - 查找重复
- `exportToJSON()` / `exportToHTML()` - 导出

### openai.js - OpenAIService
OpenAI API 集成单例类，提供：
- `initialize()` - 初始化配置
- `chatCompletion(messages, options)` - 调用 Chat API
- `classifyBookmark(bookmark)` - 分类单个书签
- `classifyBookmarks(bookmarks, onProgress)` - 批量分类
- `semanticSearch(query, bookmarks)` - 语义搜索
- `generateSummary(bookmark)` - 生成摘要
- `recommendRelated(bookmark, allBookmarks)` - 推荐相关

## 页面脚本 (scripts/)

### sidebar.js
侧边栏页面逻辑：
- 加载和渲染书签树
- 处理搜索和筛选
- AI 分类功能
- 右键菜单
- 统计信息更新

### options.js
配置页面逻辑：
- 加载和保存设置
- 测试 OpenAI 连接
- 导入导出数据
- 显示统计信息

### manage.js
管理页面逻辑：
- 书签列表渲染（列表/网格视图）
- 批量选择和操作
- 添加/编辑/删除书签
- 查找重复
- 排序和筛选

## 样式文件 (styles/)

所有样式文件使用 CSS Variables 实现主题切换，包含：
- 颜色变量（主色、背景色、文字色等）
- 间距变量
- 阴影和圆角
- 响应式设计
- 深色模式支持

### sidebar.css
- 侧边栏布局
- 搜索框样式
- 书签树样式
- 右键菜单
- 进度条

### options.css
- 配置页面布局
- 表单样式
- 统计卡片
- 按钮样式
- 通知提示

### manage.css
- 管理页面布局
- 书签卡片样式
- 工具栏
- 对话框
- 列表/网格视图

## HTML 页面

### sidebar.html
侧边栏页面，包含：
- 头部（标题、刷新、设置按钮）
- 搜索栏（支持 AI 搜索）
- 筛选器（分类、标签）
- 操作栏（保存、分类、管理按钮）
- 统计信息
- 书签树容器
- 右键菜单
- 进度条

### options.html
配置页面，包含：
- OpenAI 配置区
- 功能设置区
- 数据管理区
- 统计信息区
- 关于信息区
- 保存/重置按钮

### manage.html
管理页面，包含：
- 侧边栏（统计、操作、工具）
- 工具栏（搜索、排序、视图切换）
- 书签列表容器
- 添加/编辑对话框
- 通知提示

## 数据流

### 书签数据流
```
Chrome Bookmarks API
        ↓
BookmarkManager.getFlatBookmarks()
        ↓
渲染到 UI (sidebar/manage)
        ↓
用户操作 (编辑/删除)
        ↓
BookmarkManager.updateBookmark()
        ↓
Chrome Bookmarks API
```

### 元数据流
```
用户触发 AI 分类
        ↓
OpenAIService.classifyBookmark()
        ↓
OpenAI API (GPT-4o-mini)
        ↓
返回 {category, tags, description}
        ↓
StorageManager.updateBookmarkMetadata()
        ↓
Chrome Storage API
        ↓
更新 UI 显示
```

### 搜索流
```
用户输入搜索词
        ↓
普通搜索 OR AI 搜索
        ↓
[普通] 本地过滤匹配
[AI] OpenAIService.semanticSearch()
        ↓
返回匹配结果
        ↓
渲染到 UI
```

## 权限说明

### bookmarks
- 读取浏览器书签树
- 创建、更新、删除书签
- 监听书签变化事件

### storage
- 存储书签元数据（分类、标签、描述）
- 存储用户配置（API Key、主题等）
- 本地缓存数据

### tabs
- 获取当前活动标签页信息
- 创建新标签页打开书签
- 快速保存当前页面

### sidePanel
- 显示侧边栏 UI
- 响应扩展图标点击

### activeTab
- 获取当前页面 URL 和标题
- 用于快速保存功能

### host_permissions
- `https://api.openai.com/*` - 调用 OpenAI API

## 存储结构

### Chrome Storage Local
```javascript
{
  // OpenAI 配置
  openaiKey: "sk-...",
  openaiModel: "gpt-4o-mini",
  
  // 功能设置
  theme: "light",
  autoClassify: true,
  
  // 书签元数据
  bookmarkData: {
    "bookmark-id-1": {
      category: "技术",
      tags: ["前端", "React"],
      description: "React 官方文档",
      updatedAt: 1234567890
    },
    // ...
  },
  
  // 分类和标签列表
  categories: ["技术", "新闻", "娱乐", ...],
  tags: ["前端", "React", "Vue", ...],
  
  // 最后同步时间
  lastSync: 1234567890
}
```

## 开发指南

### 添加新功能

1. **添加 UI**：在对应的 HTML 文件中添加元素
2. **添加样式**：在对应的 CSS 文件中添加样式
3. **添加逻辑**：在对应的 JS 文件中添加事件处理
4. **测试**：重新加载扩展，测试功能

### 调试技巧

1. **后台脚本**：
   - 打开 `chrome://extensions/`
   - 点击"检查视图" → "Service Worker"

2. **侧边栏/页面**：
   - 右键点击页面 → "检查"
   - 查看 Console 和 Network

3. **存储数据**：
   - Console 中运行：`chrome.storage.local.get(null, console.log)`

### 性能优化建议

1. 使用虚拟滚动处理大量书签
2. 缓存常用数据，减少 Storage API 调用
3. 批量操作合并 API 请求
4. 添加防抖和节流

### 安全注意事项

1. 永远不要硬编码 API Key
2. 使用 HTTPS 通信
3. 验证用户输入
4. 最小化权限请求

## 扩展建议

### 可添加的功能

1. **书签笔记**：为每个书签添加笔记
2. **智能推荐**：基于浏览历史推荐书签
3. **云同步**：跨设备同步元数据
4. **团队协作**：分享书签集合
5. **统计可视化**：图表展示书签分布
6. **自动备份**：定期自动备份数据
7. **浏览器历史集成**：从历史记录快速添加
8. **网页截图**：保存书签时自动截图

### 技术改进

1. 使用 TypeScript 提升代码质量
2. 添加单元测试和 E2E 测试
3. 使用 Webpack/Vite 构建
4. 添加 CI/CD 流程
5. 支持多语言国际化
6. 优化打包体积

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支
3. 提交代码（遵循代码规范）
4. 推送到分支
5. 创建 Pull Request

## 许可证

MIT License - 详见 LICENSE 文件
