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
  
  // 初始化服务
  await window.OpenAIService.initialize();
  
  // 加载数据
  await loadData();
  
  // 绑定事件
  bindEvents();
  
  // 渲染书签
  renderBookmarks();
});

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
    
    // 更新筛选器
    updateFilters();
    
    // 更新统计
    updateStatistics();
    
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
        handleSearch(query, aiSearchToggle.checked);
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
  
  // 分类筛选
  document.getElementById('categoryFilter').addEventListener('change', (e) => {
    applyFilters();
  });
  
  // 标签筛选
  document.getElementById('tagFilter').addEventListener('change', (e) => {
    applyFilters();
  });
  
  // 清除筛选
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('categoryFilter').value = '';
    document.getElementById('tagFilter').value = '';
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filteredBookmarks = [...bookmarks];
    renderBookmarks();
  });
  
  // 保存当前页面
  document.getElementById('saveCurrentBtn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'SAVE_CURRENT_PAGE' });
  });
  
  // AI 分类
  document.getElementById('classifyAllBtn').addEventListener('click', async () => {
    await classifyAllBookmarks();
  });
  
  // 管理页面
  document.getElementById('manageBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'manage.html' });
  });
  
  // 添加第一个书签
  document.getElementById('addFirstBookmarkBtn')?.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: 'SAVE_CURRENT_PAGE' });
  });
  
  // 终止 AI 分类
  document.getElementById('cancelClassify').addEventListener('click', () => {
    classifyCancelled = true;
    showNotification('已取消', 'AI 分类已终止', 'warning');
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
  if (useAI && window.OpenAIService.isConfigured()) {
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

// 应用筛选
function applyFilters() {
  const categoryFilter = document.getElementById('categoryFilter').value;
  const tagFilter = document.getElementById('tagFilter').value;
  
  filteredBookmarks = bookmarks.filter(bookmark => {
    const metadata = bookmarkMetadata[bookmark.id];
    
    if (categoryFilter && metadata?.category !== categoryFilter) {
      return false;
    }
    
    if (tagFilter && !metadata?.tags?.includes(tagFilter)) {
      return false;
    }
    
    return true;
  });
  
  renderBookmarks();
}

// 更新筛选器选项
function updateFilters() {
  const categoryFilter = document.getElementById('categoryFilter');
  const tagFilter = document.getElementById('tagFilter');
  
  // 从书签中提取所有分类（包括文件夹名和 AI 分类）
  const allCategories = new Set();
  const allTags = new Set();
  
  bookmarks.forEach(bookmark => {
    // 添加文件夹名称
    if (bookmark.folderName) {
      allCategories.add(bookmark.folderName);
    }
    
    // 添加 AI 分类
    const metadata = bookmarkMetadata[bookmark.id];
    if (metadata?.category) {
      allCategories.add(metadata.category);
    }
    
    // 添加标签
    if (metadata?.tags && Array.isArray(metadata.tags)) {
      metadata.tags.forEach(tag => allTags.add(tag));
    }
  });
  
  // 更新分类下拉框
  categoryFilter.innerHTML = '<option value="">全部分类</option>';
  Array.from(allCategories).sort().forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categoryFilter.appendChild(option);
  });
  
  // 更新标签下拉框
  tagFilter.innerHTML = '<option value="">全部标签</option>';
  Array.from(allTags).sort().forEach(tag => {
    const option = document.createElement('option');
    option.value = tag;
    option.textContent = tag;
    tagFilter.appendChild(option);
  });
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
  
  for (const [category, items] of Object.entries(grouped)) {
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
      toggle.classList.toggle('expanded');
      children.classList.toggle('expanded');
    });
  }
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
  
  return grouped;
}

// 创建文件夹元素
function createFolderElement(title, count) {
  const folder = document.createElement('div');
  folder.className = 'folder-item';
  
  folder.innerHTML = `
    <span class="folder-toggle">▶</span>
    <span class="item-icon">📁</span>
    <div class="item-content">
      <div class="item-title">${escapeHtml(title)} (${count})</div>
    </div>
  `;
  
  return folder;
}

