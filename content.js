// Content script for blocking non-whitelisted pages during focus sessions

// Listen for block message from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'blockPage') {
    blockPage(message.url);
  }
});

// Check session state on load
checkAndBlockIfNeeded();

async function checkAndBlockIfNeeded() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'checkSession' });
    
    if (response && response.sessionActive) {
      // Check if current page is allowed
      const result = await chrome.storage.sync.get(['whitelist']);
      const whitelist = result.whitelist || [];
      
      const currentUrl = window.location.href;
      const hostname = window.location.hostname;
      
      // Skip special pages
      if (currentUrl.startsWith('chrome:') || 
          currentUrl.startsWith('chrome-extension:') || 
          currentUrl.startsWith('about:') ||
          currentUrl.startsWith('edge:') ||
          currentUrl.startsWith('moz-extension:')) {
        return;
      }

      // If whitelist is empty, allow all
      if (whitelist.length === 0) {
        return;
      }

      // Check if current page is in whitelist
      const isAllowed = whitelist.some(item => {
        return hostname === item.domain || 
               hostname.endsWith('.' + item.domain) ||
               currentUrl === item.url;
      });

      if (!isAllowed) {
        blockPage(currentUrl);
      }
    }
  } catch (error) {
    console.error('Error checking session:', error);
  }
}

function blockPage(url) {
  // Create block overlay
  const overlay = document.createElement('div');
  overlay.id = 'hocus-focus-block';
  overlay.innerHTML = `
    <div class="hocus-focus-block-container">
      <div class="hocus-focus-wand">🪄</div>
      <h1 class="hocus-focus-title">✨ Hocus-Focus Active ✨</h1>
      <p class="hocus-focus-message">This site is not in your focus whitelist.</p>
      <p class="hocus-focus-submessage">Stay focused on your studies! 📚</p>
      <button class="hocus-focus-btn" id="hocus-focus-add-btn">Add to Whitelist</button>
      <button class="hocus-focus-btn-secondary" id="hocus-focus-end-btn">End Focus Session</button>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #hocus-focus-block {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .hocus-focus-block-container {
      text-align: center;
      color: white;
      padding: 40px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      backdrop-filter: blur(10px);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      border: 1px solid rgba(255, 255, 255, 0.18);
      max-width: 500px;
    }

    .hocus-focus-wand {
      font-size: 80px;
      margin-bottom: 20px;
      display: inline-block;
      animation: hocus-wave 1s ease-in-out infinite;
    }

    @keyframes hocus-wave {
      0%, 100% { transform: rotate(-10deg); }
      50% { transform: rotate(10deg); }
    }

    .hocus-focus-title {
      font-size: 36px;
      margin-bottom: 20px;
      animation: hocus-glow 2s ease-in-out infinite alternate;
    }

    @keyframes hocus-glow {
      from {
        text-shadow: 0 0 5px rgba(255, 255, 255, 0.5), 0 0 10px rgba(255, 255, 255, 0.3);
      }
      to {
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.5);
      }
    }

    .hocus-focus-message {
      font-size: 20px;
      margin-bottom: 10px;
      font-weight: 500;
    }

    .hocus-focus-submessage {
      font-size: 16px;
      margin-bottom: 30px;
      opacity: 0.9;
    }

    .hocus-focus-btn,
    .hocus-focus-btn-secondary {
      padding: 15px 30px;
      border: none;
      border-radius: 10px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      margin: 10px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .hocus-focus-btn {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .hocus-focus-btn-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .hocus-focus-btn:hover,
    .hocus-focus-btn-secondary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }
  `;

  document.documentElement.appendChild(style);
  document.documentElement.appendChild(overlay);

  // Add event listeners
  document.getElementById('hocus-focus-add-btn').addEventListener('click', async () => {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      const result = await chrome.storage.sync.get(['whitelist']);
      const whitelist = result.whitelist || [];

      // Add to whitelist
      whitelist.push({
        domain: domain,
        url: url,
        title: document.title || domain,
        addedAt: Date.now(),
        isStudyRelated: false
      });

      await chrome.storage.sync.set({ whitelist });

      // Remove block and reload
      overlay.remove();
      style.remove();
      window.location.reload();
    } catch (error) {
      console.error('Error adding to whitelist:', error);
    }
  });

  document.getElementById('hocus-focus-end-btn').addEventListener('click', async () => {
    await chrome.storage.local.set({
      sessionActive: false,
      sessionEnd: null
    });

    chrome.runtime.sendMessage({ action: 'sessionEnded' });

    // Remove block
    overlay.remove();
    style.remove();
    window.location.reload();
  });
}
