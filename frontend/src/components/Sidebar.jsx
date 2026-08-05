import React, { useState, useEffect } from 'react';
import {
  MessageSquarePlus,
  MessageSquare,
  BarChart2,
  User,
  Sparkles,
  Cpu,
  Radio
} from 'lucide-react';

export default function Sidebar({
  onNewChat,
  chats = [],
  activeChatId,
  onSelectChat,
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

  return (
    <aside className="w-64 h-full bg-[#18191c] border-r border-[#25272e] flex flex-col justify-between p-4 z-20 shrink-0 select-none">
      
      {/* TOP SECTION: BRAND & NEW CHAT */}
      <div className="flex flex-col gap-5 overflow-hidden">
        
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
            onClick={() => onNavigate('analytics')}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
              currentView === 'analytics'
                ? 'bg-[#23252a] text-white'
                : 'text-[#80838d] hover:text-white hover:bg-[#1f2024]'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <span>Analytics</span>
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

        {/* RECENT CHATS LIST */}
        <div className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
          <span className="text-[10px] font-semibold text-[#5b5d66] uppercase tracking-wider px-2 mb-2">
            Recent Conversations
          </span>

          {chats.length === 0 ? (
            <p className="text-xs text-[#5b5d66] italic px-2 py-1">No chats yet</p>
          ) : (
            <div className="flex flex-col gap-1">
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs truncate transition flex items-center gap-2 ${
                    activeChatId === chat.id
                      ? 'bg-[#25272e] text-white font-medium border-l-2 border-indigo-500'
                      : 'text-[#80838d] hover:text-white hover:bg-[#1f2024]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{chat.title || 'Untitled Chat'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FOOTER: LIVE TELEMETRY CARD */}
      <div className="pt-3 border-t border-[#25272e]">
        <div className="p-3 bg-[#121316] border border-[#23252a] rounded-xl flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-emerald-400">Operational</span>
            </div>
            <span className="text-[10px] font-mono text-[#71737c]">{latency}ms</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-[#1c1d22] text-[11px] text-[#80838d]">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Engine</span>
            </div>
            <span className="font-semibold text-white text-[10px] bg-[#1d1f25] px-2 py-0.5 rounded-md border border-[#2a2d36]">
              Starbot v2.4
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#5b5d66]">
            <div className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              <span>Live Node</span>
            </div>
            <span>99.9% Uptime</span>
          </div>
        </div>
      </div>

    </aside>
  );
}