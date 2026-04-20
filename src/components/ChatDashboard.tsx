"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  LogOut, Bot, User, Send, Search, MessageSquare, 
  BotOff, Paperclip, Tag, ChevronDown, Check, Info
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

const AVAILABLE_TAGS = [
  { id: 'ventas', label: 'Ventas', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'soporte', label: 'Soporte', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'queja', label: 'Queja', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { id: 'duda', label: 'Duda', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'vip', label: 'VIP', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
];

export default function ChatDashboard() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [showTagMenu, setShowTagMenu] = useState(false);
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

  const toggleTag = async (tagId: string) => {
    if (!activeChatId || !activeChat) return;
    
    let currentTags = activeChat.tags || [];
    let newTags;
    
    if (currentTags.includes(tagId)) {
      newTags = currentTags.filter((t: string) => t !== tagId);
    } else {
      newTags = [...currentTags, tagId];
    }
    
    // Optimistic update
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, tags: newTags } : c));
    
    try {
      const res = await fetch('/api/update-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: activeChatId, tags: newTags })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
    } catch (err: any) {
      console.error(err);
      alert("Para usar etiquetas, asegúrate de añadir la columna 'tags' (tipo text[]) a la tabla 'chats' en Supabase.");
      // Revert if failed
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, tags: currentTags } : c));
    }
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
    <div className="flex h-screen bg-[#0f1115] overflow-hidden text-gray-200 font-sans">
      
      {/* Sidebar - App Navigation */}
      <div className="w-16 bg-[#181a20] border-r border-white/5 flex flex-col items-center py-5 gap-8 z-20 shadow-xl">
        <div className="w-10 h-10 bg-gradient-to-br from-[#de93a3] to-[#c77a8a] rounded-xl flex items-center justify-center text-white font-bold shadow-lg shrink-0 transition-transform hover:scale-105 cursor-pointer">
          T
        </div>
        
        <div className="flex-1"></div>

        <button 
          onClick={handleLogout} 
          className="text-gray-400 hover:text-white hover:bg-white/10 p-3 rounded-xl transition-all flex flex-col items-center gap-1 w-12 group"
          title="Cerrar Sesión"
        >
          <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Chat List (CRM View) */}
      <div className="w-80 bg-[#181a20] border-r border-white/5 flex flex-col z-10">
        <div className="p-5 border-b border-white/5 bg-[#1e2128]">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
            <MessageSquare size={18} className="text-[#de93a3]" />
            Conversaciones
          </h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar chat..." 
              className="w-full bg-[#0f1115] border border-white/10 text-white placeholder-gray-500 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#de93a3] transition-shadow"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {chats.map(chat => {
            const chatTags = chat.tags || [];
            
            return (
              <div 
                key={chat.id} 
                onClick={() => setActiveChatId(chat.id)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/5 relative overflow-hidden ${activeChatId === chat.id ? 'bg-white/5 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#de93a3]' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-gray-100 flex items-center gap-2 truncate">
                    {chat.user_name || 'Anónimo'}
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {format(new Date(chat.created_at), 'HH:mm')}
                  </div>
                </div>
                
                <div className="flex justify-between items-end mt-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs text-gray-500 font-mono">ID: {chat.id.split('-')[0]}</div>
                    {/* Tags Badges */}
                    {chatTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chatTags.map((tagId: string) => {
                          const tagInfo = AVAILABLE_TAGS.find(t => t.id === tagId);
                          if (!tagInfo) return null;
                          return (
                            <span key={tagId} className={`text-[9px] px-1.5 py-0.5 rounded border ${tagInfo.color}`}>
                              {tagInfo.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {chat.agent_active ? (
                    <span className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium shrink-0">
                      <Bot size={10} /> Bot
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full font-medium shrink-0">
                      <User size={10} /> Humano
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#0f1115] relative">
        {activeChatId ? (
          <>
            {/* Header */}
            <div className="h-16 px-6 bg-[#181a20] border-b border-white/5 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center text-sm font-bold text-white shadow-inner">
                  {activeChat?.user_name ? activeChat.user_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-100 leading-none">
                    {activeChat?.user_name || 'Anónimo'}
                  </div>
                  <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> En línea
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                 {/* Tags Menu */}
                 <div className="relative">
                   <button 
                     onClick={() => setShowTagMenu(!showTagMenu)}
                     className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5"
                   >
                     <Tag size={14} /> Etiquetas <ChevronDown size={14} className={`transition-transform ${showTagMenu ? 'rotate-180' : ''}`} />
                   </button>
                   
                   {showTagMenu && (
                     <>
                       <div className="fixed inset-0 z-40" onClick={() => setShowTagMenu(false)}></div>
                       <div className="absolute right-0 mt-2 w-48 bg-[#1e2128] border border-white/10 rounded-xl shadow-2xl z-50 py-2 animate-in fade-in slide-in-from-top-2">
                         <div className="px-3 pb-2 mb-2 border-b border-white/5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                           Asignar Etiquetas
                         </div>
                         {AVAILABLE_TAGS.map(tag => {
                           const isSelected = (activeChat?.tags || []).includes(tag.id);
                           return (
                             <button
                               key={tag.id}
                               onClick={() => toggleTag(tag.id)}
                               className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-white/5 transition-colors text-sm text-gray-200"
                             >
                               <div className="flex items-center gap-2">
                                 <span className={`w-2 h-2 rounded-full ${tag.color.split(' ')[0]}`}></span>
                                 {tag.label}
                               </div>
                               {isSelected && <Check size={14} className="text-emerald-400" />}
                             </button>
                           );
                         })}
                       </div>
                     </>
                   )}
                 </div>

                 <div className="w-px h-6 bg-white/10 mx-1"></div>

                 <button 
                  onClick={toggleAgent}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border ${activeChat?.agent_active ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                 >
                   {activeChat?.agent_active ? (
                     <><BotOff size={14} /> Desactivar Bot</>
                   ) : (
                     <><Bot size={14} /> Activar Bot</>
                   )}
                 </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {messages.map((msg, idx) => {
                const isAgent = msg.sender === 'agent';
                const isFile = msg.type === 'file' && msg.file_url;
                const isImage = isFile && msg.file_url.match(/\.(jpg|jpeg|png|gif|webp)/i);
                const isAudio = isFile && msg.file_url.match(/\.(mp3|wav|ogg|m4a|weba)/i);

                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'} group`}>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl shadow-sm text-sm relative ${isAgent ? 'bg-gradient-to-br from-[#de93a3] to-[#c77a8a] text-white rounded-tr-sm' : 'bg-[#1e2128] border border-white/5 text-gray-200 rounded-tl-sm'}`}>
                      {msg.message && <div className={`${isFile ? 'mb-3' : ''} leading-relaxed`}>{msg.message}</div>}
                      
                      {isImage && (
                        <div className="rounded-xl overflow-hidden border border-white/10">
                          <img 
                            src={msg.file_url} 
                            alt="Attachment" 
                            className="max-w-full cursor-pointer hover:scale-105 transition-transform duration-300" 
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                        </div>
                      )}

                      {isAudio && (
                        <audio controls className="w-full h-10 mt-2 custom-audio">
                          <source src={msg.file_url} />
                          Navegador no soporta audio.
                        </audio>
                      )}

                      {isFile && !isImage && !isAudio && (
                        <a href={msg.file_url} target="_blank" className="flex items-center gap-2 p-3 rounded-lg bg-black/20 hover:bg-black/30 transition-colors text-white/90 font-medium text-xs">
                          <Paperclip size={16} /> Documento Adjunto
                        </a>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1.5 mx-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#181a20] border-t border-white/5 z-10">
              <div className="flex items-end gap-2 bg-[#0f1115] border border-white/10 rounded-2xl p-1.5 focus-within:border-[#de93a3]/50 focus-within:ring-1 focus-within:ring-[#de93a3]/50 transition-all">
                
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
                  className="p-3 text-gray-400 hover:text-[#de93a3] hover:bg-[#de93a3]/10 rounded-xl transition-colors disabled:opacity-30 mb-0.5"
                  title="Adjuntar archivo"
                >
                  <Paperclip size={20} />
                </button>

                <textarea 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={activeChat?.agent_active ? "El bot está gestionando este chat..." : "Escribe un mensaje..."}
                  disabled={activeChat?.agent_active}
                  rows={1}
                  className="flex-1 bg-transparent border-none text-gray-100 px-3 py-3 focus:outline-none focus:ring-0 text-sm disabled:opacity-50 disabled:cursor-not-allowed placeholder-gray-600 resize-none max-h-32 min-h-[44px]"
                  style={{ fieldSizing: 'content' } as any}
                />
                
                <button 
                  onClick={sendMessage}
                  disabled={!inputText.trim() || activeChat?.agent_active}
                  className="w-11 h-11 bg-gradient-to-br from-[#de93a3] to-[#c77a8a] text-white rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity shadow-md mb-0.5"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
              
              {activeChat?.agent_active && (
                <div className="flex items-center justify-center gap-2 text-xs text-amber-500/80 mt-3 font-medium bg-amber-500/10 py-1.5 rounded-lg">
                  <Info size={14} /> El bot está respondiendo automáticamente. Desactívalo para intervenir.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-500">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <MessageSquare size={32} className="text-gray-600" />
            </div>
            <p className="text-lg font-medium text-gray-400">Ningún chat seleccionado</p>
            <p className="text-sm mt-2 opacity-60">Selecciona una conversación del panel lateral</p>
          </div>
        )}
      </div>

      {/* Global CSS for scrollbars */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
        `
      }} />
    </div>
  );
}