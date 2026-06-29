import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import LogoTile from '../../components/LogoTile.jsx';

const CAT_CLASS = {
  'Essays': 'cat-essays',
  'Testing': 'cat-testing',
  'Documents': 'cat-documents',
  'Recommendations': 'cat-recs',
  'Financial Aid': 'cat-finaid',
  'College Search': 'cat-search',
  'General': 'cat-general',
};

export default function SuggestionRow({ suggestion: s, onAccept, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const uni = s.universities;

  function dismiss() {
    setLeaving(true);
    setTimeout(() => onDismiss(s.id), 180);
  }

  return (
    <div className={`ws-row suggested ${leaving ? 'leaving' : ''}`}>
      <span className="ws-row-suggest-dot" />

      <span className="ws-row-title" title={s.title}>{s.title}</span>

      <div className="ws-row-meta">
        {uni && (
          <LogoTile
            item={{ name: uni.name, short_name: uni.short_name, logoUrl: uni.logo_url, logoStyle: uni.logo_style, fallback: uni.fallback }}
            size={22}
            radius={5}
          />
        )}
        {s.category && (
          <span className={`ws-row-cat ${CAT_CLASS[s.category] || 'cat-general'}`}>{s.category}</span>
        )}
        {s.priority && s.priority !== 'low' && (
          <span className="ws-row-prio">
            <span className={`ws-prio-dot prio-${s.priority}`} />
            {s.priority === 'high' && <span className="ws-prio-label">High</span>}
          </span>
        )}
      </div>

      <div className="ws-row-actions ws-row-actions-suggest">
        <button className="ws-icon-sm accept" title="Add to your tasks" onClick={() => onAccept(s)}>
          <Plus size={15} />
        </button>
        <button className="ws-icon-sm" title="Dismiss" onClick={dismiss}>
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
