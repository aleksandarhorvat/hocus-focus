// Options page script for Hocus-Focus

document.addEventListener('DOMContentLoaded', async () => {
  await loadWhitelist();
  setupEventListeners();
});

function setupEventListeners() {
  document.getElementById('addBtn').addEventListener('click', addDomain);
  document.getElementById('domainInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addDomain();
    }
  });
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);
}

async function loadWhitelist() {
  const result = await chrome.storage.sync.get(['whitelist']);
  const whitelist = result.whitelist || [];
  
  updateStats(whitelist);
  displayWhitelist(whitelist);
}

function updateStats(whitelist) {
  const total = whitelist.length;
  const studySites = whitelist.filter(item => item.isStudyRelated).length;
  const otherSites = total - studySites;
  
  document.getElementById('totalSites').textContent = total;
  document.getElementById('studySites').textContent = studySites;
  document.getElementById('otherSites').textContent = otherSites;
}

function displayWhitelist(whitelist) {
  const container = document.getElementById('whitelistContainer');
  container.innerHTML = '';
  
  if (whitelist.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📭 No sites in your whitelist yet</p>
        <p>Add domains above to allow them during focus sessions</p>
      </div>
    `;
    return;
  }

  // Sort by most recent first but keep track of original indices
  const sortedWithIndices = whitelist.map((item, idx) => ({ item, originalIndex: idx }))
    .sort((a, b) => b.item.addedAt - a.item.addedAt);
  
  sortedWithIndices.forEach(({ item, originalIndex }) => {
    const div = document.createElement('div');
    div.className = 'whitelist-item';
    
    const emoji = item.isStudyRelated ? '📚' : '🌐';
    const badge = item.isStudyRelated ? 
      '<span class="item-badge">Study Related</span>' : '';
    
    const addedDate = new Date(item.addedAt).toLocaleDateString();
    
    div.innerHTML = `
      <div class="item-info">
        <div class="item-domain">${emoji} ${item.domain}</div>
        <div class="item-meta">
          Added: ${addedDate}
          ${badge}
        </div>
      </div>
      <button class="btn btn-remove" data-index="${originalIndex}">Remove ✕</button>
    `;
    
    container.appendChild(div);
  });

  // Add event listeners for remove buttons
  container.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.target.dataset.index);
      await removeDomain(index);
    });
  });
}

async function addDomain() {
  const input = document.getElementById('domainInput');
  const domainRaw = input.value.trim();
  
  if (!domainRaw) {
    showMessage('Please enter a domain ⚠️');
    return;
  }

  // Clean and validate domain
  let domain = domainRaw.toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  if (!domain || domain.includes(' ')) {
    showMessage('Invalid domain format ⚠️');
    return;
  }

  const result = await chrome.storage.sync.get(['whitelist']);
  const whitelist = result.whitelist || [];
  
  // Check if already exists
  if (whitelist.some(item => item.domain === domain)) {
    showMessage('Domain already in whitelist! ℹ️');
    input.value = '';
    return;
  }

  // Detect if study-related
  const isStudyRelated = detectStudyRelated(domain);
  
  // Add to whitelist
  whitelist.push({
    domain: domain,
    url: `https://${domain}`,
    title: domain,
    addedAt: Date.now(),
    isStudyRelated: isStudyRelated
  });

  await chrome.storage.sync.set({ whitelist });
  
  input.value = '';
  await loadWhitelist();
  
  const emoji = isStudyRelated ? '📚' : '⭐';
  showMessage(`Added ${domain} ${emoji}`);
}

async function removeDomain(index) {
  const result = await chrome.storage.sync.get(['whitelist']);
  const whitelist = result.whitelist || [];
  
  const removed = whitelist.splice(index, 1)[0];
  
  await chrome.storage.sync.set({ whitelist });
  await loadWhitelist();
  
  showMessage(`Removed ${removed.domain} ✓`);
}

async function clearAll() {
  if (!confirm('Are you sure you want to remove all sites from the whitelist?')) {
    return;
  }

  await chrome.storage.sync.set({ whitelist: [] });
  await loadWhitelist();
  
  showMessage('Whitelist cleared 🗑️');
}

function detectStudyRelated(domain) {
  const studyKeywords = [
    'edu', 'school', 'university', 'college', 'learn', 'study', 
    'course', 'tutorial', 'lecture', 'academic', 'scholar',
    'library', 'research', 'wikipedia', 'khan', 'coursera',
    'udemy', 'edx', 'mit', 'stanford', 'arxiv', 'jstor',
    'researchgate', 'mendeley', 'springer', 'elsevier',
    'learning', 'education', 'teaching'
  ];
  
  const lowerDomain = domain.toLowerCase();
  
  return studyKeywords.some(keyword => lowerDomain.includes(keyword));
}

function showMessage(text) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.classList.add('show');
  
  setTimeout(() => {
    messageEl.classList.remove('show');
  }, 3000);
}
