// Background Service Worker
console.log('AI Bookmark Manager - Background Service Worker Started');

// 监听扩展安装或更新
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed');
    // 初始化存储
    initializeStorage();
    // 不再自动打开设置页面，只在需要 AI 功能时提示配置
  } else if (details.reason === 'update') {
    console.log('Extension updated');
  }
});

// 初始化存储
async function initializeStorage() {
  const defaults = {
    openaiKey: '',
    openaiModel: 'gpt-4o-mini',
    theme: 'auto', // 默认跟随系统
    autoClassify: true,
    lastSync: null,
    bookmarkData: {},
    categories: [],
    tags: []
  };
  
  const existing = await chrome.storage.local.get(Object.keys(defaults));
  const toSet = {};
  
  for (const [key, value] of Object.entries(defaults)) {
    if (existing[key] === undefined) {
      toSet[key] = value;
    }
  }
  
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.local.set(toSet);
  }
}

// 监听快捷键命令
chrome.commands.onCommand.addListener((command) => {
  if (command === 'save-bookmark') {
    saveCurrentPage();
  } else if (command === 'open-sidebar') {
    openSidebar();
  }
});

// 保存当前页面为书签
async function saveCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.url && !tab.url.startsWith('chrome://')) {
    try {
      // 检查书签是否已存在
      const existing = await chrome.bookmarks.search({ url: tab.url });
      
      if (existing.length > 0) {
        // 书签已存在，显示通知
        showNotification('书签已存在', `"${tab.title}" 已经在书签中了`, 'info');
      } else {
        // 创建新书签
        const bookmark = await chrome.bookmarks.create({
          title: tab.title,
          url: tab.url
        });
        
        showNotification('保存成功', `已保存 "${tab.title}"`, 'success');
        
        // 触发书签同步
        chrome.runtime.sendMessage({ 
          type: 'BOOKMARK_ADDED', 
          bookmark: bookmark 
        });
      }
    } catch (error) {
      console.error('Error saving bookmark:', error);
      showNotification('保存失败', error.message, 'error');
    }
  } else {
    showNotification('无法保存', '当前页面无法保存为书签', 'warning');
  }
}

// 打开侧边栏
async function openSidebar() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await chrome.sidePanel.open({ windowId: tab.windowId });
  }
}

// 显示通知
function showNotification(title, message, type = 'info') {
  const icons = {
    success: 'icons/icon48.png',
    error: 'icons/icon48.png',
    warning: 'icons/icon48.png',
    info: 'icons/icon48.png'
  };
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: icons[type] || icons.info,
    title: title,
    message: message,
    priority: 1
  });
}

// 监听书签变化
chrome.bookmarks.onCreated.addListener((id, bookmark) => {
  console.log('Bookmark created:', bookmark);
  chrome.runtime.sendMessage({ type: 'BOOKMARK_CREATED', bookmark });
});

chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
  console.log('Bookmark removed:', id);
  chrome.runtime.sendMessage({ type: 'BOOKMARK_REMOVED', id, removeInfo });
});

chrome.bookmarks.onChanged.addListener((id, changeInfo) => {
  console.log('Bookmark changed:', id, changeInfo);
  chrome.runtime.sendMessage({ type: 'BOOKMARK_CHANGED', id, changeInfo });
});

chrome.bookmarks.onMoved.addListener((id, moveInfo) => {
  console.log('Bookmark moved:', id, moveInfo);
  chrome.runtime.sendMessage({ type: 'BOOKMARK_MOVED', id, moveInfo });
});

// 监听来自其他页面的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_CURRENT_PAGE') {
    saveCurrentPage();
    sendResponse({ success: true });
  } else if (message.type === 'OPEN_SIDEBAR') {
    openSidebar();
    sendResponse({ success: true });
  } else if (message.type === 'GET_ALL_BOOKMARKS') {
    chrome.bookmarks.getTree().then(tree => {
      sendResponse({ success: true, data: tree });
    });
    return true; // 异步响应
  }
});

// 点击扩展图标时打开侧边栏
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
