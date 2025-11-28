// 书签管理工具类
class BookmarkManager {
  constructor() {
    this.bookmarkTree = null;
    this.flatBookmarks = [];
  }

  // 获取所有书签树
  async getBookmarkTree() {
    try {
      const tree = await chrome.bookmarks.getTree();
      this.bookmarkTree = tree;
      return tree;
    } catch (error) {
      console.error('Error getting bookmark tree:', error);
      return null;
    }
  }

  // 获取扁平化的书签列表（仅包含 URL 书签）
  async getFlatBookmarks() {
    const tree = await this.getBookmarkTree();
    if (!tree) return [];

    const bookmarks = [];
    
    const traverse = (nodes, folderPath = []) => {
      for (const node of nodes) {
        if (node.url) {
          bookmarks.push({
            id: node.id,
            title: node.title,
            url: node.url,
            dateAdded: node.dateAdded,
            dateGroupModified: node.dateGroupModified,
            parentId: node.parentId,
            folderPath: folderPath.join(' > '), // 添加文件夹路径
            folderName: folderPath[folderPath.length - 1] || '未分类' // 直接父文件夹名
          });
        }
        if (node.children) {
          const newPath = node.title ? [...folderPath, node.title] : folderPath;
          traverse(node.children, newPath);
        }
      }
    };

    traverse(tree);
    this.flatBookmarks = bookmarks;
    return bookmarks;
  }

  // 搜索书签
  async searchBookmarks(query) {
    try {
      const results = await chrome.bookmarks.search(query);
      return results.filter(bookmark => bookmark.url); // 只返回有 URL 的书签
    } catch (error) {
      console.error('Error searching bookmarks:', error);
      return [];
    }
  }

  // 创建书签
  async createBookmark(bookmark) {
    try {
      const created = await chrome.bookmarks.create(bookmark);
      return created;
    } catch (error) {
      console.error('Error creating bookmark:', error);
      return null;
    }
  }

  // 更新书签
  async updateBookmark(id, changes) {
    try {
      const updated = await chrome.bookmarks.update(id, changes);
      return updated;
    } catch (error) {
      console.error('Error updating bookmark:', error);
      return null;
    }
  }

  // 删除书签
  async deleteBookmark(id) {
    try {
      await chrome.bookmarks.remove(id);
      return true;
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      return false;
    }
  }

  // 移动书签
  async moveBookmark(id, destination) {
    try {
      const moved = await chrome.bookmarks.move(id, destination);
      return moved;
    } catch (error) {
      console.error('Error moving bookmark:', error);
      return null;
    }
  }

  // 创建文件夹
  async createFolder(title, parentId) {
    try {
      const folder = await chrome.bookmarks.create({
        title: title,
        parentId: parentId
      });
      return folder;
    } catch (error) {
      console.error('Error creating folder:', error);
      return null;
    }
  }

  // 获取书签的完整路径
  async getBookmarkPath(id) {
    const path = [];
    let currentId = id;

    try {
      while (currentId) {
        const [node] = await chrome.bookmarks.get(currentId);
        if (!node) break;
        
        path.unshift(node.title);
        currentId = node.parentId;
        
        // 避免无限循环
        if (currentId === '0') break;
      }
      return path.join(' > ');
    } catch (error) {
      console.error('Error getting bookmark path:', error);
      return '';
    }
  }

  // 检查 URL 是否已存在
  async urlExists(url) {
    try {
      const results = await chrome.bookmarks.search({ url });
      return results.length > 0;
    } catch (error) {
      console.error('Error checking URL:', error);
      return false;
    }
  }

  // 查找重复的书签
  async findDuplicates() {
    const bookmarks = await this.getFlatBookmarks();
    const urlMap = new Map();
    const duplicates = [];

    for (const bookmark of bookmarks) {
      if (urlMap.has(bookmark.url)) {
        urlMap.get(bookmark.url).push(bookmark);
      } else {
        urlMap.set(bookmark.url, [bookmark]);
      }
    }

    for (const [url, items] of urlMap.entries()) {
      if (items.length > 1) {
        duplicates.push({
          url,
          bookmarks: items
        });
      }
    }

    return duplicates;
  }

