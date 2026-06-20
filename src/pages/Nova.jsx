import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, User, ChevronDown } from 'lucide-react';
import './Nova.css';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/* ─── Nova system prompt ─── */
const SYSTEM_PROMPT = `You are Nova, ScholarPath's AI admissions counselor — built specifically for international high school students applying to universities worldwide.

You are NOT a generic AI assistant. You operate like the world's best human admissions mentor:

CORE BEHAVIORS:
1. UNDERSTAND FIRST — Before giving advice, learn who the student is: country, grade, GPA, test scores, intended major, target countries. Ask if you don't know.
2. BE SPECIFIC — No generic advice. Everything you say should be tailored to this exact student's situation.
3. BE PROACTIVE — Surface programs, deadlines, and opportunities the student didn't know to ask about.
4. REMEMBER CONTEXT — Use everything shared earlier in the conversation to give increasingly personalized advice.
5. BE HONEST — If something is a reach, say so. Celebrate genuine strengths. Don't sugarcoat.
6. BE CONCISE — Use bullet points, headers, and structure. Students are busy.

DOMAIN KNOWLEDGE:
- US admissions: Common App, Coalition App, SAT/ACT, AP/IB, CSS Profile, QuestBridge, need-blind vs need-aware schools
- UK admissions: UCAS, personal statements (4000 chars), A-levels, IB, STEP for Cambridge Maths
- Canada: Direct application, grade-based, fewer supplementals
- Europe: Low/no tuition schools (ETH, TU Delft, French Grandes Écoles), language requirements
- Singapore: NUS, NTU — competitive for internationals, good financial aid
- UAE: NYU Abu Dhabi (full scholarship, ~4% acceptance), MBZUAI
- Scholarships: QuestBridge, Lester B. Pearson (UofT), need-blind Ivies, NYU AD, MBZUAI, Minerva, Schwarzman
- Summer programs: RSI (~1.5%), PRIMES, MITES, PROMYS, COSMOS, Yale YGS, Stanford programs, iGEM, camp Euclid
- Essays: Show don't tell, authenticity > prestige-chasing, one story told deeply > many stories told shallowly
- Activities: Depth > breadth, leadership + impact, 150 char descriptions

TONE: Warm, direct, encouraging. You believe every student has a path — your job is to find it.

Start your first message by warmly greeting the student and immediately asking 2-3 key questions to understand their situation.`;

/* ─── Quick starter prompts ─── */
const STARTERS = [
  { label: "Where to start?", prompt: "I'm in high school and want to apply abroad. Where do I start?" },
  { label: "College list help", prompt: "Help me build a balanced college list." },
  { label: "Summer programs", prompt: "What summer programs should I apply to?" },
  { label: "Essay help", prompt: "How do I write a great college essay?" },
  { label: "Full scholarships", prompt: "How can I get a full scholarship as an international student?" },
  { label: "US vs UK", prompt: "What's the difference between applying to US and UK universities?" },
];

/* ─── Render markdown-lite ─── */
function renderContent(text) {
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="msg-h4">{line.slice(4)}</h4>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="msg-h3">{line.slice(3)}</h3>);
    } else if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
      elements.push(<p key={i} className="msg-bold">{line.slice(2,-2)}</p>);
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <div key={i} className="msg-bullet">
          <span className="bullet-dot">·</span>
          <span dangerouslySetInnerHTML={{ __html: inlineFormat(line.slice(2)) }} />
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="msg-spacer" />);
    } else {
      elements.push(
        <p key={i} className="msg-p" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
      );
    }
    i++;
  }
  return elements;
}

