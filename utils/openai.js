// OpenAI API 集成类
class OpenAIService {
  constructor() {
    this.apiKey = '';
    this.model = 'gpt-4o-mini';
    this.baseURL = 'https://api.openai.com/v1';
  }

  // 初始化配置
  async initialize() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const data = await chrome.storage.local.get(['openaiKey', 'openaiModel', 'openaiBaseURL']);
      this.apiKey = data.openaiKey || '';
      this.model = data.openaiModel || 'gpt-4o-mini';
      this.baseURL = data.openaiBaseURL || 'https://api.openai.com/v1';
    }
  }

  // 设置 API Key
  setApiKey(key) {
    this.apiKey = key;
  }

  // 设置模型
  setModel(model) {
    this.model = model;
  }

  // 设置 Base URL
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
  }

  // 检查配置是否有效
  isConfigured() {
    return this.apiKey && this.apiKey.length > 0;
  }

  // 调用 OpenAI Chat Completion API
  async chatCompletion(messages, options = {}) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API Key 未配置');
    }

    const requestBody = {
      model: options.model || this.model,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 2000,
      ...options
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  // 为书签生成分类和标签
  async classifyBookmark(bookmark) {
    const prompt = `请分析以下书签并提供分类和标签建议。

书签信息：
标题: ${bookmark.title}
URL: ${bookmark.url}

请以 JSON 格式返回结果，包含以下字段：
- category: 主要分类（如：技术、新闻、娱乐、购物、教育、工具等）
- tags: 标签数组（3-5个相关标签）
- description: 简短描述（一句话）

只返回 JSON，不要其他内容。`;

    try {
      const response = await this.chatCompletion([
        { role: 'system', content: '你是一个专业的书签分类助手，擅长分析网站内容并提供准确的分类和标签。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.3 });

      // 尝试解析 JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('无法解析 AI 响应');
    } catch (error) {
      console.error('Classify bookmark error:', error);
      // 返回默认值
      return {
        category: '未分类',
        tags: [],
        description: bookmark.title
      };
    }
  }

  // 批量分类书签
  async classifyBookmarks(bookmarks, onProgress) {
    const results = [];
    const total = bookmarks.length;

    for (let i = 0; i < total; i++) {
      const bookmark = bookmarks[i];
      
      try {
        const classification = await this.classifyBookmark(bookmark);
        results.push({
          bookmarkId: bookmark.id,
          ...classification
        });

        if (onProgress) {
          onProgress(i + 1, total);
        }

        // 避免触发速率限制，添加延迟
        if (i < total - 1) {
          await this.delay(500);
        }
      } catch (error) {
        console.error(`Error classifying bookmark ${bookmark.id}:`, error);
        results.push({
          bookmarkId: bookmark.id,
          category: '未分类',
          tags: [],
          description: bookmark.title,
          error: error.message
        });
      }
    }

    return results;
  }

  // 智能搜索书签
  async semanticSearch(query, bookmarks) {
    if (!bookmarks || bookmarks.length === 0) {
      return [];
    }

    const bookmarkList = bookmarks.map((b, i) => 
      `${i + 1}. ${b.title} - ${b.url}`
    ).join('\n');

    const prompt = `用户搜索: "${query}"

书签列表：
${bookmarkList}

请根据用户的搜索意图，返回最相关的书签编号（最多10个），按相关性排序。
只返回编号数组的 JSON 格式，例如: [1, 5, 3]`;

    try {
      const response = await this.chatCompletion([
        { role: 'system', content: '你是一个智能搜索助手，能够理解用户意图并找到最相关的书签。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.3 });

      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const indices = JSON.parse(jsonMatch[0]);
        return indices.map(i => bookmarks[i - 1]).filter(Boolean);
      }

      return [];
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  // 生成书签摘要
  async generateSummary(bookmark) {
    const prompt = `请为以下书签生成一个简短的摘要（不超过100字）：

标题: ${bookmark.title}
URL: ${bookmark.url}

只返回摘要文本，不要其他内容。`;

    try {
      const response = await this.chatCompletion([
        { role: 'system', content: '你是一个专业的内容摘要助手。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.5, max_tokens: 200 });

      return response.trim();
    } catch (error) {
      console.error('Generate summary error:', error);
      return bookmark.title;
    }
  }

  // 检测失效链接（基于 URL 模式分析）
  async detectBrokenLinks(bookmarks) {
    const suspiciousPatterns = [
      /\d{4,}/, // 包含长数字串
      /temp|tmp|test/i, // 临时链接
      /localhost|127\.0\.0\.1/, // 本地链接
    ];

    const suspicious = bookmarks.filter(bookmark => {
      return suspiciousPatterns.some(pattern => pattern.test(bookmark.url));
    });

    return suspicious;
  }

  // 推荐相关书签
  async recommendRelated(currentBookmark, allBookmarks, limit = 5) {
    const bookmarkList = allBookmarks
      .filter(b => b.id !== currentBookmark.id)
      .slice(0, 50) // 限制数量以避免 token 超限
      .map((b, i) => `${i + 1}. ${b.title} - ${b.url}`)
      .join('\n');

    const prompt = `当前书签：
标题: ${currentBookmark.title}
URL: ${currentBookmark.url}

其他书签：
${bookmarkList}

请推荐与当前书签最相关的 ${limit} 个书签编号，按相关性排序。
只返回编号数组的 JSON 格式，例如: [1, 5, 3]`;

    try {
      const response = await this.chatCompletion([
        { role: 'system', content: '你是一个智能推荐助手。' },
        { role: 'user', content: prompt }
      ], { temperature: 0.3 });

      const jsonMatch = response.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const indices = JSON.parse(jsonMatch[0]);
        return indices
          .map(i => allBookmarks.filter(b => b.id !== currentBookmark.id)[i - 1])
          .filter(Boolean)
          .slice(0, limit);
      }

      return [];
    } catch (error) {
      console.error('Recommend related error:', error);
      return [];
    }
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建单例
const openaiService = new OpenAIService();

// 如果在浏览器环境中，导出到全局
if (typeof window !== 'undefined') {
  window.OpenAIService = openaiService;
}
