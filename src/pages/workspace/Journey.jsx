import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUp, Sparkles, Flag } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchCollegeList, fetchEssays } from '../../api/workspace.js';
import { MILESTONE_ICONS } from './JourneyIcons.jsx';
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
    headline: 'Decide what to study and where?',
    desc: 'Discover schools that excite you and build a balanced list where your future can come to life.',
  },
  {
    num: 3,
    name: 'The Story',
    headline: 'Write essays that sound like you',
    desc: 'The story is already yours. This act is just about getting it on paper — and making it shine.',
  },
];

const MILESTONES = [
  { id: 1, act: 1, label: 'Complete your profile',      to: '/dashboard/profile',  novaPrompt: 'What information should I add to my profile to strengthen my college application?' },
  { id: 2, act: 1, label: 'Lock in your major',         to: '/dashboard/profile',  novaPrompt: 'Help me choose the right major based on my interests and career goals.' },
  { id: 3, act: 1, label: 'Add your test scores',       to: '/dashboard/profile',  novaPrompt: 'What SAT or ACT scores do I need for my target schools?' },
  { id: 4, act: 2, label: 'Explore colleges',           to: '/dashboard/colleges', novaPrompt: 'Which colleges should I start with for my application list?' },
  { id: 5, act: 2, label: 'Build a list of 4+ schools', to: '/dashboard/colleges', novaPrompt: 'Help me build a balanced college list of at least 4 schools.' },
  { id: 6, act: 2, label: 'Balance reach & likely',     to: '/dashboard/colleges', novaPrompt: 'How should I balance reach, match, and likely schools on my list?' },
  { id: 7, act: 3, label: 'Brainstorm essay ideas',     to: '/dashboard/essays',   novaPrompt: 'Help me brainstorm ideas for my Common App personal statement.' },
  { id: 8, act: 3, label: 'Craft your first draft',     to: '/dashboard/essays',   novaPrompt: 'Help me expand and improve my essay draft.' },
  { id: 9, act: 3, label: 'Claim your seat',            to: '/dashboard/essays',   novaPrompt: 'Please review my college essay and give me detailed feedback.' },
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

function computeCompleted(profile = {}, collegeList = [], essays = []) {
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

export default function Journey() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [collegeList, setCollegeList] = useState([]);
  const [essays,      setEssays]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const currentRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetchCollegeList(user.id).catch(() => []),
      fetchEssays(user.id).catch(() => []),
    ]).then(([cl, es]) => {
      setCollegeList(cl || []);
      setEssays(es || []);
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!loading && currentRef.current) {
      currentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading]);

  const completed  = computeCompleted(profile, collegeList, essays);
  const doneCount  = completed.size;
  const current    = MILESTONES.find(m => !completed.has(m.id)) ?? null;
  const currentIdx = current ? MILESTONES.findIndex(m => m.id === current.id) : MILESTONES.length - 1;

  const { headers, nodes, totalH } = LAYOUT;
  const centers = nodes.map(n => ({ x: n.x, y: n.y }));

  // Trailing stub after the final node (Kollegio ends the path with a dot)
  const lastNode = centers[centers.length - 1];
  const endDot = { x: lastNode.x - 170, y: lastNode.y + 105 };
  const fullPath = roundedPath([...centers, endDot]);

  // Amber "traveled" path: through nodes up to & including the current one
  const traveledPts = centers.slice(0, currentIdx + 1);
  const traveledPath = currentIdx > 0 ? roundedPath(traveledPts) : '';

  if (loading) return <div className="ws-loading">Loading your journey…</div>;

  return (
    <div className="jrn-page">

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
        <div className="jrn-map" style={{ width: MAP_W, height: totalH }}>

          {/* Connector paths */}
          <svg className="jrn-svg" width={MAP_W} height={totalH} viewBox={`0 0 ${MAP_W} ${totalH}`} aria-hidden="true">
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

            {/* Traveled: amber glow + solid core */}
            {traveledPath && (
              <>
                <path d={traveledPath} fill="none" stroke="#FFE6A6" strokeWidth="10" strokeLinecap="round" filter="url(#journey-amber-glow)" />
                <path d={traveledPath} fill="none" stroke="#FFBB33" strokeWidth="2.5" strokeLinecap="round" />
              </>
            )}

            {/* End dot */}
            <circle cx={endDot.x} cy={endDot.y} r="4" fill="rgba(19, 38, 25, 0.25)" />
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
            const tile = isDone ? TILE.done : isCurrent ? TILE.current : TILE.pending;

            return (
              <Link
                key={m.id}
                to={m.to}
                ref={isCurrent ? currentRef : null}
                className={`jrn-node ${isDone ? 'is-done' : isCurrent ? 'is-current' : 'is-pending'}`}
                style={{ left: x, top: y }}
                aria-label={m.label}
              >
                <div className="jrn-node-art">
                  <span className="jrn-node-icon">
                    {(() => { const Icon = MILESTONE_ICONS[m.id]; return <Icon />; })()}
                  </span>
                  {isDone && <span className="jrn-node-badge"><CheckIcon size={16} /></span>}
                  <Platform base={tile.base} top={tile.top} />
                </div>
                <span className="jrn-node-label">{m.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Floating Ask-Nova bar ──────────────────────────────── */}
      <Link
        to="/nova"
        state={{ prompt: current?.novaPrompt || 'How is my college application journey looking? What should I focus on next?' }}
        className="jrn-ask-bar"
      >
        <span className="jrn-ask-avatar"><Sparkles size={16} /></span>
        <span className="jrn-ask-text">
          <span className="jrn-ask-hint">Ask Nova…</span>
          <span className="jrn-ask-prompt">{current ? current.novaPrompt : 'What should I do next?'}</span>
        </span>
        <span className="jrn-ask-send"><ArrowUp size={15} /></span>
      </Link>
    </div>
  );
}
