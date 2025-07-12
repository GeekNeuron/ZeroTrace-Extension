document.addEventListener('DOMContentLoaded', async () => {
document.addEventListener('contextmenu', event => event.preventDefault());
  const whitelistList = document.getElementById('whitelist-list');
  const darkModeToggle = document.querySelector('[data-setting="darkMode"]');
  const blocklistUrlsTextarea = document.getElementById('blocklist-urls');
  const saveBlocklistsBtn = document.getElementById('save-blocklists');
  const defaultSettings = {
    webrtc: true, tracker: true, fingerprint: true,
    timezone: true, geolocation: true, language: true, darkMode: false,
  };

  const { settings = defaultSettings, whitelistedSites = [], customBlocklists = [] } = await browser.storage.local.get(['settings', 'whitelistedSites', 'customBlocklists']);

  const applyTheme = (isDark) => {
    document.body.classList.toggle('dark-theme', isDark);
  };
  
  applyTheme(settings.darkMode);
  if (darkModeToggle) {
      darkModeToggle.checked = settings.darkMode;
  }

  if (darkModeToggle) {
    darkModeToggle.addEventListener('change', async (event) => {
      const isDark = event.target.checked;
      const { settings: currentSettings = defaultSettings } = await browser.storage.local.get('settings');
      currentSettings.darkMode = isDark;
      await browser.storage.local.set({ settings: currentSettings });
      applyTheme(isDark);
    });
  }

  document.querySelectorAll('.switch input').forEach(toggle => {
    const key = toggle.dataset.setting;
    if (key === 'darkMode') return;
    
    toggle.checked = settings[key] !== false;

    toggle.addEventListener('change', async event => {
      const value = event.target.checked;
      const { settings: currentSettings = defaultSettings } = await browser.storage.local.get('settings');
      currentSettings[key] = value;
      await browser.storage.local.set({ settings: currentSettings });
      browser.runtime.sendMessage({ action: "settingsChanged" });
    });
  });

  if (blocklistUrlsTextarea) {
      blocklistUrlsTextarea.value = customBlocklists.join('\n');
  }
  if (saveBlocklistsBtn) {
      saveBlocklistsBtn.addEventListener('click', async () => {
        const urls = blocklistUrlsTextarea.value.split('\n').map(url => url.trim()).filter(Boolean);
        await browser.storage.local.set({ customBlocklists: urls });
        
        browser.runtime.sendMessage({ action: "settingsChanged" });
        saveBlocklistsBtn.textContent = 'Saved!';
        setTimeout(() => { saveBlocklistsBtn.textContent = 'Save and Update Rules'; }, 2000);
      });
  }

  function renderWhitelist(sites) {
    if (!whitelistList) return;
    whitelistList.innerHTML = '';
    if (sites.length === 0) {
      whitelistList.innerHTML = '<li>No sites are whitelisted.</li>';
      return;
    }
    sites.forEach(site => {
      const li = document.createElement('li');
      li.textContent = site;
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'remove-btn';
      removeBtn.dataset.site = site;
      removeBtn.addEventListener('click', async () => {
        const siteToRemove = removeBtn.dataset.site;
        const { whitelistedSites: currentSites = [] } = await browser.storage.local.get('whitelistedSites');
        const newSites = currentSites.filter(s => s !== siteToRemove);
        await browser.storage.local.set({ whitelistedSites: newSites });
        browser.runtime.sendMessage({ action: "whitelistChanged" });
        renderWhitelist(newSites);
      });
      li.appendChild(removeBtn);
      whitelistList.appendChild(li);
    });
  }

  renderWhitelist(whitelistedSites);
});
