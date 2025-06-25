# Text Explainer Assistant

A Chrome extension that provides AI-powered explanations for selected text on any webpage or PDF. Simply select any text and get instant, clear explanations to help you read and understand better.

## Installation

1. **Download or Clone** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** by toggling the switch in the top right corner
4. **Click "Load unpacked"** and select the folder containing this extension
5. **Configure your API key** by clicking the extension icon and entering your OpenRouter API key

## Setup

### Getting an API Key

1. Visit [OpenRouter](https://openrouter.ai/keys) to create an account and get your API key
2. Click the extension icon in your Chrome toolbar
3. Enter your API key in the settings popup
4. Optionally customize the AI model and prompt
5. Click "Save Settings"

### Available Models

The extension supports any model available on OpenRouter. The default model is `google/gemini-2.5-flash`. You can find other available models at [openrouter.ai/models](https://openrouter.ai/models).

## Usage

1. **Select Text**: Highlight any text on a webpage or PDF
2. **Right-click**: Access the context menu and select "Explain selected text"
3. **View Explanation**: A popup window will appear with the AI explanation streaming in real-time
4. **Close**: Press Escape or click the Close button when done

## Customization

### Custom Prompts

You can customize how the AI explains text by modifying the prompt template in the extension settings. Use `{text}` as a placeholder for the selected text.

**Default Prompt:**
```
Explain the following text clearly and concisely. If it's a single word, provide its definition and usage. If it's a phrase or sentence, explain its meaning and context. Keep the explanation brief and easy to understand.

Text to explain: "{text}"
```

### Model Selection

Choose from various AI models based on your needs.

## Permissions

The extension requires the following permissions:
- `storage`: Save your API key and settings
- `activeTab`: Access the current webpage
- `contextMenus`: Add right-click menu options
- `scripting`: Inject content scripts
- `tabs`: Manage explanation windows
- `notifications`: Show status notifications

## Privacy

- Your API key is stored locally in Chrome's sync storage
- Selected text is sent to OpenRouter's API for explanation
- No data is collected or stored by this extension beyond your settings
- All communication with OpenRouter uses HTTPS encryption


## Development

To modify or contribute to this extension:

1. Clone the repository
2. Make your changes
3. Load the unpacked extension in Chrome for testing
4. Test on various websites and PDFs
5. Submit a pull request with your improvements

## License

This project is open source. Please check the license file for details.

## Support

For issues, questions, or feature requests, please open an issue in the project repository.