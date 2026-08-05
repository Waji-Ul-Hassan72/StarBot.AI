import axios from 'axios';
import Sidebar from './components/Sidebar';
import React, { useState, useRef, useEffect } from 'react';
import Login from './components/Login'; 
import Signup from './components/Signup';
import {
  Paperclip,
  Database,
  ArrowUp,
  FileText,
  Compass,
  Sparkles,
  Mic,
  BarChart2,
  User,
  ShieldCheck,
  Activity,
  Cpu,
  Zap,
  Mail
} from 'lucide-react';

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
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);                 
  const [activeChatId, setActiveChatId] = useState(null); 

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Global Axios Interceptor for handling 401/403 globally
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

  const handleLogout = () => {
    localStorage.removeItem('token'); 
    localStorage.removeItem('user');  
    setIsAuthenticated(false);        
    setUser(null);
    setMessages([]);                  
    setChats([]);
    setActiveChatId(null);
    setCurrentView('chat');
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
        handleLogout();
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
      const token = localStorage.getItem('token');
      
      if (!token) {
        setMessages([{ sender: 'bot', text: '🔒 Session expired or token missing. Redirecting to login...' }]);
        setTimeout(() => handleLogout(), 1500);
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
        setTimeout(() => handleLogout(), 1500);
      }
    }
  };

  const handleNewChat = () => {
    setCurrentView('chat');           
    setActiveChatId(null);            
    setMessages([]);
    setInputQuery('');
    setLoading(false);
  };

  const handleSend = async () => {
    if (!inputQuery.trim() || loading) return;

    const userMessage = inputQuery;
    const token = localStorage.getItem('token');
    let currentChatId = activeChatId;

    // 1. Guard check if token was manually deleted before sending
    if (!token) {
      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: userMessage },
        { sender: 'bot', text: '🔒 Session expired or token missing. Redirecting to login...' }
      ]);
      setInputQuery('');
      setTimeout(() => handleLogout(), 1500);
      return;
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
        currentChatId = newChatRes.data.id;
        setActiveChatId(currentChatId);
        fetchUserChats(); 
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

      const botText = response.data.answer || response.data.response || "No response received.";

      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: botText },
      ]);

      await axios.post(
        `http://localhost:5000/api/chats/${currentChatId}/message`,
        { sender: 'bot', text: botText },
        { headers: { Authorization: `Bearer ${token}` } }
      );

    } catch (error) {
      console.error('Error in chat execution:', error);

      const status = error.response?.status;
      
      // 2. Display specific error message on page for 401 or 403 status code
      if (status === 401 || status === 403) {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: '🔒 Session expired or unauthorized (403). Redirecting to login...' },
        ]);
        setTimeout(() => {
          handleLogout();
        }, 1500);
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: error.response?.data?.message || 'Error connecting to backend service.' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

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
        currentView={currentView}
        onNavigate={setCurrentView}
      />

      {/* SINGLE MAIN PAGE SCROLLBAR (MAIN CONTAINER SCROLLS) */}
      <main className="flex-1 flex flex-col justify-between relative overflow-y-auto h-full w-full custom-scrollbar">
        
        {/* LOGOUT BUTTON */}
        <button 
          onClick={handleLogout}
          className="absolute top-6 right-8 z-50 px-4 py-1.5 bg-[#18191c] border border-[#2a2d34] text-sm text-[#80838d] hover:text-white hover:border-[#40434a] rounded-lg transition"
        >
          Logout
        </button>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-indigo-600/10 blur-[130px] pointer-events-none rounded-full" />

        {/* ANALYTICS VIEW */}
        {currentView === 'analytics' && (
          <div className="max-w-6xl w-full mx-auto px-8 pt-12 flex flex-col z-10 flex-1">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Analytics & Intelligence</h1>
                <p className="text-xs text-[#80838d] mt-1">Real-time model performance, token usage, and system throughput.</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#18191c] border border-[#2e3138] rounded-lg text-xs text-[#9ca3af]">
                <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Live System Status: Healthy</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-5 bg-[#18191c] border border-[#25272e] rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs text-[#80838d] font-medium">Token Consumption</h3>
                    <p className="text-lg font-semibold text-white">482.5K / 1M</p>
                  </div>
                </div>
                <div className="w-full bg-[#25272e] h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[48%]" />
                </div>
                <span className="text-[10px] text-[#80838d] mt-2 block">48% of monthly limit used</span>
              </div>

              <div className="p-5 bg-[#18191c] border border-[#25272e] rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-cyan-400">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs text-[#80838d] font-medium">Vector Index Retrieval</h3>
                    <p className="text-lg font-semibold text-white">99.4% Accuracy</p>
                  </div>
                </div>
                <div className="w-full bg-[#25272e] h-2 rounded-full overflow-hidden">
                  <div className="bg-cyan-400 h-full w-[99%]" />
                </div>
                <span className="text-[10px] text-emerald-400 mt-2 block">+1.2% precision score increase</span>
              </div>

              <div className="p-5 bg-[#18191c] border border-[#25272e] rounded-xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs text-[#80838d] font-medium">Avg API Latency</h3>
                    <p className="text-lg font-semibold text-white">184 ms</p>
                  </div>
                </div>
                <div className="w-full bg-[#25272e] h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full w-[25%]" />
                </div>
                <span className="text-[10px] text-[#80838d] mt-2 block">Optimal server throughput</span>
              </div>
            </div>

            <div className="bg-[#18191c] border border-[#25272e] rounded-xl p-5 mb-8">
              <h2 className="text-sm font-semibold text-white mb-4">Top Prompt Patterns & Data Queries</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#121316] border border-[#2a2d34] rounded-lg text-xs">
                  <span className="text-[#e1e2e6] font-medium">Financial & Revenue Forecasting</span>
                  <span className="text-[#80838d]">3,210 executions</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#121316] border border-[#2a2d34] rounded-lg text-xs">
                  <span className="text-[#e1e2e6] font-medium">Document Vector Retrieval (RAG)</span>
                  <span className="text-[#80838d]">2,840 executions</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#121316] border border-[#2a2d34] rounded-lg text-xs">
                  <span className="text-[#e1e2e6] font-medium">SQL & Database Schema Optimizations</span>
                  <span className="text-[#80838d]">1,950 executions</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MY ACCOUNT VIEW */}
        {currentView === 'account' && (
          <div className="max-w-md w-full mx-auto px-6 pt-24 pb-12 flex flex-col items-center justify-center z-10 flex-1">
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

              <p className="text-sm text-[#80838d] flex items-center gap-2 justify-center mb-6">
                <Mail className="w-4 h-4 text-indigo-400" />
                {user?.email || 'Logged-in Account'}
              </p>

              <div className="w-full pt-6 border-t border-[#27292d] flex items-center justify-center gap-3">
                <div className="px-3.5 py-1.5 bg-[#121316] border border-[#2a2d34] rounded-full flex items-center gap-2 text-xs font-medium text-[#d1d5db]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Verified Session</span>
                </div>
                <div className="px-3.5 py-1.5 bg-indigo-600/10 border border-indigo-500/30 rounded-full flex items-center gap-2 text-xs font-medium text-indigo-300">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Starbot Pro</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* CHAT VIEW */}
        {currentView === 'chat' && (
          <div className="max-w-4xl w-full mx-auto px-6 pt-10 pb-4 flex flex-col items-center z-10 flex-1">
            
            {/* HEADER */}
            <div className="flex flex-col items-center shrink-0">
              <div className="relative mb-3 group">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 blur-xl opacity-50" />
                <div className="relative w-12 h-12 bg-[#18191c] border border-[#2e3138] rounded-2xl flex items-center justify-center shadow-2xl">
                  <Sparkles className="w-6 h-6 text-cyan-400" />
                </div>
              </div>

              <h1 className="text-2xl font-medium tracking-tight text-white mb-2 text-center">
                {getGreeting()}, ready to start?
              </h1>
            </div>

            {/* MESSAGES AREA */}
            <div className="w-full my-3 p-2 flex flex-col gap-4 flex-1">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-3.5 rounded-xl max-w-[85%] ${
                    msg.sender === 'user'
                      ? 'bg-indigo-600/30 text-white self-end border border-indigo-500/40'
                      : 'bg-[#18191c] text-[#e1e2e6] self-start border border-[#2a2d34]'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                </div>
              ))}

              {loading && (
                <div className="p-4 rounded-xl max-w-[85%] bg-[#18191c] text-[#e1e2e6] self-start border border-[#2a2d34] flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT AREA */}
            <div className="w-full shrink-0">
              <div className="w-full bg-[#18191c] border border-[#2a2d34] focus-within:border-indigo-500/50 rounded-2xl p-3 shadow-xl transition-all mb-4">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Show the monthly sales trends..."
                  className="w-full bg-transparent px-2 py-1 text-sm text-white placeholder-[#5b5d66] focus:outline-none"
                />

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#23252a]">
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-lg text-[#80838d] hover:text-white hover:bg-[#23252a] transition">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#23252a] text-xs text-[#b0b3bc] border border-[#30333b] hover:bg-[#2a2d36] transition">
                      <Database className="w-3.5 h-3.5" />
                      <span>Data Sources</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#23252a] text-xs text-[#b0b3bc] border border-[#30333b] hover:bg-[#2a2d36] transition">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Upload Data</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-1.5 rounded-lg text-[#80838d] hover:text-white hover:bg-[#23252a] transition">
                      <Mic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={loading}
                      className="p-1.5 rounded-lg bg-white text-black hover:bg-gray-200 transition disabled:opacity-50"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mb-2">
                <div className="p-3 bg-[#18191c] border border-[#25272e] rounded-xl cursor-pointer hover:border-[#3a3d47] transition">
                  <FileText className="w-4 h-4 text-[#9ca3af] mb-1.5" />
                  <h3 className="text-xs font-medium text-white mb-0.5">My Weekly Reports</h3>
                  <p className="text-[11px] text-[#71737c]">Your weekly reports are ready, see what I prepared.</p>
                </div>
                <div 
                  onClick={() => setCurrentView('analytics')}
                  className="p-3 bg-[#18191c] border border-[#25272e] rounded-xl cursor-pointer hover:border-[#3a3d47] transition"
                >
                  <BarChart2 className="w-4 h-4 text-[#9ca3af] mb-1.5" />
                  <h3 className="text-xs font-medium text-white mb-0.5">System Metrics</h3>
                  <p className="text-[11px] text-[#71737c]">Check token limits and AI service health.</p>
                </div>
                <div 
                  onClick={() => setCurrentView('analytics')}
                  className="p-3 bg-[#18191c] border border-[#25272e] rounded-xl cursor-pointer hover:border-[#3a3d47] transition"
                >
                  <Compass className="w-4 h-4 text-[#9ca3af] mb-1.5" />
                  <h3 className="text-xs font-medium text-white mb-0.5">Advanced Analysis</h3>
                  <p className="text-[11px] text-[#71737c]">Go beyond the basics—discover new game-changing insights.</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* FOOTER */}
        <footer className="w-full py-3 text-center text-[11px] text-[#555760] flex flex-col items-center gap-1 z-10 shrink-0">
          <p className="max-w-xl px-4">
            Starbot AI is an assistant designed to generate analytical insights. Smart decisions start with verified data.
          </p>
          <div className="flex items-center gap-4 text-[#71737c]">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span>/</span>
            <a href="#" className="hover:underline">Terms of Use</a>
            <span>/</span>
            <a href="#" className="hover:underline">Feedback</a>
            <span>/</span>
            <a href="#" className="hover:underline">About Us</a>
          </div>
        </footer>
      </main>
    </div>
  );
}