import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, PenLine, Sparkles, CheckCircle2 } from 'lucide-react';
import LogoTile from '../../components/LogoTile';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchEssays, addEssay, updateEssay, deleteEssay, fetchCollegeList } from '../../api/workspace.js';
import { reviewEssay } from '../../api/nova.js';
import NewEssayModal from './NewEssayModal.jsx';
import EssayReview from './EssayReview.jsx';
import './workspace.css';

/* ai_feedback may be new structured JSON, legacy {feedback:"markdown"}, or a plain string. */
function parseReview(raw) {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return null;
  const str = raw.trim();
  if (!str) return null;
  try {
    const obj = JSON.parse(str);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      // New format: has overall or suggestions
      if ('suggestions' in obj || 'overall' in obj) return obj;
      // Legacy format: {feedback: "markdown text"}
      if ('feedback' in obj) {
        const text = (obj.feedback || '').trim();
        return text ? { overall: text, score: 0, strengths: [], suggestions: [] } : null;
      }
    }
  } catch { /* not JSON — treat as plain text */ }
  return { overall: str, score: 0, strengths: [], suggestions: [] };
}

const WORD_LIMIT = 650;
const GENERAL = { id: '', name: 'Common App / General' };

const BRAND_COLORS = {
  // ── US Ivies & top liberal arts ──
  'Harvard University':                      '#A51C30',
  'Yale University':                         '#00356B',
  'Princeton University':                    '#E77500',
  'Columbia University':                     '#003DA5',
  'University of Pennsylvania':              '#011F5B',
  'Cornell University':                      '#B31B1B',
  'Dartmouth College':                       '#00693E',
  'Brown University':                        '#4E3629',
  'Massachusetts Institute of Technology':   '#A31F34',
  'Caltech':                                 '#FF6C0C',
  'Stanford University':                     '#8C1515',
  'Duke University':                         '#003087',
  'Johns Hopkins University':                '#002D72',
  'Carnegie Mellon University':              '#C0392B',
  'Northwestern University':                 '#4E2A84',
  'University of Chicago':                   '#800000',
  'University of Notre Dame':                '#0C2340',
  'Georgetown University':                   '#002D6D',
  'Vanderbilt University':                   '#866D4B',
  'Rice University':                         '#00205B',
  'Tufts University':                        '#417BD5',
  'Emory University':                        '#012169',
  'University of Virginia':                  '#232D4B',
  'Washington University in St. Louis':      '#A51417',
  'Wake Forest University':                  '#9E7E38',
  'Tulane University':                       '#006747',
  'University of Southern California':       '#990000',
  'New York University':                     '#57068C',
  'NYU Abu Dhabi':                           '#57068C',
  'Boston University':                       '#CC0000',
  'Boston College':                          '#8A0029',
  'Northeastern University':                 '#C8102E',
  'Lehigh University':                       '#6B3529',
  'Case Western Reserve University':         '#0A3161',
  'Syracuse University':                     '#F76900',
  'Fordham University':                      '#6B1E3C',
  'Villanova University':                    '#003366',
  'Rutgers University':                      '#CC0033',
  'Temple University':                       '#9D2235',
  'Drexel University':                       '#07294D',
  'George Washington University':            '#002E5D',
  'American University':                     '#003F87',
  'Indiana University Bloomington':          '#990000',
  'Purdue University':                       '#8E6F3E',
  'Michigan State University':               '#18453B',
  'Ohio State University':                   '#BB0000',
  'University of Michigan':                  '#003FA5',
  'University of Wisconsin-Madison':         '#C5050C',
  'University of Washington':                '#4B2E83',
  'University of North Carolina':            '#4B9CD3',
  'University of Texas at Austin':           '#BF5700',
  'University of Florida':                   '#FA4616',
  'Penn State University':                   '#001E44',
  'Virginia Tech':                           '#861F41',
  'University of Maryland':                  '#E03A3E',
  'Georgia Institute of Technology':         '#B3861B',
  'University of Illinois Urbana-Champaign': '#E84A27',
  'University of Minnesota':                 '#7A0019',
  'University of Colorado Boulder':          '#CFB87C',
  'University of Arizona':                   '#AB0520',
  'Arizona State University':                '#8C1D40',
  // Liberal arts
  'Williams College':                        '#512888',
  'Amherst College':                         '#3F1F69',
  'Swarthmore College':                      '#6B0005',
  'Wellesley College':                       '#003B8C',
  'Middlebury College':                      '#1E427F',
  'Bowdoin College':                         '#003580',
  'Carleton College':                        '#003082',
  'Colgate University':                      '#820000',
  'Colby College':                           '#003893',
  'Hamilton College':                        '#003366',
  'Grinnell College':                        '#BE0000',
  'Davidson College':                        '#CC0000',
  'Harvey Mudd College':                     '#F05A28',
  'Claremont McKenna College':               '#C5962C',
  'Pomona College':                          '#004B8E',
  'Haverford College':                       '#C0001D',
  'Vassar College':                          '#721232',
  'Barnard College':                         '#003DA5',
  'Spelman College':                         '#004B87',
  'Howard University':                       '#003082',
  'Morehouse College':                       '#002868',
  'Babson College':                          '#004080',
  'Olin College of Engineering':             '#005CB4',
  'Cooper Union':                            '#231F20',
  // ── UK & Ireland ──
  'University of Oxford':                    '#002147',
  'University of Cambridge':                 '#003B5C',
  'Imperial College London':                 '#003E74',
  'London School of Economics':              '#BA0225',
  'University College London':               '#500778',
  'King\'s College London':                  '#750038',
  'University of Edinburgh':                 '#00325F',
  'University of Manchester':                '#660099',
  'University of Bristol':                   '#003B5C',
  'Durham University':                       '#7D2239',
  'University of Warwick':                   '#762A4F',
  'University of Glasgow':                   '#003865',
  'University of Birmingham':                '#2B0D61',
  'University of Leeds':                     '#003377',
  'University of St Andrews':                '#003162',
  'Heriot-Watt University':                  '#0D2B56',
  'University of Exeter':                    '#002147',
  'University of Bath':                      '#1D3C6E',
  'University of Nottingham':                '#005694',
  'Lancaster University':                    '#C9122A',
  'Loughborough University':                 '#7A0019',
  'Queen Mary University of London':         '#002781',
  'University of Sheffield':                 '#002147',
  'University of Southampton':               '#003B5C',
  'University of York':                      '#1E3E6E',
  'University of Aberdeen':                  '#003366',
  'Trinity College Dublin':                  '#012169',
  'University College Dublin':               '#003478',
  // ── Europe ──
  'ETH Zurich':                              '#1F407A',
  'EPFL':                                    '#E00026',
  'Sciences Po':                             '#C7001E',
  'HEC Paris':                               '#0C1B4D',
  'Bocconi University':                      '#003366',
  'TU Delft':                                '#00A6D6',
  'KU Leuven':                               '#003082',
  'University of Amsterdam':                 '#BB0000',
  'Leiden University':                       '#001158',
  'Technical University of Munich':          '#0073A5',
  'Ludwig Maximilian University':            '#009FE3',
  'RWTH Aachen University':                  '#00549F',
  'Heidelberg University':                   '#C1002A',
  'Maastricht University':                   '#00273D',
  'Lund University':                         '#A5303B',
  'Uppsala University':                      '#990000',
  'University of Copenhagen':                '#901A1E',
  'KTH Royal Institute of Technology':       '#003366',
  'Aalto University':                        '#FFBE00',
  'École Polytechnique':                     '#003399',
  'École Normale Supérieure':                '#002A5C',
  'Sorbonne University':                     '#00308F',
  'University of Bologna':                   '#CC0000',
  'Politecnico di Milano':                   '#FFCC00',
  // ── Asia-Pacific ──
  'National University of Singapore':        '#003D7C',
  'Nanyang Technological University':        '#C8102E',
  'Singapore Management University':         '#00205B',
  'KAIST':                                   '#003C71',
  'Seoul National University':               '#0039A6',
  'Yonsei University':                       '#003087',
  'Korea University':                        '#C8102E',
  'POSTECH':                                 '#0B3083',
  'University of Tokyo':                     '#004098',
  'Kyoto University':                        '#663300',
  'Tohoku University':                       '#003087',
  'Osaka University':                        '#003087',
  'Tokyo Institute of Technology':           '#004098',
  'Keio University':                         '#990033',
  'Tsinghua University':                     '#660874',
  'Peking University':                       '#410099',
  'Fudan University':                        '#990000',
  'Shanghai Jiao Tong University':           '#B8191A',
  'Nanjing University':                      '#003087',
  'Hong Kong University of Science and Technology': '#003087',
  'University of Hong Kong':                 '#003366',
  'Chinese University of Hong Kong':         '#65005B',
  'Australian National University':          '#374EA2',
  'University of Melbourne':                 '#000C3D',
  'University of Sydney':                    '#00003E',
  'University of New South Wales':           '#FFD100',
  'Monash University':                       '#006DAE',
  // ── Canada ──
  'University of Toronto':                   '#002A5C',
  'McGill University':                       '#ED1B2F',
  'University of British Columbia':          '#002145',
  'University of Waterloo':                  '#8B6914',
  'McMaster University':                     '#7A003C',
  'Queen\'s University':                     '#002452',
  'University of Alberta':                   '#007C41',
  'Simon Fraser University':                 '#CC0000',
  'University of Calgary':                   '#C8102E',
  'Dalhousie University':                    '#FACC1B',
  'Western University':                      '#4F2683',
  // ── Middle East / Africa ──
  'MBZUAI':                                  '#00A0E9',
  'Khalifa University':                      '#003087',
  'American University of Beirut':           '#003DA5',
  'American University in Cairo':            '#003087',
  'American University of Sharjah':          '#003087',
  'Sabanci University':                      '#0072C6',
  'Koç University':                          '#002B5C',
  'Bilkent University':                      '#C8102E',
  'Boğaziçi University':                     '#4169E1',
  'Hebrew University of Jerusalem':          '#003DA5',
  'Tel Aviv University':                     '#003087',
  'Technion - Israel Institute of Technology': '#003087',
  // ── South Asia ──
  'IIT Bombay':                              '#003087',
  'IIT Delhi':                               '#003087',
  'IIT Madras':                              '#003087',
  'IIT Kanpur':                              '#003087',
  'IIT Kharagpur':                           '#003087',
  'Indian Institute of Science':             '#002D72',
  'BITS Pilani':                             '#0066CC',
  'Ashoka University':                       '#FF6B00',
  'Lahore University of Management Sciences':'#003087',
  // ── Misc ──
  'Minerva University':                      '#2D2D8F',
  'Yale-NUS College':                        '#00356B',
};

