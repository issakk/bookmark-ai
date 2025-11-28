// 管理页面核心状态管理模块
class ManageCore {
  constructor() {
    this.allBookmarks = [];
    this.filteredBookmarks = [];
    this.selectedBookmarks = new Set();
    this.bookmarkMetadata = {};
    this.currentEditingId = null;
    this.viewMode = 'tree'; // 'tree' 或 'list'
    this.sortBy = 'title'; // 'title', 'date', 'url'
    this.filterCategory = '';
    this.filterTag = '';
    this.searchQuery = '';
  }

  // 加载书签数据
  async loadBookmarks() {
    try {
      this.allBookmarks = await window.BookmarkManager.getFlatBookmarks();
      this.bookmarkMetadata = await window.StorageManager.getBookmarkData();
      this.applyFilters();
      return true;
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      throw error;
    }
  }

  // 应用筛选
  applyFilters() {
    let result = [...this.allBookmarks];

    // 搜索过滤
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter(bookmark => {
        const titleMatch = bookmark.title.toLowerCase().includes(query);
        const urlMatch = bookmark.url.toLowerCase().includes(query);
        const metadata = this.bookmarkMetadata[bookmark.id];
        const tagMatch = metadata?.tags?.some(tag => 
          tag.toLowerCase().includes(query)
        );
        const categoryMatch = metadata?.category?.toLowerCase().includes(query);
        return titleMatch || urlMatch || tagMatch || categoryMatch;
      });
    }

    // 分类过滤
    if (this.filterCategory) {
      result = result.filter(bookmark => {
        const metadata = this.bookmarkMetadata[bookmark.id];
        const category = bookmark.folderName || metadata?.category || '未分类';
        return category === this.filterCategory;
      });
    }

    // 标签过滤
    if (this.filterTag) {
      result = result.filter(bookmark => {
        const metadata = this.bookmarkMetadata[bookmark.id];
        return metadata?.tags?.includes(this.filterTag);
      });
    }

    // 排序
    this.sortBookmarks(result);

    this.filteredBookmarks = result;
  }

  // 排序书签
  sortBookmarks(bookmarks) {
    bookmarks.sort((a, b) => {
      switch (this.sortBy) {
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

  // 设置搜索查询
  setSearchQuery(query) {
    this.searchQuery = query;
    this.applyFilters();
  }

  // 设置分类筛选
  setFilterCategory(category) {
    this.filterCategory = category;
    this.applyFilters();
  }

  // 设置标签筛选
  setFilterTag(tag) {
    this.filterTag = tag;
    this.applyFilters();
  }

  // 设置排序方式
  setSortBy(sortBy) {
    this.sortBy = sortBy;
    this.applyFilters();
  }

  // 设置视图模式
  setViewMode(mode) {
    this.viewMode = mode;
  }

  // 切换书签选中状态
  toggleBookmark(id) {
    if (this.selectedBookmarks.has(id)) {
      this.selectedBookmarks.delete(id);
    } else {
      this.selectedBookmarks.add(id);
    }
  }

  // 全选/取消全选
  toggleSelectAll() {
    if (this.selectedBookmarks.size === this.filteredBookmarks.length) {
      this.selectedBookmarks.clear();
    } else {
      this.filteredBookmarks.forEach(b => this.selectedBookmarks.add(b.id));
    }
  }

  // 清空选择
  clearSelection() {
    this.selectedBookmarks.clear();
  }

  // 获取所有分类
  getAllCategories() {
    const categories = new Set();
    this.allBookmarks.forEach(bookmark => {
      if (bookmark.folderName) {
        categories.add(bookmark.folderName);
      }
      const metadata = this.bookmarkMetadata[bookmark.id];
      if (metadata?.category) {
        categories.add(metadata.category);
      }
    });
    return Array.from(categories).sort();
  }

  // 获取所有标签
  getAllTags() {
    const tags = new Set();
    this.allBookmarks.forEach(bookmark => {
      const metadata = this.bookmarkMetadata[bookmark.id];
      if (metadata?.tags && Array.isArray(metadata.tags)) {
        metadata.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }

  // 获取统计信息
  getStats() {
    return {
      total: this.allBookmarks.length,
      filtered: this.filteredBookmarks.length,
      selected: this.selectedBookmarks.size
    };
  }

  // 获取书签元数据
  getBookmarkMetadata(id) {
    return this.bookmarkMetadata[id] || {};
  }

  // 构建树状结构
  buildTree() {
    const tree = {};
    
    this.filteredBookmarks.forEach(bookmark => {
      const metadata = this.bookmarkMetadata[bookmark.id];
      const category = bookmark.folderName || metadata?.category || '未分类';
      
      if (!tree[category]) {
        tree[category] = [];
      }
      
      tree[category].push(bookmark);
    });
    
    return tree;
  }
}

// 导出单例
window.ManageCore = new ManageCore();
