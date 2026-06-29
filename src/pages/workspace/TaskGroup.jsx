import { useState } from 'react';
import { ChevronDown, Sparkles, Loader2 } from 'lucide-react';
import TaskRow from './TaskRow.jsx';
import SuggestionRow from './SuggestionRow.jsx';
import LogoTile from '../../components/LogoTile.jsx';

/* Groups suggestions by university and renders them with a logo + school sub-header */
function SuggestionGroup({ suggestions, onAccept, onDismiss }) {
  const bySchool = new Map();
  for (const s of suggestions) {
    const key = s.university_id || '__none__';
    if (!bySchool.has(key)) bySchool.set(key, { uni: s.universities || null, items: [] });
    bySchool.get(key).items.push(s);
  }
  return (
    <div className="ws-suggest-school-groups">
      {[...bySchool.values()].map(({ uni, items }) => {
        const label = uni?.name || 'General';
        return (
          <div key={label} className="ws-suggest-school-group">
            <div className="ws-suggest-school-label">
              {uni ? (
                <LogoTile
                  item={{ name: uni.name, short_name: uni.short_name, logoUrl: uni.logo_url, logoStyle: uni.logo_style, fallback: uni.fallback }}
                  size={18}
                  radius={4}
                />
              ) : null}
              <span>{label}</span>
            </div>
            {items.map(s => (
              <SuggestionRow key={s.id} suggestion={s} onAccept={onAccept} onDismiss={onDismiss} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export default function TaskGroup({
  group, defaultCollapsed = false, droppable = false,
  nova = {}, onMove, onDelete, onAccept, onDismiss, dnd = {},
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [suggestCollapsed, setSuggestCollapsed] = useState(true);
  const [dropActive, setDropActive] = useState(false);

  const tasks = group.tasks || [];
  const suggestions = group.suggestions || [];
  const count = tasks.length;

  return (
    <section
      className={`ws-group ${dropActive ? 'droppable' : ''}`}
      onDragOver={droppable ? (e => { e.preventDefault(); setDropActive(true); }) : undefined}
      onDragLeave={droppable ? (() => setDropActive(false)) : undefined}
      onDrop={droppable ? (() => { setDropActive(false); dnd.onDrop?.(group.key); }) : undefined}
    >
      <button className="ws-group-head" onClick={() => setCollapsed(c => !c)}>
        <ChevronDown size={15} className={`ws-group-caret ${collapsed ? 'collapsed' : ''}`} />
        <span className="ws-group-label">{group.label}</span>
        <span className="ws-group-count">{count}</span>
        <span className="ws-group-spacer" />
        {nova.show && (
          <span
            role="button"
            tabIndex={0}
            className="ws-nova-gen"
            aria-disabled={nova.generating}
            onClick={e => { e.stopPropagation(); if (!nova.generating) nova.onGenerate(group.college); }}
          >
            {nova.generating
              ? <><Loader2 size={14} className="ws-spin" /> Finding…</>
              : <><Sparkles size={14} /> Suggest tasks</>}
          </span>
        )}
      </button>

      {!collapsed && (
        <div className="ws-group-rows">
          {/* Suggestions hidden behind a single quiet toggle, collapsed by default */}
          {suggestions.length > 0 && (
            <>
              <button
                className="ws-suggest-toggle"
                onClick={() => setSuggestCollapsed(c => !c)}
              >
                <Sparkles size={12} />
                <span>{suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''} from Nova</span>
                <span className="ws-suggest-toggle-action">{suggestCollapsed ? 'Review' : 'Hide'}</span>
              </button>
              {!suggestCollapsed && <SuggestionGroup suggestions={suggestions} onAccept={onAccept} onDismiss={onDismiss} />}
            </>
          )}

          {tasks.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              onMove={onMove}
              onDelete={onDelete}
              draggable={!!dnd.onDragStart}
              isDragging={dnd.dragId === t.id}
              onDragStart={() => dnd.onDragStart?.(t.id)}
              onDragEnd={() => dnd.onDragEnd?.()}
            />
          ))}

          {tasks.length === 0 && suggestions.length === 0 && (
            <p className="ws-group-empty">Nothing here yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
