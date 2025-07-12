const DEFAULT_BLOCKLISTS = ['https://s3.amazonaws.com/lists.disconnect.me/simple_tracking.txt'];
const WEBRTC_POLICIES = { PROTECTED: 'disable_non_proxied_udp', DEFAULT: 'default' };
const defaultSettings = {
  webrtc: true, tracker: true, fingerprint: true,
  timezone: true, geolocation: true, language: true, darkMode: false,
};

let blockedCounts = {};

async function handleTabProtection(tabId) {
  const { settings = defaultSettings, isProtected } = await browser.storage.local.get(['settings', 'isProtected']);

  if (!isProtected) return;

  const spoofingFeatures = ['fingerprint', 'timezone', 'geolocation', 'language'];
  if (spoofingFeatures.some(s => settings[s])) {
    const spoofingData = { settings };
    if (settings.timezone) spoofingData.targetTimezone = await fetchTimezone();
    if (settings.geolocation) spoofingData.targetGeolocation = await fetchGeolocation();
    if (settings.language) spoofingData.targetLanguage = await fetchLanguage();
    
    injectScript(tabId, spoofingData);
  }
}

async function applyGlobalProtections() {
  const { settings = defaultSettings, isProtected, whitelistedSites = [] } = await browser.storage.local.get(['settings', 'isProtected', 'whitelistedSites']);

  await browser.privacy.network.webRTCIPHandlingPolicy.set({ value: WEBRTC_POLICIES.DEFAULT });
  await clearDynamicRules();
  
  if (!isProtected) {
    updateIcon(false);
    reloadAllTabs(); 
    return;
  }

  if (settings.webrtc) {
    await browser.privacy.network.webRTCIPHandlingPolicy.set({ value: WEBRTC_POLICIES.PROTECTED });
  }
  if (settings.tracker) {
    await updateDynamicRules(whitelistedSites);
  }

  updateIcon(true);

  const tabs = await browser.tabs.query({ url: ["http://*/*", "https://*/*"] });
  for (const tab of tabs) {
    handleTabProtection(tab.id);
  }
}

async function injectScript(tabId, spoofingData) {
    if (!spoofingData || !spoofingData.settings || Object.keys(spoofingData).length <= 1) return;
    if (!tabId) return;

    browser.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      func: (data) => {
          'use strict';
          const { settings, targetTimezone, targetGeolocation, targetLanguage } = data;
          if (!settings) return;
          if (settings.fingerprint) {
            try {
              const originalGetContext = HTMLCanvasElement.prototype.getContext;
              HTMLCanvasElement.prototype.getContext = function (type, contextAttributes) {
                const context = originalGetContext.call(this, type, contextAttributes);
                if (type === '2d') {
                  const originalToDataURL = this.toDataURL;
                  this.toDataURL = function () {
                    context.fillStyle = `rgba(0, 0, 0, ${0.0001 * Math.random()})`;
                    context.fillRect(0, 0, 1, 1);
                    return originalToDataURL.apply(this, arguments);
                  };
                }
                return context;
              };
            } catch (e) {}
            try {
              const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
              WebGLRenderingContext.prototype.getParameter = function (parameter) {
                if (parameter === this.UNMASKED_VENDOR_WEBGL) return 'Google Inc. (Apple)';
                if (parameter === this.UNMASKED_RENDERER_WEBGL) return 'ANGLE (Apple, Apple M1, OpenGL 4.1)';
                return originalGetParameter.apply(this, arguments);
              };
            } catch (e) {}
            try {
              const originalGetChannelData = AudioBuffer.prototype.getChannelData;
              AudioBuffer.prototype.getChannelData = function (channel) {
                const data = originalGetChannelData.call(this, channel);
                for (let i = 0; i < data.length; i++) { data[i] += (Math.random() - 0.5) * 0.0000001; }
                return data;
              };
            } catch (e) {}
            try {
              if (navigator.fonts && navigator.fonts.query) {
                navigator.fonts.query = () => Promise.resolve([]);
              }
            } catch(e) {}
          }
          if (settings.timezone && targetTimezone) {
            try {
              Date.prototype.toString = () => new Date().toLocaleString("en-US", { timeZone: targetTimezone });
              Date.prototype.toLocaleString = function(locales, options) { return new Date(this).toLocaleString(locales, { ...options, timeZone: targetTimezone }); };
              const offset = new Date().toLocaleString("en-US", { timeZone: targetTimezone, timeZoneName: "shortOffset" }).split("GMT")[1];
              if (offset) {
                const offsetMinutes = (parseInt(offset.split(':')[0],10) * 60) + (parseInt(offset.split(':')[1] || 0,10));
                Date.prototype.getTimezoneOffset = () => -offsetMinutes;
              }
            } catch(e){}
          }
          if (settings.geolocation && targetGeolocation) {
            try {
              navigator.geolocation.getCurrentPosition = (s) => s({ coords: { ...targetGeolocation, accuracy: 20, altitude: null, altitudeAccuracy: null, heading: null, speed: null }, timestamp: Date.now() });
              navigator.geolocation.watchPosition = (s) => { navigator.geolocation.getCurrentPosition(s); return 1; };
            } catch (e) {}
          }
          if (settings.language && targetLanguage) {
            try {
              Object.defineProperties(navigator, {
                language: { value: targetLanguage, configurable: true },
                languages: { value: [targetLanguage], configurable: true },
              });
            } catch (e) {}
          }
      },
      args: [spoofingData],
      injectImmediately: true,
      world: 'MAIN',
    }).catch(err => {});
}

