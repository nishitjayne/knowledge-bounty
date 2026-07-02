import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Trophy, Plus, Zap, X, Send,
  Target, Palette, CheckCircle2, Flame, Clock, Tag, ChevronDown,
  Radio, MessageSquare, Gift, Lightbulb, Lock, ShieldCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ThreeBackground from './ThreeBackground';
import './index.css';

const API = "/api";

const THEMES = {
  professional: { name: 'Professional', bg: '#f4f5f7', card: '#ffffff', text: '#172b4d', subText: '#5e6c84', accent: '#dfe1e6', button: '#0052cc', highlight: '#0052cc', zap: '#ff991f', watermarkColor: '#0040A0', targetOpacity: 0.35 },
  punk:         { name: 'Punk',         bg: '#000000', card: '#111111', text: '#e0e0e0', subText: '#f50057', accent: '#333', button: '#f50057', highlight: '#ffea00', zap: '#00e5ff', watermarkColor: '#f50057', targetOpacity: 0.18 },
  glossy:       { name: 'Glossy',       bg: '#f0f2f5', card: 'rgba(255,255,255,0.85)', text: '#333333', subText: '#666666', accent: '#ccc', button: '#ea4c89', highlight: '#4facfe', zap: '#ff0844', watermarkColor: '#d81b60', targetOpacity: 0.35 },
  dark:         { name: 'Dark',         bg: '#121212', card: '#1e1e1e', text: '#ffffff', subText: '#a0a0a0', accent: '#333', button: '#bb86fc', highlight: '#03dac6', zap: '#cf6679', watermarkColor: '#bb86fc', targetOpacity: 0.15 },
  spring:       { name: 'Spring',       bg: '#fdfbfb', card: '#ffffff', text: '#2d3436', subText: '#636e72', accent: '#ffeaa7', button: '#00b894', highlight: '#fdcb6e', zap: '#e17055', watermarkColor: '#00856A', targetOpacity: 0.45 },
  haze:         { name: 'Haze',         bg: '#2c3e50', card: '#34495e', text: '#ecf0f1', subText: '#bdc3c7', accent: '#7f8c8d', button: '#9b59b6', highlight: '#e74c3c', zap: '#f1c40f', watermarkColor: '#9b59b6', targetOpacity: 0.15 },
};

const hexToRgb = (hex) => {
  if (!hex) return '99,102,241';
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return `${r},${g},${b}`;
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return `${r},${g},${b}`;
  }
  return '99,102,241';
};

