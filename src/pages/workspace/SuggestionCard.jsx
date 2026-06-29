import { useState } from 'react';
import { Sparkles, Plus, X, CalendarDays } from 'lucide-react';
import LogoTile from '../../components/LogoTile.jsx';

const CAT_CLASS = {
  'Essays':        'cat-essays',
  'Testing':       'cat-testing',
  'Documents':     'cat-documents',
  'Recommendations': 'cat-recs',
  'Financial Aid': 'cat-finaid',
  'College Search':'cat-search',
  'General':       'cat-general',
};

export default function SuggestionCard({ suggestion: s, onAccept, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const uni = s.universities;

  function dismiss() {
    setLeaving(true);
    setTimeout(() => onDismiss(s.id), 200);
  }

  return (
    <div className={`ws-card2 suggested ${leaving ? 'ws-card2-leaving' : ''}`}>
      {/* Top: title + category chip */}
      <div className="ws-card2-top">
        <span className="ws-card2-title">{s.title}</span>
        {s.category && (
          <span className={`ws-row-cat ${CAT_CLASS[s.category] || 'cat-general'} ws-card2-chip`}>
            {s.category}
          </span>
        )}
      </div>

      {/* Bottom: accept/dismiss + Nova badge + logo */}
      <div className="ws-card2-bottom">
        <div className="ws-card2-actions">
          <button className="ws-icon-sm accept" title="Add to To do" onClick={() => onAccept(s)}>
            <Plus size={15} />
          </button>
          <button className="ws-icon-sm" title="Dismiss" onClick={dismiss}>
            <X size={15} />
          </button>
        </div>

        <div className="ws-card2-bottom-right">
          <span className="ws-card2-nova">
            <Sparkles size={12} /> Nova Suggested
          </span>
          {uni && (
            <LogoTile
              item={{ name: uni.name, short_name: uni.short_name, logoUrl: uni.logo_url, logoStyle: uni.logo_style, fallback: uni.fallback }}
              size={24}
              radius={6}
            />
          )}
        </div>
      </div>
    </div>
  );
}
