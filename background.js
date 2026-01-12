// Background service worker for Hocus-Focus

let sessionActive = false;

// Initialize on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('Hocus-Focus installed');
  
  // Initialize storage
  chrome.storage.sync.get(['whitelist'], (result) => {
    if (!result.whitelist) {
      chrome.storage.sync.set({ whitelist: [] });
    }
  });
  
  chrome.storage.local.get(['sessionActive'], (result) => {
    if (!result.sessionActive) {
      chrome.storage.local.set({ sessionActive: false });
    }
  });
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sessionStarted') {
    sessionActive = true;
    console.log('Focus session started');
  } else if (message.action === 'sessionEnded') {
    sessionActive = false;
    console.log('Focus session ended');
  } else if (message.action === 'checkSession') {
    sendResponse({ sessionActive });
  }
  return true;
});

// Listen for alarm (session end)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'sessionEnd') {
    sessionActive = false;
    chrome.storage.local.set({
      sessionActive: false,
      sessionEnd: null
    });
    console.log('Focus session completed');
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'Hocus-Focus',
      message: 'Focus session completed! Great work! 🎉',
      priority: 2
    });
  }
});

// Check if URL is in whitelist
async function isUrlAllowed(url) {
  try {
    const urlObj = new URL(url);
    
    // Always allow extension pages and special URLs
    if (urlObj.protocol === 'chrome:' || 
        urlObj.protocol === 'chrome-extension:' || 
        urlObj.protocol === 'about:' ||
        urlObj.protocol === 'edge:' ||
        urlObj.protocol === 'moz-extension:') {
      return true;
    }

    const result = await chrome.storage.sync.get(['whitelist']);
    const whitelist = result.whitelist || [];
    
    if (whitelist.length === 0) {
      return true; // If whitelist is empty, allow all
    }

    const hostname = urlObj.hostname;
    
    // Check if domain or URL matches
    return whitelist.some(item => {
      // Match exact domain or subdomains
      if (hostname === item.domain || hostname.endsWith('.' + item.domain)) {
        return true;
      }
      // Match exact URL
      if (url === item.url) {
        return true;
      }
      return false;
    });
  } catch (error) {
    console.error('Error checking URL:', error);
    return true; // Allow on error
  }
}

// Listen for navigation events to block pages
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only check main frame navigation
  if (details.frameId !== 0) return;
  
  const sessionState = await chrome.storage.local.get(['sessionActive']);
  
  if (!sessionState.sessionActive) return;
  
  const allowed = await isUrlAllowed(details.url);
  
  if (!allowed) {
    // Send message to content script to block the page
    chrome.tabs.sendMessage(details.tabId, { 
      action: 'blockPage',
      url: details.url 
    }).catch(() => {
      // Content script might not be loaded yet, inject it
      chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ['content.js']
      });
    });
  }
});

// Listen for tab updates to recheck
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url) {
    const sessionState = await chrome.storage.local.get(['sessionActive']);
    
    if (!sessionState.sessionActive) return;
    
    const allowed = await isUrlAllowed(tab.url);
    
    if (!allowed) {
      chrome.tabs.sendMessage(tabId, { 
        action: 'blockPage',
        url: tab.url 
      }).catch(() => {
        // Ignore if content script not ready
      });
    }
  }
});
