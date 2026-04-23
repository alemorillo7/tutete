(function() {
  // Styles for the Tutete Chatbot
  const styles = `
    /* Import Lato font */
    @import url('https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap');

    :root {
      --chat-primary: #E59EAF; /* Tutete Pink */
      --chat-primary-hover: #D4899A;
      --chat-bg: #fff;
      --chat-text: #333;
      --chat-border: #ddd;
      --chat-msg-user: #E59EAF;
      --chat-msg-agent: #f0f0f0;
      --chat-shadow: 0 4px 12px rgba(0,0,0,0.15);
      --chat-radius: 12px;
    }

    #tutete-chatbot-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: 'Lato', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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
      align-items: center;
      gap: 6px;
      background: #fff;
    }

    #tutete-chat-input {
      flex: 1;
      border: 1px solid #eee;
      border-radius: 20px;
      padding: 10px 14px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      background: #f9f9f9;
    }

    #tutete-chat-input:focus {
      border-color: var(--chat-primary);
      background: #fff;
    }

    .chat-btn {
      background: none;
      border: none;
      color: #999;
      cursor: pointer;
      padding: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s, color 0.2s;
    }

    .chat-btn:hover {
      background: #f0f0f0;
      color: var(--chat-primary);
    }

    .chat-btn.active {
      color: #ff4444;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    #tutete-chat-send {
      background: var(--chat-primary);
      color: white;
      border: none;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    #tutete-chat-send:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .msg-img {
      max-width: 100%;
      border-radius: 8px;
      margin-top: 4px;
      display: block;
      cursor: pointer;
    }

    .msg-audio {
      width: 100%;
      height: 32px;
      margin-top: 4px;
    }

    #tutete-recording-status {
       display: none;
       flex: 1;
       color: #ff4444;
       font-size: 13px;
       font-weight: 500;
       padding-left: 10px;
    }

      
    @media (max-width: 480px) {
      #tutete-chatbot-container {
        bottom: 0;
        right: 0;
      }
      #tutete-chat-toggle {
        bottom: 20px;
        right: 20px;
        position: fixed;
      }
      #tutete-chat-window {
        width: 100% !important;
        height: 100% !important;
        height: -webkit-fill-available !important; /* Fix for mobile browser bars */
        bottom: 0 !important;
        right: 0 !important;
        border-radius: 0;
        position: fixed;
      }
      #tutete-chat-header {
        padding: 20px 16px; /* Header más grande en móvil */
      }
      .chat-btn {
        padding: 10px; /* Botones más fáciles de tocar */
      }
    }

  `;

  // Inject Styles
  const styleTag = document.createElement('style');
  styleTag.innerHTML = styles;
  document.head.appendChild(styleTag);

  // Configuration
  const config = window.CHATBOT_CONFIG || {};
  config.client_id = config.client_id || "TUTETE_MAIN";
  config.api_base_url = config.api_base_url || "https://tutete.vercel.app";

  // Utils
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // State
  let chatData = {
    chat_id: config.user_id || localStorage.getItem('tutete_chat_id'),
    user_name: config.user_name || localStorage.getItem('tutete_user_name') || 'Cliente'
  };

  if (!chatData.chat_id) {
    chatData.chat_id = generateUUID();
    localStorage.setItem('tutete_chat_id', chatData.chat_id);
  } else if (config.user_id) {
    // If coming from config, sync to localstorage too
    localStorage.setItem('tutete_chat_id', chatData.chat_id);
  }
  
  if (config.user_name) {
    localStorage.setItem('tutete_user_name', chatData.user_name);
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
        <button id="tutete-chat-img-btn" class="chat-btn" title="Enviar imagen">
           <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none text"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
        </button>
        <input type="file" id="tutete-file-input" accept="image/*" style="display:none" />
        
        <input type="text" id="tutete-chat-input" placeholder="Escribe un mensaje..." autocomplete="off"/>
        <div id="tutete-recording-status">Grabando...</div>

        <button id="tutete-chat-mic" class="chat-btn" title="Grabar audio">
           <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
        </button>

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
  const imgBtn = document.getElementById('tutete-chat-img-btn');
  const fileInput = document.getElementById('tutete-file-input');
  const micBtn = document.getElementById('tutete-chat-mic');
  const recordingStatus = document.getElementById('tutete-recording-status');

  // Event Push (Strict formatting based on GTM requirements)
  function pushEvent(eventName, payload = {}) {
    console.log('[GA4 Event]', eventName, payload);
    window.dataLayer = window.dataLayer || [];
    
    // Clear previous sticky variables as requested
    window.dataLayer.push({ 
      event: eventName, 
      product_id: undefined, 
      product_name: undefined, 
      value: undefined, 
      query_text: undefined,
      reason: undefined,
      message_count: undefined,
      ...payload 
    });
  }

  // State for tracking
  let botWasActiveLastCheck = true;
  let userMessageCount = 0;

  // Render Messages
  function renderMessages() {
    messagesEl.innerHTML = '';
    messages.forEach(msg => {
      const msgDiv = document.createElement('div');
      msgDiv.className = `msg ${msg.sender}`;
      const timeStr = new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      let content = msg.message;
      if (msg.type === 'file' && msg.file_url) {
        const url = msg.file_url.toLowerCase();
        if (url.match(/\.(jpg|jpeg|png|gif|webp)/)) {
           content = `${msg.message ? `<div>${msg.message}</div>` : ''}<img src="${msg.file_url}" class="msg-img" onclick="window.open('${msg.file_url}')" />`;
        } else if (url.match(/\.(mp3|wav|ogg|m4a|weba)/)) {
           content = `${msg.message ? `<div>${msg.message}</div>` : ''}<audio controls class="msg-audio"><source src="${msg.file_url}" type="audio/webm"></audio>`;
        } else {
           content = `${msg.message} <br><a href="${msg.file_url}" target="_blank" style="color:inherit;text-decoration:underline;">Ver archivo</a>`;
        }
      }

      msgDiv.innerHTML = `
        ${content}
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
      // Intentar extraer data-attributes si el bot los envía
      const productId = link.getAttribute('data-product-id');
      const productName = link.getAttribute('data-product-name');
      const val = link.getAttribute('data-value');

      if (link.href.includes('/cart') || link.href.includes('/carrito') || link.href.includes('checkout') || link.getAttribute('data-action') === 'add_to_cart') {
        pushEvent('chat_to_cart', { 
           product_id: productId || 'unknown', 
           value: val ? parseFloat(val) : 0 
        });
      } else {
        pushEvent('product_clicked', { 
           product_id: productId || 'unknown', 
           product_name: productName || link.innerText.trim() 
        });
      }
    }
  });

  // API Calls
  async function fetchMessages() {
    try {
      const res = await fetch(`${config.api_base_url}/api/messages?chat_id=${chatData.chat_id}`);
      if (res.ok) {
        const data = await res.json();
        
        // Handoff tracking
        if (data.agent_active !== undefined) {
           if (botWasActiveLastCheck && data.agent_active === false) {
             pushEvent('human_handoff', { reason: 'bot_disabled_by_agent' });
             botWasActiveLastCheck = false;
           } else if (!botWasActiveLastCheck && data.agent_active === true) {
             botWasActiveLastCheck = true;
           }
        }
        
        // Analytics parsing from AI messages (using HTML comments like <!-- GA4: product_recommended | SKU-123 | Saco... -->)
        data.messages?.forEach(msg => {
          if (msg.sender === 'agent' && msg.message.includes('<!-- GA4:')) {
             const trackMatch = msg.message.match(/<!-- GA4:\s*([a-zA-Z_]+)\s*\|\s*([^|]+)\s*\|\s*([^>]+)-->/);
             if (trackMatch && !messages.find(m => m.id === msg.id)) {
                if (trackMatch[1] === 'product_recommended') {
                  pushEvent('product_recommended', { product_id: trackMatch[2].trim(), product_name: trackMatch[3].trim() });
                } else if (trackMatch[1] === 'chat_fallback') {
                  pushEvent('chat_fallback', { query_text: trackMatch[2].trim() });
                }
             }
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
    
    userMessageCount++;
    pushEvent('chat_message_sent', { message_count: userMessageCount });

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

  // Storage Upload Logic (using Supabase REST API)
  async function uploadToSupabase(file, fileName) {
    // You need to pass these via config or have them hardcoded if they are public
    const supabaseUrl = config.supabase_url || 'https://mluwalpbtyzszudefwtl.supabase.co';
    const anonKey = config.supabase_anon_key || 'sb_publishable_jK7zIk-yz9n88IaIeXd3WQ__fJmyop2';
    
    const filePath = `chat-files/${chatData.chat_id}/${generateUUID()}_${fileName}`;
    const uploadUrl = `${supabaseUrl}/storage/v1/object/${filePath}`;

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Content-Type': file.type
        },
        body: file
      });
      
      if (!res.ok) throw new Error('Error al subir archivo');
      
      // Get public URL
      return `${supabaseUrl}/storage/v1/object/public/${filePath}`;
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error al subir el archivo. Asegúrate de que el bucket "chat-files" sea público.');
      return null;
    }
  }

  // Voice Recording Logic
  let mediaRecorder;
  let audioChunks = [];
  let isRecording = false;

  async function toggleRecording() {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Try to use a more standard format like mp4/aac if supported (Safari/Edge)
        // Fallback to webm (Chrome/Firefox)
        const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
        const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
        
        mediaRecorder = new MediaRecorder(stream, { mimeType });
        audioChunks = [];
        
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: mimeType });
          const url = await uploadToSupabase(audioBlob, `voice_note.${extension}`);
          if (url) {
            sendMsgPayload({ text: 'Nota de voz', type: 'file', file_url: url });
          }
          isRecording = false;
          updateMicUI();
        };

        mediaRecorder.start();
        isRecording = true;
        updateMicUI();
      } catch (err) {
        alert('No se pudo acceder al micrófono');
      }
    } else {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
  }

  function updateMicUI() {
    if (isRecording) {
      micBtn.classList.add('active');
      inputEl.style.display = 'none';
      recordingStatus.style.display = 'block';
    } else {
      micBtn.classList.remove('active');
      inputEl.style.display = 'block';
      recordingStatus.style.display = 'none';
    }
  }

  // Listeners
  imgBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = await uploadToSupabase(file, file.name);
      if (url) {
        sendMsgPayload({ text: '', type: 'file', file_url: url });
      }
      fileInput.value = '';
    }
  });

  micBtn.addEventListener('click', toggleRecording);

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
