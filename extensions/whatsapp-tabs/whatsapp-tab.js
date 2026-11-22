window.addEventListener('message', (event) => {
  if (event.source !== window || event.origin !== location.origin || location.pathname !== '/whatsapp'
      || event.data?.type !== 'senor-arroz:focus-whatsapp-tab') return

  // The page observes actual focus. The bridge sends no order or customer data.
  void chrome.runtime.sendMessage({ type: 'focus-whatsapp-tab' }).catch(() => {})
})
