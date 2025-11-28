// 存储管理工具类
class StorageManager {
  constructor() {
    this.cache = {};
  }

  // 获取存储的数据
  async get(keys) {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    
    try {
      const result = await chrome.storage.local.get(keys);
      return keys.length === 1 ? result[keys[0]] : result;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  // 设置存储的数据
  async set(data) {
    try {
      await chrome.storage.local.set(data);
      // 更新缓存
      Object.assign(this.cache, data);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  // 删除存储的数据
  async remove(keys) {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    
    try {
      await chrome.storage.local.remove(keys);
      keys.forEach(key => delete this.cache[key]);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  // 清空所有存储
  async clear() {
    try {
      await chrome.storage.local.clear();
      this.cache = {};
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  // 获取 OpenAI API Key
  async getOpenAIKey() {
    const key = await this.get('openaiKey');
    return key || '';
  }

  // 设置 OpenAI API Key
  async setOpenAIKey(key) {
    return await this.set({ openaiKey: key });
  }

  // 获取 OpenAI 模型
  async getOpenAIModel() {
    const model = await this.get('openaiModel');
    return model || 'gpt-4o-mini';
  }

  // 设置 OpenAI 模型
  async setOpenAIModel(model) {
    return await this.set({ openaiModel: model });
  }

  // 获取书签数据
  async getBookmarkData() {
    const data = await this.get('bookmarkData');
    return data || {};
  }

  // 设置书签数据
  async setBookmarkData(data) {
    return await this.set({ bookmarkData: data });
  }

  // 更新单个书签的元数据
  async updateBookmarkMetadata(bookmarkId, metadata) {
    const bookmarkData = await this.getBookmarkData();
    bookmarkData[bookmarkId] = {
      ...(bookmarkData[bookmarkId] || {}),
      ...metadata,
      updatedAt: Date.now()
    };
    return await this.setBookmarkData(bookmarkData);
  }

  // 获取分类列表
  async getCategories() {
    const categories = await this.get('categories');
    return categories || [];
  }

  // 设置分类列表
  async setCategories(categories) {
    return await this.set({ categories });
  }

  // 获取标签列表
  async getTags() {
    const tags = await this.get('tags');
    return tags || [];
  }

  // 设置标签列表
  async setTags(tags) {
    return await this.set({ tags });
  }

  // 获取主题
  async getTheme() {
    const theme = await this.get('theme');
    return theme || 'light';
  }

  // 设置主题
  async setTheme(theme) {
    return await this.set({ theme });
  }

  // 获取自动分类设置
  async getAutoClassify() {
    const autoClassify = await this.get('autoClassify');
    return autoClassify !== false; // 默认为 true
  }

  // 设置自动分类
  async setAutoClassify(enabled) {
    return await this.set({ autoClassify: enabled });
  }

  // 获取最后同步时间
  async getLastSync() {
    return await this.get('lastSync');
  }

  // 更新最后同步时间
  async updateLastSync() {
    return await this.set({ lastSync: Date.now() });
  }

  // 导出所有数据
  async exportData() {
    try {
      const allData = await chrome.storage.local.get(null);
      return allData;
    } catch (error) {
      console.error('Export data error:', error);
      return null;
    }
  }

  // 导入数据
  async importData(data) {
    try {
      await chrome.storage.local.set(data);
      this.cache = { ...data };
      return true;
    } catch (error) {
      console.error('Import data error:', error);
      return false;
    }
  }
}

// 创建单例
const storage = new StorageManager();

// 如果在浏览器环境中，导出到全局
if (typeof window !== 'undefined') {
  window.StorageManager = storage;
}