async function reloadAllTabs() {
    const tabs = await browser.tabs.query({url: ["http://*/*", "https://*/*"]});
    for (const tab of tabs) {
      try { await browser.tabs.reload(tab.id, { bypassCache: true }); } catch (e) {}
    }
}

async function updateDynamicRules(whitelistedSites = []) {
  const { customBlocklists = [] } = await browser.storage.local.get('customBlocklists');
  const allBlocklistUrls = [...DEFAULT_BLOCKLISTS, ...customBlocklists];
  const domains = await fetchAndParseDomains(allBlocklistUrls);
  const trackerBlockRules = domains.map((d, i) => ({ id: i + 1, priority: 1, action: { type: 'block' }, condition: { urlFilter: `||${d}`, excludedRequestDomains: whitelistedSites, resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'xmlhttprequest', 'stylesheet', 'media'] } }));
  const headerRemovalRule = {
    id: domains.length + 1,
    priority: 2,
    action: {
      type: 'modifyHeaders',
      requestHeaders: [
        { header: 'sec-ch-ua', operation: 'remove' }, { header: 'sec-ch-ua-mobile', operation: 'remove' },
        { header: 'sec-ch-ua-platform', operation: 'remove' }, { header: 'sec-ch-ua-arch', operation: 'remove' },
        { header: 'sec-ch-ua-model', operation: 'remove' }, { header: 'sec-ch-ua-bitness', operation: 'remove' },
        { header: 'sec-ch-ua-full-version-list', operation: 'remove' }, { header: 'sec-ch-ua-platform-version', operation: 'remove' },
      ],
    },
    condition: { urlFilter: '*', resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest', 'image', 'stylesheet', 'media'] },
  };

  const allRules = [...trackerBlockRules, headerRemovalRule];
  const oldRules = await browser.declarativeNetRequest.getDynamicRules();
  await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRules.map(r => r.id), addRules: allRules });
}

async function fetchAndParseDomains(urls) {
  const allDomains = new Set();
  const fetchPromises = urls.map(url => fetch(url).then(res => res.ok ? res.text() : '').catch(() => ''));
  const results = await Promise.all(fetchPromises);
  results.forEach(text => {
    text.split('\n').forEach(line => {
      if (line && !line.startsWith('#')) allDomains.add(line.trim());
    });
  });
  return Array.from(allDomains);
}

