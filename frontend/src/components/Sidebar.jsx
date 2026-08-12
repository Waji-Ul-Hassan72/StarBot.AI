import React, { useState, useEffect } from 'react';
import {
  MessageSquarePlus,
  MessageSquare,
  BarChart2,
  User,
  Sparkles,
  Cpu,
  Radio,
  Trash2,
  Pin
} from 'lucide-react';

export default function Sidebar({
  onNewChat,
  chats = [],
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onTogglePin,
  currentView,
  onNavigate
}) {
  const [latency, setLatency] = useState(18);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(Math.floor(Math.random() * (24 - 14 + 1)) + 14);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Sort chats: Pinned chats first, keeping original order for others
  const sortedChats = [...chats].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <aside className="w-64 h-full bg-[#18191c] border-r border-[#25272e] flex flex-col justify-between p-4 z-20 shrink-0 select-none">
      
      {/* TOP SECTION: BRAND & NEW CHAT */}
      <div className="flex flex-col gap-5 overflow-hidden flex-1">
        
        {/* APP BRAND HEADER */}
        <div className="flex items-center gap-3 px-2 pt-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#121316] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wider uppercase">Starbot.ai</h1>
            <p className="text-[10px] text-[#80838d]">Intelligence Engine</p>
          </div>
        </div>

        {/* ATTRACTIVE GRADIENT NEW CHAT BUTTON */}
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:via-indigo-500 hover:to-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-cyan-500/30 transition-all duration-300 active:scale-[0.97]"
        >
          <MessageSquarePlus className="w-4 h-4 text-cyan-100" />
          <span className="tracking-wide">New Chat</span>
        </button>

        {/* MAIN NAVIGATION */}
        <div className="flex flex-col gap-1 border-b border-[#25272e] pb-3">
          <button
            onClick={() => onNavigate('chat')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              currentView === 'chat'
                ? 'bg-[#23252a] text-white'
                : 'text-[#80838d] hover:text-white hover:bg-[#1f2024]'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Chat Workspace</span>
          </button>

          <button
            onClick={() => onNavigate('account')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              currentView === 'account'
                ? 'bg-[#23252a] text-white'
                : 'text-[#80838d] hover:text-white hover:bg-[#1f2024]'
            }`}
          >
            <User className="w-4 h-4 text-cyan-400" />
            <span>My Account</span>
          </button>
        </div>

        {/* RECENT CHATS LIST (Scrollbar completely hidden) */}
        <div className="flex flex-col flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <span className="text-[10px] font-semibold text-[#5b5d66] uppercase tracking-wider px-2 mb-2">
            Recent Conversations
          </span>

          {sortedChats.length === 0 ? (
            <p className="text-xs text-[#5b5d66] italic px-2 py-1">No chats yet</p>
          ) : (
            <div className="flex flex-col gap-1">
              {sortedChats.map((chat) => {
                const chatId = chat.id || chat._id;
                const isActive = activeChatId === chatId;
                const isPinned = Boolean(chat.isPinned);

                return (
                  <div
                    key={chatId}
                    onClick={() => onSelectChat(chatId)}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition ${
                      isActive
                        ? 'bg-[#25272e] text-white font-medium border-l-2 border-indigo-500'
                        : 'text-[#80838d] hover:text-white hover:bg-[#1f2024]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{chat.title || 'Untitled Chat'}</span>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* PIN CHAT BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTogglePin) {
                            onTogglePin(chatId, e);
                          }
                        }}
                        title={isPinned ? "Unpin conversation" : "Pin conversation"}
                        className={`p-1 rounded transition ${
                          isPinned
                            ? 'text-amber-400 hover:bg-amber-400/10 opacity-100'
                            : 'text-[#71737c] hover:text-white hover:bg-[#2d3039] opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-amber-400' : ''}`} />
                      </button>

                      {/* DELETE CHAT BUTTON */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteChat) {
                            onDeleteChat(chatId, e);
                          }
                        }}
                        title="Delete conversation"
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#71737c] hover:text-red-400 hover:bg-red-500/10 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </aside>
  );
}