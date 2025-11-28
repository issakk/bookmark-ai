// 书签管理页面脚本
let allBookmarks = [];
let filteredBookmarks = [];
let selectedBookmarks = new Set();
let bookmarkMetadata = {};
let currentEditingId = null;
let currentResults = []; // 当前检测结果

document.addEventListener('DOMContentLoaded', async () => {
  console.log('Manage page loaded');
  
  // 初始化
  await window.OpenAIService.initialize();
  await loadBookmarks();
  
  // 绑定事件
  bindEvents();
  
  // 渲染书签
  renderBookmarks();
});

// 加载书签
async function loadBookmarks() {
  try {
    allBookmarks = await window.BookmarkManager.getFlatBookmarks();
    filteredBookmarks = [...allBookmarks];
    bookmarkMetadata = await window.StorageManager.getBookmarkData();
    
    updateStats();
  } catch (error) {
    console.error('Error loading bookmarks:', error);
    showNotification('加载失败', 'error');
  }
}

// 绑定事件
function bindEvents() {
  // 添加书签
  document.getElementById('addBookmarkBtn').addEventListener('click', () => {
    openBookmarkDialog();
  });
  
  // 添加文件夹
  document.getElementById('addFolderBtn').addEventListener('click', async () => {
    const title = prompt('文件夹名称:');
    if (title && title.trim()) {
      await window.BookmarkManager.createFolder(title.trim());
      showNotification('文件夹已创建', 'success');
    }
  });
  
  // 搜索
  let searchTimeout;
  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      handleSearch(e.target.value.trim());
    }, 300);
  });
  
  // 排序
  document.getElementById('sortBy').addEventListener('change', (e) => {
    sortBookmarks(e.target.value);
    renderBookmarks();
  });
  
  // 视图模式
  document.getElementById('viewMode').addEventListener('change', (e) => {
    const list = document.getElementById('bookmarkList');
    if (e.target.value === 'grid') {
      list.classList.add('grid-view');
    } else {
      list.classList.remove('grid-view');
    }
  });
  
  // 全选
  document.getElementById('selectAllBtn').addEventListener('click', () => {
    if (selectedBookmarks.size === filteredBookmarks.length) {
      selectedBookmarks.clear();
    } else {
      filteredBookmarks.forEach(b => selectedBookmarks.add(b.id));
    }
    renderBookmarks();
    updateStats();
  });
  
  // 刷新
  document.getElementById('refreshBtn').addEventListener('click', async () => {
    await loadBookmarks();
    renderBookmarks();
    showNotification('已刷新', 'success');
  });
  
  // AI 分类选中项
  document.getElementById('classifySelectedBtn').addEventListener('click', async () => {
    await classifySelected();
  });
  
  // 查找重复
  document.getElementById('findDuplicatesBtn').addEventListener('click', async () => {
    await findDuplicates();
  });
  
  // 查找失效书签
  document.getElementById('findInvalidBtn').addEventListener('click', async () => {
    await findInvalidBookmarks();
  });
  
  // 删除选中项
  document.getElementById('deleteSelectedBtn').addEventListener('click', async () => {
    await deleteSelected();
  });
  
  // 对话框
  document.getElementById('closeDialog').addEventListener('click', closeBookmarkDialog);
  document.getElementById('cancelDialog').addEventListener('click', closeBookmarkDialog);
  document.getElementById('saveBookmark').addEventListener('click', saveBookmark);
  
  // 点击遮罩关闭对话框
  document.querySelector('.dialog-overlay')?.addEventListener('click', closeBookmarkDialog);
  
  // 结果面板
  document.getElementById('closeResults').addEventListener('click', closeResults);
  document.getElementById('cancelResultsBtn').addEventListener('click', closeResults);
  document.getElementById('deleteResultsBtn').addEventListener('click', deleteResults);
}

