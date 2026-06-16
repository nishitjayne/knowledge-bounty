import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
    Trophy, Gift, Plus, BarChart3, ShieldCheck, Zap, X, Send, 
    MessageSquare, Bell, Clock, Tag, ExternalLink, User, Target, Palette 
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Ensure the API routes hit our Vercel serverless functions
const API = "/api"; 

const THEMES = {
    professional: { name: 'Professional', bg: '#f4f5f7', card: '#ffffff', text: '#172b4d', subText: '#5e6c84', accent: '#dfe1e6', button: '#0052cc', highlight: '#0052cc', zap: '#ff991f' },
    punk: { name: 'Punk', bg: '#000000', card: '#111111', text: '#e0e0e0', subText: '#f50057', accent: '#ffea00', button: '#f50057', highlight: '#ffea00', zap: '#00e5ff' },
    glossy: { name: 'Glossy', bg: '#f0f2f5', card: 'rgba(255,255,255,0.85)', text: '#333333', subText: '#666666', accent: '#cccccc', button: '#ea4c89', highlight: '#4facfe', zap: '#ff0844' },
    light: { name: 'Light', bg: '#ffffff', card: '#f9fafb', text: '#111827', subText: '#6b7280', accent: '#e5e7eb', button: '#2563eb', highlight: '#10b981', zap: '#f59e0b' },
    dark: { name: 'Dark', bg: '#121212', card: '#1e1e1e', text: '#ffffff', subText: '#a0a0a0', accent: '#333333', button: '#bb86fc', highlight: '#03dac6', zap: '#cf6679' },
    spring: { name: 'Spring', bg: '#fdfbfb', card: '#ffffff', text: '#2d3436', subText: '#636e72', accent: '#ffeaa7', button: '#00b894', highlight: '#fdcb6e', zap: '#e17055' },
    winter: { name: 'Winter', bg: '#e0c3fc', card: '#8ec5fc', text: '#1e293b', subText: '#334155', accent: '#cbd5e1', button: '#0f172a', highlight: '#0284c7', zap: '#f8fafc' },
    haze: { name: 'Haze', bg: '#2c3e50', card: '#34495e', text: '#ecf0f1', subText: '#bdc3c7', accent: '#7f8c8d', button: '#9b59b6', highlight: '#e74c3c', zap: '#f1c40f' }
};