// 创建书签元素
function createBookmarkElement(bookmark) {
  const item = document.createElement('div');
  item.className = 'bookmark-item';
  item.dataset.bookmarkId = bookmark.id;
  
  const metadata = bookmarkMetadata[bookmark.id];
  const tags = metadata?.tags || [];
  
  const tagsHtml = tags.length > 0 
    ? `<div class="item-tags">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>`
    : '';
  
  item.innerHTML = `
    <span class="item-icon">🔖</span>
    <div class="item-content">
      <div class="item-title">${escapeHtml(bookmark.title || bookmark.url)}</div>
      <div class="item-url">${escapeHtml(bookmark.url)}</div>
      ${tagsHtml}
    </div>
  `;
  
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
  if (!window.OpenAIService.isConfigured()) {
    showNotification('未配置', '请先配置 OpenAI API Key', 'warning');
    chrome.runtime.openOptionsPage();
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

// AI 分类所有书签
async function classifyAllBookmarks() {
  if (!window.OpenAIService.isConfigured()) {
    showNotification('未配置', '请先配置 OpenAI API Key', 'warning');
    chrome.runtime.openOptionsPage();
    return;
  }
  
  if (!confirm(`确定要对 ${bookmarks.length} 个书签进行 AI 分类吗？\n这可能需要一些时间并消耗 API 额度。`)) {
    return;
  }
  
  classifyCancelled = false; // 重置取消标志
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const progressPercent = document.getElementById('progressPercent');
  const progressFill = document.getElementById('progressFill');
  
  progressBar.style.display = 'block';
  
  try {
    let processedCount = 0;
    
    // 逐个处理书签，以便支持取消
    for (let i = 0; i < bookmarks.length; i++) {
      if (classifyCancelled) {
        showNotification('已取消', `已处理 ${processedCount} 个书签`, 'warning');
        break;
      }
      
      const bookmark = bookmarks[i];
      const percent = Math.round(((i + 1) / bookmarks.length) * 100);
      progressText.textContent = `正在分类... (${i + 1}/${bookmarks.length})`;
      progressPercent.textContent = `${percent}%`;
      progressFill.style.width = `${percent}%`;
      
      try {
        const classification = await window.OpenAIService.classifyBookmark(bookmark);
        await window.StorageManager.updateBookmarkMetadata(bookmark.id, classification);
        processedCount++;
      } catch (error) {
        console.error(`Failed to classify bookmark ${bookmark.id}:`, error);
      }
    }
    
    if (!classifyCancelled) {
      // 更新分类和标签列表
      await updateCategoriesAndTags();
      
      // 重新加载
      await loadData();
      renderBookmarks();
      
      showNotification('分类完成', `已完成 ${processedCount} 个书签的分类`, 'success');
    }
  } catch (error) {
    console.error('Classify all error:', error);
    showNotification('分类失败', error.message, 'error');
  } finally {
    progressBar.style.display = 'none';
  }
}

// 更新分类和标签列表
async function updateCategoriesAndTags() {
  const allCategories = new Set();
  const allTags = new Set();
  
  for (const metadata of Object.values(bookmarkMetadata)) {
    if (metadata.category) {
      allCategories.add(metadata.category);
    }
    if (metadata.tags) {
      metadata.tags.forEach(tag => allTags.add(tag));
    }
  }
  
  categories = Array.from(allCategories).sort();
  tags = Array.from(allTags).sort();
  
  await window.StorageManager.setCategories(categories);
  await window.StorageManager.setTags(tags);
}

// 更新统计信息
function updateStatistics() {
  document.getElementById('totalBookmarks').textContent = bookmarks.length;
  
  const classified = bookmarks.filter(b => bookmarkMetadata[b.id]?.category).length;
  document.getElementById('classifiedBookmarks').textContent = classified;
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