// 搜索处理
function handleSearch(query) {
  if (!query) {
    filteredBookmarks = [...allBookmarks];
  } else {
    const lowerQuery = query.toLowerCase();
    filteredBookmarks = allBookmarks.filter(bookmark => {
      const titleMatch = bookmark.title.toLowerCase().includes(lowerQuery);
      const urlMatch = bookmark.url.toLowerCase().includes(lowerQuery);
      const metadata = bookmarkMetadata[bookmark.id];
      const tagMatch = metadata?.tags?.some(tag => 
        tag.toLowerCase().includes(lowerQuery)
      );
      const categoryMatch = metadata?.category?.toLowerCase().includes(lowerQuery);
      
      return titleMatch || urlMatch || tagMatch || categoryMatch;
    });
  }
  
  renderBookmarks();
  updateStats();
}

// 排序书签
function sortBookmarks(sortBy) {
  filteredBookmarks.sort((a, b) => {
    switch (sortBy) {
      case 'title':
        return a.title.localeCompare(b.title);
      case 'date':
        return (b.dateAdded || 0) - (a.dateAdded || 0);
      case 'url':
        return a.url.localeCompare(b.url);
      default:
        return 0;
    }
  });
}

// 渲染书签
function renderBookmarks() {
  const container = document.getElementById('bookmarkList');
  const emptyState = document.getElementById('emptyState');
  const loadingIndicator = document.getElementById('loadingIndicator');
  
  loadingIndicator.style.display = 'none';
  
  if (filteredBookmarks.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'flex';
    return;
  }
  
  emptyState.style.display = 'none';
  container.innerHTML = '';
  
  filteredBookmarks.forEach(bookmark => {
    const card = createBookmarkCard(bookmark);
    container.appendChild(card);
  });
}

// 创建书签卡片
function createBookmarkCard(bookmark) {
  const card = document.createElement('div');
  card.className = 'bookmark-card';
  if (selectedBookmarks.has(bookmark.id)) {
    card.classList.add('selected');
  }
  
  const metadata = bookmarkMetadata[bookmark.id];
  const category = metadata?.category;
  const tags = metadata?.tags || [];
  
  const metaHtml = [];
  if (category) {
    metaHtml.push(`<span class="meta-category">${escapeHtml(category)}</span>`);
  }
  tags.forEach(tag => {
    metaHtml.push(`<span class="meta-tag">${escapeHtml(tag)}</span>`);
  });
  
  card.innerHTML = `
    <input 
      type="checkbox" 
      class="bookmark-checkbox" 
      ${selectedBookmarks.has(bookmark.id) ? 'checked' : ''}
      data-id="${bookmark.id}"
    />
    <span class="bookmark-icon">🔖</span>
    <div class="bookmark-info">
      <div class="bookmark-title">${escapeHtml(bookmark.title || bookmark.url)}</div>
      <div class="bookmark-url">${escapeHtml(bookmark.url)}</div>
      ${metaHtml.length > 0 ? `<div class="bookmark-meta">${metaHtml.join('')}</div>` : ''}
    </div>
    <div class="bookmark-actions">
      <button class="action-btn" data-action="open" title="打开">🔗</button>
      <button class="action-btn" data-action="edit" title="编辑">✏️</button>
      <button class="action-btn danger" data-action="delete" title="删除">🗑️</button>
    </div>
  `;
  
  // 复选框事件
  const checkbox = card.querySelector('.bookmark-checkbox');
  checkbox.addEventListener('change', (e) => {
    e.stopPropagation();
    if (checkbox.checked) {
      selectedBookmarks.add(bookmark.id);
    } else {
      selectedBookmarks.delete(bookmark.id);
    }
    card.classList.toggle('selected', checkbox.checked);
    updateStats();
  });
  
  // 点击卡片打开书签
  card.addEventListener('click', (e) => {
    if (!e.target.closest('.bookmark-checkbox') && !e.target.closest('.bookmark-actions')) {
      chrome.tabs.create({ url: bookmark.url });
    }
  });
  
  // 操作按钮
  card.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleAction(btn.dataset.action, bookmark);
    });
  });
  
  return card;
}

