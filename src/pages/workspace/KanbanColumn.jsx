import { useState } from 'react';
import { Sparkles, ChevronDown, Plus, X } from 'lucide-react';
import TaskCard from './TaskCard.jsx';
import TaskComposer from './TaskComposer.jsx';
import LogoTile from '../../components/LogoTile.jsx';

const CAT_CLASS = {
  'Essays': 'cat-essays', 'Testing': 'cat-testing', 'Documents': 'cat-documents',
  'Recommendations': 'cat-recs', 'Financial Aid': 'cat-finaid',
  'College Search': 'cat-search', 'General': 'cat-general',
};

/* Keywords that mark a suggestion as general (not university-specific) */
const GENERAL_KEYWORDS = [
  'sat', 'act', 'toefl', 'ielts', 'psat', 'ap exam', 'ap test',
  'css profile', 'fafsa', 'common app', 'commonapp', 'coalition app',
  'financial aid', 'scholarship search', 'college list',
];
function isGeneralSuggestion(s) {
  const lower = s.title.toLowerCase();
  return GENERAL_KEYWORDS.some(kw => lower.includes(kw));
}

/* Group suggestions: general items first, then by university */
function groupBySchool(suggestions) {
  const general = suggestions.filter(isGeneralSuggestion);
  const specific = suggestions.filter(s => !isGeneralSuggestion(s));

  const map = new Map();
  if (general.length > 0) {
    map.set('__general__', { uni: null, items: general, isGeneral: true });
  }
  for (const s of specific) {
    const key = s.university_id || '__none__';
    if (!map.has(key)) map.set(key, { uni: s.universities || null, items: [], isGeneral: false });
    map.get(key).items.push(s);
  }
  return [...map.values()];
}

/* Compact suggestion row — shown inside each school group */
function SuggestRow({ s, onAccept, onDismiss }) {
  const [leaving, setLeaving] = useState(false);

  function dismiss() {
    setLeaving(true);
    setTimeout(() => onDismiss(s.id), 200);
  }

  return (
    <div className={`ws-suggest-row ${leaving ? 'ws-suggest-row-leaving' : ''}`}>
      <div className="ws-suggest-row-dot" />
      <span className="ws-suggest-row-title">{s.title}</span>
      <div className="ws-suggest-row-meta">
        {s.category && (
          <span className={`ws-row-cat ${CAT_CLASS[s.category] || 'cat-general'}`}>{s.category}</span>
        )}
      </div>
      <div className="ws-suggest-row-actions">
        <button className="ws-icon-sm accept" title="Add to To do" onClick={() => onAccept(s)}>
          <Plus size={13} />
        </button>
        <button className="ws-icon-sm" title="Dismiss" onClick={dismiss}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

export default function KanbanColumn({
  status, label, tasks, suggestions = [], nova = {},
  composerOpen = false, onAdd, onComposerClose,
  onDelete, onEdit, onAccept, onDismiss, dnd = {},
}) {
  const [dropActive, setDropActive] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const count = tasks.length + suggestions.length;
  const schoolGroups = groupBySchool(suggestions);

  return (
    <div
      className={`ws-kcol ${dropActive ? 'droppable' : ''}`}
      onDragOver={e => { e.preventDefault(); setDropActive(true); }}
      onDragLeave={() => setDropActive(false)}
      onDrop={() => { setDropActive(false); dnd.onDrop?.(status); }}
    >
      {/* Column pill header */}
      <div className="ws-kcol-head">
        <span className="ws-kcol-label">{label}</span>
        <span className="ws-kcol-count">{count}</span>
      </div>

      {/* Card stack */}
      <div className="ws-kcol-body">
        {composerOpen && <TaskComposer onAdd={onAdd} onCancel={onComposerClose} />}

        {/* Nova suggestion toggle — grouped by school inside */}
        {suggestions.length > 0 && (
          <>
            <button className="ws-kcol-suggest-toggle" onClick={() => setSuggestOpen(o => !o)}>
              <Sparkles size={13} />
              <span>Suggestions from Nova</span>
              <ChevronDown
                size={13}
                style={{ transform: suggestOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 180ms ease', flexShrink: 0 }}
              />
            </button>

            {suggestOpen && (
              <div className="ws-kcol-suggest-panel">
                <div className="ws-kcol-suggest-groups">
                  {schoolGroups.map(({ uni, items, isGeneral }) => (
                    <div key={uni?.name || (isGeneral ? '__general__' : '__none__')} className="ws-kcol-suggest-school">
                      {/* School header */}
                      <div className="ws-kcol-suggest-school-head">
                        {uni && (
                          <LogoTile
                            item={{
                              name: uni.name,
                              short_name: uni.short_name,
                              logoUrl: uni.logo_url,
                              logoStyle: uni.logo_style,
                              fallback: uni.fallback,
                            }}
                            logoStyle={{ background: 'transparent', padding: '1px' }}
                            size={28}
                            radius={6}
                          />
                        )}
                        <span className={`ws-kcol-suggest-school-name${isGeneral ? ' ws-kcol-general-label' : ''}`}>
                          {isGeneral ? 'General' : (uni?.name || 'Other')}
                        </span>
                        <span className="ws-kcol-suggest-school-count">{items.length}</span>
                      </div>

                      {/* Compact rows for this school */}
                      <div className="ws-kcol-suggest-rows">
                        {items.map(s => (
                          <SuggestRow key={s.id} s={s} onAccept={onAccept} onDismiss={onDismiss} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tasks.map(t => (
          <TaskCard
            key={t.id}
            task={t}
            onDelete={onDelete}
            onEdit={onEdit}
            draggable
            isDragging={dnd.dragId === t.id}
            onDragStart={() => dnd.onDragStart?.(t.id)}
            onDragEnd={() => dnd.onDragEnd?.()}
          />
        ))}

        {tasks.length === 0 && suggestions.length === 0 && (
          <p className="ws-kcol-empty">Drop tasks here</p>
        )}
      </div>

    </div>
  );
}
