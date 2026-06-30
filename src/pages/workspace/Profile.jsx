import { useState, useEffect, useRef } from 'react';
import { Save, Check, Search, X, UserRound, BookOpen, SlidersHorizontal, Bell, BellOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchProfile, updateProfile } from '../../api/workspace.js';
import {
  notificationsSupported,
  getPermissionState,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  getCachedToken,
} from '../../lib/notifications.js';
import './workspace.css';

const GRADE_OPTIONS = ['8', '9', '10', '11', '12', 'Gap Year'];

const CLASS_YEAR_OPTIONS = [
  'Class of 2024', 'Class of 2025', 'Class of 2026', 'Class of 2027',
  'Class of 2028', 'Class of 2029', 'Already Graduated',
];

const BUDGET_OPTIONS = [
  'Full Aid Needed',
  'Partial Financial Aid',
  'Self-Funded / Low Budget (<$10k/yr)',
  'Self-Funded / Medium Budget ($10k-$30k/yr)',
  'Self-Funded / Full Budget (>$30k/yr)',
];

const MAJORS = [
  'Accounting','Aerospace Engineering','African Studies','Agricultural Science','American Studies',
  'Anthropology','Applied Mathematics','Arabic','Architecture','Art History','Astronomy',
  'Biochemistry','Biomedical Engineering','Biology','Biostatistics','Business Administration',
  'Chemical Engineering','Chemistry','Chinese','Civil Engineering','Classics',
  'Cognitive Science','Communication','Comparative Literature','Computer Engineering',
  'Computer Science','Creative Writing','Criminal Justice','Cybersecurity',
  'Data Science','Dentistry (Pre-Dental)','Design',
  'Earth Science','East Asian Studies','Economics','Education','Electrical Engineering',
  'English','Entrepreneurship','Environmental Engineering','Environmental Science',
  'Film & Media Studies','Finance','Fine Arts','Food Science','French',
  'Gender Studies','Genetics','Geography','Geology','German','Global Studies',
  'Graphic Design','Health Sciences','Hindi','History','Hospitality Management',
  'Human Resources','Industrial Engineering','Information Systems','Information Technology',
  'International Business','International Relations',
  'Japanese','Journalism',
  'Kinesiology','Korean',
  'Latin American Studies','Law (Pre-Law)','Liberal Arts','Linguistics',
  'Management','Marine Biology','Marketing','Materials Science','Mathematics',
  'Mechanical Engineering','Media Studies','Medicine (Pre-Med)','Meteorology',
  'Microbiology','Middle Eastern Studies','Military Science','Molecular Biology',
  'Music','Music Education','Nanotechnology','Neuroscience','Nuclear Engineering',
  'Nursing','Nutrition',
  'Oceanography',
  'Pharmacy','Philosophy','Photography','Physical Therapy','Physics',
  'Political Science','Psychology','Public Health','Public Policy',
  'Real Estate','Religious Studies','Robotics','Russian',
  'Social Work','Sociology','Software Engineering','Spanish','Sports Management',
  'Statistics','Supply Chain Management','Sustainability','Systems Engineering',
  'Theater','Theology','Tourism Management',
  'Undecided','Urban Planning',
  'Veterinary Science (Pre-Vet)','Visual Arts',
  'Women\'s Studies',
  'Zoology',
];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia',
  'Australia','Austria','Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium',
  'Belize','Benin','Bhutan','Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria',
  'Burkina Faso','Burundi','Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad',
  'Chile','China','Colombia','Comoros','Congo','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
  'Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea',
  'Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany',
  'Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kiribati','Kosovo','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho',
  'Liberia','Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives',
  'Mali','Malta','Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco',
  'Mongolia','Montenegro','Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands',
  'New Zealand','Nicaragua','Niger','Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan',
  'Palau','Palestine','Panama','Papua New Guinea','Paraguay','Peru','Philippines','Poland','Portugal',
  'Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis','Saint Lucia',
  'Saint Vincent and the Grenadines','Samoa','San Marino','Sao Tome and Principe','Saudi Arabia',
  'Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands',
  'Somalia','South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden',
  'Switzerland','Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga',
  'Trinidad and Tobago','Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine',
  'United Arab Emirates','United Kingdom','United States','Uruguay','Uzbekistan','Vanuatu',
  'Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