// 处理操作
async function handleAction(action, bookmark) {
  switch (action) {
    case 'open':
      chrome.tabs.create({ url: bookmark.url });
      break;
      
    case 'edit':
      openBookmarkDialog(bookmark);
      break;
      
    case 'delete':
      if (confirm(`确定要删除书签 "${bookmark.title}" 吗？`)) {
        await window.BookmarkManager.deleteBookmark(bookmark.id);
        await loadBookmarks();
        renderBookmarks();
        showNotification('已删除', 'success');
      }
      break;
  }
}

// 打开书签对话框
function openBookmarkDialog(bookmark = null) {
  const dialog = document.getElementById('bookmarkDialog');
  const title = document.getElementById('dialogTitle');
  
  if (bookmark) {
    currentEditingId = bookmark.id;
    title.textContent = '编辑书签';
    document.getElementById('bookmarkTitle').value = bookmark.title || '';
    document.getElementById('bookmarkUrl').value = bookmark.url || '';
    
    const metadata = bookmarkMetadata[bookmark.id];
    document.getElementById('bookmarkCategory').value = metadata?.category || '';
    document.getElementById('bookmarkTags').value = metadata?.tags?.join(', ') || '';
  } else {
    currentEditingId = null;
    title.textContent = '添加书签';
    document.getElementById('bookmarkTitle').value = '';
    document.getElementById('bookmarkUrl').value = '';
    document.getElementById('bookmarkCategory').value = '';
    document.getElementById('bookmarkTags').value = '';
  }
  
  dialog.style.display = 'flex';
}

// 关闭书签对话框
function closeBookmarkDialog() {
  const dialog = document.getElementById('bookmarkDialog');
  dialog.style.display = 'none';
  currentEditingId = null;
}

// 保存书签
async function saveBookmark() {
  const title = document.getElementById('bookmarkTitle').value.trim();
  const url = document.getElementById('bookmarkUrl').value.trim();
  const category = document.getElementById('bookmarkCategory').value.trim();
  const tagsInput = document.getElementById('bookmarkTags').value.trim();
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  if (!title || !url) {
    showNotification('请填写标题和 URL', 'error');
    return;
  }
  
  try {
    if (currentEditingId) {
      // 更新书签
      await window.BookmarkManager.updateBookmark(currentEditingId, { title, url });
      
      // 更新元数据
      if (category || tags.length > 0) {
        await window.StorageManager.updateBookmarkMetadata(currentEditingId, {
          category,
          tags
        });
      }
      
      showNotification('已更新', 'success');
    } else {
      // 创建新书签
      const bookmark = await window.BookmarkManager.createBookmark({ title, url });
      
      if (bookmark && (category || tags.length > 0)) {
        await window.StorageManager.updateBookmarkMetadata(bookmark.id, {
          category,
          tags
        });
      }
      
      showNotification('已添加', 'success');
    }
    
    closeBookmarkDialog();
    await loadBookmarks();
    renderBookmarks();
  } catch (error) {
    console.error('Error saving bookmark:', error);
    showNotification('保存失败', 'error');
  }
}

// AI 分类选中项
async function classifySelected() {
  if (selectedBookmarks.size === 0) {
    showNotification('请先选择书签', 'error');
    return;
  }
  
  if (!window.OpenAIService.isConfigured()) {
    showNotification('请先配置 OpenAI API Key', 'error');
    chrome.runtime.openOptionsPage();
    return;
  }
  
  if (!confirm(`确定要对 ${selectedBookmarks.size} 个书签进行 AI 分类吗？`)) {
    return;
  }
  
  const selected = allBookmarks.filter(b => selectedBookmarks.has(b.id));
  
  try {
    showNotification('正在分类...', 'info');
    
    for (const bookmark of selected) {
      const classification = await window.OpenAIService.classifyBookmark(bookmark);
      await window.StorageManager.updateBookmarkMetadata(bookmark.id, classification);
      await new Promise(resolve => setTimeout(resolve, 500)); // 避免速率限制
    }
    
    await loadBookmarks();
    renderBookmarks();
    showNotification('分类完成', 'success');
  } catch (error) {
    console.error('Error classifying:', error);
    showNotification('分类失败', 'error');
  }
}

