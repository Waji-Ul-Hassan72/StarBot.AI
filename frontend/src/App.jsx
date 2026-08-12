import axios from 'axios';
import Sidebar from './components/Sidebar';
import React, { useState, useRef, useEffect } from 'react';
import Login from './components/Login'; 
import Signup from './components/Signup';
import {
  ArrowUp,
  Sparkles,
  User,
  Mail,
  Trash2,
  MessageSquare,
  ArrowRight,
  AlertCircle,
  X
} from 'lucide-react';

const MAX_CHAR_LIMIT = 1000;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  
  const [currentAuthView, setCurrentAuthView] = useState('login'); 
  
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
          email: payload.email || payload.sub || 'Logged-in User',
          username: payload.username || payload.name || 'User'
        };
      } catch (e) {
        return { email: 'Active Account', username: 'User' };
      }
    }
    return null;
  });

  const [currentView, setCurrentView] = useState('chat');
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);               
  const [activeChatId, setActiveChatId] = useState(null); 

  const latestMessageRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      latestMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, loading]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          console.warn('Unauthorized or Forbidden response detected. Logging out user.');
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse user from localStorage', e);
        }
      } else {
        const token = localStorage.getItem('token');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setUser({
              email: payload.email || payload.sub || 'Logged-in User',
              username: payload.username || payload.name || 'User'
            });
          } catch (e) {
            setUser({ email: 'Active Account', username: 'User' });
          }
        }
      }
    }
  }, [isAuthenticated]);

  const performLogout = () => {
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');  
    setIsAuthenticated(false);        
    setUser(null);
    setMessages([]);                  
    setChats([]);
    setActiveChatId(null);
    setCurrentView('chat');
    setErrorMessage('');
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      performLogout();
    }
  };

  const fetchUserChats = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/chats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChats(response.data);
    } catch (err) {
      console.error('Failed to fetch user chats:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        performLogout();
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserChats();
    }
  }, [isAuthenticated]);

  const handleSelectChat = async (chatId) => {
    try {
      setCurrentView('chat'); 
      setErrorMessage('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        setMessages([{ sender: 'bot', text: '🔒 Session expired or token missing. Redirecting to login...' }]);
        setTimeout(() => performLogout(), 1500);
        return;
      }

      const response = await axios.get(`http://localhost:5000/api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setActiveChatId(chatId);

      const formattedMessages = response.data.messages.map(msg => ({
        sender: msg.sender,
        text: msg.text
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Failed to load chat messages:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setMessages([{ sender: 'bot', text: '🔒 Session expired or unauthorized (403). Redirecting to login...' }]);
        setTimeout(() => performLogout(), 1500);
      }
    }
  };

  const handleNewChat = () => {
    setCurrentView('chat');           
    setActiveChatId(null);            
    setMessages([]);
    setInputQuery('');
    setLoading(false);
    setErrorMessage('');
  };

  const handleDeleteChat = async (chatId, e) => {
    if (e) e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this chat session?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return performLogout();

      await axios.delete(`http://localhost:5000/api/chats/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setChats((prevChats) =>
        prevChats.filter((chat) => String(chat.id || chat._id) !== String(chatId))
      );

      if (activeChatId && String(activeChatId) === String(chatId)) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        performLogout();
      }
    }
  };
  
   const handleTogglePin = async (chatId, e) => {
  if (e) e.stopPropagation();

  try {
    const token = localStorage.getItem('token');
    const response = await axios.patch(
      `http://localhost:5000/api/chats/${chatId}/pin`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const updatedChat = response.data;

    // Update local state so UI updates immediately
    setChats((prevChats) =>
      prevChats.map((chat) => {
        const id = chat.id || chat._id;
        if (String(id) === String(chatId)) {
          return {
            ...chat,
            isPinned: updatedChat.is_pinned !== undefined ? updatedChat.is_pinned : updatedChat.isPinned
          };
        }
        return chat;
      })
    );
  } catch (err) {
    console.error('Failed to pin chat:', err);
  }
};

  const handleInputChange = (e) => {
    setInputQuery(e.target.value);
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const sendQueryText = async (textToSend) => {
    if (!textToSend.trim() || loading) return;

    setErrorMessage('');
    const userMessage = textToSend;
    const token = localStorage.getItem('token');
    let currentChatId = activeChatId;

    if (!token) {
      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: userMessage },
        { sender: 'bot', text: '🔒 Session expired or token missing. Redirecting to login...' }
      ]);
      setInputQuery('');
      setTimeout(() => performLogout(), 1500);
      return;
    }

    const chatExists = chats.some((c) => String(c.id || c._id) === String(currentChatId));
    if (!chatExists) {
      currentChatId = null;
    }

    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInputQuery('');
    setLoading(true);

    try {
      if (!currentChatId) {
        const titleSnippet = userMessage.length > 30 ? userMessage.slice(0, 30) + '...' : userMessage;
        const newChatRes = await axios.post(
          'http://localhost:5000/api/chats',
          { title: titleSnippet },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        currentChatId = newChatRes.data.id || newChatRes.data._id;
        setActiveChatId(currentChatId);
      }

      await axios.post(
        `http://localhost:5000/api/chats/${currentChatId}/message`,
        { sender: 'user', text: userMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const response = await axios.post('http://localhost:5000/api/chat', {
        prompt: userMessage,
        history: messages
      });

      const botText = response.data.answer || response.data.response || response.data.reply || "No response received.";

      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: botText },
      ]);

      await axios.post(
        `http://localhost:5000/api/chats/${currentChatId}/message`,
        { sender: 'bot', text: botText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchUserChats();

    } catch (error) {
      console.error('Error in chat execution:', error);

      const status = error.response?.status;
      
      if (status === 401 || status === 403) {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: '🔒 Session expired or unauthorized (403). Redirecting to login...' },
        ]);
        setTimeout(() => {
          performLogout();
        }, 1500);
      } else {
        const backendError = 
          error.response?.data?.error || 
          error.response?.data?.message || 
          (typeof error.response?.data === 'string' ? error.response?.data : null) || 
          'Error connecting to backend service.';

        setErrorMessage(backendError);

        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: `⚠️ Error: ${backendError}` },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleSend = () => {
    if (inputQuery.length > MAX_CHAR_LIMIT) {
      setErrorMessage(`Your prompt is too long (${inputQuery.length} characters). Please keep it under ${MAX_CHAR_LIMIT} characters.`);
      return;
    }
    sendQueryText(inputQuery);
  };

  const isOverLimit = inputQuery.length > MAX_CHAR_LIMIT;

  if (!isAuthenticated) {
    if (currentAuthView === 'login') {
      return (
        <Login 
          onLoginSuccess={() => setIsAuthenticated(true)} 
          switchToSignup={() => setCurrentAuthView('signup')} 
        />
      );
    } else {
      return (
        <Signup 
          onSignupSuccess={() => setCurrentAuthView('login')} 
          switchToLogin={() => setCurrentAuthView('login')} 
        />
      );
    }
  }

  return (
    <div className="fixed inset-0 h-screen w-screen bg-[#121316] text-[#e1e2e6] font-sans antialiased flex overflow-hidden">
      
      {/* SIDEBAR */}
      <Sidebar 
        onNewChat={handleNewChat} 
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onTogglePin={handleTogglePin}
        currentView={currentView}
        onNavigate={setCurrentView}
      />

      {/* FULL SCREEN SCROLLABLE MAIN SECTION */}
      <main className="flex-1 h-full overflow-y-auto relative scrollbar-thin scrollbar-thumb-[#2a2d34] scrollbar-track-transparent">
        
        {/* LOGOUT BUTTON */}
        <button 
          onClick={handleLogout}
          className="fixed top-6 right-8 z-50 px-4 py-1.5 bg-[#18191c]/80 backdrop-blur-md border border-[#2a2d34] text-sm text-[#80838d] hover:text-white hover:border-[#40434a] rounded-lg transition"
        >
          Logout
        </button>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-600/10 blur-[130px] pointer-events-none rounded-full" />

        {/* MY ACCOUNT VIEW */}
        {currentView === 'account' && (
          <div className="max-w-md w-full mx-auto px-6 pt-24 pb-12 flex flex-col items-center justify-center min-h-screen">
            <div className="w-full bg-[#18191c] border border-[#27292d] rounded-2xl p-8 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              
              <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-tr from-indigo-600/20 to-cyan-500/20 blur-2xl rounded-full pointer-events-none" />

              <div className="relative mb-5">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-500 to-cyan-400 p-1 shadow-xl shadow-indigo-500/20">
                  <div className="w-full h-full bg-[#121316] rounded-full flex items-center justify-center text-3xl font-bold text-white uppercase">
                    {user?.username ? user.username.charAt(0) : (user?.email ? user.email.charAt(0) : <User className="w-10 h-10" />)}
                  </div>
                </div>
                <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-[#18191c] rounded-full animate-pulse" title="Active Session" />
              </div>

              <div className="flex items-center gap-2 justify-center mb-1">
                <h2 className="text-2xl font-bold text-white tracking-tight capitalize">
                  {user?.username || user?.name || 'Active User'}
                </h2>
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
              </div>

              <p className="text-sm text-[#80838d] flex items-center gap-2 justify-center">
                <Mail className="w-4 h-4 text-indigo-400" />
                {user?.email || 'Logged-in Account'}
              </p>

            </div>
          </div>
        )}

        {/* CHAT VIEW - FULL SCREEN CONTENT */}
        {currentView === 'chat' && (
          <div className="max-w-4xl w-full mx-auto px-6 pt-12 pb-10 flex flex-col min-h-screen justify-between">
            
            {/* TOP CONTENT: HEADER & MESSAGES TOGETHER */}
            <div className="flex flex-col w-full">
              
              {/* HEADER */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-3 group">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 blur-xl opacity-50" />
                  <div className="relative w-12 h-12 bg-[#18191c] border border-[#2e3138] rounded-2xl flex items-center justify-center shadow-2xl">
                    <span className="text-cyan-400 font-bold text-lg">⟨/⟩</span>
                  </div>
                </div>

                <h1 className="text-2xl font-medium tracking-tight text-white text-center">
                  {getGreeting()}, ready to start?
                </h1>
              </div>

              {/* MESSAGES FLOW NATURALLY */}
              <div className="w-full flex flex-col gap-6 mb-8">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl max-w-[85%] ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600/30 text-white self-end border border-indigo-500/40'
                        : 'bg-[#18191c] text-[#e1e2e6] self-start border border-[#2a2d34]'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  </div>
                ))}

                {loading && (
                  <div className="p-4 rounded-xl max-w-[85%] bg-[#18191c] text-[#e1e2e6] self-start border border-[#2a2d34] flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                )}

                <div ref={latestMessageRef} />
              </div>

            </div>

            {/* CHAT INPUT AT THE BOTTOM */}
            <div className="w-full pt-4 sticky bottom-0 bg-[#121316]/80 backdrop-blur-md pb-4 z-20">
              
              {errorMessage && (
                <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center justify-between gap-3 text-red-400 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={() => setErrorMessage('')}
                    className="p-1 hover:bg-red-500/20 rounded-lg text-red-400 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className={`w-full bg-[#18191c] border ${
                  isOverLimit ? 'border-red-500/70 focus-within:ring-red-500/30' : 'border-[#2a2d34] focus-within:border-indigo-500/60'
                } focus-within:ring-1 rounded-2xl p-3 pl-4 pr-3 shadow-2xl transition-all duration-200 flex flex-col gap-2`}
              >
                <div className="flex items-center gap-3">
                  <textarea
                    rows={2}
                    value={inputQuery}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={loading}
                    placeholder={loading ? "Starbot is thinking..." : "Ask Starbot anything (Shift+Enter for line break)..."}
                    className="w-full bg-transparent text-sm text-white placeholder-[#5b5d66] focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  />

                  <button
                    type="submit"
                    disabled={loading || !inputQuery.trim() || isOverLimit}
                    className="p-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-95 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-indigo-500/20 shrink-0 flex items-center justify-center self-end"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#5b5d66] pt-1.5 border-t border-[#25272e]/60">
                  <span className="text-[10px] text-[#71737c]">
                    Press <kbd className="px-1 py-0.5 bg-[#25272e] rounded text-gray-300">Enter</kbd> to send
                  </span>
                  <span
                    className={`font-mono text-[11px] ${
                      isOverLimit
                        ? 'text-red-400 font-bold'
                        : inputQuery.length > MAX_CHAR_LIMIT * 0.85
                        ? 'text-amber-400'
                        : 'text-[#71737c]'
                    }`}
                  >
                    {inputQuery.length}/{MAX_CHAR_LIMIT}
                  </span>
                </div>
              </form>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}