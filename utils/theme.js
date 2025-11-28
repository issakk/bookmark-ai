// 主题管理系统 - 固定深色主题
class ThemeManager {
  constructor() {
    this.init();
  }

  // 初始化 - 固定应用深色主题
  async init() {
    this.applyDarkTheme();
  }

  // 应用深色主题
  applyDarkTheme() {
    // 移除所有主题类
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    
    // 添加深色主题类
    document.documentElement.classList.add('theme-dark');
    
    // 设置 data 属性（用于 CSS 选择器）
    document.documentElement.setAttribute('data-theme', 'dark');
    
    // 更新 meta theme-color
    this.updateMetaThemeColor();
  }

  // 更新 meta theme-color
  updateMetaThemeColor() {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    
    // 设置深色主题颜色
    metaThemeColor.content = '#1f2937';
  }
}

// 导出单例
window.ThemeManager = new ThemeManager();
