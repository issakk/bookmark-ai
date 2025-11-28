// 国际化系统
class I18n {
  constructor() {
    this.currentLocale = 'auto';
    this.translations = {};
    this.loadingPromise = null;
  }

  // 加载翻译文件
  async loadTranslations() {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        // 加载中文
        const zhResponse = await fetch(chrome.runtime.getURL('locales/zh-CN.json'));
        const zhData = await zhResponse.json();
        this.translations['zh-CN'] = this.flattenObject(zhData);

        // 加载英文
        const enResponse = await fetch(chrome.runtime.getURL('locales/en-US.json'));
        const enData = await enResponse.json();
        this.translations['en-US'] = this.flattenObject(enData);
        
        console.log('Translations loaded successfully');
      } catch (error) {
        console.error('Failed to load translations:', error);
        // 如果加载失败，设置空对象避免错误
        this.translations = {
          'zh-CN': {},
          'en-US': {}
        };
      }
    })();

    return this.loadingPromise;
  }

  // 将嵌套对象展开为点分隔的键
  flattenObject(obj, prefix = '') {
    const flattened = {};
    
    for (const key in obj) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, this.flattenObject(value, newKey));
      } else {
        flattened[newKey] = value;
      }
    }
    
    return flattened;
  }

  // 获取浏览器语言
  getBrowserLocale() {
    const lang = navigator.language || navigator.userLanguage;
    console.log('Browser language:', lang);
    if (lang.startsWith('zh')) {
      return 'zh-CN';
    }
    return 'en-US';
  }

  // 获取当前语言
  async getCurrentLocale() {
    if (this.currentLocale === 'auto') {
      // 从存储中读取用户设置
      const data = await chrome.storage.sync.get(['language']);
      console.log('Stored language:', data.language);
      if (data.language && data.language !== 'auto') {
        return data.language;
      }
      return this.getBrowserLocale();
    }
    return this.currentLocale;
  }

  // 设置语言
  async setLocale(locale) {
    this.currentLocale = locale;
    await chrome.storage.sync.set({ language: locale });
    await this.translatePage();
  }

  // 获取翻译
  async t(key, defaultValue = key, params = {}) {
    const locale = await this.getCurrentLocale();
    let translation = this.translations[locale]?.[key] || defaultValue;
    
    // 替换占位符
    Object.keys(params).forEach(param => {
      translation = translation.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
    });
    
    return translation;
  }

  // 翻译页面
  async translatePage() {
    const locale = await this.getCurrentLocale();
    const translations = this.translations[locale];
    
    console.log('Translating page to:', locale);
    console.log('Available translations:', Object.keys(translations || {}).length);
    
    if (!translations) {
      console.warn(`Translations not found for locale: ${locale}`);
      return;
    }

    // 翻译所有带 data-i18n 属性的元素
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      const translation = translations[key];
      
      if (translation) {
        // 根据元素类型设置文本
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          if (element.placeholder !== undefined) {
            element.placeholder = translation;
          } else {
            element.value = translation;
          }
        } else if (element.tagName === 'IMG') {
          element.alt = translation;
        } else if (element.hasAttribute('title')) {
          element.title = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    // 翻译所有带 data-i18n-placeholder 属性的元素
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      const translation = translations[key];
      if (translation) {
        element.placeholder = translation;
      }
    });

    // 翻译所有带 data-i18n-title 属性的元素
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
      const key = element.getAttribute('data-i18n-title');
      const translation = translations[key];
      if (translation) {
        element.title = translation;
      }
    });
  }

  // 初始化
  async init() {
    console.log('Initializing i18n...');
    
    // 加载翻译文件
    await this.loadTranslations();
    
    // 从存储中读取用户设置
    const data = await chrome.storage.sync.get(['language']);
    if (data.language) {
      this.currentLocale = data.language;
    } else {
      // 如果没有设置，默认为 auto（跟随系统）
      this.currentLocale = 'auto';
      await chrome.storage.sync.set({ language: 'auto' });
    }
    
    console.log('Current locale:', this.currentLocale);
    
    // 翻译页面
    await this.translatePage();
  }
}

// 导出单例
window.I18n = new I18n();

// 页面加载时自动初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.I18n.init();
  });
} else {
  window.I18n.init();
}
