import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Trophy, Plus, Zap, X, Send,
  Target, Palette, CheckCircle2, Flame, Clock, Tag, ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './index.css';

const API = "/api";

const THEMES = {
  professional: { name: 'Professional', bg: '#f4f5f7', card: '#ffffff', text: '#172b4d', subText: '#5e6c84', accent: '#dfe1e6', button: '#0052cc', highlight: '#0052cc', zap: '#ff991f', orb1: '#0052cc', orb2: '#ff991f' },
  punk:         { name: 'Punk',         bg: '#000000', card: '#111111', text: '#e0e0e0', subText: '#f50057', accent: '#333', button: '#f50057', highlight: '#ffea00', zap: '#00e5ff', orb1: '#f50057', orb2: '#00e5ff' },
  glossy:       { name: 'Glossy',       bg: '#f0f2f5', card: 'rgba(255,255,255,0.85)', text: '#333333', subText: '#666666', accent: '#ccc', button: '#ea4c89', highlight: '#4facfe', zap: '#ff0844', orb1: '#ea4c89', orb2: '#4facfe' },
  dark:         { name: 'Dark',         bg: '#121212', card: '#1e1e1e', text: '#ffffff', subText: '#a0a0a0', accent: '#333', button: '#bb86fc', highlight: '#03dac6', zap: '#cf6679', orb1: '#bb86fc', orb2: '#03dac6' },
  spring:       { name: 'Spring',       bg: '#fdfbfb', card: '#ffffff', text: '#2d3436', subText: '#636e72', accent: '#ffeaa7', button: '#00b894', highlight: '#fdcb6e', zap: '#e17055', orb1: '#00b894', orb2: '#fdcb6e' },
  haze:         { name: 'Haze',         bg: '#2c3e50', card: '#34495e', text: '#ecf0f1', subText: '#bdc3c7', accent: '#7f8c8d', button: '#9b59b6', highlight: '#e74c3c', zap: '#f1c40f', orb1: '#9b59b6', orb2: '#e74c3c' },
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
  const [category, setCategory]           = useState('Engineering');
  const [time, setTime]                   = useState('15M');
  const [view, setView]                   = useState('market');
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [msg, setMsg]                     = useState('');
  const [notification, setNotification]   = useState(null);
  const [currentTheme, setCurrentTheme]   = useState('dark');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [xpAnimKey, setXpAnimKey]         = useState(0);
  const chatEndRef                        = useRef(null);
  const prevCount                         = useRef(0);
  const theme                             = THEMES[currentTheme];

  const refresh = async () => {
    try {
      const { data } = await axios.get(`${API}/bounties`);
      if (data.length > prevCount.current && prevCount.current !== 0) {
        setNotification("⚡ New Signal Detected!");
        setTimeout(() => setNotification(null), 4000);
      }
      prevCount.current = data.length;
      setBounties(data);
      setLoading(false);
      if (selectedQuest) {
        const updated = data.find(b => b._id === selectedQuest._id);
        if (updated) setSelectedQuest(updated);
      }
    } catch { setLoading(false); }
  };

  useEffect(() => {
    refresh();
    const int = setInterval(refresh, 3000);
    return () => clearInterval(int);
  }, [selectedQuest?._id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedQuest?.messages?.length]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title || !reward) return;
    try {
      await axios.post(`${API}/bounties`, { title, reward, category, timeEstimate: time });
      setTitle(''); setReward('');
      setNotification("📡 Broadcast Sent!");
      setTimeout(() => setNotification(null), 3000);
      refresh();
    } catch { alert("Server Error"); }
  };

  const handleAction = async (id, action) => {
    try {
      await axios.patch(`${API}/bounties/${id}/${action}`); // now /claim or /resolve
      if (action === 'resolve') {
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.6 }, colors: [theme.highlight, theme.zap, theme.button] });
        setNotification("🏆 Mission Complete!");
        setTimeout(() => setNotification(null), 4000);
        setXpAnimKey(k => k + 1);
      }
      if (action === 'claim') {
        setNotification("🔒 Bounty Secured!");
        setTimeout(() => setNotification(null), 3000);
      }
      refresh();
    } catch (err) {
      if (err.response?.status === 409) {
        alert("⚠️ TOO SLOW! Another agent secured this bounty.");
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
  const isThemeDark = ['punk', 'dark', 'haze'].includes(currentTheme);
  const optionStyle = {
    backgroundColor: isThemeDark ? '#1e1e1e' : '#ffffff',
    color: isThemeDark ? '#ffffff' : '#172b4d',
  };

  return (
    <div className="min-h-screen transition-theme animate-fade-in" style={bgStyle}>
      {/* Ambient background */}
      <div className="bg-grid" />
      <div className="orb orb-1" style={{ backgroundColor: theme.orb1 }} />
      <div className="orb orb-2" style={{ backgroundColor: theme.orb2 }} />
      <div className="orb orb-3" style={{ backgroundColor: theme.highlight }} />

      {/* Notification toast */}
      {notification && (
        <div
          className="fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-2xl font-black text-white shadow-2xl glass animate-notification"
          style={{ transform: 'translateX(-50%)', backgroundColor: theme.button }}
        >
          {notification}
        </div>
      )}

      {/* Theme Picker */}
      <div className="fixed top-5 right-5 flex flex-col items-end z-50">
        <button
          onClick={() => setShowThemePicker(s => !s)}
          className="p-3 rounded-full shadow-xl border glass theme-btn"
          style={{ backgroundColor: theme.card, borderColor: theme.accent }}
          title="Change theme"
        >
          <Palette size={22} style={{ color: theme.text }} />
        </button>
        {showThemePicker && (
          <div
            className="mt-3 p-3 rounded-2xl shadow-2xl flex flex-col gap-1 glass border animate-slide-up w-44"
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
                {currentTheme === tKey && '✓ '}{THEMES[tKey].name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 px-4 sm:px-6 md:px-12 pb-16 pt-6">
        {/* Header */}
        <header className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6 mb-14 pt-10 header-flex">
          <div
            className="flex items-center gap-5 cursor-pointer animate-slide-up"
            onClick={() => setView('market')}
          >
            <div className="p-4 rounded-[1.6rem] shadow-2xl logo-icon animate-float" style={{ backgroundColor: theme.button }}>
              <Trophy size={34} className="text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase select-none">
              KNOWLEDGE<span style={{ color: theme.highlight }}>BOUNTY</span>
            </h1>
          </div>

          <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <button
              onClick={() => setView(view === 'admin' ? 'market' : 'admin')}
              className="nav-tab"
              style={{
                backgroundColor: view === 'admin' ? theme.button : 'transparent',
                borderColor: theme.button,
                color: view === 'admin' ? '#fff' : theme.text
              }}
            >
              {view === 'admin' ? '← Market' : 'Dashboard'}
            </button>

            {/* XP Counter */}
            <button
              key={xpAnimKey}
              onClick={() => {}}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 shadow-xl glass xp-counter animate-count"
              style={{ backgroundColor: theme.card, borderColor: theme.zap }}
            >
              <Zap size={20} style={{ color: theme.zap }} fill="currentColor" />
              <span className="text-lg font-black">{xp} XP</span>
            </button>
          </div>
        </header>

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
                    <BountyCard key={b._id} b={b} onAction={handleAction} onChat={setSelectedQuest} theme={theme} index={i} />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

              {/* Post Form */}
              <div className="lg:col-span-4 animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <div className="border-2 p-8 rounded-[2.5rem] shadow-2xl glass kb-form-card lg:sticky lg:top-8 transition-theme" style={{ ...cardStyle, '--accent-rgb': hexToRgb(theme.button) }}>
                  <h2 className="text-xs font-black uppercase mb-6 flex items-center gap-2" style={{ color: theme.subText }}>
                    <Plus size={16} /> New Broadcast
                  </h2>
                  <form className="space-y-4" onSubmit={onSubmit}>
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
                      placeholder="Reward (e.g. $50, coffee ☕)"
                      value={reward}
                      onChange={e => setReward(e.target.value)}
                      required
                    />
                    <div className="select-wrapper">
                      <select
                        className="kb-input transition-theme"
                        style={{ ...inputStyle, '--option-bg': optionStyle.backgroundColor, '--option-text': optionStyle.color }}
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                      >
                        {['Engineering','Design','Research','Marketing','Finance','Other'].map(c => (
                          <option key={c} value={c} style={optionStyle}>{c}</option>
                        ))}
                      </select>
                      <span className="select-arrow" style={{ color: theme.text }}>
                        <ChevronDown size={18} />
                      </span>
                    </div>
                    <div className="select-wrapper">
                      <select
                        className="kb-input transition-theme"
                        style={{ ...inputStyle, '--option-bg': optionStyle.backgroundColor, '--option-text': optionStyle.color }}
                        value={time}
                        onChange={e => setTime(e.target.value)}
                      >
                        {['5M','10M','15M','30M','1H','2H','4H'].map(t => (
                          <option key={t} value={t} style={optionStyle}>{t}</option>
                        ))}
                      </select>
                      <span className="select-arrow" style={{ color: theme.text }}>
                        <ChevronDown size={18} />
                      </span>
                    </div>
                    <button
                      type="submit"
                      className="btn-action"
                      style={{ backgroundColor: theme.button, color: '#fff' }}
                    >
                      📡 Broadcast
                    </button>
                  </form>

                  {/* Live stats */}
                  <div className="mt-8 pt-6 border-t flex justify-between text-center" style={{ borderColor: theme.accent }}>
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
                      <BountyCard key={b._id} b={b} onAction={handleAction} onChat={setSelectedQuest} theme={theme} index={i} />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </main>
      </div>

      {/* Chat Sidebar */}
      {selectedQuest && (
        <aside
          className="fixed top-0 right-0 h-full border-l z-50 flex flex-col glass transition-theme animate-slide-right chat-sidebar"
          style={{ width: 380, backgroundColor: theme.bg, borderColor: theme.accent }}
        >
          <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: theme.accent }}>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider" style={{ color: theme.subText }}>Comms</h2>
              <p className="font-bold truncate text-sm mt-1">{selectedQuest.title}</p>
            </div>
            <button
              onClick={() => setSelectedQuest(null)}
              className="p-2 rounded-xl hover:opacity-70 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {(!selectedQuest.messages || selectedQuest.messages.length === 0) ? (
              <div className="empty-state" style={{ color: theme.subText }}>
                <p className="text-sm font-bold">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              selectedQuest.messages.map((m, i) => (
                <div
                  key={i}
                  className={`chat-bubble ${m.sender === 'Expert' ? 'chat-bubble-expert' : 'chat-bubble-other'}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="text-xs font-bold mb-1 opacity-60">{m.sender}</div>
                  {m.text}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!msg) return;
              await axios.post(`${API}/bounties/${selectedQuest._id}/chat`, { sender: "Expert", text: msg });
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

function BountyCard({ b, onAction, onChat, theme, index }) {
  const isOpen     = b.status === 'open';
  const isClaimed  = b.status === 'claimed';
  const isResolved = b.status === 'resolved';
  const delayClass = `card-delay-${Math.min(index + 1, 6)}`;

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

      <h3 className="text-lg font-black mb-2 leading-tight">{b.title}</h3>

      <div className="flex items-center gap-4 mb-4 text-xs font-bold" style={{ color: theme.subText }}>
        <span style={{ color: theme.highlight }}>🎁 {b.reward}</span>
        {b.timeEstimate && <span className="flex items-center gap-1"><Clock size={11} />{b.timeEstimate}</span>}
        <span>by {b.requesterName}</span>
      </div>

      <div className="space-y-2">
        {isOpen && (
          <button
            onClick={() => onAction(b._id, 'claim')}
            className="btn-action"
            style={{ backgroundColor: theme.highlight, color: theme.bg }}
          >
            ⚡ Claim Bounty
          </button>
        )}
        {isClaimed && (
          <button
            onClick={() => onAction(b._id, 'resolve')}
            className="btn-action"
            style={{ backgroundColor: '#22c55e', color: '#fff' }}
          >
            ✅ Mark Complete
          </button>
        )}
        {isResolved && (
          <div className="text-center font-black text-sm py-3 animate-float" style={{ color: theme.highlight }}>
            🏆 Mission Secured
          </div>
        )}
        {(isClaimed || isResolved) && (
          <button
            onClick={() => onChat(b)}
            className="btn-action"
            style={{ backgroundColor: 'transparent', border: `2px solid ${theme.accent}`, color: theme.text }}
          >
            💬 Open Comms
          </button>
        )}
      </div>
    </div>
  );
}

export default App;