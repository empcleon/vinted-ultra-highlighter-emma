
// background.js
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({sniperResults: [], snipers: []});
});

// Recibe eventos de content.js con items relevantes
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'SNIPER_ALERT') {
    
    // 1. Guardar en historial local de la extensión
    chrome.storage.local.get(['sniperResults'], (res) => {
      const arr = res.sniperResults || [];
      // Evitar duplicados recientes
      if (!arr.some(i => i.url === msg.url)) {
          arr.unshift({
            time: Date.now(),
            title: msg.title,
            url: msg.url,
            price: msg.price || null,
            reason: msg.reason || 'match'
          });
          const truncated = arr.slice(0, 200);
          chrome.storage.local.set({sniperResults: truncated});
          
          // 2. Notificación de Chrome
          chrome.notifications.create('', {
            type: 'basic',
            iconUrl: 'icons/icon48.png',
            title: '🔥 Vinted UltraSniper',
            message: `${msg.title} (${msg.price}€)`,
            priority: 2
          });

          // 3. ENVIAR AL PANEL (La App Local)
          // Esto es lo que conecta con tu app React sin pedir permiso
          fetch('http://localhost:3000/api/vinted-hook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: msg.title,
                url: msg.url,
                price: msg.price,
                brand: 'Detectado por Bot',
                status: 'new'
            })
          }).catch(err => {
            // Si el panel está cerrado, no pasa nada, falla silenciosamente
            console.log('Panel local no detectado o cerrado.');
          });
      }
    });

  } else if (msg.type === 'SAVE_SNIPERS') {
    chrome.storage.local.set({snipers: msg.snipers});
  } else if (msg.type === 'GET_HISTORY') {
    chrome.storage.local.get(['sniperResults'], (res) => {
      sendResponse({history: res.sniperResults || []});
    });
    // keep channel open
    return true;
  }
});
