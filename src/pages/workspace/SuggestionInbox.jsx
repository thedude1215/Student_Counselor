import { Sparkles, Plus, X, Loader2 } from 'lucide-react';

/*
 * AI Suggestion Inbox — sits above the Kanban board on the Tasks page.
 * Per college: a "Find requirements" button (if not yet generated), or the
 * generated suggestion cards the user can Add (→ To do) or Dismiss.
 *
 * Props:
 *   colleges       — college_list_items (each has university_id + universities{name})
 *   suggestions    — task_suggestions rows (status 'suggested') with universities{name}
 *   generatedIds   — Set of university_ids that already have suggestions (any status)
 *   generatingId   — university_id currently being generated (spinner), or null
 *   onGenerate(college)
 *   onAccept(suggestion)
 *   onDismiss(id)
 */
export default function SuggestionInbox({
  colleges = [],
  suggestions = [],
  generatedIds,
  generatingId,
  onGenerate,
  onAccept,
  onDismiss,
}) {
  // Colleges that haven't been generated yet → show a "Find requirements" button.
  const pendingColleges = colleges.filter(c => !generatedIds.has(c.university_id));

  // Nothing to show at all → render nothing (keeps the page clean).
  if (!colleges.length || (!pendingColleges.length && !suggestions.length)) return null;

  // Group suggestions by university for tidy sections.
  const byUni = new Map();
  for (const s of suggestions) {
    const key = s.university_id || 'other';
    if (!byUni.has(key)) byUni.set(key, { name: s.universities?.name || 'Your schools', items: [] });
    byUni.get(key).items.push(s);
  }

  return (
    <section className="ws-suggest">
      <div className="ws-suggest-head">
        <span className="ws-section-icon acc-violet"><Sparkles size={15} /></span>
        <div>
          <h2 className="ws-suggest-title">Nova&apos;s suggested tasks</h2>
          <p className="ws-suggest-sub">Generate school-specific to-dos, then add the ones you want.</p>
        </div>
      </div>

      {/* Generate buttons for colleges with no suggestions yet */}
      {pendingColleges.length > 0 && (
        <div className="ws-suggest-generate">
          {pendingColleges.map(c => {
            const busy = generatingId === c.university_id;
            return (
              <button
                key={c.id}
                className="ws-btn ws-btn-ai"
                disabled={busy}
                onClick={() => onGenerate(c)}
              >
                {busy
                  ? <><Loader2 size={15} className="ws-spin" /> Finding requirements…</>
                  : <><Sparkles size={15} /> Find requirements for {c.universities?.name || 'school'}</>}
              </button>
            );
          })}
        </div>
      )}

      {/* Generated suggestions grouped by school */}
      {[...byUni.values()].map(group => (
        <div key={group.name} className="ws-suggest-group">
          <div className="ws-suggest-group-head">
            ✨ Nova found {group.items.length} requirement{group.items.length === 1 ? '' : 's'} for {group.name}
          </div>
          <div className="ws-suggest-cards">
            {group.items.map(s => (
              <div key={s.id} className="ws-card ws-suggest-card">
                <div className="ws-card-top">
                  <span className="ws-card-title">{s.title}</span>
                  <div className="ws-suggest-actions">
                    <button className="ws-icon-btn ws-suggest-add" onClick={() => onAccept(s)} title="Add to To do">
                      <Plus size={15} />
                    </button>
                    <button className="ws-icon-btn" onClick={() => onDismiss(s.id)} title="Dismiss">
                      <X size={15} />
                    </button>
                  </div>
                </div>
                <div className="ws-card-meta">
                  {s.category && <span className="ws-card-tag">{s.category}</span>}
                  <span className={`ws-prio prio-${s.priority}`}>{s.priority}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