async function clearDynamicRules() {
  const oldRules = await browser.declarativeNetRequest.getDynamicRules();
  if (oldRules.length > 0) {
    await browser.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRules.map(r => r.id) });
  }
}

function updateIcon(isProtected) {
  const iconPath = isProtected ? 'icons/icon-on-16.png' : 'icons/icon-off-16.png';
  browser.action.setIcon({ path: iconPath });
  browser.action.setBadgeText({ text: isProtected ? 'ON' : '' });
  browser.action.setBadgeBackgroundColor({ color: '#34A853' });
}

async function fetchTimezone() {
  const response = await fetch('https://worldtimeapi.org/api/ip').catch(() => null);
  if (response?.ok) { const data = await response.json(); return data.timezone; }
  return null;
}

async function fetchGeolocation() {
  const response = await fetch('http://ip-api.com/json/?fields=lat,lon').catch(() => null);
  if (response?.ok) { const data = await response.json(); if(data.lat && data.lon) return { latitude: data.lat, longitude: data.lon }; }
  return null;
}

async function fetchLanguage() {
  const response = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client').catch(() => null);
  if (response?.ok) { const data = await response.json(); if(data.localityInfo?.informative[0]?.isoCode) return data.localityInfo.informative[0].isoCode; }
  return null;
}

browser.runtime.onInstalled.addListener(() => {
  browser.storage.local.set({ isProtected: false, whitelistedSites: [], settings: defaultSettings, customBlocklists: [] });
  browser.alarms.create('updateBlocklistAlarm', { periodInMinutes: 1440 });
});

browser.runtime.onStartup.addListener(async () => {
  const { isProtected } = await browser.storage.local.get('isProtected');
  if (isProtected) await applyGlobalProtections();
  else updateIcon(false);
});

browser.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'updateBlocklistAlarm') {
    const { isProtected, settings } = await browser.storage.local.get(['isProtected', 'settings']);
    if (isProtected && settings.tracker) await updateDynamicRules((await browser.storage.local.get('whitelistedSites')).whitelistedSites);
  }
});

browser.webRequest.onErrorOccurred.addListener((details) => {
  if (details.error === 'net::ERR_BLOCKED_BY_CLIENT' && details.tabId > 0) {
    blockedCounts[details.tabId] = (blockedCounts[details.tabId] || 0) + 1;
    browser.action.setBadgeText({ text: blockedCounts[details.tabId].toString(), tabId: details.tabId });
    browser.action.setBadgeBackgroundColor({ color: '#d32f2f', tabId: details.tabId });
  }
}, { urls: ['<all_urls>'] });

browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading' && tab.url && (tab.url.startsWith('http:') || tab.url.startsWith('https:'))) {
    blockedCounts[tabId] = 0;
    const { isProtected } = await browser.storage.local.get('isProtected');
    if (isProtected) {
      browser.action.setBadgeText({ text: 'ON', tabId: tabId });
      browser.action.setBadgeBackgroundColor({ color: '#34A853', tabId: tabId });
      
      handleTabProtection(tabId);
    } else {
      browser.action.setBadgeText({ text: '', tabId: tabId });
    }
  }
});

browser.tabs.onRemoved.addListener(tabId => delete blockedCounts[tabId]);

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "toggleGlobalProtection":
      browser.storage.local.get('isProtected', data => {
        browser.storage.local.set({ isProtected: !data.isProtected }).then(applyGlobalProtections);
      });
      break;
    case "whitelistChanged":
    case "settingsChanged":
      applyGlobalProtections();
      break;
    case "getTabCount":
      sendResponse({ count: blockedCounts[request.tabId] || 0 });
      break;
    
    case "clearPrivacyData":
      const dataTypesToRemove = {
        "cache": true,
        "cookies": true,
        "localStorage": true,
        "indexedDB": true,
        "serviceWorkers": true
      };

      const timePeriod = { since: (new Date()).getTime() - (24 * 60 * 60 * 1000) };

      browser.BrowseData.remove(timePeriod, dataTypesToRemove, () => {
        reloadAllTabs();
      });
      break;

  }
  return true;
});
