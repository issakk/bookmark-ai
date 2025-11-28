// 侧边栏主脚本
let bookmarks = [];
let filteredBookmarks = [];
let bookmarkMetadata = {};
let categories = [];
let tags = [];
let currentContextMenu = null;
let classifyCancelled = false; // AI 分类取消标志

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Sidebar loaded');
  
  // 初始化图标
  initIcons();
  
  // 初始化服务
  await window.OpenAIService.initialize();
  
  // 加载数据
  await loadData();
  
  // 绑定事件
  bindEvents();
  
  // 渲染书签
  renderBookmarks();
  
  // 监听 storage 变化，实时更新 OpenAI 配置
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.openaiKey) {
        console.log('OpenAI Key changed, updating...');
        window.OpenAIService.setApiKey(changes.openaiKey.newValue || '');
      }
      if (changes.openaiModel) {
        console.log('OpenAI Model changed, updating...');
        window.OpenAIService.setModel(changes.openaiModel.newValue || 'gpt-4o-mini');
      }
    }
  });
});

// 初始化图标
function initIcons() {
  // 头部按钮图标
  setIcon('manageIcon', 'list');
  setIcon('refreshIcon', 'refresh');
  setIcon('settingsIcon', 'settings');
  
  // 搜索栏图标
  setIcon('searchIconEl', 'search');
  setIcon('clearIcon', 'x');
  
  // 空状态图标
  setIcon('emptyIcon', 'inbox');
  
  // 右键菜单图标
  setIcon('menuOpenIcon', 'externalLink');
  setIcon('menuNewTabIcon', 'externalLink');
  setIcon('menuEditIcon', 'edit');
  setIcon('menuClassifyIcon', 'sparkles');
  setIcon('menuDeleteIcon', 'trash');
}

// 安全设置图标
function setIcon(elementId, iconName) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = window.Icons.get(iconName);
  }
}

// 加载数据
async function loadData() {
  showLoading(true);
  
  try {
    // 加载书签
    bookmarks = await window.BookmarkManager.getFlatBookmarks();
    filteredBookmarks = [...bookmarks];
    
    // 加载元数据
    bookmarkMetadata = await window.StorageManager.getBookmarkData();
    categories = await window.StorageManager.getCategories();
    tags = await window.StorageManager.getTags();
    
  } catch (error) {
    console.error('Error loading data:', error);
    showNotification('加载失败', error.message, 'error');
  } finally {
    showLoading(false);
  }
}

// 绑定事件
function bindEvents() {
  // 刷新按钮
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await loadData();
    renderBookmarks();
    showNotification('刷新成功', '书签已更新', 'success');
  });
  
  // 设置按钮
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // 搜索
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const aiSearchToggle = document.getElementById('aiSearchToggle');
  
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    
    clearSearchBtn.style.display = query ? 'flex' : 'none';
    
    searchTimeout = setTimeout(() => {
      if (query) {
        handleSearch(query, aiSearchToggle ? aiSearchToggle.checked : false);
      } else {
        filteredBookmarks = [...bookmarks];
        renderBookmarks();
      }
    }, 300);
  });
  
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filteredBookmarks = [...bookmarks];
    renderBookmarks();
  });
  
  
  // 管理页面
  const manageBtn = document.getElementById('manageBtn');
  if (manageBtn) {
    manageBtn.addEventListener('click', async () => {
      // 检查是否已经打开了管理页面
      const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('manage.html') });
      if (tabs.length > 0) {
        // 如果已经打开，切换到该标签页
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // 否则创建新标签页
        chrome.tabs.create({ url: 'manage.html' });
      }
    });
  }
  
  // 添加第一个书签
  document.getElementById('addFirstBookmarkBtn')?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'SAVE_CURRENT_PAGE' });
  });
  
  // 隐藏右键菜单
  document.addEventListener('click', () => {
    hideContextMenu();
  });
  
  // 监听书签变化
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type.startsWith('BOOKMARK_')) {
      loadData().then(() => renderBookmarks());
    }
  });
}

