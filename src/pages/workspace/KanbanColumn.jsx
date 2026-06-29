import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, Plus, X } from 'lucide-react';
import TaskCard from './TaskCard.jsx';
import TaskComposer from './TaskComposer.jsx';
import LogoTile from '../../components/LogoTile.jsx';

const CAT_CLASS = {
  'Essays': 'cat-essays', 'Testing': 'cat-testing', 'Documents': 'cat-documents',
  'Recommendations': 'cat-recs', 'Financial Aid': 'cat-finaid',
  'College Search': 'cat-search', 'General': 'cat-general',
};

/* Group suggestions by university, return [{ uni, items }] in insertion order */
function groupBySchool(suggestions) {
  const map = new Map();
  for (const s of suggestions) {
    const key = s.university_id || '__none__';
    if (!map.has(key)) map.set(key, { uni: s.universities || null, items: [] });
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
  onDelete, onAccept, onDismiss, dnd = {},
}) {
  const [dropActive, setDropActive] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const pendingColleges = nova.colleges
    ? nova.colleges.filter(c => !nova.generatedIds?.has(c.university_id))
    : [];

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
              <span>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} from Nova</span>
              <ChevronDown
                size={13}
                style={{ transform: suggestOpen ? 'none' : 'rotate(-90deg)', transition: 'transform 180ms ease', flexShrink: 0 }}
              />
            </button>

            {suggestOpen && (
              <div className="ws-kcol-suggest-panel">
                <div className="ws-kcol-suggest-groups">
                  {schoolGroups.map(({ uni, items }) => (
                    <div key={uni?.name || 'general'} className="ws-kcol-suggest-school">
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
                        <span className="ws-kcol-suggest-school-name">{uni?.name || 'General'}</span>
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

      {/* Nova generate footer */}
      {pendingColleges.length > 0 && (
        <div className="ws-kcol-nova">
          {pendingColleges.map(c => {
            const busy = nova.generatingId === c.university_id;
            return (
              <button key={c.university_id} className="ws-nova-gen" disabled={busy} onClick={() => nova.onGenerate(c)}>
                {busy
                  ? <><Loader2 size={13} className="ws-spin" /> Finding…</>
                  : <><Sparkles size={13} /> Suggest tasks for {c.universities?.name || 'school'}</>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
