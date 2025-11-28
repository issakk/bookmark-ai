// 管理页面结果面板模块
class ManageResults {
  constructor() {
    this.currentResults = [];
    this.resultType = ''; // 'duplicates' 或 'invalid'
  }

  // 初始化
  init() {
    this.bindEvents();
  }

  // 绑定事件
  bindEvents() {
    const closeBtn = document.getElementById('closeResults');
    const cancelBtn = document.getElementById('cancelResultsBtn');
    const deleteBtn = document.getElementById('deleteResultsBtn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.close());
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteResults());
    }
  }

  // 显示重复书签结果
  async showDuplicates() {
    try {
      window.ManageUI.showNotification('正在查找重复书签...', 'info');
      const duplicates = await window.BookmarkManager.findDuplicates();
      
      if (duplicates.length === 0) {
        window.ManageUI.showNotification('未发现重复书签', 'success');
        return;
      }
      
      // 展开所有重复的书签（保留第一个）
      this.currentResults = [];
      duplicates.forEach(group => {
        group.bookmarks.slice(1).forEach(bookmark => {
          this.currentResults.push(bookmark);
        });
      });
      
      this.resultType = 'duplicates';
      this.show(
        '重复书签', 
        `发现 ${duplicates.length} 组重复，共 ${this.currentResults.length} 个重复项`
      );
    } catch (error) {
      console.error('Error finding duplicates:', error);
      window.ManageUI.showNotification('查找失败', 'error');
    }
  }

  // 显示失效书签结果
  async showInvalid() {
    try {
      window.ManageUI.showNotification('正在检测失效书签...', 'info');
      const invalidBookmarks = await window.BookmarkManager.findInvalidBookmarks();
      
      if (invalidBookmarks.length === 0) {
        window.ManageUI.showNotification('未发现失效书签', 'success');
        return;
      }
      
      this.currentResults = invalidBookmarks;
      this.resultType = 'invalid';
      this.show('失效书签', `发现 ${invalidBookmarks.length} 个失效书签`);
    } catch (error) {
      console.error('Error finding invalid bookmarks:', error);
      window.ManageUI.showNotification('检测失败', 'error');
    }
  }

  // 显示结果面板
  show(title, subtitle) {
    const panel = document.getElementById('resultsPanel');
    const titleEl = document.getElementById('resultsTitle');
    const content = document.getElementById('resultsContent');
    
    titleEl.textContent = title;
    
    // 渲染结果列表
    content.innerHTML = this.currentResults.map(bookmark => `
      <div class="result-item">
        <div class="result-title">${this.escapeHtml(bookmark.title || '无标题')}</div>
        <div class="result-url">${this.escapeHtml(bookmark.url)}</div>
      </div>
    `).join('');
    
    // 在顶部添加统计信息
    content.insertAdjacentHTML('afterbegin', `
      <div class="result-summary">
        <strong>${subtitle}</strong>
      </div>
    `);
    
    panel.style.display = 'block';
    document.getElementById('bookmarkList').style.display = 'none';
  }

  // 关闭结果面板
  close() {
    document.getElementById('resultsPanel').style.display = 'none';
    document.getElementById('bookmarkList').style.display = 'block';
    this.currentResults = [];
    this.resultType = '';
  }

  // 删除结果中的书签
  async deleteResults() {
    if (this.currentResults.length === 0) return;
    
    if (!confirm(`确定要删除这 ${this.currentResults.length} 个书签吗？此操作不可恢复。`)) {
      return;
    }
    
    try {
      const ids = this.currentResults.map(b => b.id);
      const results = await window.BookmarkManager.deleteBookmarks(ids);
      
      this.close();
      await window.ManageCore.loadBookmarks();
      window.ManageUI.render();
      
      window.ManageUI.showNotification(
        `已删除 ${results.success.length} 个书签` + 
        (results.failed.length > 0 ? `，${results.failed.length} 个删除失败` : ''),
        results.failed.length > 0 ? 'warning' : 'success'
      );
    } catch (error) {
      console.error('Error deleting results:', error);
      window.ManageUI.showNotification('删除失败', 'error');
    }
  }

  // HTML 转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 导出单例
window.ManageResults = new ManageResults();