// 搜索处理
async function handleSearch(query, useAI) {
  if (useAI) {
    // 重新初始化 OpenAI 配置
    await window.OpenAIService.initialize();
    
    if (window.OpenAIService.isConfigured()) {
      showLoading(true);
      try {
        filteredBookmarks = await window.OpenAIService.semanticSearch(query, bookmarks);
        renderBookmarks();
        showNotification('AI 搜索完成', `找到 ${filteredBookmarks.length} 个相关书签`, 'success');
      } catch (error) {
        console.error('AI search error:', error);
        showNotification('AI 搜索失败', error.message, 'error');
        // 降级到普通搜索
        normalSearch(query);
      } finally {
        showLoading(false);
      }
    } else {
      normalSearch(query);
    }
  } else {
    normalSearch(query);
  }
}

// 普通搜索
function normalSearch(query) {
  const lowerQuery = query.toLowerCase();
  filteredBookmarks = bookmarks.filter(bookmark => {
    const titleMatch = bookmark.title.toLowerCase().includes(lowerQuery);
    const urlMatch = bookmark.url.toLowerCase().includes(lowerQuery);
    
    // 搜索标签和分类
    const metadata = bookmarkMetadata[bookmark.id];
    const tagMatch = metadata?.tags?.some(tag => 
      tag.toLowerCase().includes(lowerQuery)
    );
    const categoryMatch = metadata?.category?.toLowerCase().includes(lowerQuery);
    
    return titleMatch || urlMatch || tagMatch || categoryMatch;
  });
  
  renderBookmarks();
}


// 渲染书签
function renderBookmarks() {
  const container = document.getElementById('bookmarkTree');
  const emptyState = document.getElementById('emptyState');
  
  if (filteredBookmarks.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  container.innerHTML = '';
  
  // 按分类分组
  const grouped = groupByCategory(filteredBookmarks);
  
  // 按分类名称排序
  const sortedCategories = Object.keys(grouped).sort();
  
  sortedCategories.forEach(category => {
    const items = grouped[category];
    // 创建分类文件夹
    const folder = createFolderElement(category, items.length);
    container.appendChild(folder);
    
    // 创建子项容器
    const children = document.createElement('div');
    children.className = 'folder-children';
    
    items.forEach(bookmark => {
      const item = createBookmarkElement(bookmark);
      children.appendChild(item);
    });
    
    container.appendChild(children);
    
    // 绑定折叠事件
    folder.addEventListener('click', () => {
      const toggle = folder.querySelector('.folder-toggle');
      const isExpanded = children.classList.toggle('expanded');
      
      // 切换图标
      if (isExpanded) {
        toggle.innerHTML = window.Icons.get('chevronDown');
      } else {
        toggle.innerHTML = window.Icons.get('chevronRight');
      }
    });
  });
}

// 按分类分组（优先使用用户的书签文件夹，其次使用 AI 分类）
function groupByCategory(bookmarks) {
  const grouped = {};
  
  bookmarks.forEach(bookmark => {
    const metadata = bookmarkMetadata[bookmark.id];
    // 优先使用用户的书签文件夹名称，如果没有则使用 AI 分类，最后才是"未分类"
    const category = bookmark.folderName || metadata?.category || '未分类';
    
    if (!grouped[category]) {
      grouped[category] = [];
    }
    
    grouped[category].push(bookmark);
  });
  
  // 对每个分类内的书签按标题排序
  Object.keys(grouped).forEach(category => {
    grouped[category].sort((a, b) => {
      return (a.title || a.url).localeCompare(b.title || b.url);
    });
  });
  
  return grouped;
}

// 创建文件夹元素
function createFolderElement(title, count) {
  const folder = document.createElement('div');
  folder.className = 'folder-item';
  
  const toggleIcon = document.createElement('span');
  toggleIcon.className = 'folder-toggle icon';
  toggleIcon.innerHTML = window.Icons.get('chevronRight');
  
  const folderIcon = document.createElement('span');
  folderIcon.className = 'item-icon icon';
  folderIcon.innerHTML = window.Icons.get('folder');
  
  const content = document.createElement('div');
  content.className = 'item-content';
  content.innerHTML = `<div class="item-title">${escapeHtml(title)} (${count})</div>`;
  
  folder.appendChild(toggleIcon);
  folder.appendChild(folderIcon);
  folder.appendChild(content);
  
  return folder;
}

// 创建书签元素
function createBookmarkElement(bookmark) {
  const item = document.createElement('div');
  item.className = 'bookmark-item';
  item.dataset.bookmarkId = bookmark.id;
  
  const metadata = bookmarkMetadata[bookmark.id];
  const tags = metadata?.tags || [];
  
  const bookmarkIcon = document.createElement('span');
  bookmarkIcon.className = 'item-icon icon';
  bookmarkIcon.innerHTML = window.Icons.get('bookmark');
  
  const content = document.createElement('div');
  content.className = 'item-content';
  
  const title = document.createElement('div');
  title.className = 'item-title';
  title.textContent = bookmark.title || bookmark.url;
  
  const url = document.createElement('div');
  url.className = 'item-url';
  url.textContent = bookmark.url;
  
  content.appendChild(title);
  content.appendChild(url);
  
  if (tags.length > 0) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'item-tags';
    tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag';
      tagSpan.textContent = tag;
      tagsDiv.appendChild(tagSpan);
    });
    content.appendChild(tagsDiv);
  }
  
  item.appendChild(bookmarkIcon);
  item.appendChild(content);
  
  // 点击打开
  item.addEventListener('click', (e) => {
    if (e.ctrlKey || e.metaKey) {
      chrome.tabs.create({ url: bookmark.url, active: false });
    } else {
      chrome.tabs.create({ url: bookmark.url });
    }
  });
  
  // 右键菜单
  item.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, bookmark);
  });
  
  return item;
}

