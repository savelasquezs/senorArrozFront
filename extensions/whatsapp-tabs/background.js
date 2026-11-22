const appOrigin = 'https://senorarroz.up.railway.app'

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const tabId = sender.tab?.id
  if (message?.type !== 'focus-whatsapp-tab' || sender.id !== chrome.runtime.id
      || sender.origin !== appOrigin || sender.frameId !== 0 || typeof tabId !== 'number') return false

  // Activate only the tab that sent the extension message.
  chrome.tabs.update(tabId, { active: true })
    .then(tab => chrome.windows.update(tab.windowId, { focused: true }))
    .then(() => reply(true), () => reply(false))
  return true
})