// 查找重复
async function findDuplicates() {
  try {
    showNotification('正在查找重复书签...', 'info');
    const duplicates = await window.BookmarkManager.findDuplicates();
    
    if (duplicates.length === 0) {
      showNotification('未发现重复书签', 'success');
      return;
    }
    
    // 展开所有重复的书签
    currentResults = [];
    duplicates.forEach(group => {
      // 保留第一个，其余的标记为重复
      group.bookmarks.slice(1).forEach(bookmark => {
        currentResults.push(bookmark);
      });
    });
    
    showResults('重复书签', `发现 ${duplicates.length} 组重复，共 ${currentResults.length} 个重复项`);
  } catch (error) {
    console.error('Error finding duplicates:', error);
    showNotification('查找失败', 'error');
  }
}

// 查找失效书签
async function findInvalidBookmarks() {
  try {
    showNotification('正在检测失效书签...', 'info');
    const invalidBookmarks = await window.BookmarkManager.findInvalidBookmarks();
    
    if (invalidBookmarks.length === 0) {
      showNotification('未发现失效书签', 'success');
      return;
    }
    
    currentResults = invalidBookmarks;
    showResults('失效书签', `发现 ${invalidBookmarks.length} 个失效书签`);
  } catch (error) {
    console.error('Error finding invalid bookmarks:', error);
    showNotification('检测失败', 'error');
  }
}

// 删除选中项
async function deleteSelected() {
  if (selectedBookmarks.size === 0) {
    showNotification('请先选择书签', 'error');
    return;
  }
  
  if (!confirm(`确定要删除 ${selectedBookmarks.size} 个书签吗？`)) {
    return;
  }
  
  try {
    for (const id of selectedBookmarks) {
      await window.BookmarkManager.deleteBookmark(id);
    }
    
    selectedBookmarks.clear();
    await loadBookmarks();
    renderBookmarks();
    showNotification('已删除', 'success');
  } catch (error) {
    console.error('Error deleting:', error);
    showNotification('删除失败', 'error');
  }
}

// 更新统计
function updateStats() {
  document.getElementById('totalCount').textContent = filteredBookmarks.length;
  document.getElementById('selectedCount').textContent = selectedBookmarks.size;
}

// 显示通知
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  const text = document.getElementById('notificationText');
  
  text.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 显示结果
function showResults(title, subtitle) {
  const panel = document.getElementById('resultsPanel');
  const titleEl = document.getElementById('resultsTitle');
  const content = document.getElementById('resultsContent');
  
  titleEl.textContent = title;
  
  // 渲染结果列表
  content.innerHTML = currentResults.map(bookmark => `
    <div class="result-item">
      <div class="result-title">${escapeHtml(bookmark.title || '无标题')}</div>
      <div class="result-url">${escapeHtml(bookmark.url)}</div>
    </div>
  `).join('');
  
  // 在顶部添加统计信息
  content.insertAdjacentHTML('afterbegin', `
    <div style="padding: 12px; background: var(--primary-light); border-radius: var(--radius); margin-bottom: 16px; color: var(--primary);">
      <strong>${subtitle}</strong>
    </div>
  `);
  
  panel.style.display = 'block';
  document.getElementById('bookmarkList').style.display = 'none';
}

// 关闭结果
function closeResults() {
  document.getElementById('resultsPanel').style.display = 'none';
  document.getElementById('bookmarkList').style.display = 'block';
  currentResults = [];
}

// 删除结果中的书签
async function deleteResults() {
  if (currentResults.length === 0) return;
  
  if (!confirm(`确定要删除这 ${currentResults.length} 个书签吗？此操作不可恢复。`)) {
    return;
  }
  
  try {
    const ids = currentResults.map(b => b.id);
    const results = await window.BookmarkManager.deleteBookmarks(ids);
    
    closeResults();
    await loadBookmarks();
    renderBookmarks();
    
    showNotification(
      `已删除 ${results.success.length} 个书签` + 
      (results.failed.length > 0 ? `，${results.failed.length} 个删除失败` : ''),
      results.failed.length > 0 ? 'warning' : 'success'
    );
  } catch (error) {
    console.error('Error deleting results:', error);
    showNotification('删除失败', 'error');
  }
}