// 显示右键菜单
function showContextMenu(x, y, bookmark) {
  hideContextMenu();
  
  const menu = document.getElementById('contextMenu');
  menu.style.display = 'block';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  
  currentContextMenu = bookmark;
  
  // 绑定菜单项事件
  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.onclick = () => handleContextMenuAction(item.dataset.action, bookmark);
  });
}

// 隐藏右键菜单
function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  menu.style.display = 'none';
  currentContextMenu = null;
}

// 处理右键菜单操作
async function handleContextMenuAction(action, bookmark) {
  hideContextMenu();
  
  switch (action) {
    case 'open':
      chrome.tabs.create({ url: bookmark.url });
      break;
      
    case 'open-new-tab':
      chrome.tabs.create({ url: bookmark.url, active: false });
      break;
      
    case 'edit':
      const newTitle = prompt('编辑标题:', bookmark.title);
      if (newTitle !== null && newTitle.trim()) {
        await window.BookmarkManager.updateBookmark(bookmark.id, { title: newTitle.trim() });
        await loadData();
        renderBookmarks();
      }
      break;
      
    case 'classify':
      await classifyBookmark(bookmark);
      break;
      
    case 'delete':
      if (confirm(`确定要删除书签 "${bookmark.title}" 吗？`)) {
        await window.BookmarkManager.deleteBookmark(bookmark.id);
        await loadData();
        renderBookmarks();
        showNotification('删除成功', '书签已删除', 'success');
      }
      break;
  }
}

// AI 分类单个书签
async function classifyBookmark(bookmark) {
  // 重新初始化 OpenAI 配置，确保获取最新的 API Key
  await window.OpenAIService.initialize();
  
  if (!window.OpenAIService.isConfigured()) {
    if (confirm('AI 功能需要配置 OpenAI API Key 才能使用。\n\n是否立即前往设置页面进行配置？')) {
      chrome.runtime.openOptionsPage();
    }
    return;
  }
  
  showLoading(true);
  
  try {
    const classification = await window.OpenAIService.classifyBookmark(bookmark);
    
    // 保存分类结果
    await window.StorageManager.updateBookmarkMetadata(bookmark.id, classification);
    
    // 更新分类和标签列表
    await updateCategoriesAndTags();
    
    // 重新加载
    await loadData();
    renderBookmarks();
    
    showNotification('分类成功', `已分类为: ${classification.category}`, 'success');
  } catch (error) {
    console.error('Classify error:', error);
    showNotification('分类失败', error.message, 'error');
  } finally {
    showLoading(false);
  }
}

// 显示/隐藏加载指示器
function showLoading(show) {
  const indicator = document.getElementById('loadingIndicator');
  indicator.style.display = show ? 'flex' : 'none';
}

// 显示通知
function showNotification(title, message, type = 'info') {
  // 使用浏览器通知 API
  if (chrome.notifications) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: title,
      message: message,
      priority: 1
    });
  }
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
