import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Trash2, Plus, Sparkles, ArrowLeft, ArrowRight, Pencil, GraduationCap, ThumbsUp, ThumbsDown, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { sendMessageStream, listConversations, createConversation, loadMessages, deleteConversation } from '../api/nova.js';
import { Link, useLocation } from 'react-router-dom';
import './Nova.css';

const PROMPTS = [
  { icon: <Sparkles size={18} />, label: 'Help me build my college list', prompt: 'Help me build a balanced college list based on my profile.' },
  { icon: <Pencil size={18} />,   label: 'Review my essay',               prompt: 'Can you help me review and improve my college essay?' },
  { icon: <GraduationCap size={18} />, label: 'Find scholarships I can get', prompt: 'What scholarships can I apply to as an international student?' },
];

const FOLLOW_UPS = [
  { icon: <Sparkles size={16} />, label: 'Help me choose a major', prompt: 'Help me choose a major that suits my interests and goals.' },
  { icon: <Pencil size={16} />,   label: 'Find the right colleges for me', prompt: 'Based on my profile, which colleges should I apply to?' },
];

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
}

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
      elements.push(<p key={i} className="msg-p" dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />);
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
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export default function Nova() {
  const { user, profile, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [thumbs, setThumbs] = useState({});
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const location = useLocation();
  const pendingPromptRef = useRef(location.state?.prompt || null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (!user) return;
    // Deep-linked prompt (e.g. "See my chances") always starts a fresh chat
    if (pendingPromptRef.current) { startNewConversation(); return; }
    listConversations()
      .then(({ conversations: convos }) => {
        setConversations(convos || []);
        if (convos?.length) selectConversation(convos[0].id);
        else startNewConversation();
      })
      .catch(() => startNewConversation());
  }, [user]);

  // Fire the deep-linked prompt once a conversation exists
  useEffect(() => {
    if (!conversationId || !pendingPromptRef.current) return;
    const prompt = pendingPromptRef.current;
    pendingPromptRef.current = null;
    window.history.replaceState({}, ''); // don't re-send on refresh
    send(prompt);
  }, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setMessages([]);
    }
  }

  async function startNewConversation() {
    try {
      const { id } = await createConversation();
      setConversationId(id);
      setMessages([]);
      setConversations(prev => [{ id, title: 'New conversation', created_at: new Date().toISOString() }, ...prev]);
    } catch {
      setConversationId(crypto.randomUUID());
      setMessages([]);
    }
    setThumbs({});
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
    } catch (err) { console.error('Delete failed:', err); }
  }

  const send = async (text) => {
    const msg = text.trim();
    if (!msg || !conversationId) return;
    if (loading) { abortRef.current?.(); return; }
    const userMsg = { role: 'user', text: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const novaMsg = { role: 'nova', text: '', time: new Date() };
      setMessages(prev => [...prev, novaMsg]);
      let cancelled = false;
      abortRef.current = () => { cancelled = true; setLoading(false); };
      await sendMessageStream(conversationId, msg, {
        onText(content) {
          if (cancelled) return;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], text: content };
            return updated;
          });
          setLoading(false);
        },
        onToolCall() {},
        onDone() {},
        onError(err) {
          if (cancelled) return;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], text: `Something went wrong: ${err.message}. Please try again.` };
            return updated;
          });
        },
      });
      setConversations(prev => {
        const exists = prev.find(c => c.id === conversationId);
        if (exists && exists.title === 'New conversation') {
          return prev.map(c => c.id === conversationId ? { ...c, title: msg.slice(0, 60) + (msg.length > 60 ? '…' : '') } : c);
        }
        return prev;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'nova' && !last.text) {
          updated[updated.length - 1] = { ...last, text: `Something went wrong: ${err.message}. Please try again.` };
        } else {
          updated.push({ role: 'nova', text: `Something went wrong: ${err.message}. Please try again.`, time: new Date() });
        }
        return updated;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
      textareaRef.current?.focus();
    }
  };

  const stopGeneration = () => { abortRef.current?.(); };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="nova-page nova-page-unauth">
        <div className="nova-unauth-card">
          <div className="nova-brand-icon" style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 1rem' }}><Sparkles size={26} /></div>
          <h2>Sign in to use Nova</h2>
          <p>Nova needs your profile to give personalized advice.</p>
          <Link to="/auth" className="nova-new-btn" style={{ justifyContent: 'center', marginTop: '1rem' }}>Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="nova-page">
      {/* ─── Sidebar ─── */}
      <aside className="nova-sidebar">
        <Link to="/dashboard" className="nova-back"><ArrowLeft size={14} /> Back</Link>

        <div className="nova-sidebar-brand">
          <div className="nova-brand-icon"><Sparkles size={17} /></div>
          <div className="nova-brand-info">
            <div className="nova-brand-name">Nova</div>
            <div className="nova-brand-role">AI Counselor</div>
          </div>
          <div className="nova-online">Online</div>
        </div>

        <button className="nova-new-btn" onClick={startNewConversation}>
          <Plus size={14} /> New chat
        </button>

        {conversations.length > 0 && (
          <>
            <div className="sidebar-label">History</div>
            <div className="nova-convos">
              {conversations.map(c => (
                <div key={c.id} className={`nova-convo-item ${conversationId === c.id ? 'active' : ''}`}>
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

      </aside>

      {/* ─── Main ─── */}
      <div className="nova-chat">

        {!hasMessages ? (
          /* ── Welcome ── */
          <div className="nova-welcome">
            <div className="nova-welcome-inner">
              <div className="nova-welcome-avatar"><Sparkles size={28} /></div>
              <div className="nova-welcome-text">
                <p className="nova-welcome-sub">Hi{profile?.first_name ? `, ${profile.first_name}` : ''}. I'm Nova.</p>
                <h1 className="nova-welcome-title">Here to help you<br />get into your dream school.</h1>
              </div>
              <div className="nova-prompts">
                {PROMPTS.map((p, i) => (
                  <button key={i} className="nova-prompt-card" onClick={() => send(p.prompt)}>
                    <span className="nova-prompt-icon">{p.icon}</span>
                    <span className="nova-prompt-label">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Messages ── */
          <div className="nova-messages">
            {messages.map((m, i) => {
              const isTyping = m.role === 'nova' && !m.text;
              const isLastNova = m.role === 'nova' && i === messages.length - 1 && m.text && !loading;

              if (m.role === 'user') {
                return (
                  <div key={i} className="nova-msg-row user">
                    <div className="nova-user-bubble">{m.text}</div>
                    <div className="nova-msg-time">{formatTime(m.time)}</div>
                  </div>
                );
              }

              return (
                <div key={i} className="nova-msg-row nova">
                  <div className="nova-msg-avatar av-nova"><Sparkles size={14} /></div>
                  <div className="nova-nova-content">
                    {isTyping ? (
                      <div className="nova-typing"><span /><span /><span /></div>
                    ) : (
                      <>
                        <div className="nova-nova-text">{renderContent(m.text)}</div>
                        <div className="nova-msg-meta">
                          <span className="nova-msg-time-inline">{formatTime(m.time)}</span>
                          <button
                            className={`nova-thumb ${thumbs[i] === 'up' ? 'active-up' : ''}`}
                            onClick={() => setThumbs(prev => ({ ...prev, [i]: prev[i] === 'up' ? null : 'up' }))}
                          ><ThumbsUp size={13} /></button>
                          <button
                            className={`nova-thumb ${thumbs[i] === 'down' ? 'active-down' : ''}`}
                            onClick={() => setThumbs(prev => ({ ...prev, [i]: prev[i] === 'down' ? null : 'down' }))}
                          ><ThumbsDown size={13} /></button>
                        </div>
                        {isLastNova && (
                          <div className="nova-follow-ups">
                            {FOLLOW_UPS.map((f, fi) => (
                              <button key={fi} className="nova-follow-card" onClick={() => send(f.prompt)}>
                                <span className="nova-follow-icon">{f.icon}</span>
                                <span>{f.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}

        {/* ── Input ── */}
        <div className="nova-input-wrap">
          <div className="nova-input-box">
            <textarea
              ref={textareaRef}
              className="nova-textarea"
              placeholder="Ask Nova…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              rows={1}
            />
            {loading ? (
              <button className="nova-send nova-stop" onClick={stopGeneration} title="Stop">
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button
                className={`nova-send ${!input.trim() ? 'disabled' : ''}`}
                onClick={() => send(input)}
                disabled={!input.trim()}
              >
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
