let accumulatedText = '';
let isStreaming = false;
const contentElement = document.getElementById('explanationContent');

marked.setOptions({
  breaks: true,
  gfm: true,
  sanitize: false
});

function renderMarkdown(text) {
  return marked.parse(text);
}

function updateContent(text, showCursor = false) {
  const markdownHtml = renderMarkdown(text);
  contentElement.innerHTML = markdownHtml + (showCursor ? '<span class="cursor"></span>' : '');
  contentElement.scrollTop = contentElement.scrollHeight;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'streamToken') {
    isStreaming = true;
    accumulatedText += message.token;
    updateContent(accumulatedText, true);
  } else if (message.action === 'streamComplete') {
    isStreaming = false;
    updateContent(accumulatedText, false);
  } else if (message.action === 'streamError') {
    isStreaming = false;
    contentElement.innerHTML = '<div style="color: #dc3545; text-align: center;">Error: ' + message.error + '</div>';
  }
});

const urlParams = new URLSearchParams(window.location.search);
const explanationId = urlParams.get('id');

if (explanationId) {
  chrome.storage.local.get(`streaming_${explanationId}`, function(result) {
    if (result[`streaming_${explanationId}`]) {
      isStreaming = true;
      return;
    }
    chrome.storage.local.get(`explanation_${explanationId}`, function(result) {
      const data = result[`explanation_${explanationId}`];
      
      if (data) {
        accumulatedText = data.explanation || 'No explanation available';
        updateContent(accumulatedText, false);
        chrome.storage.local.remove(`explanation_${explanationId}`);
      } else {
        contentElement.innerHTML = '<div style="color: #dc3545; text-align: center;">Failed to load explanation data.</div>';
      }
    });
  });
} else {
  const selectedText = urlParams.get('text');
  const explanation = urlParams.get('explanation');
  if (selectedText && explanation) {
    accumulatedText = decodeURIComponent(explanation);
    updateContent(accumulatedText, false);
  } else {
    contentElement.innerHTML = '<div style="color: #dc3545; text-align: center;">No explanation data found.</div>';
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    window.close();
  }
});

window.focus();