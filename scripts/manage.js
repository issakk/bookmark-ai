// 管理页面主 UI 模块
class ManageUI {
  constructor() {
    this.currentEditingId = null;
  }

  // 初始化
  async init() {
    console.log('Manage page loaded');
    
    // 初始化图标
    this.initIcons();
    
    // 初始化服务
    await window.OpenAIService.initialize();
    
    // 加载数据
    await window.ManageCore.loadBookmarks();
    
    // 初始化子模块
    window.ManageFilter.init();
    window.ManageResults.init();
    
    // 绑定事件
    this.bindEvents();
    
    // 绑定活动栏切换
    this.bindActivityBar();
    
    // 首次渲染
    this.render();
  }

  // 初始化图标
  initIcons() {
    // 活动栏图标
    this.setIcon('bookmarksIcon', 'bookmark');
    this.setIcon('toolsIcon', 'tool');
    this.setIcon('aiOrganizeIcon', 'sparkles');
    this.setIcon('settingsViewIcon', 'settings');
    
    // 侧边栏 - 书签视图
    this.setIcon('addIcon', 'plus');
    this.setIcon('refreshIcon', 'refresh');
    this.setIcon('clearIcon', 'x');
    this.setIcon('clearSearchIcon', 'x');
    this.setIcon('selectAllIcon', 'checkSquare');
    this.setIcon('expandIcon', 'chevronDown');
    this.setIcon('collapseIcon', 'chevronRight');
    
    // 侧边栏 - 搜索视图
    this.setIcon('searchIcon', 'search');
    
    // 侧边栏 - 工具视图
    this.setIcon('aiIcon', 'sparkles');
    this.setIcon('duplicateIcon', 'copy');
    this.setIcon('warningIcon', 'alertCircle');
    this.setIcon('deleteIcon', 'trash');
    
    // 侧边栏 - AI 整理视图
    this.setIcon('startAiIcon', 'sparkles');
    this.setIcon('stopAiIcon', 'x');
    
    // 标题栏图标
    this.setIcon('tabIcon', 'bookmark');
    
    // 结果面板图标
    this.setIcon('resultsIcon', 'alertCircle');
    this.setIcon('closeResultsIcon', 'x');
    this.setIcon('deleteResultsIcon', 'trash');
    
    // 对话框图标
    this.setIcon('closeDialogIcon', 'x');
  }
  
