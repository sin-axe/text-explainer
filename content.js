if (typeof window.textExplainerInjected === 'undefined') {
  window.textExplainerInjected = true;

  window.textExplainerData = {
    explainButton: null,
    tooltip: null,
    isButtonVisible: false,
    isTooltipVisible: false,
    lastSelectedText: '',
    currentSelectedText: '',
    selectionRect: null
  };

  function isPDFViewer() {
    return window.location.href.includes('.pdf') ||
      document.querySelector('embed[type="application/pdf"]') !== null ||
      document.querySelector('object[type="application/pdf"]') !== null;
  }

  function createExplainButton() {
    if (window.textExplainerData.explainButton) return;
    window.textExplainerData.explainButton = document.createElement('button');
    window.textExplainerData.explainButton.className = 'text-explainer-button';
    window.textExplainerData.explainButton.textContent = 'Explain';
    window.textExplainerData.explainButton.addEventListener('click', handleExplainClick);
    document.body.appendChild(window.textExplainerData.explainButton);
  }

  function createTooltip() {
    if (window.textExplainerData.tooltip) return;
    window.textExplainerData.tooltip = document.createElement('div');
    window.textExplainerData.tooltip.className = 'text-explainer-tooltip';
    document.body.appendChild(window.textExplainerData.tooltip);
  }

  function getButtonPosition(rect) {
    const buttonWidth = 60;
    const buttonHeight = 30;
    const offset = 5;
    let x = rect.left + (rect.width / 2) - (buttonWidth / 2);
    let y = rect.top - buttonHeight - offset;
    const viewportWidth = window.innerWidth;
    if (x < 5) x = 5;
    if (x + buttonWidth > viewportWidth - 5) x = viewportWidth - buttonWidth - 5;
    if (y < 5) {
      y = rect.bottom + offset;
    }
    return { x, y };
  }

  // Show explain button
  function showExplainButton(rect) {
    createExplainButton();
    window.textExplainerData.selectionRect = rect;
    const pos = getButtonPosition(rect);
    window.textExplainerData.explainButton.style.left = pos.x + 'px';
    window.textExplainerData.explainButton.style.top = pos.y + 'px';
    window.textExplainerData.explainButton.classList.add('visible');
    window.textExplainerData.isButtonVisible = true;
  }

  function hideExplainButton() {
    if (window.textExplainerData.explainButton && window.textExplainerData.isButtonVisible) {
      window.textExplainerData.explainButton.classList.remove('visible');
      window.textExplainerData.isButtonVisible = false;
    }
  }

  function handleExplainClick(e) {
    e.stopPropagation();
    if (!window.textExplainerData.currentSelectedText) return;
    chrome.runtime.sendMessage({
      action: 'explainTextStreaming',
      text: window.textExplainerData.currentSelectedText
    });
    hideExplainButton();
  }

  function showTooltip(x, y, text) {
    createTooltip();
    window.textExplainerData.tooltip.innerHTML = `
      <div class="text-explainer-loading">Getting explanation...</div>
    `;
    window.textExplainerData.tooltip.style.left = x + 'px';
    window.textExplainerData.tooltip.style.top = y + 'px';
    window.textExplainerData.tooltip.style.transform = 'translateX(-50%)';
    setTimeout(() => {
      const tooltipRect = window.textExplainerData.tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      if (tooltipRect.left < 5) {
        window.textExplainerData.tooltip.style.left = (x - tooltipRect.left + 5) + 'px';
      } else if (tooltipRect.right > viewportWidth - 5) {
        window.textExplainerData.tooltip.style.left = (x - (tooltipRect.right - viewportWidth + 5)) + 'px';
      }
    }, 0);

    window.textExplainerData.tooltip.classList.add('visible');
    window.textExplainerData.isTooltipVisible = true;
    chrome.runtime.sendMessage({ action: 'explainText', text: text }, function (response) {
      if (response && response.error) {
        window.textExplainerData.tooltip.innerHTML = `<div class="text-explainer-error">${response.error}</div>`;
      } else if (response && response.explanation) {
        window.textExplainerData.tooltip.innerHTML = `<div class="text-explainer-content">${response.explanation}</div>`;
      } else {
        window.textExplainerData.tooltip.innerHTML = `<div class="text-explainer-error">Failed to get explanation</div>`;
      }
    });
  }

  function hideTooltip() {
    if (window.textExplainerData.tooltip && window.textExplainerData.isTooltipVisible) {
      window.textExplainerData.tooltip.classList.remove('visible');
      window.textExplainerData.isTooltipVisible = false;
    }
  }

  function handleSelection(e) {
    if (e && (e.target.closest('.text-explainer-button') || e.target.closest('.text-explainer-tooltip'))) return;
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText && selectedText !== window.textExplainerData.lastSelectedText) {
      window.textExplainerData.lastSelectedText = selectedText;
      window.textExplainerData.currentSelectedText = selectedText;
      hideTooltip();
      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        showExplainButton(rect);
      } catch (err) {
        console.error('Error getting selection coordinates:', err);
      }
    } else if (!selectedText) {
      hideExplainButton();
      hideTooltip();
      window.textExplainerData.lastSelectedText = '';
      window.textExplainerData.currentSelectedText = '';
      window.textExplainerData.selectionRect = null;
    }
  }

  document.addEventListener('mouseup', handleSelection);
  document.addEventListener('selectionchange', function () {
    if (isPDFViewer()) {
      setTimeout(handleSelection, 100);
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.text-explainer-button') &&
      !e.target.closest('.text-explainer-tooltip') &&
      !window.getSelection().toString().trim()) {
      hideExplainButton();
      hideTooltip();
    }
  });

  document.addEventListener('scroll', function () {
    hideExplainButton();
    hideTooltip();
  });

  window.addEventListener('beforeunload', function () {
    if (window.textExplainerData.explainButton) {
      window.textExplainerData.explainButton.remove();
    }
    if (window.textExplainerData.tooltip) {
      window.textExplainerData.tooltip.remove();
    }
  });

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'showExplanation') {
      const selection = window.getSelection();
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;
      if (selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.bottom + 10;
        } catch (e) {
          // Use center position if range fails
        }
      }
      createTooltip();
      if (window.textExplainerData.tooltip) {
        window.textExplainerData.tooltip.innerHTML = `<div class="text-explainer-content">${request.explanation}</div>`;
        window.textExplainerData.tooltip.style.left = x + 'px';
        window.textExplainerData.tooltip.style.top = y + 'px';
        window.textExplainerData.tooltip.style.transform = 'translateX(-50%)';
        window.textExplainerData.tooltip.classList.add('visible');
        window.textExplainerData.isTooltipVisible = true;
        setTimeout(() => {
          hideTooltip();
        }, 10000);
      }
    }
  });
}