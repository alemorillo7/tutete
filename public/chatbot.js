(function() {
  // Styles for the Tutete Chatbot
  const styles = `
    :root {
      --chat-primary: #e691a3; /* Tutete Pink */
      --chat-primary-hover: #cf798b;
      --chat-bg: #fff;
      --chat-text: #333;
      --chat-border: #ddd;
      --chat-msg-user: #e691a3;
      --chat-msg-agent: #f0f0f0;
      --chat-shadow: 0 4px 12px rgba(0,0,0,0.15);
      --chat-radius: 12px;
    }

    #tutete-chatbot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    #tutete-chat-toggle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: var(--chat-primary);
      color: white;
      border: none;
      box-shadow: var(--chat-shadow);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, background-color 0.2s;
    }

    #tutete-chat-toggle:hover {
      background-color: var(--chat-primary-hover);
      transform: scale(1.05);
    }

    #tutete-chat-toggle svg {
      width: 28px;
      height: 28px;
      fill: currentColor;
    }

    #tutete-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 350px;
      height: 500px;
      background: var(--chat-bg);
      border-radius: var(--chat-radius);
      box-shadow: var(--chat-shadow);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform-origin: bottom right;
      transition: transform 0.3s ease, opacity 0.3s ease;
      opacity: 0;
      transform: scale(0.8);
      pointer-events: none;
    }

    #tutete-chat-window.open {
      opacity: 1;
      transform: scale(1);
      pointer-events: all;
    }

    #tutete-chat-header {
      background: var(--chat-primary);
      color: white;
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    #tutete-chat-header .title {
      font-weight: 600;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    #tutete-chat-header .status {
      display: block;
      font-size: 11px;
      opacity: 0.9;
    }
    
    #tutete-chat-header .status-dot {
      width: 8px; height: 8px; background: #4caf50; border-radius: 50%; display: inline-block; margin-right: 4px;
    }

    #tutete-close-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 4px;
      display: flex;
    }

    #tutete-chat-messages {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background-color: #fcfcfc;
    }

    .msg {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }

    .msg.user {
      align-self: flex-end;
      background: var(--chat-msg-user);
      color: white;
      border-bottom-right-radius: 4px;
    }

    .msg.agent {
      align-self: flex-start;
      background: var(--chat-msg-agent);
      color: var(--chat-text);
      border-bottom-left-radius: 4px;
    }

    .msg-time {
      font-size: 10px;
      opacity: 0.7;
      margin-top: 4px;
      text-align: right;
    }

    #tutete-chat-input-area {
      padding: 12px;
      border-top: 1px solid var(--chat-border);
      display: flex;
      gap: 8px;
      background: #fff;
    }

    #tutete-chat-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 20px;
      padding: 10px 14px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
    }

    #tutete-chat-input:focus {
      border-color: var(--chat-primary);
    }

    #tutete-chat-send {
      background: var(--chat-primary);
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #tutete-chat-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
      
    @media (max-width: 480px) {
      #tutete-chat-window {
        width: 100%;
        height: 100vh;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }
    }
  `;

  // Inject Styles
  const styleTag = document.createElement('style');
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);

  // Configuration
  const config = window.CHATBOT_CONFIG || {
    client_id: "default_client",
    api_base_url: ""
  };

  // Utils
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // State
  let chatData = {
    chat_id: localStorage.getItem('tutete_chat_id'),
    user_name: localStorage.getItem('tutete_user_name') || 'Cliente'
  };

  if (!chatData.chat_id) {
    chatData.chat_id = generateUUID();
    localStorage.setItem('tutete_chat_id', chatData.chat_id);
  }

  let isOpen = false;
  let messages = [];
  let pollInterval = null;

  // HTML Structure
  const container = document.createElement('div');
  container.id = 'tutete-chatbot-container';
  container.innerHTML = `
    <div id="tutete-chat-window">
      <div id="tutete-chat-header">
        <div class="title">
          <div>
            <div>Atención al cliente</div>
            <div class="status"><span class="status-dot"></span>En línea</div>
          </div>
        </div>
        <button id="tutete-close-btn">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div id="tutete-chat-messages"></div>
      <div id="tutete-chat-input-area">
        <button id="tutete-chat-attach" title="Enviar enlace de archivo" style="background:none;border:none;color:#999;cursor:pointer;padding:0 4px;">
           <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
        </button>
        <input type="text" id="tutete-chat-input" placeholder="Escribe un mensaje..." autocomplete="off"/>
        <button id="tutete-chat-send">
           <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
    <button id="tutete-chat-toggle">
      <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.543.356 3.003.985 4.316L2 22l5.684-.985C9.003 21.644 10.457 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18c-1.373 0-2.684-.282-3.876-.788l-.278-.118-3.086.535.535-3.086-.118-.278C4.282 14.684 4 13.373 4 12c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"/></svg>
    </button>
  `;
  document.body.appendChild(container);

  const toggleBtn = document.getElementById('tutete-chat-toggle');
  const windowEl = document.getElementById('tutete-chat-window');
  const closeBtn = document.getElementById('tutete-close-btn');
  const messagesEl = document.getElementById('tutete-chat-messages');
  const inputEl = document.getElementById('tutete-chat-input');
  const sendBtn = document.getElementById('tutete-chat-send');
  const attachBtn = document.getElementById('tutete-chat-attach');

  // Event Push
  function pushEvent(eventName, payload = {}) {
    console.log('[GA4 Event]', eventName, payload); // For easy debugging
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, ...payload });
  }

  // To track handoff
  let botWasActiveLastCheck = true;

  // Render Messages
  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = `msg ${msg.sender}`;
      const timeStr = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      msgDiv.innerHTML = `
        ${msg.message}
        ${msg.file_url ? `<br><a href="${msg.file_url}" target="_blank" style="color:inherit;text-decoration:underline;">Adjunto</a>` : ''}
        <div class="msg-time">${timeStr}</div>
      `;
      messagesEl.appendChild(msgDiv);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Handle link clicks for analytics
  messagesEl.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) {
      pushEvent('product_clicked', { url: link.href });
      if (link.href.includes('/cart') || link.href.includes('/carrito') || link.href.includes('checkout')) {
        pushEvent('chat_to_cart');
      }
    }
  });

  // API Calls
  async function fetchMessages() {
    try {
      const res = await fetch(`${config.api_base_url}/api/messages?chat_id=${chatData.chat_id}`);
      if (res.ok) {
        const data = await res.json();
        
        // Check for agent status changes to trigger GA4 human_handoff
        // This is a simple heuristic: if a message from 'agent' appears and we don't know the bot state
        // or if we receive a metadata flag from server (optional)
        const hasAgentMsg = data.messages && data.messages.some(m => m.sender === 'agent');
        
        // Analytics: if a specific message contains an event trigger
        data.messages?.forEach(msg => {
          if (msg.analytics_event && !messages.find(m => m.id === msg.id)) {
             pushEvent(msg.analytics_event);
          }
        });

        // check if new messages arrived
        if (data.messages && data.messages.length > messages.length) {
           messages = data.messages;
           renderMessages();
        }
      }
    } catch(err) {
      console.error('Error fetching messages', err);
    }
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    return sendMsgPayload({ text, type: 'text', file_url: null });
  }

  async function sendMsgPayload({ text, type, file_url }) {
    sendBtn.disabled = true;
    inputEl.value = '';
    
    const newMsg = {
      chat_id: chatData.chat_id,
      message_id: generateUUID(),
      type: type,
      user_name: chatData.user_name,
      message: text,
      file_url: file_url,
      timestamp: new Date().toISOString(),
      client_id: config.client_id
    };

    // Optimistic UI update
    const uiMsg = { ...newMsg, created_at: newMsg.timestamp, sender: 'user' };
    messages.push(uiMsg);
    renderMessages();
    pushEvent('chat_message_sent');

    try {
      await fetch(`${config.api_base_url}/api/ingest-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg)
      });
      // Start polling after first message if not polling
      startPolling(); 
    } catch(err) {
      // Revert optimism if needed (ignored for simplicity)
      console.error('Error sending message', err);
    } finally {
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  function startPolling() {
    if (!pollInterval) {
      pollInterval = setInterval(fetchMessages, 3000);
    }
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  // Listeners
  attachBtn.addEventListener('click', () => {
    const fileUrl = prompt('Ingresa la URL del archivo o imagen a enviar:');
    if (fileUrl && fileUrl.trim()) {
      sendMsgPayload({ text: 'Archivo adjunto', type: 'file', file_url: fileUrl.trim() });
    }
  });

  toggleBtn.addEventListener('click', () => {
    isOpen = true;
    windowEl.classList.add('open');
    toggleBtn.style.display = 'none';
    pushEvent('chat_opened');
    fetchMessages();
    startPolling();
    setTimeout(() => inputEl.focus(), 300);
  });

  closeBtn.addEventListener('click', () => {
    isOpen = false;
    windowEl.classList.remove('open');
    toggleBtn.style.display = 'flex';
    stopPolling();
  });

  sendBtn.addEventListener('click', () => {
    sendMessage(inputEl.value);
  });

  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage(inputEl.value);
    }
  });

  // Initial fetch to show history if returning user
  fetchMessages();

})();
