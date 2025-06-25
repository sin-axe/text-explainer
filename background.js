console.log('BACKGROUND SCRIPT LOADED');

let apiKey = null;
let modelName = 'google/gemini-2.5-flash';
let customPrompt = `Explain the following text clearly and concisely. If it's a single word, provide its definition and usage. If it's a phrase or sentence, explain its meaning and context. Keep the explanation brief and easy to understand.

Text to explain: "{text}"`;

// Load settings from storage
function loadSettings() {
  chrome.storage.sync.get(['openRouterApiKey', 'modelName', 'customPrompt'], function (data) {
    if (data.openRouterApiKey) {
      apiKey = data.openRouterApiKey;
    }
    if (data.modelName) {
      modelName = data.modelName;
    }
    if (data.customPrompt) {
      customPrompt = data.customPrompt;
    }
  });
}

// Initial load
loadSettings();

// Create context menu
function createContextMenu() {
  console.log('Creating context menu...');
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "explainSelection",
      title: "Explain selected text",
      contexts: ["selection"],
      documentUrlPatterns: [
        "https://*/*",
        "http://*/*",
        "file://*/*",
        "chrome-extension://*/*"
      ]
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error creating context menu:', chrome.runtime.lastError);
      } else {
        console.log('Context menu created successfully');
      }
    });
  });
}

// Create context menu on install and startup
chrome.runtime.onInstalled.addListener(createContextMenu);
chrome.runtime.onStartup.addListener(createContextMenu);

// Also create immediately when script loads
createContextMenu();

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log('Context menu clicked:', info.menuItemId, 'Selected text:', info.selectionText);

  if (info.menuItemId === "explainSelection" && info.selectionText) {
    console.log('Processing explanation request...');

    // Check if API key is loaded
    if (!apiKey) {
      console.log('No API key found');
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Error',
        message: 'Please set your OpenRouter API key in the extension settings.',
        priority: 2
      });
      return;
    }

    console.log('API key found, getting explanation...');

    // Show immediate notification that we're processing
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Text Explainer',
      message: 'Getting explanation for: ' + info.selectionText.substring(0, 50) + '...',
      priority: 1
    });

    // Use streaming explanation window
    createStreamingExplanationWindow(info.selectionText);
  }
});

// Create a streaming explanation window
function createStreamingExplanationWindow(selectedText) {
  const windowWidth = 800;
  const windowHeight = 600;
  const explanationId = Date.now().toString();

  // Mark this as a streaming session
  chrome.storage.local.set({ [`streaming_${explanationId}`]: true });

  // Get current window to center the popup
  chrome.windows.getCurrent((currentWindow) => {
    const left = currentWindow.left + Math.round((currentWindow.width - windowWidth) / 2);
    const top = currentWindow.top + Math.round((currentWindow.height - windowHeight) / 2);

    chrome.windows.create({
      url: chrome.runtime.getURL(`explanation.html?id=${explanationId}`),
      type: 'popup',
      width: windowWidth,
      height: windowHeight,
      left: left,
      top: top,
      focused: true
    }, (window) => {
      // Start streaming explanation
      if (window && window.tabs && window.tabs[0]) {
        const tabId = window.tabs[0].id;

        explainTextStreaming(
          selectedText,
          (token) => {
            chrome.tabs.sendMessage(tabId, {
              action: 'streamToken',
              token: token
            }).catch(() => {
              // Tab might be closed, ignore errors
            });
          },
          (complete) => {
            // Send completion signal
            chrome.tabs.sendMessage(tabId, {
              action: 'streamComplete'
            }).catch(() => {
              // Tab might be closed, ignore errors
            });
            chrome.storage.local.remove(`streaming_${explanationId}`);
          },
          (error) => {
            chrome.tabs.sendMessage(tabId, {
              action: 'streamError',
              error: error.message || 'Failed to get explanation'
            }).catch(() => {
              // Tab might be closed, ignore errors
            });
            chrome.storage.local.remove(`streaming_${explanationId}`);
          }
        );
      }
    });
  });
}

function createExplanationWindow(selectedText, explanation) {
  const windowWidth = 800;
  const windowHeight = 600;

  const escapeHtml = (text) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Text Explanation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f8f9fa;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 100%;
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      height: calc(100vh - 40px);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }
    .header {
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 20px;
      font-weight: 600;
      color: #4CAF50;
      margin: 0;
    }
    .selected-text {
      background: #f8f9fa;
      border-left: 4px solid #4CAF50;
      padding: 16px;
      margin: 16px 0;
      border-radius: 8px;
      font-style: italic;
      color: #495057;
      word-wrap: break-word;
    }
    .selected-text-label {
      font-size: 14px;
      font-weight: 600;
      color: #666;
      margin-bottom: 8px;
    }
    .explanation {
      flex: 1;
      overflow-y: auto;
      padding: 16px 0;
    }
    .explanation-content {
      font-size: 16px;
      line-height: 1.7;
      color: #333;
      word-wrap: break-word;
    }
    .footer {
      border-top: 1px solid #e9ecef;
      padding-top: 16px;
      margin-top: 20px;
      text-align: center;
    }
    .close-btn {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }
    .close-btn:hover {
      background: #5a6268;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">Text Explanation</h1>
    </div>
    
    <div class="selected-text">
      <div class="selected-text-label">Selected Text:</div>
      <div>${escapeHtml(selectedText)}</div>
    </div>
    
    <div class="explanation">
      <div class="explanation-content">${escapeHtml(explanation).replace(/\n/g, '<br>')}</div>
    </div>
    
    <div class="footer">
      <button class="close-btn" onclick="window.close()">Close</button>
    </div>
  </div>

  <script>
    // Close window on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        window.close();
      }
    });
    
    // Auto-focus the window
    window.focus();
  </script>
</body>
</html>`;

  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);

  chrome.windows.getCurrent((currentWindow) => {
    const left = currentWindow.left + Math.round((currentWindow.width - windowWidth) / 2);
    const top = currentWindow.top + Math.round((currentWindow.height - windowHeight) / 2);

    chrome.windows.create({
      url: dataUrl,
      type: 'popup',
      width: windowWidth,
      height: windowHeight,
      left: left,
      top: top,
      focused: true
    });
  });
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'settingsUpdated' || request.action === 'apiKeyUpdated') {
    loadSettings();
  } else if (request.action === 'explainText') {
    if (!apiKey) {
      sendResponse({ error: 'Please set your OpenRouter API key in the extension settings.' });
      return;
    }

    explainText(request.text)
      .then(explanation => sendResponse({ explanation }))
      .catch(error => sendResponse({ error: error.message }));

    return true;
  } else if (request.action === 'explainTextStreaming') {
    if (!apiKey) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon48.png',
        title: 'Error',
        message: 'Please set your OpenRouter API key in the extension settings.',
        priority: 2
      });
      return;
    }

    createStreamingExplanationWindow(request.text);
  }
});

async function explainTextStreaming(text, onToken, onComplete, onError) {
  const prompt = customPrompt.replace('{text}', text);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'Text Explainer Assistant',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
        stream: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to get explanation');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onComplete(fullContent);
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);

          if (data === '[DONE]') {
            onComplete(fullContent);
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              onToken(content);
            }
          } catch (e) {
            // Skip invalid JSON lines
          }
        }
      }
    }
  } catch (error) {
    console.error('Error explaining text:', error);
    onError(error);
  }
}

async function explainText(text) {
  return new Promise((resolve, reject) => {
    let fullText = '';
    explainTextStreaming(
      text,
      (token) => { fullText += token; },
      (complete) => { resolve(complete); },
      (error) => { reject(error); }
    );
  });
}