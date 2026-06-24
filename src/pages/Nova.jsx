import { useState, useRef, useEffect } from 'react';
import { Send, User, MessageSquare, Trash2, Plus, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { sendMessage, listConversations, createConversation, loadMessages, deleteConversation } from '../api/nova.js';
import { Link } from 'react-router-dom';
import './Nova.css';

/* ─── Quick starter prompts ─── */
const STARTERS = [
  { label: "Where to start?", prompt: "I'm in high school and want to apply abroad. Where do I start?" },
  { label: "College list help", prompt: "Help me build a balanced college list." },
  { label: "Summer programs", prompt: "What summer programs should I apply to?" },
  { label: "Essay help", prompt: "How do I write a great college essay?" },
  { label: "Full scholarships", prompt: "How can I get a full scholarship as an international student?" },
  { label: "US vs UK", prompt: "What's the difference between applying to US and UK universities?" },
];

const GREETING = `Hi! I'm Nova — ScholarPath's AI admissions counselor.\n\nI'm not a generic chatbot. I'll take time to understand your situation before giving advice.\n\nTo get started:\n- **What grade are you in?**\n- **Which country are you from?**\n- **What countries are you considering for university?**`;

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
  const { user, profile, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  /* Load conversations on mount */
  useEffect(() => {
    if (!user) return;
    setLoadingConvos(true);
    listConversations()
      .then(({ conversations: convos }) => {
        setConversations(convos || []);
        if (convos?.length) {
          selectConversation(convos[0].id);
        } else {
          startNewConversation();
        }
      })
      .catch(() => startNewConversation())
      .finally(() => setLoadingConvos(false));
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  async function selectConversation(id) {
    setConversationId(id);
    try {
      const { messages: msgs } = await loadMessages(id);
      setMessages(msgs.map(m => ({ role: m.role, text: m.content, time: new Date(m.created_at) })));
    } catch {
      setMessages([{ role: 'nova', text: GREETING, time: new Date() }]);
    }
  }

  async function startNewConversation() {
    try {
      const { id } = await createConversation();
      setConversationId(id);
      setMessages([{ role: 'nova', text: GREETING, time: new Date() }]);
      setConversations(prev => [{ id, title: 'New conversation', created_at: new Date().toISOString() }, ...prev]);
    } catch {
      setConversationId(crypto.randomUUID());
      setMessages([{ role: 'nova', text: GREETING, time: new Date() }]);
    }
  }

  async function removeConversation(id) {
    try {
      await deleteConversation(id);
      const rest = conversations.filter(c => c.id !== id);
      setConversations(rest);
      if (conversationId === id) {
        if (rest.length) selectConversation(rest[0].id);
        else startNewConversation();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  const send = async (text) => {
    const msg = text.trim();
    if (!msg || loading || !conversationId) return;

    const userMsg = { role: 'user', text: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const { reply } = await sendMessage(conversationId, msg);
      setMessages(prev => [...prev, { role: 'nova', text: reply, time: new Date() }]);

      setConversations(prev => {
        const exists = prev.find(c => c.id === conversationId);
        if (exists && exists.title === 'New conversation') {
          return prev.map(c => c.id === conversationId
            ? { ...c, title: msg.slice(0, 60) + (msg.length > 60 ? '...' : '') }
            : c
          );
        }
        return prev;
      });
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'nova',
        text: `Something went wrong: ${err.message}. Please try again.`,
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

  const profileRows = [
    ['Grade', profile?.grade_level],
    ['Country', profile?.country],
    ['Major', profile?.intended_major],
    ['Target', profile?.target_countries?.length ? profile.target_countries.join(', ') : null],
  ].filter(([, v]) => v);
  const hasProfile = profileRows.length > 0;

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="nova-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div className="nova-brand-icon" style={{ width: 56, height: 56, margin: '0 auto 1rem' }}><Sparkles size={24} /></div>
          <h2 style={{ marginBottom: '0.5rem' }}>Sign in to use Nova</h2>
          <p style={{ color: 'var(--ink-3)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Nova needs your profile to give personalized advice.
          </p>
          <Link to="/auth" className="ws-btn ws-btn-primary" style={{ display: 'inline-flex', padding: '0.6rem 1.5rem' }}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-page">
      {/* ─── Left sidebar ─── */}
      <aside className="nova-sidebar">
        <div className="nova-sidebar-brand">
          <div className="nova-brand-icon"><Sparkles size={17} /></div>
          <div className="nova-brand-info">
            <div className="nova-brand-name">Nova</div>
            <div className="nova-brand-role">ScholarPath Counselor</div>
          </div>
          <div className="nova-online">Online</div>
        </div>

        {/* New conversation button */}
        <button className="nova-starter" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }} onClick={startNewConversation}>
          <Plus size={14} /> New conversation
        </button>

        {/* Conversation history */}
        {conversations.length > 0 && (
          <>
            <div className="sidebar-label">History</div>
            <div className="nova-convos">
              {conversations.map(c => (
                <div
                  key={c.id}
                  className={`nova-convo-item ${conversationId === c.id ? 'active' : ''}`}
                >
                  <button className="nova-convo-btn" onClick={() => selectConversation(c.id)}>
                    <MessageSquare size={13} />
                    <span>{c.title}</span>
                  </button>
                  <button className="nova-convo-del" onClick={() => removeConversation(c.id)} title="Delete">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Quick starters */}
        <div className="sidebar-label" style={{ marginTop: '1rem' }}>Quick starts</div>
        <div className="nova-starters">
          {STARTERS.map((s, i) => (
            <button key={i} className="nova-starter" onClick={() => send(s.prompt)}>
              {s.label}
            </button>
          ))}
        </div>

        {/* Profile summary — Nova reads this automatically */}
        <div className="nova-profile-card">
          <div className="nova-profile-head">
            <User size={14} />
            <span>Your profile</span>
          </div>
          {hasProfile ? (
            <>
              <div className="nova-profile-rows">
                {profileRows.map(([label, value]) => (
                  <div key={label} className="nova-profile-row">
                    <span className="nova-pf-label">{label}</span>
                    <span className="nova-pf-value">{value}</span>
                  </div>
                ))}
              </div>
              <Link to="/dashboard/profile" className="nova-profile-link">
                Edit profile <ArrowRight size={12} />
              </Link>
            </>
          ) : (
            <>
              <p className="nova-profile-empty">
                Add your grade, country, and major so Nova can tailor its advice.
              </p>
              <Link to="/dashboard/profile" className="nova-profile-link">
                Complete your profile <ArrowRight size={12} />
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* ─── Main chat ─── */}
      <div className="nova-chat">
        <div className="nova-messages">
          {messages.map((m, i) => (
            <div key={i} className={`nova-msg-row ${m.role}`}>
              {m.role === 'nova' && (
                <div className="nova-msg-avatar av-nova"><Sparkles size={14} /></div>
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
