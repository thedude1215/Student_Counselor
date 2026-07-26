import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUp, Flag, ArrowRight, Lock, Check } from 'lucide-react';
import NovaMascot from '../../components/NovaMascot.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCollegeList, fetchEssays, fetchTasks } from '../../api/workspace.js';
import { MILESTONE_ICONS, TrophyIcon } from './JourneyIcons.jsx';
import Confetti from './Confetti.jsx';
import './workspace.css';

// ── Acts & milestones ──────────────────────────────────────────────────────
const ACTS = [
  {
    num: 1,
    name: 'The Foundation',
    headline: 'Tell us who you are',
    desc: 'Every journey begins with a story. Build the profile that colleges — and Nova — will get to know you by.',
  },
  {
    num: 2,
    name: 'The List',
    headline: 'Decide what to study and where',
    desc: 'Discover schools that excite you and build a balanced list where your future can come to life.',
  },
  {
    num: 3,
    name: 'The Story',
    headline: 'Write essays that sound like you',
    desc: 'The story is already yours. This act is just about getting it on paper — and making it shine.',
  },
  {
    num: 4,
    name: 'The Finish',
    headline: 'Track every deadline to the end',
    desc: 'The final push. Turn your plan into checked boxes and cross the line to Decision Day.',
  },
];

const MILESTONES = [
  { id: 1, act: 1, label: 'Complete your profile',      to: '/dashboard/profile',  desc: 'Add your GPA or a test score so colleges and Nova know your baseline.',                novaPrompt: 'What information should I add to my profile to strengthen my college application?' },
  { id: 2, act: 1, label: 'Lock in your major',         to: '/dashboard/profile',  desc: 'Set an intended major so your recommendations and essays pull in one direction.',       novaPrompt: 'Help me choose the right major based on my interests and career goals.' },
  { id: 3, act: 1, label: 'Add your test scores',       to: '/dashboard/profile',  desc: 'Record your class year and scores so Nova can gauge fit against real admit ranges.',    novaPrompt: 'What SAT or ACT scores do I need for my target schools?' },
  { id: 4, act: 2, label: 'Explore colleges',           to: '/dashboard/colleges', desc: 'Add your first school to your list to start tracking fit and deadlines.',                novaPrompt: 'Which colleges should I start with for my application list?' },
  { id: 5, act: 2, label: 'Build a list of 4+ schools', to: '/dashboard/colleges', desc: 'Aim for at least four schools so your options stay open.',                              novaPrompt: 'Help me build a balanced college list of at least 4 schools.' },
  { id: 6, act: 2, label: 'Balance reach & likely',     to: '/dashboard/colleges', desc: 'Spread your list across reach, match, and likely tiers so it is realistic.',            novaPrompt: 'How should I balance reach, match, and likely schools on my list?' },
  { id: 7, act: 3, label: 'Brainstorm essay ideas',     to: '/dashboard/essays',   desc: 'Start a draft — even a rough one — to get your story out of your head.',                 novaPrompt: 'Help me brainstorm ideas for my Common App personal statement.' },
  { id: 8, act: 3, label: 'Craft your first draft',     to: '/dashboard/essays',   desc: 'Grow a draft past 100 words so there is something real to shape.',                      novaPrompt: 'Help me expand and improve my essay draft.' },
  { id: 9, act: 3, label: 'Claim your seat',            to: '/dashboard/essays',   desc: 'Run a Nova review on an essay to sharpen it before you submit.',                        novaPrompt: 'Please review my college essay and give me detailed feedback.' },
  { id: 10, act: 4, label: 'Map your deadlines',        to: '/dashboard/tasks',    desc: 'Add your application tasks so nothing slips through the cracks.',                        novaPrompt: 'Help me map out my application deadlines and tasks.' },
  { id: 11, act: 4, label: 'Check off your first task', to: '/dashboard/tasks',    desc: 'Momentum starts with one. Complete any task to get rolling.',                           novaPrompt: 'Which task should I tackle first?' },
  { id: 12, act: 4, label: 'Cross the finish line',     to: '/dashboard/tasks',    desc: 'Every task done — the moment your applications are ready to hit submit.',               novaPrompt: 'Am I ready to submit my applications? What is left?' },
];

