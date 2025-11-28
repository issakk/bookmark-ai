# AI Bookmark Manager

> AI-powered bookmark manager for Chrome/Edge - Automatically classify, organize and search your bookmarks with AI

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-blue.svg)](https://www.google.com/chrome/)

## ✨ Features

- 🤖 **AI Classification** - Automatically categorize bookmarks using OpenAI
- 🔍 **Smart Search** - Semantic search powered by AI
- 📁 **Organized View** - Tree structure with categories and tags
- ⚡ **Quick Save** - Save bookmarks with keyboard shortcuts
- 🎨 **Modern UI** - Clean interface with dark/light themes
- � **i18n Support** - Multi-language support (English & Chinese)
- 📤 **Import/Export** - Backup and restore your data

## 🚀 Installation

### From Source

1. Clone this repository
```bash
git clone https://github.com/simonguo/bookmark-ai.git
cd bookmark-ai/bookmark-ai-extension
```

2. Open Chrome/Edge and navigate to `chrome://extensions/`

3. Enable "Developer mode"

4. Click "Load unpacked" and select the `bookmark-ai-extension` folder

## ⚙️ Configuration

1. Click the extension icon to open settings
2. Enter your OpenAI API Key
   - Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
3. Select a model (recommended: `gpt-4o-mini` for best value)
4. Click "Test Connection" to verify
5. Click "Save Settings"

## 📖 Usage

### Save Bookmarks
- **Keyboard**: `Cmd+Shift+S` (Mac) or `Ctrl+Shift+S` (Windows)
- **Sidebar**: Click "Save Current Page" button
- **Browser**: Use native bookmark function

### View Bookmarks
- Click extension icon to open sidebar
- Bookmarks are organized by folders/categories
- Click to expand/collapse folders
- Click bookmark to open

### AI Classification
1. Open sidebar
2. Click "AI Classify" button
3. Wait for AI to process
4. Bookmarks are automatically categorized

### Search
- **Keyword Search**: Type in search box
- **AI Search**: Enable "AI Search" for semantic search
- **Filter**: Use category/tag dropdowns

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript, HTML, CSS
- **AI**: OpenAI API (GPT-4o-mini)
- **Storage**: Chrome Storage API
- **Icons**: Lucide Icons

## 📝 Development

```bash
# Install dependencies (if any)
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

## 🔒 Privacy

- All data is stored locally in your browser
- API key is encrypted
- No data is sent to external servers (except OpenAI when using AI features)
- Open source - you can verify the code

## 💰 Cost

Using `gpt-4o-mini` model:
- Classifying 100 bookmarks: ~$0.01-0.02
- Very affordable for personal use

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 👤 Author

**Simon Guo**
- GitHub: [@simonguo](https://github.com/simonguo)
- Email: simonguo.2009@gmail.com

## 🙏 Acknowledgments

- OpenAI for the powerful AI API
- Lucide for the beautiful icons
- All contributors and users

---

Made with ❤️ by Simon Guo
