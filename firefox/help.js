document.addEventListener('DOMContentLoaded', async () => {
document.addEventListener('contextmenu', event => event.preventDefault());
  const { settings } = await browser.storage.local.get('settings');
  if (settings && settings.darkMode) {
    document.body.classList.add('dark-theme');
  }
});
