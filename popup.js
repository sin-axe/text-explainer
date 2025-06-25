const DEFAULT_MODEL = 'google/gemini-2.5-flash';
const DEFAULT_PROMPT = `Explain the following text clearly and concisely. If it's a single word, provide its definition and usage. If it's a phrase or sentence, explain its meaning and context. Keep the explanation brief and easy to understand.

Text to explain: "{text}"`;

document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const modelNameInput = document.getElementById('modelName');
  const customPromptInput = document.getElementById('customPrompt');
  const saveButton = document.getElementById('saveButton');
  const resetButton = document.getElementById('resetButton');
  const statusDiv = document.getElementById('status');

  chrome.storage.sync.get(['openRouterApiKey', 'modelName', 'customPrompt'], function(data) {
    if (data.openRouterApiKey) {
      apiKeyInput.value = data.openRouterApiKey;
    }
    modelNameInput.value = data.modelName || DEFAULT_MODEL;
    customPromptInput.value = data.customPrompt || DEFAULT_PROMPT;
  });

  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    const modelName = modelNameInput.value.trim() || DEFAULT_MODEL;
    const customPrompt = customPromptInput.value.trim() || DEFAULT_PROMPT;
    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }
    if (!customPrompt.includes('{text}')) {
      showStatus('Prompt must include {text} placeholder', 'error');
      return;
    }
    chrome.storage.sync.set({ 
      openRouterApiKey: apiKey,
      modelName: modelName,
      customPrompt: customPrompt
    }, function() {
      showStatus('Settings saved successfully!', 'success');
      chrome.runtime.sendMessage({ action: 'settingsUpdated' });
    });
  });

  resetButton.addEventListener('click', function() {
    modelNameInput.value = DEFAULT_MODEL;
    customPromptInput.value = DEFAULT_PROMPT;
    showStatus('Reset to default values', 'success');
  });

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
    statusDiv.style.display = 'block';
    setTimeout(function() {
      statusDiv.style.display = 'none';
    }, 3000);
  }
});