"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { LogOut, Bot, User, Send, Search, MessageSquare, BotOff } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

export default function ChatDashboard() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const activeChat = chats.find(c => c.id === activeChatId);

  // Fetch initial chats
  useEffect(() => {
    fetchChats();

    // Subscribe to new and updated chats
    const channel = supabase
      .channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, payload => {
        if (payload.eventType === 'INSERT') {
          setChats(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setChats(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch or subscribe to messages when active chat changes
  useEffect(() => {
    if (!activeChatId) return;

    fetchMessages(activeChatId);

    const channel = supabase
      .channel(`chat_${activeChatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `chat_id=eq.${activeChatId}`
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChatId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setChats(data);
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const toggleAgent = async () => {
    if (!activeChatId) return;
    const newState = !activeChat?.agent_active;
    
    // Optimistic update
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, agent_active: newState } : c));
    
    await fetch('/api/toggle-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: activeChatId, agent_active: newState })
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !activeChatId) return;
    
    // Optimistic UI for Agent Message
    const tempMsg = {
      id: crypto.randomUUID(),
      chat_id: activeChatId,
      sender: 'agent',
      message: inputText,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMsg]);
    const currentInput = inputText;
    setInputText("");

    await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: activeChatId, message: currentInput })
    });
  };

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      
      {/* Sidebar - App Navigation */}
      <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4 gap-8 z-10">
        <div className="w-10 h-10 bg-[#de93a3] rounded-xl flex items-center justify-center text-white font-bold shadow-md shrink-0">
          T
        </div>
        
        <button 
          onClick={handleLogout} 
          className="text-gray-400 hover:text-white hover:bg-red-500/20 p-2 rounded-xl transition-all flex flex-col items-center gap-1 w-12"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
          <span className="text-[10px] font-medium uppercase">Salir</span>
        </button>
      </div>

      {/* Chat List (CRM View) */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700 bg-[#E095A6] text-white">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare size={20} />
            Conversaciones
          </h2>
          <div className="mt-3 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-200" size={16} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full bg-white/20 border-white/30 text-white placeholder-white/70 border rounded-full py-1.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-white"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {chats.map(chat => (
            <div 
              key={chat.id} 
              onClick={() => setActiveChatId(chat.id)}
              className={`p-4 border-b border-gray-700 cursor-pointer transition-colors hover:bg-gray-700 ${activeChatId === chat.id ? 'bg-gray-700' : ''}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-gray-100">{chat.user_name || 'Anónimo'}</div>
                <div className="text-xs text-gray-400">
                  {format(new Date(chat.created_at), 'HH:mm')}
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-400 truncate mr-2">ID: {chat.id.split('-')[0]}</div>
                {chat.agent_active ? (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    <Bot size={12} /> Bot
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] bg-orange-900/30 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                    <User size={12} /> Humano
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {activeChatId ? (
          <>
            {/* Header */}
            <div className="h-16 px-6 bg-gray-800 border-b border-gray-700 flex items-center justify-between shadow-sm z-10">
              <div className="font-semibold text-lg text-gray-100">
                {activeChat?.user_name}
              </div>
              <div>
                 <button 
                  onClick={toggleAgent}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeChat?.agent_active ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'}`}
                 >
                   {activeChat?.agent_active ? (
                     <><BotOff size={16} /> Apagar Bot</>
                   ) : (
                     <><Bot size={16} /> Encender Bot</>
                   )}
                 </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isAgent = msg.sender === 'agent';
                const isFile = msg.type === 'file' && msg.file_url;
                const isImage = isFile && msg.file_url.match(/\.(jpg|jpeg|png|gif|webp)/i);
                const isAudio = isFile && msg.file_url.match(/\.(mp3|wav|ogg|m4a|weba)/i);

                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-md px-4 py-2.5 rounded-2xl shadow-sm text-sm ${isAgent ? 'bg-[#de93a3] text-white rounded-br-sm' : 'bg-gray-800 border border-gray-700 text-gray-100 rounded-bl-sm'}`}>
                      {msg.message && <div className={isFile ? 'mb-2' : ''}>{msg.message}</div>}
                      
                      {isImage && (
                        <img 
                          src={msg.file_url} 
                          alt="Attachment" 
                          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => window.open(msg.file_url, '_blank')}
                        />
                      )}

                      {isAudio && (
                        <audio controls className="w-full h-8 mt-1">
                          <source src={msg.file_url} />
                          Your browser does not support the audio element.
                        </audio>
                      )}

                      {isFile && !isImage && !isAudio && (
                        <a href={msg.file_url} target="_blank" className="flex items-center gap-2 underline text-white/90">
                          <MessageSquare size={14} /> Ver archivo adjunto
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 mt-1 mx-1">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <div className="flex items-center gap-2">
                <input 
                   type="file" 
                   id="admin-file-input" 
                   className="hidden" 
                   onChange={async (e) => {
                     const file = e.target.files?.[0];
                     if (!file || !activeChatId) return;
                     
                     const filePath = `chat-files/${activeChatId}/${crypto.randomUUID()}_${file.name}`;
                     const { data, error } = await supabase.storage
                       .from('chat-files')
                       .upload(filePath, file);

                     if (error) {
                       alert('Error al subir: ' + error.message);
                       return;
                     }

                     const { data: { publicUrl } } = supabase.storage
                       .from('chat-files')
                       .getPublicUrl(filePath);

                     await fetch('/api/send-message', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ 
                         chat_id: activeChatId, 
                         message: '', 
                         type: 'file', 
                         file_url: publicUrl 
                       })
                     });
                   }}
                />
                
                <button 
                  onClick={() => document.getElementById('admin-file-input')?.click()}
                  disabled={activeChat?.agent_active}
                  className="p-2 text-gray-400 hover:text-[#de93a3] transition-colors disabled:opacity-30"
                  title="Adjuntar imagen/archivo"
                >
                  <Search size={20} /> {/* Usando Search como icono de adjunto temporal o similar */}
                </button>

                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={activeChat?.agent_active ? "Apaga el bot para enviar un mensaje..." : "Escribe un mensaje al cliente..."}
                  disabled={activeChat?.agent_active}
                  className="flex-1 bg-gray-900 border border-gray-700 text-gray-100 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-[#de93a3] focus:border-transparent text-sm disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-500"
                />
                
                <button 
                  onClick={sendMessage}
                  disabled={!inputText.trim() || activeChat?.agent_active}
                  className="w-11 h-11 bg-[#de93a3] text-white rounded-full flex items-center justify-center hover:bg-[#cc7889] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
              {activeChat?.agent_active && (
                <div className="text-xs text-center text-gray-500 mt-2">
                  El bot está respondiendo automáticamente. Para intervenir, apaga el bot.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-400">
            <MessageSquare size={48} className="mb-4 opacity-50 text-[#de93a3]" />
            <p>Selecciona una conversación para comenzar</p>
          </div>
        )}
      </div>

    </div>
  );
}
