// 配置页面脚本
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Options page loaded');
  
  // 加载设置
  await loadSettings();
  
  // 加载统计信息
  await loadStatistics();
  
  // 绑定事件
  bindEvents();
});

// 加载设置
async function loadSettings() {
  try {
    const apiKey = await window.StorageManager.getOpenAIKey();
    const model = await window.StorageManager.getOpenAIModel();
    const theme = await window.StorageManager.getTheme();
    const autoClassify = await window.StorageManager.getAutoClassify();
    
    document.getElementById('apiKey').value = apiKey;
    document.getElementById('model').value = model;
    document.getElementById('theme').value = theme;
    document.getElementById('autoClassify').checked = autoClassify;
  } catch (error) {
    console.error('Error loading settings:', error);
    showNotification('加载设置失败', 'error');
  }
}

// 加载统计信息
async function loadStatistics() {
  try {
    const bookmarks = await window.BookmarkManager.getFlatBookmarks();
    const bookmarkData = await window.StorageManager.getBookmarkData();
    const categories = await window.StorageManager.getCategories();
    const tags = await window.StorageManager.getTags();
    
    const classified = bookmarks.filter(b => bookmarkData[b.id]?.category).length;
    
    document.getElementById('statTotalBookmarks').textContent = bookmarks.length;
    document.getElementById('statClassified').textContent = classified;
    document.getElementById('statCategories').textContent = categories.length;
    document.getElementById('statTags').textContent = tags.length;
  } catch (error) {
    console.error('Error loading statistics:', error);
  }
}

// 绑定事件
function bindEvents() {
  // 显示/隐藏 API Key
  document.getElementById('toggleApiKey').addEventListener('click', () => {
    const input = document.getElementById('apiKey');
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  // 测试连接
  document.getElementById('testConnection').addEventListener('click', async () => {
    await testOpenAIConnection();
  });
  
  // 保存设置
  document.getElementById('saveSettings').addEventListener('click', async () => {
    await saveSettings();
  });
  
  // 重置设置
  document.getElementById('resetSettings').addEventListener('click', async () => {
    if (confirm('确定要重置所有设置吗？')) {
      await loadSettings();
      showNotification('设置已重置', 'success');
    }
  });
  
  // 导出数据
  document.getElementById('exportData').addEventListener('click', async () => {
    await exportData();
  });
  
  // 导入数据
  document.getElementById('importData').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  
  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await importData(file);
      e.target.value = ''; // 重置文件输入
    }
  });
  
  // 导出书签
  document.getElementById('exportBookmarks').addEventListener('click', async () => {
    await exportBookmarks();
  });
  
  // 清除数据
  document.getElementById('clearData').addEventListener('click', async () => {
    if (confirm('确定要清除所有分类和标签数据吗？\n这不会删除书签本身。')) {
      await clearData();
    }
  });
  
  // 链接已在 HTML 中直接设置，无需 JavaScript 处理
}

// 测试 OpenAI 连接
async function testOpenAIConnection() {
  const apiKey = document.getElementById('apiKey').value.trim();
  const model = document.getElementById('model').value;
  const resultSpan = document.getElementById('testResult');
  
  if (!apiKey) {
    resultSpan.textContent = '❌ 请输入 API Key';
    resultSpan.className = 'test-result error';
    return;
  }
  
  resultSpan.textContent = '⏳ 测试中...';
  resultSpan.className = 'test-result';
  
  try {
    window.OpenAIService.setApiKey(apiKey);
    window.OpenAIService.setModel(model);
    
    const response = await window.OpenAIService.chatCompletion([
      { role: 'user', content: 'Hello' }
    ], { max_tokens: 10 });
    
    resultSpan.textContent = '✅ 连接成功';
    resultSpan.className = 'test-result success';
    showNotification('连接成功', 'success');
  } catch (error) {
    console.error('Test connection error:', error);
    resultSpan.textContent = '❌ 连接失败';
    resultSpan.className = 'test-result error';
    showNotification(`连接失败: ${error.message}`, 'error');
  }
}

// 保存设置
async function saveSettings() {
  try {
    const apiKey = document.getElementById('apiKey').value.trim();
    const model = document.getElementById('model').value;
    const theme = document.getElementById('theme').value;
    const autoClassify = document.getElementById('autoClassify').checked;
    
    await window.StorageManager.setOpenAIKey(apiKey);
    await window.StorageManager.setOpenAIModel(model);
    await window.StorageManager.setTheme(theme);
    await window.StorageManager.setAutoClassify(autoClassify);
    
    // 重新初始化 OpenAI 服务
    await window.OpenAIService.initialize();
    
    showNotification('设置已保存', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showNotification('保存失败', 'error');
  }
}

// 导出数据
async function exportData() {
  try {
    const data = await window.StorageManager.exportData();
    
    // 移除敏感信息
    const exportData = { ...data };
    delete exportData.openaiKey;
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmark-data-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('数据已导出', 'success');
  } catch (error) {
    console.error('Error exporting data:', error);
    showNotification('导出失败', 'error');
  }
}

// 导入数据
async function importData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    // 验证数据格式
    if (typeof data !== 'object') {
      throw new Error('无效的数据格式');
    }
    
    // 导入数据（保留现有的 API Key）
    const currentApiKey = await window.StorageManager.getOpenAIKey();
    await window.StorageManager.importData(data);
    
    // 恢复 API Key
    if (currentApiKey) {
      await window.StorageManager.setOpenAIKey(currentApiKey);
    }
    
    // 重新加载
    await loadSettings();
    await loadStatistics();
    
    showNotification('数据已导入', 'success');
  } catch (error) {
    console.error('Error importing data:', error);
    showNotification(`导入失败: ${error.message}`, 'error');
  }
}

// 导出书签
async function exportBookmarks() {
  try {
    const html = await window.BookmarkManager.exportToHTML();
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmarks-${Date.now()}.html`;
    a.click();
    
    URL.revokeObjectURL(url);
    showNotification('书签已导出', 'success');
  } catch (error) {
    console.error('Error exporting bookmarks:', error);
    showNotification('导出失败', 'error');
  }
}

// 清除数据
async function clearData() {
  try {
    await window.StorageManager.set({
      bookmarkData: {},
      categories: [],
      tags: []
    });
    
    await loadStatistics();
    showNotification('数据已清除', 'success');
  } catch (error) {
    console.error('Error clearing data:', error);
    showNotification('清除失败', 'error');
  }
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
