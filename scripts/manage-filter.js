// 管理页面筛选排序模块
class ManageFilter {
  constructor() {
    this.searchTimeout = null;
  }

  // 初始化筛选器
  async init() {
    await this.updateFilterOptions();
    this.bindEvents();
  }

  // 绑定事件
  bindEvents() {

    // 分类筛选
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        window.ManageCore.setFilterCategory(e.target.value);
        this.updateClearButtonVisibility();
        window.ManageUI.render();
      });
    }

    // 标签筛选
    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter) {
      tagFilter.addEventListener('change', (e) => {
        window.ManageCore.setFilterTag(e.target.value);
        this.updateClearButtonVisibility();
        window.ManageUI.render();
      });
    }

    // 排序
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
      sortBy.addEventListener('change', (e) => {
        window.ManageCore.setSortBy(e.target.value);
        window.ManageUI.render();
      });
    }

    // 视图模式
    const viewMode = document.getElementById('viewMode');
    if (viewMode) {
      viewMode.addEventListener('change', (e) => {
        window.ManageCore.setViewMode(e.target.value);
        window.ManageUI.render();
      });
    }

    // 清空筛选
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        this.clearFilters();
      });
    }
  }

  // 更新筛选选项
  async updateFilterOptions() {
    await this.updateCategoryFilter();
    await this.updateTagFilter();
  }

  // 更新分类筛选器
  async updateCategoryFilter() {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) return;

    const categories = window.ManageCore.getAllCategories();
    const currentValue = categoryFilter.value;

    const allCategoriesText = await window.I18n.t('manage.filter.allCategories');
    categoryFilter.innerHTML = `<option value="">${allCategoriesText}</option>`;
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      if (category === currentValue) {
        option.selected = true;
      }
      categoryFilter.appendChild(option);
    });
  }

  // 更新标签筛选器
  async updateTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    if (!tagFilter) return;

    const tags = window.ManageCore.getAllTags();
    const currentValue = tagFilter.value;

    const allTagsText = await window.I18n.t('manage.filter.allTags');
    tagFilter.innerHTML = `<option value="">${allTagsText}</option>`;
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      if (tag === currentValue) {
        option.selected = true;
      }
      tagFilter.appendChild(option);
    });
  }

  // 设置搜索查询
  setSearch(query) {
    window.ManageCore.setSearchQuery(query);
  }

  // 更新清空筛选按钮的显示状态
  updateClearButtonVisibility() {
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    if (!clearFiltersBtn) return;
    
    const categoryFilter = document.getElementById('categoryFilter');
    const tagFilter = document.getElementById('tagFilter');
    
    const hasFilter = (categoryFilter && categoryFilter.value) || 
                     (tagFilter && tagFilter.value);
    
    clearFiltersBtn.style.display = hasFilter ? 'flex' : 'none';
  }

  // 清空筛选
  clearFilters() {
    const sidebarSearchInput = document.getElementById('sidebarSearchInput');
    if (sidebarSearchInput) sidebarSearchInput.value = '';
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) categoryFilter.value = '';
    
    const tagFilter = document.getElementById('tagFilter');
    if (tagFilter) tagFilter.value = '';

    window.ManageCore.setSearchQuery('');
    window.ManageCore.setFilterCategory('');
    window.ManageCore.setFilterTag('');
    this.updateClearButtonVisibility();
    window.ManageUI.render();
  }

  // 获取当前筛选状态
  getFilterStatus() {
    return {
      hasSearch: window.ManageCore.searchQuery !== '',
      hasCategory: window.ManageCore.filterCategory !== '',
      hasTag: window.ManageCore.filterTag !== '',
      hasAnyFilter: window.ManageCore.searchQuery !== '' || 
                    window.ManageCore.filterCategory !== '' || 
                    window.ManageCore.filterTag !== ''
    };
  }
}

// 导出单例
window.ManageFilter = new ManageFilter();
