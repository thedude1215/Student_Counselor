import { useState } from 'react';
import { Search } from 'lucide-react';
import { acceptanceData } from '../api/catalog';
import './Acceptances.css';

const BADGE = {
  'Full Scholarship': { bg: '#ECFDF5', color: '#059669' },
  'Financial Aid':    { bg: '#EAE8FF', color: '#4055F5' },
  'Merit Aid':        { bg: '#FFFBEB', color: '#D97706' },
  'No Aid':           { bg: '#F3F4F6', color: '#6B7280' },
  'Swiss Excellence': { bg: '#FDF2F8', color: '#9333EA' },
  'Lester B. Pearson':{ bg: '#EAE8FF', color: '#4055F5' },
};

export default function Acceptances() {
  const [query, setQuery] = useState('');

  const filtered = acceptanceData.filter(a => {
    const q = query.toLowerCase();
    return (
      a.student.toLowerCase().includes(q) ||
      a.university.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q) ||
      a.scholarship.toLowerCase().includes(q)
    );
  });

  return (
    <div className="acc-page">

      {/* ── Dark purple hero ── */}
      <div className="acc-hero">
        <div className="acc-hero-glow" />
        <div className="wrap acc-hero-content">
          <div className="acc-cycle">2025–26 ADMISSIONS CYCLE</div>
          <h1 className="acc-hero-title">
            Our students<br />
            got into their<br />
            dream schools
          </h1>
          <p className="acc-hero-sub">
            Real acceptances. Real students. From international high schoolers
            across 170+ countries who used ScholarPath this cycle.
          </p>
          <div className="acc-stats-row">
            <div>
              <div className="acc-stat-n">120+</div>
              <div className="acc-stat-l">Students</div>
            </div>
            <div>
              <div className="acc-stat-n">300+</div>
              <div className="acc-stat-l">Acceptances</div>
            </div>
            <div>
              <div className="acc-stat-n">40+</div>
              <div className="acc-stat-l">Countries</div>
            </div>
          </div>
          <p className="acc-footnote">Data from the 2025–2026 admissions cycle only.</p>
        </div>

        {/* World map glowing dots */}
        <div className="acc-map-dots" aria-hidden>
          {[
            [28,22],[22,50],[38,54],[20,57],[48,30],[42,72],
            [36,76],[57,37],[30,40],[62,82],[33,64],[50,62],
            [25,35],[44,48],[52,25],[35,83],
          ].map(([t,l], i) => (
            <div key={i} className="map-dot" style={{ top:`${t}%`, left:`${l}%` }} />
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="acc-body wrap">
        <div className="acc-body-header">
          <h2 className="acc-body-title">All Acceptances</h2>
          <div className="search-bar acc-search">
            <Search size={15} />
            <input
              id="acceptances-search"
              placeholder="Search school, country..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="acc-table-wrap">
          <table className="acc-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>From</th>
                <th>University</th>
                <th>Year</th>
                <th>Aid</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const b = BADGE[a.scholarship] || BADGE['No Aid'];
                return (
                  <tr key={i}>
                    <td className="td-bold">{a.student}</td>
                    <td className="td-muted">{a.country}</td>
                    <td className="td-bold">{a.university}</td>
                    <td className="td-muted">{a.year}</td>
                    <td>
                      <span className="acc-badge" style={{ background: b.bg, color: b.color }}>
                        {a.scholarship}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty">
              <div className="empty-icon">🏆</div>
              <h3>No matches found</h3>
              <p>Try a different search term</p>
            </div>
          )}
        </div>
        <p className="acc-footnote-table">
          Student names abbreviated for privacy. Data from 2025–2026 cycle only.
        </p>
      </div>
    </div>
  );
}
