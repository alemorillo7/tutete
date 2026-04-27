"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  LogOut, Bot, User, Send, Search, MessageSquare, 
  BotOff, Paperclip, Tag, ChevronDown, Check, Info,
  Settings, Plus, Edit2, Trash2, X, Sun, Moon, NotebookPen
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";

const DEFAULT_TAGS = [
  { id: 'ventas', label: 'Ventas', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'soporte', label: 'Soporte', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'queja', label: 'Queja', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { id: 'duda', label: 'Duda', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 'vip', label: 'VIP', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
];

const SYSTEM_TAGS = [
  { id: 'agent-on', label: 'Bot Activo', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'agent-off', label: 'Bot Apagado', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const COLOR_OPTIONS = [
  { name: 'Azul', value: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { name: 'Púrpura', value: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { name: 'Rojo', value: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { name: 'Amarillo', value: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { name: 'Ámbar', value: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { name: 'Verde', value: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { name: 'Rosa', value: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { name: 'Cian', value: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { name: 'Gris', value: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
];

const CANNED_RESPONSES = [
  { trigger: '/saludo', text: '¡Hola! ¿En qué puedo ayudarte hoy?' },
  { trigger: '/despedida', text: '¡Gracias por comunicarte con nosotros! Que tengas un excelente día.' },
  { trigger: '/demora', text: 'Disculpa la demora, estamos revisando tu caso.' },
  { trigger: '/devolucion', text: 'Para procesar una devolución, necesitamos el número de pedido y fotos del producto.' },
];

export default function ChatDashboard() {
  const [chats, setChats] = useState<any[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [userTags, setUserTags] = useState(DEFAULT_TAGS);
  const [isManageTagsOpen, setIsManageTagsOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<{id: string, label: string, color: string} | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [chatFilter, setChatFilter] = useState<'all'|'bot'|'human'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [showCannedResponses, setShowCannedResponses] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const activeChat = chats.find(c => c.id === activeChatId);
  const AVAILABLE_TAGS = [...userTags, ...SYSTEM_TAGS];

  // Load custom tags and theme
  useEffect(() => {
    const savedTags = localStorage.getItem('tutete_custom_tags');
    if (savedTags) {
      try {
        setUserTags(JSON.parse(savedTags));
      } catch (e) {}
    }
    
    const savedTheme = localStorage.getItem('tutete_theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
    }
  }, []);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('tutete_theme', newMode ? 'dark' : 'light');
  };

  const saveUserTags = (tags: any[]) => {
    setUserTags(tags);
    localStorage.setItem('tutete_custom_tags', JSON.stringify(tags));
  };

  // Fetch initial chats
  useEffect(() => {
    fetchChats();

    // Subscribe to new and updated chats
    const channel = supabase
      .channel('public:chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, payload => {
        if (payload.eventType === 'INSERT') {
          setChats(prev => [{ ...payload.new, lastActivity: new Date(payload.new.created_at).getTime() }, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setChats(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c));
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        // When a new message arrives, update the lastActivity of the corresponding chat
        // and resort the chats array
        setChats(prev => {
          const updatedChats = prev.map(chat => {
            if (chat.id === payload.new.chat_id) {
              return { ...chat, lastActivity: new Date(payload.new.created_at).getTime() };
            }
            return chat;
          });
          return updatedChats.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
        });
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

  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, 'HH:mm');
    }
    if (isYesterday(date)) {
      return 'Ayer';
    }
    return format(date, 'd MMM', { locale: es });
  };

  const fetchChats = async () => {
    const { data } = await supabase
      .from('chats')
      .select('*, messages(created_at)')
      .order('created_at', { ascending: false });
      
    if (data) {
      // Calculate last activity time for sorting
      const chatsWithLastActivity = data.map(chat => {
        const messageDates = chat.messages?.map((m: any) => new Date(m.created_at).getTime()) || [];
        const chatCreatedDate = new Date(chat.created_at).getTime();
        const lastActivity = messageDates.length > 0 ? Math.max(...messageDates) : chatCreatedDate;
        return { ...chat, lastActivity };
      });
      
      // Sort by last activity descending
      chatsWithLastActivity.sort((a, b) => b.lastActivity - a.lastActivity);
      setChats(chatsWithLastActivity);
    }
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
    if (!activeChatId || !activeChat) return;
    const newState = !activeChat.agent_active;
    
    // Optimistic update
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        let currentTags = c.tags || [];
        currentTags = currentTags.filter((t: string) => t !== 'agent-on' && t !== 'agent-off');
        currentTags.push(newState ? 'agent-on' : 'agent-off');
        return { ...c, agent_active: newState, tags: currentTags };
      }
      return c;
    }));
    
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
      type: isInternalNote ? 'internal_note' : 'text',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempMsg]);
    const currentInput = inputText;
    const currentIsInternal = isInternalNote;
    setInputText("");
    setShowCannedResponses(false);
    
    // Si era nota interna, podemos desactivarla después de enviarla para mayor seguridad
    // setIsInternalNote(false); 

    await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: activeChatId, 
        message: currentInput,
        is_internal: currentIsInternal
      })
    });
  };

  const filteredChats = chats.filter(c => {
    // Filter by type
    if (chatFilter === 'bot' && !c.agent_active) return false;
    if (chatFilter === 'human' && c.agent_active) return false;
    
    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const userName = (c.user_name || '').toLowerCase();
      const id = c.id.toLowerCase();
      return userName.includes(q) || id.includes(q);
    }
    
    return true;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    
    if (text.startsWith('/')) {
      setShowCannedResponses(true);
    } else {
      setShowCannedResponses(false);
    }
  };

  const applyCannedResponse = (text: string) => {
    setInputText(text);
    setShowCannedResponses(false);
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'bg-[#0f1115] text-gray-200' : 'bg-[#F8F9FA] text-gray-800'}`}>
      
      {/* Sidebar - App Navigation */}
      <div className={`w-16 flex flex-col items-center py-5 gap-8 z-20 shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-[#181a20] border-r border-white/5' : 'bg-white border-r border-gray-200'}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm shrink-0 transition-transform hover:scale-105 cursor-pointer ${isDarkMode ? 'bg-gradient-to-br from-[#E59EAF] to-[#D4899A]' : 'bg-[#E59EAF]'}`}>
          T
        </div>
        
        <div className="flex-1"></div>

        <button 
          onClick={toggleTheme} 
          className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 w-12 group ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-[#E59EAF] hover:bg-pink-50'}`}
          title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
        >
          {isDarkMode ? <Sun size={20} className="group-hover:rotate-45 transition-transform" /> : <Moon size={20} className="group-hover:-rotate-12 transition-transform" />}
        </button>

        <button 
          onClick={handleLogout} 
          className={`p-3 rounded-xl transition-all flex flex-col items-center gap-1 w-12 group ${isDarkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-[#E59EAF] hover:bg-pink-50'}`}
          title="Cerrar Sesión"
        >
          <LogOut size={20} className="group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Chat List (CRM View) */}
      <div className={`w-80 flex flex-col z-10 shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-[#181a20] border-r border-white/5' : 'bg-white border-r border-gray-200'}`}>
        <div className={`p-5 border-b transition-colors duration-300 ${isDarkMode ? 'bg-[#1e2128] border-white/5' : 'bg-[#FAFAFA] border-gray-100'}`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 tracking-tight ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            <MessageSquare size={18} className="text-[#E59EAF]" />
            Conversaciones
          </h2>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input 
              type="text" 
              placeholder="Buscar chat o ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#E59EAF]/50 focus:border-[#E59EAF] transition-all shadow-sm ${isDarkMode ? 'bg-[#0f1115] border border-white/10 text-white placeholder-gray-500' : 'bg-white border border-gray-200 text-gray-800 placeholder-gray-400'}`}
            />
          </div>
          
          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setChatFilter('all')}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${chatFilter === 'all' ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-200 text-gray-800') : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setChatFilter('human')}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${chatFilter === 'human' ? (isDarkMode ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700') : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')}`}
            >
              Humano
            </button>
            <button 
              onClick={() => setChatFilter('bot')}
              className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${chatFilter === 'bot' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'text-gray-400 hover:bg-white/5' : 'text-gray-500 hover:bg-gray-100')}`}
            >
              Bot Activo
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredChats.map(chat => {
            const chatTags = chat.tags || [];
            
            // Extract last message text if available
            let lastMessageText = "";
            if (chat.messages && chat.messages.length > 0) {
              const lastMsgObj = [...chat.messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
              lastMessageText = lastMsgObj.type === 'file' ? 'Adjunto 📎' : lastMsgObj.message || '';
            }

            return (
              <div 
                key={chat.id} 
                onClick={() => setActiveChatId(chat.id)}
                className={`p-4 border-b cursor-pointer transition-all relative overflow-hidden ${
                  isDarkMode 
                    ? `border-white/5 hover:bg-white/5 ${activeChatId === chat.id ? 'bg-white/5 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#E59EAF]' : ''}`
                    : `border-gray-100 hover:bg-gray-50 ${activeChatId === chat.id ? 'bg-[#FFF5F7] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[#E59EAF]' : ''}`
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className={`font-semibold flex items-center gap-2 truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                    {chat.user_name || 'Anónimo'}
                  </div>
                  <div className={`text-xs whitespace-nowrap ml-2 font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {formatChatDate(chat.lastActivity ? new Date(chat.lastActivity).toISOString() : chat.created_at)}
                  </div>
                </div>
                
                {/* Last message preview */}
                {lastMessageText && (
                  <div className={`text-[13px] truncate mt-0.5 mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {lastMessageText}
                  </div>
                )}
                
                <div className="flex justify-between items-end mt-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="text-xs text-gray-400 font-mono">ID: {chat.id.split('-')[0]}</div>
                    {/* Tags Badges */}
                    {chatTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {chatTags.map((tagId: string) => {
                          const tagInfo = AVAILABLE_TAGS.find(t => t.id === tagId);
                          if (!tagInfo) return null;
                          return (
                            <span key={tagId} className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${isDarkMode ? tagInfo.color : tagInfo.color.replace('bg-', 'bg-').replace('/20', '/10')}`}>
                              {tagInfo.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {chat.agent_active ? (
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 shadow-sm ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
                      <Bot size={10} /> Bot
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 shadow-sm ${isDarkMode ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-orange-50 text-orange-600 border border-orange-200'}`}>
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
      <div className={`flex-1 flex flex-col relative transition-colors duration-300 ${isDarkMode ? 'bg-[#0f1115]' : 'bg-white'}`}>
        {activeChatId ? (
          <>
            {/* Header */}
            <div className={`h-16 px-6 border-b flex items-center justify-between shadow-sm z-10 transition-colors duration-300 ${isDarkMode ? 'bg-[#181a20] border-white/5' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${isDarkMode ? 'bg-gradient-to-tr from-gray-700 to-gray-600 text-white' : 'bg-gradient-to-tr from-gray-100 to-gray-200 border border-gray-300 text-gray-600'}`}>
                  {activeChat?.user_name ? activeChat.user_name.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div className={`font-bold text-sm leading-none ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                    {activeChat?.user_name || 'Anónimo'}
                  </div>
                  <div className={`text-xs mt-1.5 flex items-center gap-1.5 font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${isDarkMode ? 'bg-emerald-400' : 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]'}`}></span> En línea
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                 {/* Tags Menu */}
                 <div className="relative">
                   <button 
                     onClick={() => setShowTagMenu(!showTagMenu)}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm ${isDarkMode ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                   >
                     <Tag size={14} /> Etiquetas <ChevronDown size={14} className={`transition-transform ${showTagMenu ? 'rotate-180' : ''}`} />
                   </button>
                   
                   {showTagMenu && (
                     <>
                       <div className="fixed inset-0 z-40" onClick={() => setShowTagMenu(false)}></div>
                       <div className={`absolute right-0 mt-2 w-56 border rounded-xl shadow-lg z-50 py-2 animate-in fade-in slide-in-from-top-2 ${isDarkMode ? 'bg-[#1e2128] border-white/10' : 'bg-white border-gray-200'}`}>
                         <div className={`px-4 pb-3 mb-2 border-b flex items-center justify-between ${isDarkMode ? 'border-white/5' : 'border-gray-100'}`}>
                           <span className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Etiquetas</span>
                           <button 
                             onClick={() => {
                               setShowTagMenu(false);
                               setIsManageTagsOpen(true);
                             }}
                             className={`transition-colors p-1.5 rounded-md ${isDarkMode ? 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100'}`}
                             title="Administrar Etiquetas"
                           >
                             <Settings size={14} />
                           </button>
                         </div>
                         <div className="max-h-64 overflow-y-auto custom-scrollbar">
                           {AVAILABLE_TAGS.map(tag => {
                             const isSelected = (activeChat?.tags || []).includes(tag.id);
                             return (
                               <button
                                 key={tag.id}
                                 onClick={() => toggleTag(tag.id)}
                                 className={`w-full px-4 py-2 flex items-center justify-between transition-colors text-sm ${isDarkMode ? 'hover:bg-white/5 text-gray-200' : 'hover:bg-gray-50 text-gray-700'}`}
                               >
                                 <div className="flex items-center gap-2.5">
                                   <span className={`w-2.5 h-2.5 rounded-full ${tag.color.split(' ')[0]}`}></span>
                                   <span className="font-medium">{tag.label}</span>
                                 </div>
                                 {isSelected && <Check size={16} className="text-[#E59EAF]" />}
                               </button>
                             );
                           })}
                         </div>
                       </div>
                     </>
                   )}
                 </div>

                 <div className={`w-px h-6 mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}></div>

                 <button 
                  onClick={toggleAgent}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all border shadow-sm ${
                    activeChat?.agent_active 
                      ? (isDarkMode ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100')
                      : (isDarkMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100')
                  }`}
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
            <div className={`flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar transition-colors duration-300 ${isDarkMode ? '' : 'bg-[#F8F9FA]'}`}>
              {messages.map((msg, idx) => {
                const isAgent = msg.sender === 'agent';
                const isFile = msg.type === 'file' && msg.file_url;
                const isInternal = msg.type === 'internal_note';
                const cleanFileUrl = isFile ? String(msg.file_url).split('?')[0].split('#')[0] : '';
                const isImage = isFile && cleanFileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                const isAudio = isFile && cleanFileUrl.match(/\.(mp3|wav|ogg|m4a|weba)$/i);

                return (
                  <div key={msg.id || idx} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'} group`}>
                    <div className={`max-w-[75%] px-5 py-3.5 rounded-2xl shadow-sm text-[15px] relative ${
                      isInternal 
                        ? (isDarkMode ? 'bg-amber-500/20 border border-amber-500/30 text-amber-100 rounded-br-sm' : 'bg-[#FFF9E6] border border-amber-200 text-amber-900 rounded-br-sm')
                        : isAgent 
                          ? (isDarkMode ? 'bg-gradient-to-br from-[#E59EAF] to-[#D4899A] text-white rounded-tr-sm' : 'bg-[#E59EAF] text-white rounded-tr-sm') 
                          : (isDarkMode ? 'bg-[#1e2128] border border-white/5 text-gray-200 rounded-tl-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm')
                    }`}>
                      {isInternal && (
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2 opacity-80">
                          <NotebookPen size={12} /> Nota Interna
                        </div>
                      )}
                      {isImage && (
                        <div className={`rounded-xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
                          <img 
                            src={msg.file_url} 
                            alt="Attachment" 
                            className="max-w-full cursor-pointer hover:scale-105 transition-transform duration-300" 
                            onClick={() => window.open(msg.file_url, '_blank')}
                          />
                        </div>
                      )}

                      {msg.message && (
                        <div className={`${isImage ? 'mt-3' : isFile ? 'mb-3' : ''} leading-relaxed`}>
                          {msg.message}
                        </div>
                      )}

                      {isAudio && (
                        <audio controls className="w-full h-10 mt-2 custom-audio">
                          <source src={msg.file_url} />
                          Navegador no soporta audio.
                        </audio>
                      )}

                      {isFile && !isImage && !isAudio && (
                        <a href={msg.file_url} target="_blank" className={`flex items-center gap-2 p-3 rounded-lg transition-colors font-medium text-sm ${
                          isAgent 
                            ? (isDarkMode ? 'bg-black/20 hover:bg-black/30 text-white/90' : 'bg-black/10 hover:bg-black/20 text-white') 
                            : (isDarkMode ? 'bg-black/20 hover:bg-black/30 text-white/90' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200')
                        }`}>
                          <Paperclip size={16} /> Documento Adjunto
                        </a>
                      )}
                    </div>
                    <span className={`text-[11px] mt-1.5 mx-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {format(new Date(msg.created_at), 'HH:mm')}
                    </span>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-5 border-t z-10 transition-colors duration-300 ${isDarkMode ? 'bg-[#181a20] border-white/5' : 'bg-white border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]'} relative`}>
              
              {/* Canned Responses Popover */}
              {showCannedResponses && (
                <div className={`absolute bottom-full mb-2 left-5 w-80 rounded-xl shadow-xl border overflow-hidden z-50 ${isDarkMode ? 'bg-[#1e2128] border-white/10' : 'bg-white border-gray-200'}`}>
                  <div className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-b ${isDarkMode ? 'text-gray-400 border-white/5' : 'text-gray-500 border-gray-100'}`}>
                    Respuestas Rápidas
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {CANNED_RESPONSES.filter(c => c.trigger.startsWith(inputText)).map(canned => (
                      <button
                        key={canned.trigger}
                        onClick={() => applyCannedResponse(canned.text)}
                        className={`w-full text-left px-4 py-2.5 transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`font-mono text-xs mb-1 ${isDarkMode ? 'text-[#E59EAF]' : 'text-[#D4899A]'}`}>{canned.trigger}</div>
                        <div className={`text-sm truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{canned.text}</div>
                      </button>
                    ))}
                    {CANNED_RESPONSES.filter(c => c.trigger.startsWith(inputText)).length === 0 && (
                      <div className={`px-4 py-3 text-sm text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        No hay respuestas que coincidan.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mode Toggle (Message vs Internal Note) */}
              <div className="flex gap-2 mb-3">
                <button 
                  onClick={() => setIsInternalNote(false)}
                  className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-all ${
                    !isInternalNote 
                      ? (isDarkMode ? 'bg-white/10 text-white' : 'bg-gray-800 text-white') 
                      : (isDarkMode ? 'text-gray-500 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100')
                  }`}
                >
                  Mensaje
                </button>
                <button 
                  onClick={() => setIsInternalNote(true)}
                  className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-md transition-all ${
                    isInternalNote 
                      ? (isDarkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700') 
                      : (isDarkMode ? 'text-gray-500 hover:bg-white/5' : 'text-gray-400 hover:bg-gray-100')
                  }`}
                >
                  <NotebookPen size={12} /> Nota Interna
                </button>
              </div>

              <div className={`flex items-end gap-2 border rounded-2xl p-1.5 transition-all shadow-sm ${
                isInternalNote 
                  ? (isDarkMode ? 'bg-amber-500/5 border-amber-500/20 focus-within:border-amber-500/50' : 'bg-[#FFFCF5] border-amber-200 focus-within:border-amber-400')
                  : (isDarkMode ? 'bg-[#0f1115] border-white/10 focus-within:border-[#E59EAF]/50 focus-within:ring-1 focus-within:ring-[#E59EAF]/50' : 'bg-[#F8F9FA] border-gray-300 focus-within:border-[#E59EAF] focus-within:ring-2 focus-within:ring-[#E59EAF]/20')
              }`}>
                
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
                  className={`p-3 rounded-xl transition-colors disabled:opacity-30 mb-0.5 ${isDarkMode ? 'text-gray-400 hover:text-[#E59EAF] hover:bg-[#E59EAF]/10' : 'text-gray-400 hover:text-[#E59EAF] hover:bg-pink-50'}`}
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
                  placeholder={activeChat?.agent_active ? "El bot está gestionando este chat..." : isInternalNote ? "Escribe una nota interna (el cliente no la verá)..." : "Escribe tu respuesta..."}
                  disabled={activeChat?.agent_active}
                  rows={1}
                  className={`flex-1 bg-transparent border-none px-3 py-3 focus:outline-none focus:ring-0 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed resize-none max-h-32 min-h-[44px] font-medium ${isDarkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}`}
                  style={{ fieldSizing: 'content' } as any}
                />
                
                <button 
                  onClick={sendMessage}
                  disabled={!inputText.trim() || activeChat?.agent_active}
                  className={`w-11 h-11 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm mb-0.5 ${
                    isInternalNote
                      ? (isDarkMode ? 'bg-amber-600 hover:bg-amber-500' : 'bg-amber-500 hover:bg-amber-600')
                      : (isDarkMode ? 'bg-gradient-to-br from-[#E59EAF] to-[#D4899A] hover:opacity-90' : 'bg-[#E59EAF] hover:bg-[#D4899A]')
                  }`}
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
              
              {activeChat?.agent_active && (
                <div className={`flex items-center justify-center gap-2 text-[13px] mt-3 font-semibold py-2 rounded-lg shadow-sm ${isDarkMode ? 'text-amber-500/80 bg-amber-500/10' : 'text-amber-700 bg-amber-50 border border-amber-200'}`}>
                  <Info size={16} className={isDarkMode ? 'text-amber-500' : 'text-amber-500'} /> El bot está respondiendo automáticamente. Desactívalo para intervenir.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center flex-col transition-colors duration-300 ${isDarkMode ? '' : 'bg-[#F8F9FA]'}`}>
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-sm border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100'}`}>
              <MessageSquare size={40} className={isDarkMode ? 'text-gray-600' : 'text-gray-300'} />
            </div>
            <p className={`text-xl font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ningún chat seleccionado</p>
            <p className={`text-[15px] mt-2 font-medium ${isDarkMode ? 'text-gray-500 opacity-60' : 'text-gray-400'}`}>Selecciona una conversación del panel lateral para comenzar</p>
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

      {/* Manage Tags Modal */}
      {isManageTagsOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#1e2128] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#181a20]">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Tag size={18} className="text-[#E59EAF]" />
                Administrar Etiquetas
              </h3>
              <button 
                onClick={() => {
                  setIsManageTagsOpen(false);
                  setEditingTag(null);
                }}
                className="text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto custom-scrollbar">
              {/* Form to Add/Edit Tag */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-300 mb-3">
                  {editingTag ? 'Editar Etiqueta' : 'Nueva Etiqueta'}
                </h4>
                <div className="space-y-3">
                  <div>
                    <input 
                      type="text" 
                      placeholder="Nombre de la etiqueta" 
                      value={editingTag ? editingTag.label : ''}
                      onChange={(e) => setEditingTag(prev => prev ? { ...prev, label: e.target.value } : { id: crypto.randomUUID(), label: e.target.value, color: COLOR_OPTIONS[0].value })}
                      className="w-full bg-[#0f1115] border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#E59EAF]"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(color => (
                      <button
                        key={color.name}
                        onClick={() => setEditingTag(prev => prev ? { ...prev, color: color.value } : { id: crypto.randomUUID(), label: '', color: color.value })}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${color.value.split(' ')[0]} ${editingTag?.color === color.value ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                        title={color.name}
                      />
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      disabled={!editingTag?.label.trim()}
                      onClick={() => {
                        if (!editingTag || !editingTag.label.trim()) return;
                        
                        let newTags;
                        if (userTags.find(t => t.id === editingTag.id)) {
                          // Update existing
                          newTags = userTags.map(t => t.id === editingTag.id ? editingTag : t);
                        } else {
                          // Create new
                          newTags = [...userTags, editingTag];
                        }
                        
                        saveUserTags(newTags);
                        setEditingTag(null);
                      }}
                      className="flex-1 bg-gradient-to-br from-[#E59EAF] to-[#D4899A] text-white py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {editingTag && userTags.find(t => t.id === editingTag.id) ? (
                        <><Check size={16} /> Guardar Cambios</>
                      ) : (
                        <><Plus size={16} /> Añadir Etiqueta</>
                      )}
                    </button>
                    {editingTag && (
                      <button
                        onClick={() => setEditingTag(null)}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* List of Custom Tags */}
              <h4 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider text-xs">Tus Etiquetas</h4>
              <div className="space-y-2">
                {userTags.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No has creado etiquetas personalizadas.</p>
                ) : (
                  userTags.map(tag => (
                    <div key={tag.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                      <span className={`text-xs px-2 py-1 rounded border ${tag.color}`}>
                        {tag.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setEditingTag(tag)}
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm(`¿Estás seguro de eliminar la etiqueta "${tag.label}"?`)) {
                              saveUserTags(userTags.filter(t => t.id !== tag.id));
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