function App() {
  const [bounties, setBounties]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [title, setTitle]                 = useState('');
  const [reward, setReward]               = useState('');
  const [category, setCategory]           = useState('');
  const [time, setTime]                   = useState('15M');
  const [requesterName, setRequesterName] = useState(() => localStorage.getItem('kb_user_name') || 'Nishit J.');
  const [view, setView]                   = useState('market');
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [msg, setMsg]                     = useState('');
  const [notification, setNotification]   = useState(null);
  const [currentTheme, setCurrentTheme]   = useState('dark');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [xpAnimKey, setXpAnimKey]         = useState(0);
  const [xpClicked, setXpClicked]         = useState(false);
  const [navAnim, setNavAnim]             = useState(false);
  const chatEndRef                        = useRef(null);
  const prevCount                         = useRef(0);
  const theme                             = THEMES[currentTheme];
  // Ref is kept in sync synchronously (not via useEffect) to prevent race
  // conditions where the polling loop re-opens a just-closed comms panel.
  const selectedQuestRef                  = useRef(null);
  const xpTimerRef                        = useRef(null);

  // Close comms: clear ref FIRST (synchronously), then clear state.
  // This ensures any in-flight refresh() async calls see null immediately.
  const closeComms = useCallback(() => {
    selectedQuestRef.current = null;
    setSelectedQuest(null);
  }, []);

  // XP button 2-second celebrate animation
  const handleXpClick = useCallback(() => {
    if (xpClicked) return;
    setXpClicked(true);
    clearTimeout(xpTimerRef.current);
    xpTimerRef.current = setTimeout(() => setXpClicked(false), 2000);
  }, [xpClicked]);

  // Cleanup XP timer on unmount
  useEffect(() => () => clearTimeout(xpTimerRef.current), []);

  // Quirky button helpers
  const fireButtonAnim = useCallback((setter, duration = 600) => {
    setter(true);
    setTimeout(() => setter(false), duration);
  }, []);


  const refresh = async () => {
    try {
      const { data } = await axios.get(`${API}/bounties`);
      if (data.length > prevCount.current && prevCount.current !== 0) {
        setNotification({ icon: 'zap',   text: 'New Signal Detected!' });
        setTimeout(() => setNotification(null), 4000);
      }
      prevCount.current = data.length;
      setBounties(data);
      setLoading(false);
      if (selectedQuestRef.current) {
        try {
          const { data: updatedBounty } = await axios.get(`${API}/bounties/${selectedQuestRef.current._id}`);
          if (updatedBounty) setSelectedQuest(updatedBounty);
        } catch (err) {
          console.error("Failed to refresh active bounty chat:", err);
        }
      }
    } catch { setLoading(false); }
  };

  const openChat = async (b) => {
    // Sync ref immediately so the polling loop can update messages for this bounty
    selectedQuestRef.current = b;
    setSelectedQuest(b);
    try {
      const { data } = await axios.get(`${API}/bounties/${b._id}`);
      // Only update if user hasn't closed comms in the meantime
      if (selectedQuestRef.current) {
        selectedQuestRef.current = data;
        setSelectedQuest(data);
      }
    } catch (err) {
      console.error("Failed to load chat details:", err);
    }
  };

  useEffect(() => {
    refresh();
    const int = setInterval(refresh, selectedQuest ? 1000 : 3000);
    return () => clearInterval(int);
  }, [selectedQuest?._id, selectedQuest]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeComms();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeComms]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedQuest?.messages?.length]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title || !reward) return;
    try {
      localStorage.setItem('kb_user_name', requesterName);
      await axios.post(`${API}/bounties`, { 
        title, 
        reward, 
        category: category || 'Engineering', 
        timeEstimate: time,
        requesterName: requesterName.trim() || 'Nishit J.'
      });
      setTitle(''); setReward(''); setCategory('');
      setNotification({ icon: 'radio',  text: 'Broadcast Sent!' });
      setTimeout(() => setNotification(null), 3000);
      refresh();
    } catch { alert("Server Error"); }
  };

  const handleAction = async (id, action) => {
    try {
      if (action === 'claim') {
        await axios.patch(`${API}/bounties/${id}/claim`, { claimerName: requesterName });
      } else {
        await axios.patch(`${API}/bounties/${id}/${action}`);
      }
      if (action === 'resolve') {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: [theme.highlight, theme.zap, theme.button] });
        setNotification({ icon: 'trophy', text: 'Mission Complete!' });
        setTimeout(() => setNotification(null), 4000);
        setXpAnimKey(k => k + 1);
      }
      if (action === 'claim') {
        setNotification({ icon: 'lock',   text: 'Bounty Secured!' });
        setTimeout(() => setNotification(null), 3000);
      }
      refresh();
    } catch (err) {
      if (err.response?.status === 409) {
        alert("TOO SLOW! Another agent secured this bounty.");
        refresh();
      }
    }
  };

  const marketplaceBounties = bounties.filter(b => b.status === 'open');
  const myClaims            = bounties.filter(b => b.status === 'claimed' || b.status === 'resolved');
  const totalPoints         = bounties.filter(b => b.status === 'resolved').length * 50;
  const xp                  = 1240 + totalPoints;

  const bgStyle    = { backgroundColor: theme.bg, color: theme.text };
  const cardStyle  = { backgroundColor: theme.card, borderColor: theme.accent, color: theme.text };
  const inputStyle = { backgroundColor: 'transparent', borderColor: theme.accent, color: theme.text };

  return (
    <div className="min-h-screen transition-theme animate-fade-in" style={bgStyle}>
      {/* Three.js ambient background */}
      <ThreeBackground theme={theme} />

      {/* Ambient Grid */}
      <div className="bg-grid" />

      {/* Notification toast */}
      {notification && (
        <div
          className="fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-2xl font-black text-white shadow-2xl glass animate-notification flex items-center gap-2"
          style={{ transform: 'translateX(-50%)', backgroundColor: theme.button }}
        >
          {notification.icon === 'zap'    && <Zap size={16} fill="currentColor" />}
          {notification.icon === 'radio'  && <Radio size={16} />}
          {notification.icon === 'trophy' && <Trophy size={16} />}
          {notification.icon === 'lock'   && <Lock size={16} />}
          {notification.text}
        </div>
      )}

      {/* Sticky Header Wrapper */}
      <div
        className="sticky top-0 z-40 transition-theme border-b"
        style={{
          backgroundColor: `${theme.bg}bb`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderColor: `${theme.accent}40`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-4">
          <header className="flex flex-col sm:flex-row justify-between items-center gap-6 header-flex">
            <div
              className="flex items-center gap-5 cursor-pointer animate-slide-up"
              onClick={() => setView('market')}
            >
              <div className="p-4 rounded-[1.6rem] shadow-2xl logo-icon animate-float" style={{ backgroundColor: theme.button }}>
                <Trophy size={34} className="text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tighter uppercase select-none break-words text-center">
                KNOWLEDGE<span style={{ color: theme.highlight }}>BOUNTY</span>
              </h1>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <button
                onClick={() => {
                  fireButtonAnim(setNavAnim, 350);
                  setView(view === 'admin' ? 'market' : 'admin');
                }}
                className={`nav-tab ${navAnim ? 'btn-nav-popping' : ''}`}
                style={{
                  backgroundColor: view === 'admin' ? theme.button : 'transparent',
                  borderColor: theme.button,
                  color: view === 'admin' ? '#fff' : theme.text
                }}
              >
                {view === 'admin' ? '← Market' : 'Dashboard'}
              </button>

              {/* User Identity Selector */}
              <div 
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border shadow-xl glass transition-theme identity-selector" 
                style={{ backgroundColor: theme.card, borderColor: `${theme.accent}30` }}
              >
                <span className="text-xs font-black uppercase opacity-60 tracking-wider" style={{ color: theme.subText }}>Identity:</span>
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-sm font-black w-24 text-center cursor-pointer hover:underline"
                  style={{ color: theme.highlight }}
                  value={requesterName}
                  onChange={e => {
                    setRequesterName(e.target.value);
                    localStorage.setItem('kb_user_name', e.target.value);
                  }}
                  title="Click to change active simulated user identity"
                />
              </div>

              {/* XP Counter */}
              <div key={xpAnimKey} className="animate-count">
                <button
                  onClick={handleXpClick}
                  className={`flex items-center gap-1.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl border-2 shadow-xl glass xp-counter ${xpClicked ? 'xp-inferno' : ''}`}
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.zap,
                    '--zap-rgb': hexToRgb(theme.zap),
                  }}
                >
                  <Zap size={18} className="xp-zap-icon relative z-10" style={{ color: theme.zap }} fill="currentColor" />
                  <span className="text-base sm:text-lg font-black relative z-10 xp-content">{xp} XP</span>
                </button>
              </div>

              {/* Theme Picker */}
              <div className="relative">
                <button
                  onClick={() => setShowThemePicker(s => !s)}
                  className="p-3 rounded-2xl shadow-xl border-2 glass theme-btn flex items-center justify-center"
                  style={{ backgroundColor: theme.card, borderColor: theme.accent }}
                  title="Change theme"
                >
                  <Palette size={20} style={{ color: theme.text }} />
                </button>
                {showThemePicker && (
                  <div
                    className="absolute right-0 mt-3 p-3 rounded-2xl shadow-2xl flex flex-col gap-1 glass border animate-slide-up w-44 z-50"
                    style={{ backgroundColor: theme.card, borderColor: theme.accent }}
                  >
                    {Object.keys(THEMES).map(tKey => (
                      <button
                        key={tKey}
                        onClick={() => { setCurrentTheme(tKey); setShowThemePicker(false); }}
                        className="px-4 py-2 text-left rounded-xl font-bold capitalize text-sm theme-btn"
                        style={{
                          color: theme.text,
                          backgroundColor: currentTheme === tKey ? theme.accent : 'transparent'
                        }}
                      >
                        <span className="flex items-center gap-1.5">
                          {currentTheme === tKey && <CheckCircle2 size={12} />}
                          {THEMES[tKey].name}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>
        </div>
      </div>

      <div className="relative z-10 px-4 sm:px-6 md:px-12 pb-16 pt-10">

        {/* Main Content */}
        <main className="max-w-7xl mx-auto">
          {view === 'admin' ? (
            <div className="animate-slide-up">
              <h2 className="text-2xl font-black mb-8 uppercase italic flex items-center gap-3">
                <Target size={24} style={{ color: theme.highlight }} />
                Active Missions
              </h2>
              {myClaims.length === 0 ? (
                <div className="empty-state" style={{ color: theme.subText }}>
                  <Target size={48} />
                  <p className="font-bold">No active missions yet. Claim a bounty!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {myClaims.map((b, i) => (
                    <BountyCard key={b._id} b={b} onAction={handleAction} onChat={openChat} theme={theme} index={i} currentUser={requesterName} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* Post Form */}
              <div className="lg:col-span-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <div className="border-2 p-6 rounded-3xl shadow-2xl glass kb-form-card lg:sticky lg:top-28 transition-theme" style={{ ...cardStyle, '--accent-rgb': hexToRgb(theme.button) }}>
                  <h2 className="text-xs font-black uppercase mb-5 flex items-center gap-2" style={{ color: theme.subText }}>
                    <Plus size={16} /> New Broadcast
                  </h2>
                  <form className="space-y-3" onSubmit={onSubmit}>
                    <input
                      className="kb-input transition-theme"
                      style={inputStyle}
                      placeholder="Mission objective..."
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                    />
                    <input
                      className="kb-input transition-theme"
                      style={inputStyle}
                      placeholder="Reward (e.g. ₹4000, coffee ☕)"
                      value={reward}
                      onChange={e => setReward(e.target.value)}
                      required
                    />
                    <input
                      className="kb-input transition-theme"
                      style={inputStyle}
                      placeholder="Your Name (e.g. Nishit J.)"
                      value={requesterName}
                      onChange={e => setRequesterName(e.target.value)}
                      required
                    />
                    <CustomDropdown
                      value={category}
                      onChange={setCategory}
                      options={['Engineering','Design','Research','Marketing','Finance','Other']}
                      theme={theme}
                      placeholder="Department?"
                    />
                    <CustomDropdown
                      value={time}
                      onChange={setTime}
                      options={['5M','10M','15M','30M','1H','2H','4H']}
                      theme={theme}
                      placeholder="Time Estimate"
                    />
                    <BroadcastButton theme={theme} />
                  </form>

                  {/* Live stats */}
                  <div className="mt-6 pt-5 border-t flex justify-between text-center" style={{ borderColor: theme.accent }}>
                    <div>
                      <div className="text-2xl font-black" style={{ color: theme.highlight }}>{marketplaceBounties.length}</div>
                      <div className="text-xs font-bold uppercase" style={{ color: theme.subText }}>Open</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black" style={{ color: theme.zap }}>{myClaims.filter(b => b.status === 'claimed').length}</div>
                      <div className="text-xs font-bold uppercase" style={{ color: theme.subText }}>Active</div>
                    </div>
                    <div>
                      <div className="text-2xl font-black" style={{ color: '#22c55e' }}>{bounties.filter(b => b.status === 'resolved').length}</div>
                      <div className="text-xs font-bold uppercase" style={{ color: theme.subText }}>Done</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bounty Grid */}
              <div className="lg:col-span-8">
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => <div key={i} className="skeleton" />)}
                  </div>
                ) : marketplaceBounties.length === 0 ? (
                  <div className="empty-state" style={{ color: theme.subText }}>
                    <Flame size={48} />
                    <p className="font-bold text-lg">No open bounties. Be the first to broadcast!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {marketplaceBounties.map((b, i) => (
                      <BountyCard key={b._id} b={b} onAction={handleAction} onChat={openChat} theme={theme} index={i} currentUser={requesterName} />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </main>
      </div>

      {/* Chat Sidebar Backdrop */}
      {selectedQuest && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 animate-fade-in"
          onClick={closeComms}
          style={{ cursor: 'pointer' }}
        />
      )}

      {/* Chat Sidebar */}
      {selectedQuest && (
        <aside
          className="fixed top-0 right-0 h-full border-l z-50 flex flex-col glass transition-theme animate-slide-right chat-sidebar"
          style={{ width: 380, backgroundColor: theme.bg, borderColor: theme.accent }}
        >
          <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: theme.accent }}>
            <div className="min-w-0 flex-1 pr-4">
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: theme.subText }}>Comms</h2>
              <p className="font-bold text-sm mt-1 break-words leading-tight">{selectedQuest.title}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-bold" style={{ color: theme.subText }}>
                <span className="flex items-center gap-1" style={{ color: theme.highlight }}><Gift size={11} /> {selectedQuest.reward}</span>
                <span>by {selectedQuest.requesterName}</span>
              </div>
            </div>
            <button
              onClick={closeComms}
              className="p-2 rounded-xl hover:opacity-80 transition-all flex items-center justify-center flex-shrink-0 self-start mt-1"
              style={{ color: theme.text, backgroundColor: `${theme.accent}20` }}
              title="Close Comms"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {/* Involved Parties Simulation Tip */}
            <div 
              className="p-3 mb-2 rounded-2xl text-xs font-semibold border flex flex-col gap-1 transition-all"
              style={{ backgroundColor: `${theme.accent}10`, borderColor: `${theme.accent}30`, color: theme.subText }}
            >
              <div className="flex items-center gap-1.5 font-bold" style={{ color: theme.text }}>
                <Lightbulb size={13} style={{ color: theme.highlight }} /> Simulation Tip
              </div>
              <p>
                To reply as the other party (<strong>{selectedQuest.requesterName === requesterName ? selectedQuest.claimerName || 'Expert' : selectedQuest.requesterName}</strong>), change your user identity in the top header.
              </p>
            </div>

            {(!selectedQuest.messages || selectedQuest.messages.length === 0) ? (
              <div className="empty-state" style={{ color: theme.subText }}>
                <p className="text-sm font-bold">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              selectedQuest.messages.map((m, i) => {
                const isMe = m.sender === requesterName;
                return (
                  <div
                    key={i}
                    className={`chat-bubble ${isMe ? 'chat-bubble-expert' : 'chat-bubble-other'}`}
                    style={{ animationDelay: `${i * 0.05}s` }}
                  >
                    <div className="text-xs font-bold mb-1 opacity-60">{m.sender}</div>
                    {m.text}
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!msg) return;
              await axios.post(`${API}/bounties/${selectedQuest._id}/chat`, { sender: requesterName, text: msg });
              setMsg('');
              refresh();
            }}
            className="p-4 border-t flex gap-2"
            style={{ borderColor: theme.accent }}
          >
            <input
              className="kb-input flex-1 transition-theme"
              style={inputStyle}
              placeholder="Type a message..."
              value={msg}
              onChange={e => setMsg(e.target.value)}
            />
            <button
              type="submit"
              className="p-3 rounded-xl transition-all hover:scale-110 active:scale-95"
              style={{ backgroundColor: theme.button, color: '#fff' }}
            >
              <Send size={18} />
            </button>
          </form>
        </aside>
      )}
    </div>
  );
}

function BountyCard({ b, onAction, onChat, theme, index, currentUser }) {
  const isOpen     = b.status === 'open';
  const isClaimed  = b.status === 'claimed';
  const isResolved = b.status === 'resolved';
  const delayClass = `card-delay-${Math.min(index + 1, 6)}`;

  const [claimAnim,   setClaimAnim]   = useState(false);
  const [resolveAnim, setResolveAnim] = useState(false);
  const [commsAnim,   setCommsAnim]   = useState(false);

  const fire = (setter, duration = 600) => {
    setter(true);
    setTimeout(() => setter(false), duration);
  };

  const categoryColors = {
    Engineering: '#3b82f6', Design: '#ec4899', Research: '#8b5cf6',
    Marketing: '#f59e0b', Finance: '#10b981', Other: '#6b7280'
  };

  return (
    <div
      className={`bounty-card animate-slide-up ${delayClass} ${isOpen ? 'is-open' : ''} ${isClaimed ? 'active-mission' : ''} ${isResolved ? 'resolved-glow' : ''} transition-theme`}
      style={{
        backgroundColor: theme.card,
        borderColor: isResolved ? theme.highlight : isClaimed ? theme.zap : theme.accent,
        '--accent-rgb': isClaimed ? hexToRgb(theme.zap) : hexToRgb(theme.highlight),
        '--highlight-rgb': '251,191,36',
        '--highlight-color': theme.highlight,
      }}
    >
      {/* Category tag */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="status-badge"
          style={{ backgroundColor: `${categoryColors[b.category] || '#6b7280'}20`, color: categoryColors[b.category] || '#6b7280' }}
        >
          <Tag size={10} />
          {b.category}
        </span>
        <span className="status-badge" style={{
          backgroundColor: isResolved ? '#22c55e20' : isClaimed ? `${theme.zap}20` : `${theme.highlight}20`,
          color: isResolved ? '#22c55e' : isClaimed ? theme.zap : theme.highlight
        }}>
          {isResolved ? <CheckCircle2 size={10} /> : isClaimed ? <Zap size={10} fill="currentColor" /> : <div className="dot" />}
          {isResolved ? 'Resolved' : isClaimed ? 'Claimed' : 'Open'}
        </span>
      </div>

      <h3 className="text-base sm:text-lg font-black mb-2 leading-tight break-words">{b.title}</h3>

      <div className="flex flex-wrap items-center gap-3 mb-4 text-xs font-bold" style={{ color: theme.subText }}>
        <span className="flex items-center gap-1" style={{ color: theme.highlight }}><Gift size={11} /> {b.reward}</span>
        {b.timeEstimate && <span className="flex items-center gap-1"><Clock size={11} />{b.timeEstimate}</span>}
        <span>by {b.requesterName}</span>
      </div>

      <div className="space-y-2">
        {isOpen && (
          <button
            onClick={() => { fire(setClaimAnim, 550); onAction(b._id, 'claim'); }}
            className={`btn-action ${claimAnim ? 'btn-claiming' : ''}`}
            style={{ backgroundColor: theme.highlight, color: theme.bg }}
          >
            <span className="flex items-center justify-center gap-2"><Zap size={14} fill="currentColor" /> Claim Bounty</span>
          </button>
        )}
        {isClaimed && (
          <button
            onClick={() => { fire(setResolveAnim, 650); onAction(b._id, 'resolve'); }}
            className={`btn-action ${resolveAnim ? 'btn-resolving' : ''}`}
            style={{ backgroundColor: '#22c55e', color: '#fff' }}
          >
            <span className="flex items-center justify-center gap-2"><CheckCircle2 size={14} /> Mark Complete</span>
          </button>
        )}
        {isResolved && (
          <div className="text-center font-black text-sm py-3 animate-float flex items-center justify-center gap-2" style={{ color: theme.highlight }}>
            <ShieldCheck size={15} /> Mission Secured
          </div>
        )}
        {(isClaimed || isResolved) && (b.requesterName === currentUser || b.claimerName === currentUser) && (
          <button
            onClick={() => { fire(setCommsAnim, 500); onChat(b); }}
            className={`btn-action ${commsAnim ? 'btn-comms-open' : ''}`}
            style={{ backgroundColor: 'transparent', border: `2px solid ${theme.accent}`, color: theme.text }}
          >
            <span className="flex items-center justify-center gap-2"><MessageSquare size={14} /> Open Comms</span>
          </button>
        )}
      </div>
    </div>
  );
}

function BroadcastButton({ theme }) {
  const [anim, setAnim] = useState(false);

  const handleClick = () => {
    setAnim(true);
    setTimeout(() => setAnim(false), 650);
  };

  return (
    <button
      type="submit"
      onClick={handleClick}
      className={`btn-action ${anim ? 'btn-broadcasting' : ''}`}
      style={{
        backgroundColor: theme.button,
        color: '#fff',
        '--btn-rgb': hexToRgb(theme.button),
      }}
    >
      <span className="flex items-center justify-center gap-2"><Radio size={15} /> Broadcast</span>
    </button>
  );
}

function CustomDropdown({ value, onChange, options, theme, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ zIndex: isOpen ? 100 : 10 }}>
      {/* Trigger Button */}
      <div
        className={`kb-input flex items-center justify-between cursor-pointer transition-theme select-none ${isOpen ? 'active' : ''}`}
        style={{
          backgroundColor: 'transparent',
          borderColor: theme.accent,
          color: theme.text,
          borderRadius: isOpen ? '1.5rem 1.5rem 0 0' : '1.5rem',
          borderBottomWidth: isOpen ? '0' : '2px',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{value || placeholder}</span>
        <ChevronDown
          size={18}
          className="transition-transform duration-300"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            color: theme.text,
          }}
        />
      </div>

      {/* Options List */}
      <div
        className={`custom-dropdown-options transition-all duration-300 ${isOpen ? 'open' : 'closed'}`}
        style={{
          backgroundColor: theme.card,
          borderColor: theme.accent,
          color: theme.text,
          borderWidth: isOpen ? '2px' : '0px',
          borderTopWidth: '0',
          borderRadius: '0 0 1.5rem 1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        {options.map((opt) => (
          <div
            key={opt}
            className="custom-dropdown-item font-bold transition-all duration-200"
            style={{
              color: theme.text,
              '--accent-rgb': hexToRgb(theme.button),
              '--highlight-color': theme.highlight,
            }}
            onClick={() => handleSelect(opt)}
          >
            {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;