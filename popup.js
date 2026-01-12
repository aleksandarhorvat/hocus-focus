// Popup script for Hocus-Focus extension

let sessionActive = false;
let remainingTime = 0;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadSessionState();
  await updateWhitelistPreview();
  setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
  document.getElementById('startBtn').addEventListener('click', startSession);
  document.getElementById('stopBtn').addEventListener('click', stopSession);
  document.getElementById('addCurrentSite').addEventListener('click', addCurrentSite);
  document.getElementById('optionsBtn').addEventListener('click', openOptions);
}

// Load current session state
async function loadSessionState() {
  const result = await chrome.storage.local.get(['sessionActive', 'sessionEnd']);
  
  if (result.sessionActive && result.sessionEnd) {
    sessionActive = true;
    const now = Date.now();
    remainingTime = Math.max(0, result.sessionEnd - now);
    
    if (remainingTime > 0) {
      updateTimerDisplay(remainingTime);
      showStopButton();
      startTimerCountdown();
      updateStatus('Focus session active! 🎯');
    } else {
      // Session ended
      await endSession();
    }
  }
}

// Start focus session
async function startSession() {
  const minutes = parseInt(document.getElementById('timerInput').value);
  
  if (!minutes || minutes < 1 || minutes > 240) {
    updateStatus('Please enter 1-240 minutes ⚠️');
    return;
  }

  const duration = minutes * 60 * 1000; // Convert to milliseconds
  const sessionEnd = Date.now() + duration;
  
  await chrome.storage.local.set({
    sessionActive: true,
    sessionEnd: sessionEnd,
    sessionDuration: duration
  });

  // Create alarm for session end
  await chrome.alarms.create('sessionEnd', { when: sessionEnd });

  sessionActive = true;
  remainingTime = duration;
  
  showStopButton();
  startTimerCountdown();
  updateStatus('Focus session started! ✨');
  
  // Notify background script
  chrome.runtime.sendMessage({ action: 'sessionStarted' });
}

// Stop focus session
async function stopSession() {
  await endSession();
  updateStatus('Session ended manually 🛑');
}

// End session (common function)
async function endSession() {
  // Clear timer interval
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  await chrome.storage.local.set({
    sessionActive: false,
    sessionEnd: null
  });
  
  await chrome.alarms.clear('sessionEnd');
  
  sessionActive = false;
  remainingTime = 0;
  
  showStartButton();
  updateTimerDisplay(0);
  
  // Notify background script
  chrome.runtime.sendMessage({ action: 'sessionEnded' });
}

// Timer countdown
let timerInterval = null;

function startTimerCountdown() {
  // Clear any existing interval
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  timerInterval = setInterval(async () => {
    if (!sessionActive || remainingTime <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      return;
    }
    
    remainingTime -= 1000;
    updateTimerDisplay(remainingTime);
    
    if (remainingTime <= 0) {
      await endSession();
      updateStatus('Session completed! 🎉');
    }
  }, 1000);
}

// Update timer display
function updateTimerDisplay(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  document.getElementById('timerDisplay').textContent = display;
}

// UI helpers
function showStartButton() {
  document.getElementById('startBtn').style.display = 'block';
  document.getElementById('stopBtn').style.display = 'none';
  document.getElementById('timerInput').disabled = false;
}

function showStopButton() {
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('stopBtn').style.display = 'block';
  document.getElementById('timerInput').disabled = true;
}

function updateStatus(message) {
  document.getElementById('statusMessage').textContent = message;
  setTimeout(() => {
    if (document.getElementById('statusMessage').textContent === message) {
      document.getElementById('statusMessage').textContent = '';
    }
  }, 3000);
}

// Add current site to whitelist
async function addCurrentSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab || !tab.url) {
    updateStatus('Cannot add this page ⚠️');
    return;
  }

  try {
    const url = new URL(tab.url);
    
    // Skip special pages
    if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:' || 
        url.protocol === 'about:' || url.protocol === 'edge:') {
      updateStatus('Cannot add browser pages ⚠️');
      return;
    }

    const domain = url.hostname;
    
    // Get current whitelist
    const result = await chrome.storage.sync.get(['whitelist']);
    const whitelist = result.whitelist || [];
    
    // Check if already exists
    if (whitelist.some(item => item.domain === domain || item.url === url.href)) {
      updateStatus('Already in whitelist! ℹ️');
      return;
    }

    // Detect if study-related (optional feature)
    const isStudyRelated = detectStudyRelated(domain, tab.title);
    
    // Add to whitelist
    whitelist.push({
      domain: domain,
      url: url.href,
      title: tab.title || domain,
      addedAt: Date.now(),
      isStudyRelated: isStudyRelated
    });

    await chrome.storage.sync.set({ whitelist });
    await updateWhitelistPreview();
    
    const emoji = isStudyRelated ? '📚' : '⭐';
    updateStatus(`Added ${domain} ${emoji}`);
  } catch (error) {
    console.error('Error adding site:', error);
    updateStatus('Error adding site ❌');
  }
}

// Simple study-related detection (optional feature)
function detectStudyRelated(domain, title) {
  const studyKeywords = [
    'edu', 'school', 'university', 'college', 'learn', 'study', 
    'course', 'tutorial', 'lecture', 'academic', 'scholar',
    'library', 'research', 'wikipedia', 'khan', 'coursera',
    'udemy', 'edx', 'mit', 'stanford', 'arxiv', 'jstor'
  ];
  
  const lowerDomain = domain.toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  
  return studyKeywords.some(keyword => 
    lowerDomain.includes(keyword) || lowerTitle.includes(keyword)
  );
}

// Update whitelist preview
async function updateWhitelistPreview() {
  const result = await chrome.storage.sync.get(['whitelist']);
  const whitelist = result.whitelist || [];
  
  document.getElementById('whitelistCount').textContent = whitelist.length;
  
  const preview = document.getElementById('whitelistPreview');
  preview.innerHTML = '';
  
  if (whitelist.length === 0) {
    preview.innerHTML = '<div style="text-align: center; opacity: 0.7; font-size: 12px;">No sites added yet</div>';
    return;
  }

  // Show last 5 items
  const recentItems = whitelist.slice(-5).reverse();
  
  recentItems.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'whitelist-item';
    
    const emoji = item.isStudyRelated ? '📚' : '🌐';
    
    div.innerHTML = `
      <span title="${item.domain}">${emoji} ${item.domain}</span>
      <button class="remove-btn" data-index="${whitelist.length - 1 - index}">✕</button>
    `;
    
    preview.appendChild(div);
  });

  // Add event listeners for remove buttons
  preview.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      if (index >= 0 && index < whitelist.length) {
        whitelist.splice(index, 1);
        await chrome.storage.sync.set({ whitelist });
        await updateWhitelistPreview();
        updateStatus('Removed from whitelist ✓');
      }
    });
  });
}

// Open options page
function openOptions() {
  chrome.runtime.openOptionsPage();
}