function inlineFormat(text) {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function Nova() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState({ grade: '', country: '', major: '', targetCountry: '' });
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const hasKey = !!API_KEY;

  /* Initial Nova greeting */
  useEffect(() => {
    setMessages([{
      role: 'nova',
      text: `Hi! I'm Nova 👋 — ScholarPath's AI admissions counselor.\n\nI'm not a generic chatbot. I'll take time to understand your situation before giving advice.\n\nTo get started:\n- **What grade are you in?**\n- **Which country are you from?**\n- **What countries are you considering for university?**`,
      time: new Date(),
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  /* Auto-resize textarea */
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  /* Build Gemini conversation history */
  const buildHistory = (msgs) =>
    msgs.map(m => ({
      role: m.role === 'nova' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));

  /* Mock responses for demo mode */
  const mockReply = (text) => {
    const t = text.toLowerCase();
    if (t.includes('essay'))
      return `Great topic! Here's how to approach your Common App essay:\n\n**The #1 rule:** Authenticity over prestige-signaling.\n\n- **Start with a specific moment** — not a summary of your life\n- **Show, don't tell** — instead of "I'm a leader," show a scene where you led\n- **Go deep on one thing** — 650 words is not enough to cover everything\n- **Your unique voice matters** — write the way you think, not how you think essays should sound\n\nWhat topic are you considering? Share it and I'll help you evaluate it.`;
    if (t.includes('scholarship') || t.includes('free'))
      return `Yes — full scholarships for international students exist! Here are the best paths:\n\n**Need-blind US schools** (meet 100% of demonstrated need):\n- Harvard, Yale, Princeton, MIT, Amherst, Dartmouth, Williams\n\n**Dedicated full scholarships:**\n- **NYU Abu Dhabi** — every admitted student gets full aid (~3.5% acceptance)\n- **MBZUAI** — AI-focused, full scholarship + stipend\n- **Minerva University** — generous aid, study in 7 cities\n- **Lester B. Pearson** at University of Toronto\n\nWhat's your country and intended major? I can narrow this down significantly.`;
    if (t.includes('summer') || t.includes('program'))
      return `Top programs for high schoolers:\n\n**Highly competitive (transforms applications):**\n- **RSI at MIT** — ~1.5% acceptance, original research, fully funded\n- **MITES at MIT** — free, STEM-focused, underrepresented students\n- **PRIMES at MIT** — year-long math research with MIT mathematicians\n\n**Excellent options:**\n- **PROMYS at BU** — intensive math, need-blind admission\n- **Yale Young Global Scholars** — 100+ countries, 8 academic tracks\n- **COSMOS at UC** — 4 UC campuses, 20+ science clusters\n\nWhat's your field of interest? I'll pick the right ones for you.`;
    return `That's a great question! To give you the most useful advice, could you share:\n1. **Grade** you're currently in?\n2. **Country** you're from?\n3. **Target countries** for university?\n\nWith those details, I can give you specific, actionable guidance. 🎯`;
  };

  const send = async (text) => {
    const msg = text.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', text: msg, time: new Date() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      if (!hasKey) {
        await new Promise(r => setTimeout(r, 1000));
        setMessages(prev => [...prev, { role: 'nova', text: mockReply(msg), time: new Date() }]);
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: buildHistory(next),
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              maxOutputTokens: 1200,
            },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        || "I'm having trouble responding right now. Please try again.";

      setMessages(prev => [...prev, { role: 'nova', text: reply, time: new Date() }]);
    } catch (err) {
      console.error('Nova error:', err);
      setMessages(prev => [...prev, {
        role: 'nova',
        text: `⚠️ Something went wrong: ${err.message}. Please try again.`,
        time: new Date(),
      }]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const reset = () => {
    setMessages([{
      role: 'nova',
      text: "Starting fresh! Tell me about yourself — what grade, country, and where are you hoping to study?",
      time: new Date(),
    }]);
  };

  const shareProfile = () => {
    const parts = [];
    if (profile.grade)         parts.push(`Grade: ${profile.grade}`);
    if (profile.country)       parts.push(`Country: ${profile.country}`);
    if (profile.major)         parts.push(`Intended major: ${profile.major}`);
    if (profile.targetCountry) parts.push(`Target countries: ${profile.targetCountry}`);
    if (parts.length) send(`Here's my profile — ${parts.join(', ')}. Please give me tailored advice.`);
    setShowProfile(false);
  };

  return (
    <div className="nova-page">
      {/* ─── Left sidebar ─── */}
      <aside className="nova-sidebar">
        <div className="nova-sidebar-brand">
          <div className="nova-brand-icon">N</div>
          <div className="nova-brand-info">
            <div className="nova-brand-name">Nova</div>
            <div className="nova-brand-role">ScholarPath Counselor</div>
          </div>
          <div className="nova-online">Online</div>
        </div>

        {/* Quick starters */}
        <div className="sidebar-label">Quick starts</div>
        <div className="nova-starters">
          {STARTERS.map((s, i) => (
            <button key={i} className="nova-starter" onClick={() => send(s.prompt)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Profile setup */}
        <div className="nova-profile-card">
          <button className="nova-profile-toggle" onClick={() => setShowProfile(o => !o)}>
            <User size={14} />
            <span>Set your profile</span>
            <ChevronDown size={13} style={{ marginLeft: 'auto', transform: showProfile ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
          {showProfile && (
            <div className="nova-profile-form">
              <input className="nova-pf-input" placeholder="Grade (e.g. Grade 11)"
                value={profile.grade} onChange={e => setProfile(p => ({ ...p, grade: e.target.value }))} />
              <input className="nova-pf-input" placeholder="Your country (e.g. Nepal)"
                value={profile.country} onChange={e => setProfile(p => ({ ...p, country: e.target.value }))} />
              <input className="nova-pf-input" placeholder="Intended major (e.g. CS)"
                value={profile.major} onChange={e => setProfile(p => ({ ...p, major: e.target.value }))} />
              <input className="nova-pf-input" placeholder="Target countries (e.g. US, UK)"
                value={profile.targetCountry} onChange={e => setProfile(p => ({ ...p, targetCountry: e.target.value }))} />
              <button className="btn btn-blue btn-sm" style={{ width: '100%' }} onClick={shareProfile}>
                Share with Nova
              </button>
            </div>
          )}
        </div>

        {!hasKey && (
          <div className="nova-env-note">
            ⚠️ <strong>Demo mode</strong> — Add <code>VITE_GEMINI_API_KEY</code> to .env for full AI
          </div>
        )}
      </aside>

      {/* ─── Main chat ─── */}
      <div className="nova-chat">
        {/* Messages */}
        <div className="nova-messages">
          {messages.map((m, i) => (
            <div key={i} className={`nova-msg-row ${m.role}`}>
              {m.role === 'nova' && (
                <div className="nova-msg-avatar av-nova">N</div>
              )}
              <div className={`nova-bubble ${m.role}`}>
                {renderContent(m.text)}
              </div>
              {m.role === 'user' && (
                <div className="nova-msg-avatar av-user">U</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="nova-msg-row nova">
              <div className="nova-msg-avatar av-nova">N</div>
              <div className="nova-bubble nova nova-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="nova-input-wrap">
          <div className="nova-input-box">
            <button className="nova-reset" onClick={reset} title="New conversation">
              <RefreshCw size={15} />
            </button>
            <textarea
              ref={textareaRef}
              id="nova-input"
              className="nova-textarea"
              placeholder="Ask Nova about admissions, programs, essays, scholarships..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
            />
            <button
              id="nova-send"
              className={`nova-send ${!input.trim() || loading ? 'disabled' : ''}`}
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
            >
              <Send size={15} />
            </button>
          </div>
          <p className="nova-hint">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