// Target countries grouped by region for the categorized multi-select
const COUNTRY_GROUPS = {
  'North America': ['United States', 'Canada', 'Mexico', 'Puerto Rico'],
  'Europe': [
    'UK', 'Germany', 'France', 'Netherlands', 'Switzerland', 'Italy', 'Spain',
    'Sweden', 'Denmark', 'Finland', 'Norway', 'Ireland', 'Belgium', 'Austria',
    'Poland', 'Czech Republic', 'Portugal', 'Estonia', 'Iceland', 'Greece',
    'Croatia', 'Slovenia', 'Serbia', 'Hungary', 'Romania', 'Lithuania', 'Latvia', 'Russia',
  ],
  'Asia': [
    'China', 'Japan', 'South Korea', 'India', 'Singapore', 'Hong Kong', 'Taiwan',
    'Malaysia', 'Thailand', 'Philippines', 'Indonesia', 'Vietnam', 'Pakistan',
    'Bangladesh', 'Sri Lanka', 'Cambodia', 'Laos', 'Myanmar', 'Mongolia',
    'Nepal', 'Bhutan', 'Brunei',
  ],
  'Middle East': ['UAE', 'Saudi Arabia', 'Qatar', 'Israel', 'Turkey', 'Lebanon', 'Egypt'],
  'Oceania': ['Australia', 'New Zealand', 'Fiji', 'Papua New Guinea'],
  'Africa': [
    'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Rwanda', 'Uganda', 'Tanzania',
    'Ethiopia', 'Morocco', 'Tunisia', 'Botswana', 'Mauritius',
  ],
  'Latin America': [
    'Brazil', 'Argentina', 'Chile', 'Colombia', 'Costa Rica', 'Peru',
    'Venezuela', 'Jamaica', 'Trinidad and Tobago',
  ],
};