  // 安全设置图标
  setIcon(elementId, iconName) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = window.Icons.get(iconName);
    }
  }

  // 绑定活动栏切换
  bindActivityBar() {
    const activityItems = document.querySelectorAll('.activity-item[data-view]');
    const sidebarViews = document.querySelectorAll('.sidebar-view');
    
    activityItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewName = item.dataset.view;
        
        // 设置视图跳转到 options 页面
        if (viewName === 'settings') {
          chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
          return;
        }
        
        // 更新活动项状态
        activityItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        // 切换侧边栏视图
        sidebarViews.forEach(view => {
          view.style.display = 'none';
        });
        
        // 将 kebab-case 转换为 camelCase
        const viewId = viewName.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) + 'View';
        const targetView = document.getElementById(viewId);
        if (targetView) {
          targetView.style.display = 'flex';
        }
      });
    });
  }

  // 绑定事件
  bindEvents() {
    // 添加书签
    document.getElementById('addBookmarkBtn').addEventListener('click', () => {
      this.openBookmarkDialog();
    });
    
    // 侧边栏刷新
    const refreshSidebarBtn = document.getElementById('refreshSidebarBtn');
    if (refreshSidebarBtn) {
      refreshSidebarBtn.addEventListener('click', async () => {
        await window.ManageCore.loadBookmarks();
        await window.ManageFilter.updateFilterOptions();
        this.render();
        this.showNotification(await window.I18n.t('manage.notification.refreshed'), 'success');
      });
    }

    // 全选
    document.getElementById('selectAllBtn').addEventListener('click', () => {
      window.ManageCore.toggleSelectAll();
      this.render();
    });
    
    // AI 分类选中项
    document.getElementById('classifySelectedBtn').addEventListener('click', async () => {
      await this.classifySelected();
    });
    
    // 查找重复
    document.getElementById('findDuplicatesBtn').addEventListener('click', async () => {
      await window.ManageResults.showDuplicates();
    });
    
    // 查找失效书签
    document.getElementById('findInvalidBtn').addEventListener('click', async () => {
      await window.ManageResults.showInvalid();
    });
    
    // 删除选中项
    document.getElementById('deleteSelectedBtn').addEventListener('click', async () => {
      await this.deleteSelected();
    });
    
    // AI 整理
    const startAiBtn = document.getElementById('startAiOrganizeBtn');
    const stopAiBtn = document.getElementById('stopAiOrganizeBtn');
    
    if (startAiBtn) {
      startAiBtn.addEventListener('click', async () => {
        console.log('Start AI organize clicked');
        await this.startAiOrganize();
      });
    } else {
      console.error('startAiOrganizeBtn not found');
    }
    
    if (stopAiBtn) {
      stopAiBtn.addEventListener('click', () => {
        console.log('Stop AI organize clicked');
        this.stopAiOrganize();
      });
    } else {
      console.error('stopAiOrganizeBtn not found');
    }
    
    // 对话框
    document.getElementById('closeDialog').addEventListener('click', () => {
      this.closeBookmarkDialog();
    });
    document.getElementById('cancelDialog').addEventListener('click', () => {
      this.closeBookmarkDialog();
    });
    document.getElementById('saveBookmark').addEventListener('click', () => {
      this.saveBookmark();
    });
    
    // 点击遮罩关闭对话框
    document.querySelector('.dialog-overlay')?.addEventListener('click', () => {
      this.closeBookmarkDialog();
    });

    // 展开/折叠所有
    const expandAllBtn = document.getElementById('expandAllBtn');
    const collapseAllBtn = document.getElementById('collapseAllBtn');
    
    if (expandAllBtn) {
      expandAllBtn.addEventListener('click', () => {
        window.ManageTree.expandAll();
        this.render();
      });
    }
    
    if (collapseAllBtn) {
      collapseAllBtn.addEventListener('click', () => {
        window.ManageTree.collapseAll();
        this.render();
      });
    }
    
    // 侧边栏搜索
    const sidebarSearchInput = document.getElementById('sidebarSearchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    
    if (sidebarSearchInput) {
      sidebarSearchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        window.ManageFilter.setSearch(query);
        this.render();
        
        // 显示/隐藏清除按钮
        if (clearSearchBtn) {
          clearSearchBtn.style.display = e.target.value ? 'flex' : 'none';
        }
      });
    }
    
    // 清除搜索
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        if (sidebarSearchInput) {
          sidebarSearchInput.value = '';
          window.ManageFilter.setSearch('');
          this.render();
          clearSearchBtn.style.display = 'none';
        }
      });
    }
  }

  // 渲染界面
  async render() {
    const container = document.getElementById('bookmarkList');
    const viewMode = window.ManageCore.viewMode;

    if (viewMode === 'tree') {
      await window.ManageTree.render(container);
    } else {
      await this.renderList(container);
    }

    this.updateStats();
    await this.updateTitleTab();
  }

  // 渲染列表视图
  async renderList(container) {
    const bookmarks = window.ManageCore.filteredBookmarks;
    
    if (bookmarks.length === 0) {
      const emptyTitle = await window.I18n.t('manage.empty.title');
      const emptySubtitle = await window.I18n.t('manage.empty.subtitle');
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📭</span>
          <h2>${emptyTitle}</h2>
          <p>${emptySubtitle}</p>
        </div>
      `;
      return;
    }

    container.innerHTML = '';
    bookmarks.forEach(bookmark => {
      const card = this.createBookmarkCard(bookmark);
      container.appendChild(card);
    });
  }

  // 创建书签卡片
  createBookmarkCard(bookmark) {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    if (window.ManageCore.selectedBookmarks.has(bookmark.id)) {
      card.classList.add('selected');
    }

    const metadata = window.ManageCore.getBookmarkMetadata(bookmark.id);
    const tags = metadata?.tags || [];

    // 复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'bookmark-checkbox';
    checkbox.checked = window.ManageCore.selectedBookmarks.has(bookmark.id);
    checkbox.dataset.id = bookmark.id;
    
    // 图标
    const icon = document.createElement('span');
    icon.className = 'bookmark-icon icon';
    icon.innerHTML = window.Icons.get('bookmark');
    
    // 信息区
    const info = document.createElement('div');
    info.className = 'bookmark-info';
    
    const title = document.createElement('div');
    title.className = 'bookmark-title';
    title.textContent = bookmark.title || bookmark.url;
    
    const url = document.createElement('div');
    url.className = 'bookmark-url';
    url.textContent = bookmark.url;
    
    info.appendChild(title);
    info.appendChild(url);
    
    // 标签
    if (tags.length > 0) {
      const meta = document.createElement('div');
      meta.className = 'bookmark-meta';
      tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'bookmark-tag';
        tagSpan.textContent = tag;
        meta.appendChild(tagSpan);
      });
      info.appendChild(meta);
    }
    
    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'bookmark-actions';
    
    const openBtn = document.createElement('button');
    openBtn.className = 'action-btn icon';
    openBtn.dataset.action = 'open';
    openBtn.title = '打开';
    openBtn.innerHTML = window.Icons.get('externalLink');
    
    const editBtn = document.createElement('button');
    editBtn.className = 'action-btn icon';
    editBtn.dataset.action = 'edit';
    editBtn.title = '编辑';
    editBtn.innerHTML = window.Icons.get('edit');
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn icon';
    deleteBtn.dataset.action = 'delete';
    deleteBtn.title = '删除';
    deleteBtn.innerHTML = window.Icons.get('trash');
    
    actions.appendChild(openBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    
    card.appendChild(checkbox);
    card.appendChild(icon);
    card.appendChild(info);
    card.appendChild(actions);

    // 复选框事件
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      window.ManageCore.toggleBookmark(bookmark.id);
      card.classList.toggle('selected', checkbox.checked);
      this.updateStats();
    });

    // 操作按钮事件
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: bookmark.url });
    });
    
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleAction('edit', bookmark);
    });
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleAction('delete', bookmark);
    });

    return card;
  }

  // 处理操作
  async handleAction(action, bookmark) {
    switch (action) {
      case 'open':
        chrome.tabs.create({ url: bookmark.url });
        break;
        
      case 'edit':
        this.openBookmarkDialog(bookmark);
        break;
        
      case 'delete':
        if (confirm(await window.I18n.t('manage.confirm.delete', '', { title: bookmark.title }))) {
          await window.BookmarkManager.deleteBookmark(bookmark.id);
          await window.ManageCore.loadBookmarks();
          this.render();
          this.showNotification(await window.I18n.t('manage.notification.deleted'), 'success');
        }
        break;
    }
  }

  // 更新统计信息
  updateStats() {
    const stats = window.ManageCore.getStats();
    document.getElementById('totalCount').textContent = stats.total;
    document.getElementById('selectedCount').textContent = stats.selected;
  }

  // 更新标题标签
  async updateTitleTab() {
    const titleTab = document.querySelector('.title-tab span:last-child');
    if (!titleTab) return;
    
    const filterStatus = window.ManageFilter.getFilterStatus();
    const stats = window.ManageCore.getStats();
    
    if (filterStatus.hasSearch) {
      // 显示搜索信息
      const searchQuery = window.ManageCore.searchQuery;
      titleTab.textContent = await window.I18n.t('manage.title.search', '', { query: searchQuery, count: stats.filtered });
    } else if (filterStatus.hasCategory || filterStatus.hasTag) {
      // 显示筛选信息
      let filterText = '';
      if (filterStatus.hasCategory) {
        filterText += window.ManageCore.filterCategory;
      }
      if (filterStatus.hasTag) {
        if (filterStatus.hasCategory) filterText += ' + ';
        filterText += window.ManageCore.filterTag;
      }
      titleTab.textContent = await window.I18n.t('manage.title.filter', '', { filter: filterText, count: stats.filtered });
    } else {
      // 显示所有书签
      titleTab.textContent = await window.I18n.t('manage.title.allBookmarks');
    }
  }

  // 打开书签对话框
  async openBookmarkDialog(bookmark = null) {
    this.currentEditingId = bookmark?.id || null;
    
    const dialog = document.getElementById('bookmarkDialog');
    const title = document.getElementById('dialogTitle');
    
    if (bookmark) {
      title.textContent = await window.I18n.t('manage.dialog.editBookmark');
      document.getElementById('bookmarkTitle').value = bookmark.title || '';
      document.getElementById('bookmarkUrl').value = bookmark.url || '';
      
      const metadata = window.ManageCore.getBookmarkMetadata(bookmark.id);
      document.getElementById('bookmarkCategory').value = metadata?.category || '';
      document.getElementById('bookmarkTags').value = metadata?.tags?.join(', ') || '';
    } else {
      title.textContent = await window.I18n.t('manage.dialog.addBookmark');
      document.getElementById('bookmarkTitle').value = '';
      document.getElementById('bookmarkUrl').value = '';
      document.getElementById('bookmarkCategory').value = '';
      document.getElementById('bookmarkTags').value = '';
    }
    
    dialog.style.display = 'block';
  }

  // 关闭书签对话框
  closeBookmarkDialog() {
    document.getElementById('bookmarkDialog').style.display = 'none';
    this.currentEditingId = null;
  }

  // 保存书签
  async saveBookmark() {
    const title = document.getElementById('bookmarkTitle').value.trim();
    const url = document.getElementById('bookmarkUrl').value.trim();
    const category = document.getElementById('bookmarkCategory').value.trim();
    const tagsStr = document.getElementById('bookmarkTags').value.trim();
    
    if (!url) {
      this.showNotification(await window.I18n.t('manage.dialog.enterUrl'), 'error');
      return;
    }

    try {
      if (this.currentEditingId) {
        // 更新书签
        await window.BookmarkManager.updateBookmark(this.currentEditingId, { title, url });
        
        // 更新元数据
        if (category || tagsStr) {
          const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
          await window.StorageManager.updateBookmarkMetadata(this.currentEditingId, {
            category: category || undefined,
            tags: tags.length > 0 ? tags : undefined
          });
        }
        
        this.showNotification(await window.I18n.t('manage.notification.bookmarkUpdated'), 'success');
      } else {
        // 创建书签
        const bookmark = await window.BookmarkManager.createBookmark({ title, url });
        
        // 保存元数据
        if (category || tagsStr) {
          const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];
          await window.StorageManager.updateBookmarkMetadata(bookmark.id, {
            category: category || undefined,
            tags: tags.length > 0 ? tags : undefined
          });
        }
        
        this.showNotification(await window.I18n.t('manage.notification.bookmarkAdded'), 'success');
      }
      
      this.closeBookmarkDialog();
      await window.ManageCore.loadBookmarks();
      await window.ManageFilter.updateFilterOptions();
      this.render();
    } catch (error) {
      console.error('Error saving bookmark:', error);
      this.showNotification(await window.I18n.t('manage.notification.saveFailed'), 'error');
    }
  }

  // AI 分类选中项
  async classifySelected() {
    const selected = Array.from(window.ManageCore.selectedBookmarks);
    
    if (selected.length === 0) {
      this.showNotification(await window.I18n.t('manage.notification.selectFirst'), 'warning');
      return;
    }

    if (!window.OpenAIService.isConfigured()) {
      this.showNotification(await window.I18n.t('manage.notification.configureApiKey'), 'warning');
      chrome.runtime.openOptionsPage();
      return;
    }

    if (!confirm(await window.I18n.t('manage.confirm.classify', '', { count: selected.length }))) {
      return;
    }

    try {
      this.showNotification(await window.I18n.t('manage.notification.classifying'), 'info');
      
      for (const id of selected) {
        const bookmark = window.ManageCore.allBookmarks.find(b => b.id === id);
        if (bookmark) {
          const classification = await window.OpenAIService.classifyBookmark(bookmark);
          await window.StorageManager.updateBookmarkMetadata(id, classification);
        }
      }
      
      await window.ManageCore.loadBookmarks();
      await window.ManageFilter.updateFilterOptions();
      this.render();
      this.showNotification(await window.I18n.t('manage.notification.classifyComplete'), 'success');
    } catch (error) {
      console.error('Error classifying:', error);
      this.showNotification(await window.I18n.t('manage.notification.classifyFailed'), 'error');
    }
  }

  // 删除选中项
  async deleteSelected() {
    const selected = Array.from(window.ManageCore.selectedBookmarks);
    
    if (selected.length === 0) {
      this.showNotification(await window.I18n.t('manage.notification.selectFirst'), 'warning');
      return;
    }

    if (!confirm(await window.I18n.t('manage.confirm.deleteMultiple', '', { count: selected.length }))) {
      return;
    }

    try {
      const results = await window.BookmarkManager.deleteBookmarks(selected);
      
      window.ManageCore.clearSelection();
      await window.ManageCore.loadBookmarks();
      this.render();
      
      const successMsg = await window.I18n.t('manage.ai.success', '', { count: results.success.length });
      const failedMsg = results.failed.length > 0 ? ', ' + await window.I18n.t('manage.ai.failed', '', { count: results.failed.length }) : '';
      this.showNotification(
        `${await window.I18n.t('manage.notification.deleted')} ${successMsg}${failedMsg}`,
        results.failed.length > 0 ? 'warning' : 'success'
      );
    } catch (error) {
      console.error('Error deleting:', error);
      this.showNotification(await window.I18n.t('manage.notification.deleteFailed'), 'error');
    }
  }

  // AI 整理所有书签
  async startAiOrganize() {
    console.log('startAiOrganize called');
    
    // 重新初始化 OpenAI 配置
    await window.OpenAIService.initialize();
    
    console.log('OpenAI configured:', window.OpenAIService.isConfigured());
    
    if (!window.OpenAIService.isConfigured()) {
      if (confirm(await window.I18n.t('manage.confirm.configureApiKey'))) {
        chrome.runtime.openOptionsPage();
      }
      return;
    }
    
    const bookmarks = window.ManageCore.allBookmarks;
    console.log('Bookmarks count:', bookmarks.length);
    
    if (!confirm(await window.I18n.t('manage.confirm.organize', '', { count: bookmarks.length }))) {
      return;
    }
    
    this.aiOrganizeCancelled = false;
    
    // 显示进度区域和结果区域
    document.getElementById('aiProgressSection').style.display = 'block';
    document.getElementById('aiResultsSection').style.display = 'block';
    document.getElementById('startAiOrganizeBtn').style.display = 'none';
    document.getElementById('stopAiOrganizeBtn').style.display = 'flex';
    
    // 清空之前的结果
    document.getElementById('aiResultsList').innerHTML = '';
    
    const progressText = document.getElementById('aiProgressText');
    const progressPercent = document.getElementById('aiProgressPercent');
    const progressFill = document.getElementById('aiProgressFill');
    const progressStats = document.getElementById('aiProgressStats');
    
    try {
      let processedCount = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      
      // 获取已有的元数据
      const existingMetadata = await window.StorageManager.getBookmarkData();
      
      for (let i = 0; i < bookmarks.length; i++) {
        if (this.aiOrganizeCancelled) {
          // 保存已处理的数据
          await this.updateCategoriesAndTags();
          await window.ManageCore.loadBookmarks();
          this.render();
          
          const cancelMsg = await window.I18n.t('manage.notification.organizeCancelled');
          const successMsg = await window.I18n.t('manage.ai.success', '', { count: successCount });
          const failedMsg = await window.I18n.t('manage.ai.failed', '', { count: failedCount });
          const skippedMsg = await window.I18n.t('manage.ai.skipped', '', { count: skippedCount });
          this.showNotification(
            `${cancelMsg}, ${successMsg}, ${failedMsg}, ${skippedMsg}`, 
            'warning'
          );
          break;
        }
        
        const bookmark = bookmarks[i];
        const percent = Math.round(((i + 1) / bookmarks.length) * 100);
        
        progressText.textContent = await window.I18n.t('manage.notification.organizing');
        progressPercent.textContent = `${percent}%`;
        progressFill.style.width = `${percent}%`;
        progressStats.textContent = `${i + 1} / ${bookmarks.length}`;
        
        // 检查是否已经被 AI 整理过
        const metadata = existingMetadata[bookmark.id];
        if (metadata && metadata.aiProcessed) {
          // 跳过已整理的书签
          this.addAiResult(bookmark, metadata, true, '', true);
          skippedCount++;
          continue;
        }
        
        try {
          const classification = await window.OpenAIService.classifyBookmark(bookmark);
          
          // 标记为已被 AI 处理
          classification.aiProcessed = true;
          classification.aiProcessedAt = Date.now();
          
          await window.StorageManager.updateBookmarkMetadata(bookmark.id, classification);
          
          // 更新本地缓存
          existingMetadata[bookmark.id] = classification;
          
          // 显示成功结果
          this.addAiResult(bookmark, classification, true);
          successCount++;
          processedCount++;
        } catch (error) {
          console.error(`Failed to classify bookmark ${bookmark.id}:`, error);
          this.addAiResult(bookmark, null, false, error.message);
          failedCount++;
          processedCount++;
        }
      }
      
      if (!this.aiOrganizeCancelled) {
        // 更新分类和标签列表
        await this.updateCategoriesAndTags();
        
        // 重新加载数据
        await window.ManageCore.loadBookmarks();
        this.render();
        
        const completeMsg = await window.I18n.t('manage.notification.organizeComplete');
        const successMsg = await window.I18n.t('manage.ai.success', '', { count: successCount });
        const failedMsg = await window.I18n.t('manage.ai.failed', '', { count: failedCount });
        const skippedMsg = await window.I18n.t('manage.ai.skipped', '', { count: skippedCount });
        this.showNotification(
          `${completeMsg} ${successMsg}, ${failedMsg}, ${skippedMsg}`, 
          'success'
        );
      }
    } catch (error) {
      console.error('AI organize error:', error);
      this.showNotification(await window.I18n.t('manage.notification.organizeFailed') + ': ' + error.message, 'error');
    } finally {
      document.getElementById('startAiOrganizeBtn').style.display = 'flex';
      document.getElementById('stopAiOrganizeBtn').style.display = 'none';
    }
  }
  
  // 停止 AI 整理
  stopAiOrganize() {
    this.aiOrganizeCancelled = true;
  }
  
  // 添加 AI 结果到列表
  addAiResult(bookmark, classification, success, errorMsg = '', skipped = false) {
    const resultsList = document.getElementById('aiResultsList');
    const resultItem = document.createElement('div');
    resultItem.className = 'ai-result-item';
    
    let metaHtml = '';
    if (success && classification) {
      if (classification.category) {
        metaHtml += `<span class="ai-result-category">${this.escapeHtml(classification.category)}</span>`;
      }
      if (classification.tags && classification.tags.length > 0) {
        classification.tags.forEach(tag => {
          metaHtml += `<span class="ai-result-tag">${this.escapeHtml(tag)}</span>`;
        });
      }
    }
    
    let statusClass, statusText;
    if (skipped) {
      statusClass = 'skipped';
      statusText = '⊘ 已跳过（之前已整理）';
    } else if (success) {
      statusClass = 'success';
      statusText = '✓ 整理成功';
    } else {
      statusClass = 'error';
      statusText = `✗ 整理失败: ${errorMsg}`;
    }
    
    resultItem.innerHTML = `
      <div class="ai-result-title">${this.escapeHtml(bookmark.title || bookmark.url)}</div>
      ${metaHtml ? `<div class="ai-result-meta">${metaHtml}</div>` : ''}
      <div class="ai-result-status ${statusClass}">${statusText}</div>
    `;
    
    // 插入到列表顶部
    resultsList.insertBefore(resultItem, resultsList.firstChild);
    
    // 限制显示数量，只保留最近的 20 条
    while (resultsList.children.length > 20) {
      resultsList.removeChild(resultsList.lastChild);
    }
  }
  
  // 更新分类和标签列表
  async updateCategoriesAndTags() {
    const bookmarks = window.ManageCore.allBookmarks;
    const bookmarkData = await window.StorageManager.getBookmarkData();
    
    const allCategories = new Set();
    const allTags = new Set();
    
    for (const bookmark of bookmarks) {
      const metadata = bookmarkData[bookmark.id];
      if (metadata) {
        if (metadata.category) {
          allCategories.add(metadata.category);
        }
        if (metadata.tags && Array.isArray(metadata.tags)) {
          metadata.tags.forEach(tag => allTags.add(tag));
        }
      }
    }
    
    const categories = Array.from(allCategories).sort();
    const tags = Array.from(allTags).sort();
    
    await window.StorageManager.setCategories(categories);
    await window.StorageManager.setTags(tags);
  }

  // 显示通知
  showNotification(text, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    notification.className = `notification ${type}`;
    notificationText.textContent = text;
    notification.style.display = 'block';
    
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }

  // HTML 转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化
window.ManageUI = new ManageUI();

document.addEventListener('DOMContentLoaded', () => {
  window.ManageUI.init();
});