  // 导出书签为 JSON
  async exportToJSON() {
    const tree = await this.getBookmarkTree();
    return JSON.stringify(tree, null, 2);
  }

  // 导出书签为 HTML (Netscape Bookmark Format)
  async exportToHTML() {
    const tree = await this.getBookmarkTree();
    
    let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
    html += '<!-- This is an automatically generated file.\n';
    html += '     It will be read and overwritten.\n';
    html += '     DO NOT EDIT! -->\n';
    html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
    html += '<TITLE>Bookmarks</TITLE>\n';
    html += '<H1>Bookmarks</H1>\n';
    html += '<DL><p>\n';

    const traverse = (nodes, indent = 1) => {
      let result = '';
      const indentStr = '    '.repeat(indent);

      for (const node of nodes) {
        if (node.url) {
          const addDate = node.dateAdded ? Math.floor(node.dateAdded / 1000) : '';
          result += `${indentStr}<DT><A HREF="${node.url}" ADD_DATE="${addDate}">${node.title || node.url}</A>\n`;
        } else if (node.children) {
          result += `${indentStr}<DT><H3 ADD_DATE="${Math.floor((node.dateAdded || 0) / 1000)}">${node.title}</H3>\n`;
          result += `${indentStr}<DL><p>\n`;
          result += traverse(node.children, indent + 1);
          result += `${indentStr}</DL><p>\n`;
        }
      }

      return result;
    };

    html += traverse(tree);
    html += '</DL><p>\n';

    return html;
  }

  // 获取书签统计信息
  async getStatistics() {
    const bookmarks = await this.getFlatBookmarks();
    const tree = await this.getBookmarkTree();

    const countFolders = (nodes) => {
      let count = 0;
      for (const node of nodes) {
        if (node.children) {
          count++;
          count += countFolders(node.children);
        }
      }
      return count;
    };

    return {
      totalBookmarks: bookmarks.length,
      totalFolders: countFolders(tree),
      oldestBookmark: bookmarks.length > 0 
        ? Math.min(...bookmarks.map(b => b.dateAdded)) 
        : null,
      newestBookmark: bookmarks.length > 0 
        ? Math.max(...bookmarks.map(b => b.dateAdded)) 
        : null
    };
  }

  // 检测失效的书签（本地链接、临时链接等）
  async findInvalidBookmarks() {
    const bookmarks = await this.getFlatBookmarks();
    
    const invalidPatterns = [
      /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/i, // 本地链接
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?/i, // 局域网链接
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?/i, // 内网链接
      /^file:\/\//i, // 文件链接
      /^chrome:\/\//i, // Chrome 内部链接
      /^chrome-extension:\/\//i, // 扩展链接
      /^about:/i, // about 页面
      /temp|tmp|test|example\.com|placeholder/i, // 临时/测试链接
    ];

    const invalidBookmarks = bookmarks.filter(bookmark => {
      return invalidPatterns.some(pattern => pattern.test(bookmark.url));
    });

    return invalidBookmarks;
  }

  // 批量删除书签
  async deleteBookmarks(bookmarkIds) {
    const results = {
      success: [],
      failed: []
    };

    for (const id of bookmarkIds) {
      try {
        await chrome.bookmarks.remove(id);
        results.success.push(id);
      } catch (error) {
        console.error(`Failed to delete bookmark ${id}:`, error);
        results.failed.push({ id, error: error.message });
      }
    }

    return results;
  }
}

// 创建单例
const bookmarkManager = new BookmarkManager();

// 如果在浏览器环境中，导出到全局
if (typeof window !== 'undefined') {
  window.BookmarkManager = bookmarkManager;
}