function App() {
  const [bounties, setBounties] = useState([]);
  const [title, setTitle] = useState('');
  const [reward, setReward] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [time, setTime] = useState('15M');
  const [view, setView] = useState('market'); 
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [msg, setMsg] = useState(''); 
  const [notification, setNotification] = useState(null);
  const [showXP, setShowXP] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('professional');
  const [showThemePicker, setShowThemePicker] = useState(false);
  const theme = THEMES[currentTheme]; 
  const prevCount = useRef(0);

  const refresh = async () => {
    try {
      const { data } = await axios.get(`${API}/bounties`);
      if (data.length > prevCount.current && prevCount.current !== 0) {
        setNotification("New Signal Detected!");
        setTimeout(() => setNotification(null), 4000);
      }
      prevCount.current = data.length;
      setBounties(data);
      if (selectedQuest) {
          const updated = data.find(b => b._id === selectedQuest._id);
          if(updated) setSelectedQuest(updated);
      }
    } catch (err) { console.error("HUD Offline - Server might be sleeping"); }
  };

  useEffect(() => { 
    refresh(); 
    const int = setInterval(refresh, 3000); 
    return () => clearInterval(int);
  }, [selectedQuest?._id]);

  const onSubmit = async (e) => {
      e.preventDefault();
      if(!title || !reward) return;
      try {
          await axios.post(`${API}/bounties`, { title, reward, category, timeEstimate: time });
          setTitle(''); setReward(''); refresh();
      } catch (err) { alert("Server Error"); }
  };

  const handleAction = async (id, action) => {
    try {
        await axios.patch(`${API}/bounties/${id}/${action}`);
        if(action === 'resolve') confetti({ particleCount: 150, spread: 70, colors: [theme.highlight, theme.zap] });
        if(action === 'claim') setNotification("Bounty Secured!");
        refresh();
    } catch (err) {
        if (err.response && err.response.status === 409) {
            alert("⚠️ TOO SLOW! Another agent secured this bounty.");
            refresh();
        } else {
            console.error(err);
        }
    }
  };

  const handleSchedule = async (id, timeStr, status) => {
    await axios.patch(`${API}/bounties/${id}/schedule`, { proposedTime: timeStr, meetingStatus: status });
    refresh();
  };

  const marketplaceBounties = bounties.filter(b => b.status === 'open');
  const myClaims = bounties.filter(b => b.status === 'claimed' || b.status === 'resolved');
  const myPosts = bounties.filter(b => b.requesterName === 'Sarah J.');
  const totalPoints = bounties.filter(b => b.status === 'resolved').length * 50;

  const bgStyle = { backgroundColor: theme.bg, color: theme.text };
  const cardStyle = { backgroundColor: theme.card, borderColor: theme.accent, color: theme.text };
  const inputStyle = { backgroundColor: theme.bg, borderColor: theme.accent, color: theme.text };
  const btnStyle = { backgroundColor: theme.button, color: '#ffffff' }; 

  return (
    <div className="min-h-screen p-6 md:p-12 font-sans overflow-x-hidden transition-colors duration-500" style={bgStyle}>
      {/* Theme Picker */}
      <div className="absolute top-6 right-6 flex flex-col items-end z-50">
        <button onClick={() => setShowThemePicker(!showThemePicker)} className="p-3 rounded-full shadow-lg border backdrop-blur-md transition-transform hover:scale-110" style={{ backgroundColor: theme.card, borderColor: theme.accent }}>
            <Palette size={24} style={{ color: theme.text }} />
        </button>
        {showThemePicker && (
            <div className="mt-4 p-4 rounded-3xl shadow-2xl flex flex-col gap-2 backdrop-blur-xl border w-48" style={{ backgroundColor: theme.card, borderColor: theme.accent }}>
                {Object.keys(THEMES).map(tKey => (
                    <button key={tKey} onClick={() => { setCurrentTheme(tKey); setShowThemePicker(false); }} className="px-4 py-2 text-left rounded-xl hover:opacity-80 font-bold capitalize transition-all duration-300" style={{ color: theme.text, backgroundColor: currentTheme === tKey ? theme.accent : 'transparent' }}>
                        {THEMES[tKey].name}
                    </button>
                ))}
            </div>
        )}
      </div>

      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 mb-20 pt-16">
          <div className="flex items-center gap-6 cursor-pointer" onClick={() => setView('market')}>
            <div className="p-4 rounded-[1.8rem] shadow-xl" style={{ backgroundColor: theme.button }}>
              <Trophy size={36} className="text-white" />
            </div>
            <h1 className="text-4xl font-black italic tracking-tighter uppercase">
              KNOWLEDGE<span style={{ color: theme.highlight }}>BOUNTY</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setView(view === 'admin' ? 'market' : 'admin')} className="px-8 py-4 rounded-[1.8rem] border-2 shadow-xl bg-purple-900 text-white">
                {view === 'admin' ? 'Market' : 'My Dashboard'}
            </button>
            <button onClick={() => setShowXP(true)} className="flex items-center gap-3 px-8 py-4 rounded-[1.8rem] border-2 shadow-xl" style={{ backgroundColor: theme.card, borderColor: theme.zap }}>
                <Zap size={22} style={{ color: theme.zap }} fill="currentColor"/>
                <span className="text-xl font-black">{1240 + totalPoints}</span>
            </button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto">
        {view === 'admin' ? (
           /* Admin View Logic... */
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
             <section>
               <h2 className="text-2xl font-black mb-8 uppercase italic">Missions I'm Solving</h2>
               {myClaims.map(b => <BountyCard key={b._id} b={b} onAction={handleAction} onChat={setSelectedQuest} onSchedule={handleSchedule} theme={theme}/>)}
             </section>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
              <div className="lg:col-span-4">
                  <div className="border p-10 rounded-[3.8rem] shadow-2xl sticky top-10" style={cardStyle}>
                      <h2 className="text-xs font-black uppercase mb-10 flex items-center gap-3"><Plus size={18} /> New Broadcast</h2>
                      <form className="space-y-6" onSubmit={onSubmit}>
                          <input className="w-full rounded-[1.8rem] p-6 font-bold border" style={inputStyle} placeholder="Objective..." value={title} onChange={e => setTitle(e.target.value)} />
                          <input className="w-full rounded-[1.8rem] p-6 font-bold border" style={inputStyle} placeholder="Reward..." value={reward} onChange={e => setReward(e.target.value)} />
                          <button className="w-full py-6 rounded-[2rem] font-black uppercase" style={btnStyle}>Broadcast</button>
                      </form>
                  </div>
              </div>
              <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-10">
                  {marketplaceBounties.map(b => <BountyCard key={b._id} b={b} onAction={handleAction} onChat={setSelectedQuest} onSchedule={handleSchedule} theme={theme}/>)}
              </div>
          </div>
        )}
      </main>

      {selectedQuest && (
        /* Chat Sidebar Logic... */
        <aside className="fixed top-0 right-0 h-full w-[400px] border-l z-50 p-10 flex flex-col" style={bgStyle}>
            <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-black uppercase">Comms</h2>
                <button onClick={() => setSelectedQuest(null)}><X size={18}/></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
                {selectedQuest.messages?.map((m, i) => (
                    <div key={i} className={`p-4 rounded-xl ${m.sender === 'Expert' ? 'bg-blue-600 text-white ml-auto' : 'bg-gray-700 text-white'}`}>
                        {m.text}
                    </div>
                ))}
            </div>
            <form onSubmit={async (e) => {
                e.preventDefault(); if(!msg) return;
                await axios.post(`${API}/bounties/${selectedQuest._id}/chat`, { sender: "Expert", text: msg });
                setMsg(''); refresh();
            }} className="mt-4 flex gap-2">
                <input className="flex-1 p-3 rounded-xl border bg-transparent" placeholder="Type..." value={msg} onChange={e => setMsg(e.target.value)} />
                <button type="submit" className="p-3 bg-blue-500 rounded-xl"><Send size={18}/></button>
            </form>
        </aside>
      )}
    </div>
  );
}

// BountyCard component remains largely the same logic-wise
function BountyCard({ b, onAction, onChat, onSchedule, theme }) {
    const isClaimed = b.status === 'claimed';
    const isResolved = b.status === 'resolved';

    return (
        <div className="p-8 rounded-[3rem] border-2 mb-6" style={{ backgroundColor: theme.card, borderColor: isClaimed ? theme.highlight : theme.accent }}>
            <h3 className="text-2xl font-black mb-4 italic">{b.title}</h3>
            <p className="font-bold text-sm mb-6" style={{ color: theme.highlight }}>Reward: {b.reward}</p>
            {b.status === 'open' && <button onClick={() => onAction(b._id, 'claim')} className="w-full py-4 rounded-2xl font-bold uppercase" style={{ backgroundColor: theme.highlight, color: theme.bg }}>Claim</button>}
            {isClaimed && <button onClick={() => onAction(b._id, 'resolve')} className="w-full py-4 rounded-2xl font-bold uppercase bg-green-600 text-white">Complete</button>}
            {isResolved && <div className="text-center font-black uppercase" style={{ color: theme.highlight }}>Mission Secured</div>}
        </div>
    );
}

export default App;