function GroupedMultiSelect({ value = [], onChange, groups, placeholder, searchPlaceholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function toggle(country) {
    if (value.includes(country)) onChange(value.filter(c => c !== country));
    else onChange([...value, country]);
  }

  const q = search.trim().toLowerCase();
  const filteredGroups = Object.entries(groups)
    .map(([region, countries]) => [region, q ? countries.filter(c => c.toLowerCase().includes(q)) : countries])
    .filter(([, countries]) => countries.length > 0);

  return (
    <div className="ws-country-select" ref={ref}>
      <div
        className="ws-tag-input ws-multi-trigger"
        onClick={() => setOpen(o => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); } }}
      >
        {value.length === 0 && <span className="ws-multi-ph">{placeholder}</span>}
        {value.map(c => (
          <span key={c} className="ws-tag-pill">
            {c}
            <button
              type="button"
              className="ws-tag-remove"
              aria-label={`Remove ${c}`}
              onClick={e => { e.stopPropagation(); onChange(value.filter(x => x !== c)); }}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <svg width="12" height="12" viewBox="0 0 12 12" className="ws-select-arrow ws-multi-arrow"><path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      {open && (
        <div className="ws-country-dropdown">
          <div className="ws-country-search-wrap">
            <Search size={14} className="ws-country-search-icon" />
            <input
              ref={inputRef}
              className="ws-country-search"
              type="text"
              placeholder={searchPlaceholder || 'Search countries…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="ws-country-list">
            {filteredGroups.length === 0 && <div className="ws-country-empty">No matches</div>}
            {filteredGroups.map(([region, countries]) => (
              <div key={region} className="ws-optgroup">
                <div className="ws-optgroup-label">{region}</div>
                {countries.map(c => {
                  const selected = value.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      className={`ws-country-option ws-multi-option ${selected ? 'active' : ''}`}
                      onClick={() => toggle(c)}
                    >
                      <span>{c}</span>
                      {selected && <Check size={14} className="ws-opt-check" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SearchableSelect({ value, onChange, options, placeholder, searchPlaceholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  function pick(v) {
    onChange(v);
    setOpen(false);
    setSearch('');
  }

  return (
    <div className="ws-country-select" ref={ref}>
      <button type="button" className="ws-input ws-select-trigger" onClick={() => setOpen(o => !o)}>
        <span className={value ? '' : 'ws-select-ph'}>{value || placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" className="ws-select-arrow"><path d="M3 5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="ws-country-dropdown">
          <div className="ws-country-search-wrap">
            <Search size={14} className="ws-country-search-icon" />
            <input
              ref={inputRef}
              className="ws-country-search"
              type="text"
              placeholder={searchPlaceholder || 'Search…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="ws-country-list">
            {filtered.length === 0 && <div className="ws-country-empty">No matches</div>}
            {filtered.map(o => (
              <button
                key={o}
                type="button"
                className={`ws-country-option ${o === value ? 'active' : ''}`}
                onClick={() => pick(o)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TagInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  function commit() {
    const v = draft.replace(/,/g, '').trim();
    if (v && !value.some(t => t.toLowerCase() === v.toLowerCase())) onChange([...value, v]);
    setDraft('');
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="ws-tag-input" onClick={() => inputRef.current?.focus()}>
      {value.map((t, i) => (
        <span key={t} className="ws-tag-pill">
          {t}
          <button
            type="button"
            className="ws-tag-remove"
            aria-label={`Remove ${t}`}
            onClick={e => { e.stopPropagation(); onChange(value.filter((_, idx) => idx !== i)); }}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="ws-tag-field"
        type="text"
        value={draft}
        placeholder={value.length ? '' : placeholder}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  );
}

function validateSatAct(val) {
  if (!val) return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  if (num <= 36) return null;
  if (num > 1600) return 'SAT scores cannot exceed 1600';
  return null;
}

export default function Profile() {
  const { user, session, refreshProfile } = useAuth();
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Notification state
  const [notifSupported] = useState(() => notificationsSupported());
  const [notifPermission, setNotifPermission] = useState(() => getPermissionState());
  const [notifEnabled, setNotifEnabled] = useState(() => !!getCachedToken());
  const [notifBusy, setNotifBusy] = useState(false);
  const [notifError, setNotifError] = useState(null);

  async function toggleNotifications() {
    if (notifBusy) return;
    setNotifBusy(true);
    setNotifError(null);
    try {
      if (notifEnabled) {
        await unsubscribeFromNotifications(session);
        setNotifEnabled(false);
      } else {
        const token = await subscribeToNotifications(session);
        setNotifEnabled(!!token);
        setNotifPermission(getPermissionState());
      }
    } catch (err) {
      setNotifError(err.message);
    } finally {
      setNotifBusy(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    fetchProfile(user.id).then(p => {
      setForm({
        ...p,
        target_countries: p.target_countries || [],
        interests: p.interests || [],
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, [user]);

  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }));
    setSaved(false);
  }

  async function save() {
    if (satError) return;
    setSaving(true);
    const updates = {
      full_name: form.full_name || null,
      country: form.country || null,
      grade_level: form.grade_level || null,
      class_year: form.class_year || null,
      intended_major: form.intended_major || null,
      gpa: form.gpa || null,
      sat_score: form.sat_score || null,
      ielts_score: form.ielts_score || null,
      budget: form.budget || null,
      target_countries: form.target_countries || [],
      interests: form.interests || [],
      goals: form.goals || null,
    };
    try {
      await updateProfile(user.id, updates);
      await refreshProfile();
      setSaved(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="ws-loading">Loading your profile…</div>;

  const satError = validateSatAct(form.sat_score);

  return (
    <div className="ws-section">
      <header className="ws-header">
        <div>
          <h1 className="ws-title">Your Profile</h1>
          <p className="ws-subtitle">This powers your readiness assessment and Nova's advice.</p>
        </div>
        <button className="ws-btn ws-btn-primary" onClick={save} disabled={saving || !!satError}>
          {saved ? <Check size={16} /> : <Save size={15} />} {saving ? 'Saving…' : saved ? 'Saved' : 'Save'}
        </button>
      </header>

      {/* ── Personal Details ── */}
      <section className="ws-form-section sec-blue">
        <h2 className="ws-section-head">
          <span className="ws-section-icon acc-blue"><UserRound size={15} /></span>
          Personal Details
        </h2>
        <div className="ws-profile-grid">
          <label className="ws-profile-field">
            <span className="ws-profile-label">Full name</span>
            <input className="ws-input" type="text" placeholder="Your name"
              value={form.full_name || ''} onChange={e => set('full_name', e.target.value)} />
          </label>

          <label className="ws-profile-field">
            <span className="ws-profile-label">Home country</span>
            <SearchableSelect
              value={form.country || ''}
              onChange={v => set('country', v)}
              options={COUNTRIES}
              placeholder="Select country"
              searchPlaceholder="Search countries…"
            />
          </label>

          <label className="ws-profile-field">
            <span className="ws-profile-label">Current grade</span>
            <select
              className="ws-input ws-input-select-styled"
              value={form.grade_level || ''}
              onChange={e => set('grade_level', e.target.value)}
            >
              <option value="" disabled>Select grade</option>
              {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g === 'Gap Year' ? g : `Grade ${g}`}</option>)}
            </select>
          </label>

          <label className="ws-profile-field">
            <span className="ws-profile-label">Graduating class</span>
            <select
              className="ws-input ws-input-select-styled"
              value={form.class_year || ''}
              onChange={e => set('class_year', e.target.value)}
            >
              <option value="" disabled>Select class year</option>
              {CLASS_YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
        </div>
      </section>

      {/* ── Academic Profile ── */}
      <section className="ws-form-section sec-violet">
        <h2 className="ws-section-head">
          <span className="ws-section-icon acc-violet"><BookOpen size={15} /></span>
          Academic Profile
        </h2>
        <div className="ws-profile-grid">
          <label className="ws-profile-field">
            <span className="ws-profile-label">Intended major</span>
            <SearchableSelect
              value={form.intended_major || ''}
              onChange={v => set('intended_major', v)}
              options={MAJORS}
              placeholder="Select major"
              searchPlaceholder="Search majors…"
            />
          </label>

          <label className="ws-profile-field">
            <span className="ws-profile-label">GPA / Average</span>
            <input className="ws-input" type="text" placeholder="e.g. 3.9 / 95%"
              value={form.gpa || ''} onChange={e => set('gpa', e.target.value)} />
          </label>

          <label className="ws-profile-field">
            <span className="ws-profile-label">SAT / ACT</span>
            <input
              className={`ws-input ${satError ? 'ws-input-error' : ''}`}
              type="text"
              placeholder="e.g. 1480 or 34"
              value={form.sat_score || ''}
              onChange={e => set('sat_score', e.target.value)}
            />
            {satError && <span className="ws-field-error">{satError}</span>}
          </label>

          <label className="ws-profile-field">
            <span className="ws-profile-label">IELTS / TOEFL</span>
            <input className="ws-input" type="text" placeholder="e.g. 7.5 or planning"
              value={form.ielts_score || ''} onChange={e => set('ielts_score', e.target.value)} />
          </label>
        </div>
      </section>

      {/* ── Preferences & Goals ── */}
      <section className="ws-form-section sec-emerald">
        <h2 className="ws-section-head">
          <span className="ws-section-icon acc-emerald"><SlidersHorizontal size={15} /></span>
          Preferences
        </h2>
        <div className="ws-profile-grid">
          <label className="ws-profile-field">
            <span className="ws-profile-label">Budget / aid need</span>
            <select
              className="ws-input ws-input-select-styled"
              value={form.budget || ''}
              onChange={e => set('budget', e.target.value)}
            >
              <option value="" disabled>Select budget tier</option>
              {BUDGET_OPTIONS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>

          <label className="ws-profile-field">
            <span className="ws-profile-label">Target countries</span>
            <GroupedMultiSelect
              value={form.target_countries || []}
              onChange={v => set('target_countries', v)}
              groups={COUNTRY_GROUPS}
              placeholder="Select target countries"
              searchPlaceholder="Search countries…"
            />
            <span className="ws-profile-hint">Pick from regions — click a pill's × to remove</span>
          </label>

          <label className="ws-profile-field">
            <span className="ws-profile-label">Interests</span>
            <TagInput
              value={form.interests || []}
              onChange={v => set('interests', v)}
              placeholder="Type an interest, press Enter"
            />
            <span className="ws-profile-hint">Press Enter or comma to add</span>
          </label>

          <label className="ws-profile-field span-2">
            <span className="ws-profile-label">Goals &amp; notes</span>
            <textarea className="ws-input ws-profile-textarea" placeholder="What are you aiming for?"
              value={form.goals || ''} onChange={e => set('goals', e.target.value)} />
          </label>
        </div>
      </section>

      {/* ── Notifications ── */}
      <section className="ws-form-section sec-amber">
        <h2 className="ws-section-head">
          <span className="ws-section-icon acc-amber"><Bell size={15} /></span>
          Notifications
        </h2>
        <div className="ws-profile-grid">
          <div className="ws-profile-field span-2 ws-notif-row">
            <div className="ws-notif-info">
              <span className="ws-profile-label">Deadline reminders</span>
              <span className="ws-profile-hint">
                {!notifSupported
                  ? 'Push notifications are not supported in this browser.'
                  : notifPermission === 'denied'
                  ? 'Notifications are blocked. Allow them in your browser settings, then reload.'
                  : notifEnabled
                  ? 'You\'ll be notified 7 days before, 24 hours before, and when a task is overdue.'
                  : 'Get browser notifications for upcoming and overdue deadlines.'}
              </span>
              {notifError && <span className="ws-profile-hint ws-notif-error">{notifError}</span>}
            </div>
            <button
              className={`ws-notif-toggle ${notifEnabled ? 'on' : 'off'}`}
              onClick={toggleNotifications}
              disabled={!notifSupported || notifPermission === 'denied' || notifBusy}
              aria-pressed={notifEnabled}
              title={notifEnabled ? 'Turn off notifications' : 'Turn on notifications'}
            >
              {notifEnabled ? <Bell size={15} /> : <BellOff size={15} />}
              {notifBusy ? 'Working…' : notifEnabled ? 'On' : 'Off'}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