// ── Layout constants (Kollegio geometry) ───────────────────────────────────
const MAP_W    = 708;
const LEFT_X   = 262;
const RIGHT_X  = 484;
const HEADER_H = 230;   // act header block height
const FIRST_GAP = 110;  // header bottom → first node center
const ROW_GAP   = 178;  // node → node vertical spacing
const ACT_TAIL  = 70;   // last node → next header

// Compute y-centers for every node + y for each act header
function buildLayout() {
  const headers = [];
  const nodes = [];
  let cursor = 0;
  for (const act of ACTS) {
    headers.push({ act: act.num, y: cursor });
    cursor += HEADER_H;
    const ms = MILESTONES.filter(m => m.act === act.num);
    ms.forEach((m, i) => {
      nodes.push({
        id: m.id,
        x: i % 2 === 0 ? RIGHT_X : LEFT_X,
        y: cursor + (i === 0 ? FIRST_GAP : 0),
      });
      cursor += (i === 0 ? FIRST_GAP : 0) + (i < ms.length - 1 ? ROW_GAP : 0);
    });
    cursor += ACT_TAIL + 60;
  }
  return { headers, nodes, totalH: cursor + 40 };
}

const LAYOUT = buildLayout();

// Rounded-elbow polyline through points (Kollegio-style: L … Q corner)
function roundedPath(pts, r = 42) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const d1 = Math.hypot(a.x - p.x, a.y - p.y);
    const d2 = Math.hypot(b.x - p.x, b.y - p.y);
    const r1 = Math.min(r, d1 / 2), r2 = Math.min(r, d2 / 2);
    const in1  = { x: p.x + ((a.x - p.x) / d1) * r1, y: p.y + ((a.y - p.y) / d1) * r1 };
    const out1 = { x: p.x + ((b.x - p.x) / d2) * r2, y: p.y + ((b.y - p.y) / d2) * r2 };
    d += ` L ${in1.x.toFixed(1)} ${in1.y.toFixed(1)} Q ${p.x} ${p.y} ${out1.x.toFixed(1)} ${out1.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function computeCompleted(profile, collegeList = [], essays = [], tasks = []) {
  profile = profile || {};   // useAuth() can hand us null before the profile loads
  const done = new Set();
  if (profile.gpa || profile.sat_score)                                                        done.add(1);
  if (profile.intended_major)                                                                  done.add(2);
  if (profile.class_year || profile.grade_level)                                               done.add(3);
  if (collegeList.length > 0)                                                                  done.add(4);
  if (collegeList.length >= 4)                                                                 done.add(5);
  if (new Set(collegeList.map(i => i.tier)).size >= 3)                                         done.add(6);
  if (essays.length > 0)                                                                       done.add(7);
  if (essays.some(e => (e.content || '').trim().split(/\s+/).filter(Boolean).length >= 100))  done.add(8);
  if (essays.some(e => e.ai_feedback))                                                         done.add(9);
  if (tasks.length > 0)                                                                        done.add(10);
  if (tasks.some(t => t.status === 'done'))                                                    done.add(11);
  if (tasks.length > 0 && tasks.every(t => t.status === 'done'))                               done.add(12);
  return done;
}

// ── Isometric platform tile (exact Kollegio geometry) ──────────────────────
function Platform({ base, top }) {
  return (
    <svg width="76" height="55" viewBox="0 0 76 55" fill="none" aria-hidden="true">
      <path d="M74.7652 32.7713L38.4931 54.1333C38.0318 54.4049 37.4594 54.4049 36.9981 54.1333L0.725494 32.7713C0.27596 32.5066 0 32.0238 0 31.5021V25.5259C0 24.3863 1.23853 23.6784 2.22046 24.2567L36.9981 44.7384C37.4594 45.0101 38.0318 45.0101 38.4931 44.7384L73.2703 24.2569C74.2522 23.6786 75.4907 24.3866 75.4907 25.5261V31.5021C75.4907 32.0238 75.2148 32.5066 74.7652 32.7713Z" fill={base} />
      <path d="M73.299 23.7125L38.4856 43.9421C38.0281 44.2079 37.4631 44.2079 37.0055 43.9421L2.19174 23.7125C1.2145 23.1447 1.2145 21.7333 2.19174 21.1654L37.0055 0.935885C37.4631 0.670015 38.0281 0.670015 38.4856 0.935888L73.299 21.1654C74.2763 21.7333 74.2763 23.1447 73.299 23.7125Z" fill={top} stroke="#F2EFE5" strokeOpacity="0.3" strokeWidth="1.47297" />
    </svg>
  );
}

// 3D-style checkmark for completed tiles
function CheckIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M9 21.5 17 29 32 12" stroke="#0E3B0E" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19.5 17 27 32 10" stroke="#FDFBF3" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TILE = {
  done:    { base: '#002B00', top: '#77CC5B' },
  current: { base: '#643600', top: '#FFBB33' },
  pending: { base: '#643600', top: '#F0C593' },
};

const STORAGE_PREFIX = 'jrn-completed-';

export default function Journey() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [collegeList, setCollegeList] = useState([]);
  const [essays,      setEssays]      = useState([]);
  const [tasks,       setTasks]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [openId,      setOpenId]      = useState(null);       // popover
  const [justDone,    setJustDone]    = useState(() => new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiCount, setConfettiCount] = useState(46);   // scales with the size of the win
  const currentRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchCollegeList(user.id).catch(() => []),
      fetchEssays(user.id).catch(() => []),
      fetchTasks(user.id).catch(() => []),
    ]).then(([cl, es, tk]) => {
      setCollegeList(cl || []);
      setEssays(es || []);
      setTasks(tk || []);
    }).finally(() => setLoading(false));
  }, [user]);

  const completed  = computeCompleted(profile, collegeList, essays, tasks);
  const doneCount  = completed.size;
  const current    = MILESTONES.find(m => !completed.has(m.id)) ?? null;
  const currentIdx = current ? MILESTONES.findIndex(m => m.id === current.id) : MILESTONES.length - 1;
  const allDone    = doneCount === MILESTONES.length;

  // Celebrate newly-completed milestones vs. the last visit (localStorage baseline).
  useEffect(() => {
    if (loading || !user) return;
    const key = STORAGE_PREFIX + user.id;
    const currentIds = [...completed];
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem(key) || 'null'); } catch { stored = null; }
    if (Array.isArray(stored)) {
      const fresh = currentIds.filter(id => !stored.includes(id));
      if (fresh.length) {
        setJustDone(new Set(fresh));
        // Tiered celebration: milestone < act-complete < the whole journey.
        const nowSet = new Set(currentIds);
        const storedSet = new Set(stored);
        const actComplete = (n) => {
          const ids = MILESTONES.filter(m => m.act === n).map(m => m.id);
          return ids.every(id => nowSet.has(id)) && !ids.every(id => storedSet.has(id));
        };
        const wholeDone = currentIds.length === MILESTONES.length && stored.length < MILESTONES.length;
        setConfettiCount(wholeDone ? 130 : ACTS.some(a => actComplete(a.num)) ? 84 : 46);
        setShowConfetti(true);
      }
    }
    try { localStorage.setItem(key, JSON.stringify(currentIds)); } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  // Jump to the current tile on demand (from the hero "Continue" button) —
  // the page now lands on the themed hero rather than auto-scrolling past it.
  function scrollToCurrent() {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Per-act progress for the hero tracker.
  const actProgress = ACTS.map(a => {
    const ms = MILESTONES.filter(m => m.act === a.num);
    const doneN = ms.filter(m => completed.has(m.id)).length;
    return {
      ...a,
      doneN,
      total: ms.length,
      isComplete: doneN === ms.length,
      isCurrent: current ? a.num === current.act : (allDone && a.num === ACTS[ACTS.length - 1].num),
    };
  });

  // Close popover on outside click / Escape
  useEffect(() => {
    if (openId == null) return;
    function onDoc(e) {
      if (!e.target.closest('.jrn-node')) setOpenId(null);
    }
    function onKey(e) { if (e.key === 'Escape') setOpenId(null); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [openId]);

  const { headers, nodes } = LAYOUT;
  const centers = nodes.map(n => ({ x: n.x, y: n.y }));
  const lastNode = centers[centers.length - 1];
  const finale = { x: MAP_W / 2, y: lastNode.y + 152 };
  const mapH = finale.y + 96;

  const fullPath = roundedPath([...centers, finale]);
  // Amber "traveled" path through completed nodes (+ into finale when all done)
  const traveledPts = allDone ? [...centers, finale] : centers.slice(0, currentIdx + 1);
  const traveledPath = traveledPts.length > 1 ? roundedPath(traveledPts) : '';

  const currentNode = current ? nodes.find(n => n.id === current.id) : null;

  if (loading) return <div className="ws-loading">Loading your journey…</div>;

  return (
    <div className="jrn-page">
      {showConfetti && <Confetti count={confettiCount} onDone={() => setShowConfetti(false)} />}

      {/* ── Forest hero band with 4-act tracker ────────────────── */}
      <div className="jrn-hero-wrap">
        <div className="ah-hero">
          <div className="ah-hero-main">
            <span className="ah-hero-eyebrow"><span className="ah-hero-dot" /> Your journey</span>
            <h1 className="ah-hero-title">Your Journey</h1>
            <p className="ah-hero-sub">
              {allDone
                ? 'Every act complete — Decision Day awaits 🎉'
                : `You're on Act ${current.act} of ${ACTS.length} · ${doneCount} of ${MILESTONES.length} milestones done`}
            </p>
            <div className="ah-hero-actions">
              <button className="ah-hero-btn solid" onClick={scrollToCurrent}>
                {allDone ? 'See your finish' : 'Continue journey'} <ArrowRight size={15} />
              </button>
            </div>
          </div>
          <div className="ah-hero-right jrn-hero-right">
            <div className="ah-hero-mascot"><NovaMascot size={40} idle /></div>
            <div className="jrn-act-tracker">
              {actProgress.map(a => (
                <div
                  key={a.num}
                  className={`jrn-act-card ${a.isComplete ? 'is-complete' : a.isCurrent ? 'is-current' : ''}`}
                >
                  <div className="jrn-act-card-top">
                    <span className="jrn-act-card-num">Act {a.num}</span>
                    {a.isComplete && <Check size={13} strokeWidth={3} className="jrn-act-card-check" />}
                  </div>
                  <span className="jrn-act-card-name">{a.name.replace('The ', '')}</span>
                  <div className="jrn-act-pips">
                    {Array.from({ length: a.total }, (_, i) => (
                      <span key={i} className={`jrn-pip ${i < a.doneN ? (a.isComplete ? 'on-done' : 'on-current') : ''}`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky top bar ─────────────────────────────────────── */}
      <div className="jrn-topbar">
        <button className="jrn-topbar-back" onClick={() => navigate('/dashboard')} aria-label="Back">
          <ArrowLeft size={18} />
        </button>
        <span className="jrn-topbar-title">Journey</span>
        <span className="jrn-topbar-count">{doneCount} / {MILESTONES.length}</span>
      </div>

      {/* ── Map ────────────────────────────────────────────────── */}
      <div className="jrn-scroll">
        <div className="jrn-map" ref={mapRef} style={{ width: MAP_W, height: mapH }}>

          {/* Connector paths */}
          <svg className="jrn-svg" width={MAP_W} height={mapH} viewBox={`0 0 ${MAP_W} ${mapH}`} aria-hidden="true">
            <defs>
              <filter id="journey-amber-glow" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Untraveled: dashed */}
            <path d={fullPath} fill="none" stroke="rgba(19, 38, 25, 0.3)" strokeWidth="1.5" strokeDasharray="8 6" strokeLinecap="round" />

            {/* Traveled: amber glow + solid core, drawn in on load, with a flowing energy trail */}
            {traveledPath && (
              <>
                <path className="jrn-path-draw" pathLength="1" d={traveledPath} fill="none" stroke="#FFE6A6" strokeWidth="10" strokeLinecap="round" filter="url(#journey-amber-glow)" />
                <path className="jrn-path-draw" pathLength="1" d={traveledPath} fill="none" stroke="#FFBB33" strokeWidth="2.5" strokeLinecap="round" />
                <path className="jrn-path-flow" d={traveledPath} fill="none" stroke="#FFF6DC" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="1 17" opacity="0.9" />
              </>
            )}
          </svg>

          {/* Act headers */}
          {headers.map(h => {
            const act = ACTS.find(a => a.num === h.act);
            const ms = MILESTONES.filter(m => m.act === h.act);
            const actDone = ms.filter(m => completed.has(m.id)).length;
            return (
              <div key={h.act} className="jrn-act" style={{ top: h.y }}>
                <div className="jrn-act-chip">Act {act.num}: {act.name}</div>
                <h2 className="jrn-act-headline">{act.headline}</h2>
                <p className="jrn-act-desc">{act.desc}</p>
                <div className="jrn-act-meta">
                  <Flag size={13} strokeWidth={2.5} />
                  <span className="jrn-act-count">{actDone}/{ms.length}</span>
                  <span className="jrn-act-label">MILESTONES</span>
                </div>
              </div>
            );
          })}

          {/* Milestone nodes */}
          {MILESTONES.map((m, i) => {
            const { x, y } = nodes[i];
            const isDone    = completed.has(m.id);
            const isCurrent = m.id === current?.id;
            const isJust    = justDone.has(m.id);
            const tile = isDone ? TILE.done : isCurrent ? TILE.current : TILE.pending;
            const openSide = x > MAP_W / 2 ? 'left' : 'right';
            const status = isDone ? 'Completed' : isCurrent ? 'In progress' : 'Locked';

            return (
              <div
                key={m.id}
                ref={isCurrent ? currentRef : null}
                className={`jrn-node ${isDone ? 'is-done' : isCurrent ? 'is-current' : 'is-pending'} ${isJust ? 'is-just-done' : ''} ${openId === m.id ? 'is-open' : ''}`}
                style={{ left: x, top: y }}
              >
                <button
                  className="jrn-node-btn"
                  onClick={() => setOpenId(openId === m.id ? null : m.id)}
                  aria-label={m.label}
                  aria-expanded={openId === m.id}
                >
                  <div className="jrn-node-art">
                    <span className="jrn-node-icon">
                      {(() => { const Icon = MILESTONE_ICONS[m.id]; return <Icon />; })()}
                    </span>
                    {isDone && <span className="jrn-node-badge"><CheckIcon size={16} /></span>}
                    <Platform base={tile.base} top={tile.top} />
                  </div>
                  <span className="jrn-node-label">{m.label}</span>
                </button>

                {/* Detail popover */}
                {openId === m.id && (
                  <div className={`jrn-popover open-${openSide}`} role="dialog">
                    <div className={`jrn-pop-status st-${isDone ? 'done' : isCurrent ? 'current' : 'locked'}`}>
                      {isDone ? <Check size={12} /> : isCurrent ? <span className="jrn-pop-dot" /> : <Lock size={11} />}
                      {status}
                    </div>
                    <h4 className="jrn-pop-title">{m.label}</h4>
                    <p className="jrn-pop-desc">{m.desc}</p>
                    <div className="jrn-pop-actions">
                      <Link to={m.to} className="jrn-pop-go">
                        {isDone ? 'Review' : 'Go'} <ArrowRight size={13} />
                      </Link>
                      <Link to="/nova" state={{ prompt: m.novaPrompt, from: 'Journey' }} className="jrn-pop-ask">
                        <NovaMascot size={16} /> Ask Nova
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* "You are here" mascot marker at the current tile */}
          {currentNode && (
            <div
              className={`jrn-here open-${currentNode.x > MAP_W / 2 ? 'left' : 'right'}`}
              style={{ left: currentNode.x, top: currentNode.y }}
              aria-hidden="true"
            >
              <div className="jrn-here-mascot"><NovaMascot size={40} idle /></div>
              <span className="jrn-here-tag">You're here</span>
            </div>
          )}

          {/* Finale — Decision Day */}
          <div className={`jrn-finale ${allDone ? 'is-reached' : ''}`} style={{ left: finale.x, top: finale.y }}>
            <div className="jrn-finale-art">
              <TrophyIcon size={54} />
            </div>
            <span className="jrn-finale-label">Decision Day</span>
            <span className="jrn-finale-sub">{allDone ? 'You made it 🎉' : `${MILESTONES.length - doneCount} to go`}</span>
          </div>
        </div>
      </div>

      {/* ── Floating Ask-Nova bar ──────────────────────────────── */}
      <Link
        to="/nova"
        state={{ prompt: current?.novaPrompt || 'How is my college application journey looking? What should I focus on next?', from: 'Journey' }}
        className="jrn-ask-bar"
      >
        <span className="jrn-ask-avatar"><NovaMascot size={26} /></span>
        <span className="jrn-ask-text">
          <span className="jrn-ask-hint">Ask Nova…</span>
          <span className="jrn-ask-prompt">{current ? current.novaPrompt : 'What should I do next?'}</span>
        </span>
        <span className="jrn-ask-send"><ArrowUp size={15} /></span>
      </Link>
    </div>
  );
}
