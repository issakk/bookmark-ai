// 管理页面树状视图模块
class ManageTree {
  constructor() {
    this.expandedFolders = new Set();
  }

  // 渲染树状视图
  render(container) {
    const tree = window.ManageCore.buildTree();
    container.innerHTML = '';

    if (Object.keys(tree).length === 0) {
      this.renderEmpty(container);
      return;
    }

    // 按分类名称排序
    const sortedCategories = Object.keys(tree).sort();

    sortedCategories.forEach(category => {
      const bookmarks = tree[category];
      const folderElement = this.createFolderElement(category, bookmarks);
      container.appendChild(folderElement);
    });
  }

  // 创建文件夹元素
  createFolderElement(category, bookmarks) {
    const folder = document.createElement('div');
    folder.className = 'tree-folder';
    
    const isExpanded = this.expandedFolders.has(category);
    
    const header = document.createElement('div');
    header.className = 'folder-header';
    header.dataset.category = category;
    
    const toggle = document.createElement('span');
    toggle.className = 'folder-toggle icon';
    toggle.innerHTML = window.Icons.get(isExpanded ? 'chevronDown' : 'chevronRight');
    
    const icon = document.createElement('span');
    icon.className = 'folder-icon icon';
    icon.innerHTML = window.Icons.get('folder');
    
    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = category;
    
    const count = document.createElement('span');
    count.className = 'folder-count';
    count.textContent = bookmarks.length;
    
    header.appendChild(toggle);
    header.appendChild(icon);
    header.appendChild(name);
    header.appendChild(count);
    
    const content = document.createElement('div');
    content.className = 'folder-content';
    content.style.display = isExpanded ? 'block' : 'none';
    
    folder.appendChild(header);
    folder.appendChild(content);

    // 文件夹头部点击事件
    header.addEventListener('click', () => {
      this.toggleFolder(category, folder);
    });

    // 渲染书签
    bookmarks.forEach(bookmark => {
      const bookmarkElement = this.createBookmarkElement(bookmark);
      content.appendChild(bookmarkElement);
    });

    return folder;
  }

  // 创建书签元素
  createBookmarkElement(bookmark) {
    const item = document.createElement('div');
    item.className = 'tree-item';
    if (window.ManageCore.selectedBookmarks.has(bookmark.id)) {
      item.classList.add('selected');
    }

    const metadata = window.ManageCore.getBookmarkMetadata(bookmark.id);
    const tags = metadata?.tags || [];

    // 复选框
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'item-checkbox';
    checkbox.checked = window.ManageCore.selectedBookmarks.has(bookmark.id);
    checkbox.dataset.id = bookmark.id;
    
    // 图标
    const icon = document.createElement('span');
    icon.className = 'item-icon icon';
    icon.innerHTML = window.Icons.get('bookmark');
    
    // 信息区
    const info = document.createElement('div');
    info.className = 'item-info';
    
    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = bookmark.title || bookmark.url;
    
    const url = document.createElement('div');
    url.className = 'item-url';
    url.textContent = bookmark.url;
    
    info.appendChild(title);
    info.appendChild(url);
    
    // 标签
    if (tags.length > 0) {
      const tagsDiv = document.createElement('div');
      tagsDiv.className = 'item-tags';
      tags.forEach(tag => {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'item-tag';
        tagSpan.textContent = tag;
        tagsDiv.appendChild(tagSpan);
      });
      info.appendChild(tagsDiv);
    }
    
    // 操作按钮
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
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
    
    item.appendChild(checkbox);
    item.appendChild(icon);
    item.appendChild(info);
    item.appendChild(actions);

    // 复选框事件
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      window.ManageCore.toggleBookmark(bookmark.id);
      item.classList.toggle('selected', checkbox.checked);
      window.ManageUI.updateStats();
    });

    // 操作按钮事件
    openBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.tabs.create({ url: bookmark.url });
    });
    
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.ManageUI.handleAction('edit', bookmark);
    });
    
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.ManageUI.handleAction('delete', bookmark);
    });

    return item;
  }

  // 切换文件夹展开/折叠
  toggleFolder(category, folderElement) {
    const content = folderElement.querySelector('.folder-content');
    const toggle = folderElement.querySelector('.folder-toggle');
    
    if (this.expandedFolders.has(category)) {
      this.expandedFolders.delete(category);
      content.style.display = 'none';
      toggle.innerHTML = window.Icons.get('chevronRight');
    } else {
      this.expandedFolders.add(category);
      content.style.display = 'block';
      toggle.innerHTML = window.Icons.get('chevronDown');
    }
  }

  // 展开所有文件夹
  expandAll() {
    const tree = window.ManageCore.buildTree();
    Object.keys(tree).forEach(category => {
      this.expandedFolders.add(category);
    });
  }

  // 折叠所有文件夹
  collapseAll() {
    this.expandedFolders.clear();
  }

  // 渲染空状态
  renderEmpty(container) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📭</span>
        <h2>没有找到书签</h2>
        <p>试试调整筛选条件</p>
      </div>
    `;
  }

  // HTML 转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 导出单例
window.ManageTree = new ManageTree();
