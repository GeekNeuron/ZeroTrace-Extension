document.addEventListener('DOMContentLoaded', async () => {
  const { settings } = await chrome.storage.local.get('settings');
  if (settings && settings.darkMode) {
    document.body.classList.add('dark-theme');
  }

  const globalStatusDiv = document.getElementById('global-status');
  const toggleGlobalBtn = document.getElementById('toggleGlobalBtn');
  const runTestBtn = document.getElementById('runTestBtn');
  const liveTestSection = document.getElementById('live-test-section');
  const testIp = document.getElementById('test-ip');
  const blockedCountSpan = document.getElementById('blocked-count');
  const currentSiteP = document.getElementById('current-site');
  const toggleSiteBtn = document.getElementById('toggleSiteBtn');
  const openOptionsLink = document.getElementById('open-options');
  const openHelpLink = document.getElementById('open-help');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.startsWith('http')) {
    document.body.innerHTML = '<div class="header-container"><img src="icons/icon-on-128.png" alt="ZeroTrace Icon" width="48" height="48"><p class="header-subtitle">Your Advanced Privacy Companion</p></div><p>This page cannot be analyzed.</p>';
    if (settings && settings.darkMode) document.body.classList.add('dark-theme');
    return;
  }
  const currentHostname = new URL(tab.url).hostname;
  if(currentSiteP) currentSiteP.textContent = currentHostname;

  const data = await chrome.storage.local.get(['isProtected', 'whitelistedSites']);
  let isProtected = !!data.isProtected;
  let whitelistedSites = data.whitelistedSites || [];
  let isCurrentSiteWhitelisted = whitelistedSites.includes(currentHostname);

  function updateUI() {
    globalStatusDiv.textContent = isProtected ? 'Protection is ON' : 'Protection is OFF';
    globalStatusDiv.className = isProtected ? 'on' : 'off';
    toggleGlobalBtn.textContent = isProtected ? 'Turn Off Protection' : 'Turn On Protection';
    runTestBtn.disabled = !isProtected;

    if (toggleSiteBtn) {
        toggleSiteBtn.textContent = isCurrentSiteWhitelisted ? 'Re-enable for this site' : 'Disable for this site';
        toggleSiteBtn.disabled = !isProtected;
    }
  }

  updateUI();

  chrome.runtime.sendMessage({ action: 'getTabCount', tabId: tab.id }, response => {
    if (response && blockedCountSpan) blockedCountSpan.textContent = response.count;
  });

  toggleGlobalBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "toggleGlobalProtection" });
    window.close();
  });

  if (toggleSiteBtn) {
    toggleSiteBtn.addEventListener('click', async () => {
      const { whitelistedSites: currentList = [] } = await chrome.storage.local.get('whitelistedSites');
      if (currentList.includes(currentHostname)) {
        await chrome.storage.local.set({ whitelistedSites: currentList.filter(site => site !== currentHostname) });
      } else {
        await chrome.storage.local.set({ whitelistedSites: [...currentList, currentHostname] });
      }
      chrome.runtime.sendMessage({ action: "whitelistChanged" });
      window.close();
    });
  }

  openOptionsLink.addEventListener('click', e => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  openHelpLink.addEventListener('click', e => {
    e.preventDefault();
    chrome.tabs.create({ url: 'help.html' });
  });

  runTestBtn.addEventListener('click', async () => {
    if (liveTestSection.style.display === 'block') {
      liveTestSection.style.display = 'none';
      runTestBtn.textContent = 'Run Live Test';
      return;
    }

    liveTestSection.style.display = 'block';
    runTestBtn.textContent = 'Hide Test Results';

    testIp.textContent = 'Testing...';

    try {
      const response = await fetch('http://ip-api.com/json/?fields=status,message,query,country,city');
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      if (data.status !== 'success') throw new Error(data.message);
      testIp.textContent = `${data.query} (${data.city}, ${data.country})`;
    } catch (error) {
      testIp.textContent = 'Unavailable';
    }

  });
});