const FALLBACK_HUES = ['#6366F1','#0EA5E9','#10B981','#F59E0B','#EC4899','#8B5CF6','#EF4444','#14B8A6'];

function brandColor(uni) {
  if (!uni) return '#1273C4'; // Common App blue
  const known = BRAND_COLORS[uni.name];
  if (known) return known;
  // Deterministic color from name
  let h = 0;
  for (let i = 0; i < (uni.name || '').length; i++) h = (h * 31 + uni.name.charCodeAt(i)) & 0xffffffff;
  return FALLBACK_HUES[Math.abs(h) % FALLBACK_HUES.length];
}

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function cardStyle(uni, isActive) {
  const color = brandColor(uni);
  const [r, g, b] = hexToRgb(color);
  return {
    background:  `rgba(${r},${g},${b},${isActive ? 0.08 : 0.05})`,
    borderColor: `rgba(${r},${g},${b},${isActive ? 0.45 : 0.22})`,
    boxShadow:   isActive
      ? `0 4px 14px rgba(${r},${g},${b},0.22)`
      : `0 2px 8px rgba(${r},${g},${b},0.10)`,
    _color: color,
  };
}

function wordCount(text) {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export default function Essays() {
  const { user } = useAuth();
  const [essays, setEssays] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState({ title: '', prompt: '', content: '', university_id: '' });
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'pending' | 'saving' | 'saved'
  const autoSaveTimer = useRef(null);
  const [feedback, setFeedback] = useState(null);
  const [reviewedContent, setReviewedContent] = useState(''); // content snapshot at review time
  const [reviewing, setReviewing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([fetchEssays(user.id), fetchCollegeList(user.id)]).then(([list, cl]) => {
      setEssays(list);
      setColleges(cl.map(i => i.universities).filter(Boolean));
      if (list.length) selectEssay(list[0]);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  function selectEssay(essay) {
    setSelectedId(essay.id);
    const content = essay.content || '';
    setDraft({ title: essay.title, prompt: essay.prompt || '', content, university_id: essay.university_id || '' });
    setReviewedContent(content); // seed so saved reviews also show essay text
    setSaveState('idle');
    setFeedback(parseReview(essay.ai_feedback));
    setShowFeedback(false);
  }

  async function getAiFeedback() {
    if (!selectedId || wc < 20) return;
    // Snapshot content NOW before any async state changes can clear draft
    const contentSnap = draft.content;
    setReviewing(true);
    try {
      const uni = colleges.find(u => u.id === draft.university_id);
      const result = await reviewEssay({
        essayId: selectedId,
        essayContent: contentSnap,
        essayPrompt: draft.prompt,
        essayTitle: draft.title,
        universityName: uni?.name || null,
      });
      // result.review = new structured format; result.feedback = legacy string fallback
      const parsed = result.review
        ? result.review
        : parseReview(typeof result.feedback === 'string' ? result.feedback : null);
      setReviewedContent(contentSnap);
      setFeedback(parsed || { overall: 'Feedback received but could not be parsed.', score: 0, strengths: [], suggestions: [] });
      setShowFeedback(true);
    } catch (err) {
      setReviewedContent(contentSnap);
      setFeedback({ overall: `Failed to get feedback: ${err.message}`, score: 0, strengths: [], suggestions: [] });
      setShowFeedback(true);
    } finally { setReviewing(false); }
  }

  async function createEssay({ title, university_id, prompt, word_limit, content }) {
    try {
      const essay = await addEssay(user.id, { title, university_id: university_id || null, prompt, word_limit, content });
      setEssays([essay, ...essays]);
      selectEssay(essay);
      setShowNewModal(false);
    } catch (err) {
      console.error('Failed to create essay:', err);
      alert('Could not create essay: ' + (err.message || 'Unknown error'));
    }
  }

  // Auto-save: debounce 1.2s after any draft change
  useEffect(() => {
    if (!selectedId) return;
    setSaveState('pending');
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaveState('saving');
      try {
        const updated = await updateEssay(selectedId, { ...draft, university_id: draft.university_id || null });
        setEssays(prev => prev.map(e => (e.id === selectedId ? updated : e)));
        setSaveState('saved');
      } catch {
        setSaveState('idle');
      }
    }, 1200);
    return () => clearTimeout(autoSaveTimer.current);
  }, [draft, selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(id) {
    await deleteEssay(id);
    const rest = essays.filter(e => e.id !== id);
    setEssays(rest);
    if (selectedId === id) {
      if (rest.length) selectEssay(rest[0]);
      else { setSelectedId(null); setDraft({ title: '', prompt: '', content: '' }); }
    }
  }

  const activeEssay = essays.find(e => e.id === selectedId);
  const essayLimit = activeEssay?.word_limit || WORD_LIMIT;
  const wc = wordCount(draft.content);
  const pct = Math.min(100, Math.round((wc / essayLimit) * 100));
  const overLimit = wc > essayLimit;

  if (loading) return <div className="ws-loading">Loading your essays…</div>;

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Essays</h1>
          <p className="ws-subtitle">{essays.length} draft{essays.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="ws-btn ws-btn-primary" onClick={() => setShowNewModal(true)}><Plus size={16} /> New essay</button>
      </header>

      {essays.length === 0 ? (
        <div className="ws-empty">
          <PenLine size={40} />
          <h3>No essays yet</h3>
          <p>Start a draft and refine it over time.</p>
          <button className="ws-btn ws-btn-primary" onClick={() => setShowNewModal(true)}>Start writing</button>
        </div>
      ) : (
        <div className="ws-essay-layout">

          {/* ── Left: essay list ── */}
          <div className="ws-essay-list">
            {essays.map(e => {
              const wc2 = wordCount(e.content || '');
              const pct2 = Math.min(100, Math.round((wc2 / WORD_LIMIT) * 100));
              const uni = e.universities;
              const isActive = selectedId === e.id;
              const cs = cardStyle(uni, isActive);
              return (
                <div
                  key={e.id}
                  className={`ws-essay-item ${isActive ? 'active' : ''}`}
                  style={{ background: cs.background, borderColor: cs.borderColor, boxShadow: cs.boxShadow }}
                  onClick={() => selectEssay(e)}
                >
                  <div className="ws-essay-item-logo">
                    {uni ? (
                      <LogoTile item={{ logoUrl: uni.logo_url, logoStyle: uni.logo_style, fallback: uni.fallback, name: uni.name }} size={32} radius={8} />
                    ) : (
                      <LogoTile item={{ logoUrl: '/logos/common-app.png', logoStyle: { background: '#1273C4', padding: '0px' }, fallback: 'CA', name: 'Common App' }} size={32} radius={8} />
                    )}
                  </div>
                  <div className="ws-essay-item-body">
                    <div className="ws-essay-item-title">{e.title || 'Untitled'}</div>
                    <div className="ws-essay-item-meta">
                      {uni ? (uni.short_name || uni.name) : 'Common App'} · {wc2} words
                    </div>
                    <div className="ws-essay-item-bar">
                      <div className="ws-essay-item-bar-fill" style={{ width: `${pct2}%`, background: cs._color }} />
                    </div>
                  </div>
                  <button
                    className="ws-essay-item-delete"
                    onClick={ev => { ev.stopPropagation(); remove(e.id); }}
                    title="Delete essay"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Right: editor ── */}
          {selectedId && (
            <div className="ws-essay-editor">
              {/* Editor header: school + prompt */}
              <div className="ws-essay-editor-top">
                <div className="ws-essay-meta-row">
                  <select
                    className="ws-essay-uni-select"
                    value={draft.university_id}
                    onChange={e => setDraft({ ...draft, university_id: e.target.value })}
                  >
                    <option value={GENERAL.id}>{GENERAL.name}</option>
                    {colleges.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <input
                  className="ws-essay-title-input"
                  placeholder="Essay title"
                  value={draft.title}
                  onChange={e => setDraft({ ...draft, title: e.target.value })}
                />
                <input
                  className="ws-essay-prompt-input"
                  placeholder="Paste your prompt here (e.g. Describe a challenge you've overcome…)"
                  value={draft.prompt}
                  onChange={e => setDraft({ ...draft, prompt: e.target.value })}
                />
              </div>

              {/* Writing area */}
              <textarea
                className="ws-essay-textarea"
                placeholder="Start writing… your story matters."
                value={draft.content}
                onChange={e => setDraft({ ...draft, content: e.target.value })}
              />

              {/* Word count progress */}
              <div className="ws-essay-progress">
                <div className="ws-essay-progress-bar">
                  <div
                    className={`ws-essay-progress-fill ${overLimit ? 'over' : pct >= 80 ? 'near' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`ws-essay-words ${overLimit ? 'over' : ''}`}>
                  {wc} / {essayLimit} words {overLimit ? '— over limit' : pct >= 80 ? '— almost there' : ''}
                </span>
              </div>

              {/* Footer actions */}
              <div className="ws-essay-footer">
                <div className="ws-essay-saved-state">
                  {saveState === 'saving' && (
                    <span className="ws-essay-saving">Saving…</span>
                  )}
                  {saveState === 'saved' && (
                    <span className="ws-essay-saved"><CheckCircle2 size={13} /> Saved</span>
                  )}
                </div>
                <div className="ws-essay-actions">
                  <button
                    className="ws-btn ws-btn-ai"
                    onClick={getAiFeedback}
                    disabled={reviewing || wc < 20}
                    title={wc < 20 ? 'Write at least 20 words first' : 'Get Nova feedback'}
                  >
                    <Sparkles size={15} /> {reviewing ? 'Reviewing…' : 'AI Feedback'}
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* Nova essay review — highlighted essay + suggestions */}
      {showFeedback && feedback && (
        <EssayReview
          review={feedback}
          content={reviewedContent}
          title={draft.title}
          university={colleges.find(u => u.id === draft.university_id)?.name || (draft.university_id ? '' : 'Common App')}
          prompt={draft.prompt || ''}
          onClose={() => setShowFeedback(false)}
        />
      )}

      {showNewModal && (
        <NewEssayModal
          colleges={colleges}
          onConfirm={createEssay}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}
