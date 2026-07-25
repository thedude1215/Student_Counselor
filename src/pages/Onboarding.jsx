import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import './Onboarding.css';

const STUDENT_TYPES = ['High School Student', 'Transfer Student', 'Graduate', 'Other'];

const INTEREST_OPTIONS = [
  'Humanities', 'STEM', 'Business & Economics', 'Arts & Design',
  'Health & Medicine', 'Social Sciences', 'Law & Government',
  'Environmental Studies', 'Other',
];

const STUDY_DESTINATIONS = [
  'USA', 'UK', 'Canada', 'Australia', 'Germany', 'Netherlands',
  'Singapore', 'Japan', 'UAE', 'Open to all',
];

const GOAL_OPTIONS = [
  'Get into a top university',
  'Find scholarships & financial aid',
  'Explore all my options',
  'Transfer to a better school',
];

const TUITION_RANGES = [
  '< $10,000', '$10,000–$20,000', '$20,000–$30,000',
  '$30,000–$50,000', '$50,000–$70,000', '> $70,000',
  'Seeking full scholarship',
];

const HEARD_OPTIONS = [
  'Friends', 'High school', 'Instagram', 'TikTok',
  'Google Search', 'University', 'LinkedIn', 'Other',
];

const COLLEGE_YEARS = ['2026', '2027', '2028', '2029', '2030'];
const SEMESTERS = ['Fall', 'Spring', 'Summer'];
const GRADE_OPTIONS = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Graduated'];

const MAJORS = [
  'Accounting','Aerospace Engineering','Anthropology','Applied Mathematics','Architecture',
  'Art History','Biochemistry','Biomedical Engineering','Biology','Business Administration',
  'Chemical Engineering','Chemistry','Civil Engineering','Cognitive Science','Communication',
  'Computer Engineering','Computer Science','Creative Writing','Criminal Justice','Cybersecurity',
  'Data Science','Design','Economics','Education','Electrical Engineering','English',
  'Entrepreneurship','Environmental Engineering','Environmental Science','Film & Media Studies',
  'Finance','Fine Arts','Geography','Global Studies','Graphic Design','Health Sciences',
  'History','Industrial Engineering','Information Systems','International Business',
  'International Relations','Journalism','Law (Pre-Law)','Liberal Arts','Linguistics',
  'Management','Marine Biology','Marketing','Materials Science','Mathematics',
  'Mechanical Engineering','Medicine (Pre-Med)','Microbiology','Music','Neuroscience',
  'Nursing','Nutrition','Pharmacy','Philosophy','Physics','Political Science','Psychology',
  'Public Health','Public Policy','Religious Studies','Robotics','Social Work','Sociology',
  'Software Engineering','Statistics','Sustainability','Theater','Undecided','Urban Planning',
  'Veterinary Science (Pre-Vet)','Visual Arts',
];

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Armenia', 'Australia',
  'Austria', 'Azerbaijan', 'Bahrain', 'Bangladesh', 'Belarus', 'Belgium',
  'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Cambodia',
  'Cameroon', 'Canada', 'Chile', 'China', 'Colombia', 'Costa Rica', 'Croatia',
  'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Dominican Republic', 'Ecuador',
  'Egypt', 'Estonia', 'Ethiopia', 'Finland', 'France', 'Georgia', 'Germany',
  'Ghana', 'Greece', 'Guatemala', 'Honduras', 'Hong Kong', 'Hungary', 'India',
  'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan',
  'Jordan', 'Kazakhstan', 'Kenya', 'Kuwait', 'Kyrgyzstan', 'Latvia', 'Lebanon',
  'Libya', 'Lithuania', 'Luxembourg', 'Malaysia', 'Mexico', 'Moldova', 'Mongolia',
  'Morocco', 'Myanmar', 'Nepal', 'Netherlands', 'New Zealand', 'Nigeria',
  'Norway', 'Oman', 'Pakistan', 'Palestine', 'Panama', 'Paraguay', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia',
  'Somalia', 'South Africa', 'South Korea', 'Spain', 'Sri Lanka', 'Sudan',
  'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
  'Thailand', 'Tunisia', 'Turkey', 'Turkmenistan', 'Uganda', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Venezuela', 'Vietnam', 'Yemen', 'Zimbabwe', 'Other',
];

const GPA_SYSTEMS = [
  { name: 'IB', formula: '(Score ÷ 45) × 4', example: '(36÷45)×4 = 3.20 / 4.0' },
  { name: 'A Levels', formula: 'A*=4.0  A=4.0  B=3.0  C=2.0', example: '3 A grades → 4.0' },
  { name: 'Indian (10 pt)', formula: '(Score ÷ 10) × 4', example: '(9÷10)×4 = 3.60 / 4.0' },
  { name: 'Percentage', formula: '(Score ÷ 100) × 4', example: '(90÷100)×4 = 3.60 / 4.0' },
];

const STEPS_META = [
  { title: 'Welcome to ScholarPath', subtitle: "Don't worry, we're not judging—just tailoring your experience!" },
  { title: 'Your timeline', subtitle: "Don't worry, we're not judging—just tailoring your experience!" },
  { title: 'Your goals', subtitle: 'Tell us where you want to go and what you\'re aiming for.' },
  { title: 'Academics', subtitle: "Don't worry, we're not judging—just tailoring your experience!" },
  { title: 'Final thoughts', subtitle: 'Almost there! Just a couple more quick questions.' },
];

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [gpaModal, setGpaModal] = useState(false);

  // Step 1
  const [studentType, setStudentType] = useState('');
  const [interests, setInterests] = useState([]);
  const [notSure, setNotSure] = useState(false);

  // Step 2
  const [dob, setDob] = useState('');
  const [homeCountry, setHomeCountry] = useState('');
  const [currentGrade, setCurrentGrade] = useState('');
  const [startYear, setStartYear] = useState('');
  const [startSemester, setStartSemester] = useState('');

  // Step 3
  const [studyDestinations, setStudyDestinations] = useState([]);
  const [mainGoal, setMainGoal] = useState('');

  // Step 4
  const [intendedMajor, setIntendedMajor] = useState('');
  const [gpa, setGpa] = useState('');
  const [satReading, setSatReading] = useState('');
  const [satMath, setSatMath] = useState('');
  const [actScore, setActScore] = useState('');
  const [budget, setBudget] = useState('');

  // Step 5
  const [heardAbout, setHeardAbout] = useState('');

  useEffect(() => {
    if (profile?.onboarding_completed) {
      navigate('/dashboard', { replace: true });
    }
  }, [profile, navigate]);

  function toggleInterest(item) {
    setInterests(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  }

  function toggleDestination(item) {
    if (item === 'Open to all') {
      setStudyDestinations(prev => prev.includes(item) ? [] : [item]);
    } else {
      setStudyDestinations(prev => {
        const without = prev.filter(r => r !== 'Open to all');
        return without.includes(item)
          ? without.filter(i => i !== item)
          : [...without, item];
      });
    }
  }

  function canNext() {
    if (step === 1) return !!studentType;
    if (step === 2) return !!homeCountry && !!startYear;
    if (step === 3) return studyDestinations.length > 0;
    if (step === 4) {
      if (!gpa) return false;
      if (satReading && (Number(satReading) < 200 || Number(satReading) > 800)) return false;
      if (satMath && (Number(satMath) < 200 || Number(satMath) > 800)) return false;
      if (actScore && (Number(actScore) < 1 || Number(actScore) > 36)) return false;
      return true;
    }
    return true;
  }

  async function handleNext() {
    if (step < 5) {
      setStep(s => s + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      await handleFinish();
    }
  }

  async function handleFinish() {
    if (!user) return;
    setSaving(true);
    try {
      const satTotal = satReading && satMath
        ? String(Number(satReading) + Number(satMath))
        : (satReading || satMath || null);

      await supabase.from('profiles').update({
        interests: notSure ? [] : interests,
        date_of_birth: dob || null,
        country: homeCountry,
        grade_level: currentGrade
          ? currentGrade.replace('Grade ', '')
          : null,
        class_year: startYear ? `Class of ${Number(startYear) + 4}` : null,
        college_start_semester: startSemester || null,
        target_countries: studyDestinations,
        goals: mainGoal || null,
        intended_major: intendedMajor || null,
        gpa: gpa || null,
        sat_score: satTotal,
        sat_reading: satReading || null,
        sat_math: satMath || null,
        act_score: actScore || null,
        budget: budget || null,
        heard_about: heardAbout || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
      await refreshProfile();
      navigate('/dashboard', { replace: true });
    } finally {
      setSaving(false);
    }
  }

  const meta = STEPS_META[step - 1];

  return (
    <div className="ob-page">
      <Link to="/" className="ob-logo-link">
        <img src="/scholarpath-logo-dark.svg" alt="ScholarPath" className="ob-logo" />
      </Link>

      {/* Step counter */}
      <div className="ob-stepper">
        {step > 1 && (
          <button className="ob-back-btn" onClick={() => { setStep(s => s - 1); window.scrollTo({ top: 0 }); }}>
            <ChevronLeft size={16} />
          </button>
        )}
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="ob-step-item">
            {i > 0 && <span className={`ob-step-line${i < step ? ' done' : ''}`} />}
            <span className={`ob-step-dot${i + 1 === step ? ' active' : i + 1 < step ? ' done' : ''}`}>
              {i + 1 < step ? <Check size={11} strokeWidth={3} /> : i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Form body */}
      <div className="ob-body">
        <h1 className="ob-title">{meta.title}</h1>
        <p className="ob-subtitle">{meta.subtitle}</p>

        {/* STEP 1 — Role & Interests */}
        {step === 1 && (
          <>
            <p className="ob-q">Currently, I am a:</p>
            <div className="ob-pills">
              {STUDENT_TYPES.map(t => (
                <button
                  key={t}
                  className={`ob-pill${studentType === t ? ' selected' : ''}`}
                  onClick={() => setStudentType(t)}
                >{t}</button>
              ))}
            </div>

            <p className="ob-q">Interested in:</p>
            <div className="ob-pills">
              {INTEREST_OPTIONS.map(opt => (
                <button
                  key={opt}
                  className={`ob-pill${interests.includes(opt) ? ' selected' : ''}${notSure ? ' muted' : ''}`}
                  onClick={() => !notSure && toggleInterest(opt)}
                  disabled={notSure}
                >{opt}</button>
              ))}
            </div>
            <label className="ob-check-label" style={{ marginTop: '1rem' }}>
              <input
                type="checkbox"
                checked={notSure}
                onChange={e => {
                  setNotSure(e.target.checked);
                  if (e.target.checked) setInterests([]);
                }}
              />
              I am not sure
            </label>
          </>
        )}

        {/* STEP 2 — Timeline */}
        {step === 2 && (
          <>
            <p className="ob-q" style={{ marginTop: 0 }}>I was born</p>
            <input
              className="ob-input"
              type="date"
              value={dob}
              onChange={e => setDob(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />

            <p className="ob-q">Went to high school in</p>
            <select
              className="ob-select"
              value={homeCountry}
              onChange={e => setHomeCountry(e.target.value)}
            >
              <option value="">Select a country</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <p className="ob-q">Current grade</p>
            <div className="ob-pills">
              {GRADE_OPTIONS.map(g => (
                <button
                  key={g}
                  className={`ob-pill${currentGrade === g ? ' selected' : ''}`}
                  onClick={() => setCurrentGrade(g)}
                >{g}</button>
              ))}
            </div>

            <p className="ob-q">I hope to start college in</p>
            <div className="ob-pills">
              {COLLEGE_YEARS.map(y => (
                <button
                  key={y}
                  className={`ob-pill${startYear === y ? ' selected' : ''}`}
                  onClick={() => setStartYear(y)}
                >{y}</button>
              ))}
            </div>

            {startYear && (
              <>
                <p className="ob-q" style={{ marginTop: '1.25rem' }}>In</p>
                <select
                  className="ob-select"
                  value={startSemester}
                  onChange={e => setStartSemester(e.target.value)}
                >
                  <option value="">Select semester</option>
                  {SEMESTERS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </>
            )}
          </>
        )}

        {/* STEP 3 — Goals */}
        {step === 3 && (
          <>
            <p className="ob-q" style={{ marginTop: 0 }}>Where are you open to studying?</p>
            <div className="ob-pills">
              {STUDY_DESTINATIONS.map(d => (
                <button
                  key={d}
                  className={`ob-pill${studyDestinations.includes(d) ? ' selected' : ''}`}
                  onClick={() => toggleDestination(d)}
                >{d}</button>
              ))}
            </div>

            <p className="ob-q">What's your main goal?</p>
            <div className="ob-pills">
              {GOAL_OPTIONS.map(g => (
                <button
                  key={g}
                  className={`ob-pill${mainGoal === g ? ' selected' : ''}`}
                  onClick={() => setMainGoal(g)}
                >{g}</button>
              ))}
            </div>
          </>
        )}

        {/* STEP 4 — Academics */}
        {step === 4 && (
          <>
            <p className="ob-q" style={{ marginTop: 0 }}>Intended major <span className="ob-optional">(optional)</span></p>
            <select
              className="ob-select"
              value={intendedMajor}
              onChange={e => setIntendedMajor(e.target.value)}
            >
              <option value="">Select a major</option>
              {MAJORS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <div className="ob-q-row">
              <p className="ob-q" style={{ margin: 0 }}>Current GPA?</p>
              <button className="ob-gpa-link" onClick={() => setGpaModal(true)}>
                Converting to 4.0?
              </button>
            </div>
            <input
              className="ob-input"
              type="number"
              step="0.01"
              min="0"
              max="4"
              placeholder="Type your GPA"
              value={gpa}
              onChange={e => setGpa(e.target.value)}
              style={{ marginTop: '0.5rem' }}
            />
            <p className="ob-hint">Out of 4.0</p>

            <p className="ob-q">SAT scores <span className="ob-optional">(optional)</span></p>
            <div className="ob-input-row">
              <div>
                <input
                  className={`ob-input${satReading && (Number(satReading) < 200 || Number(satReading) > 800) ? ' ob-input-error' : ''}`}
                  type="number"
                  placeholder="Reading & Writing"
                  value={satReading}
                  onChange={e => setSatReading(e.target.value)}
                />
                {satReading && (Number(satReading) < 200 || Number(satReading) > 800) && (
                  <p className="ob-field-error">Must be 200–800</p>
                )}
              </div>
              <div>
                <input
                  className={`ob-input${satMath && (Number(satMath) < 200 || Number(satMath) > 800) ? ' ob-input-error' : ''}`}
                  type="number"
                  placeholder="Math"
                  value={satMath}
                  onChange={e => setSatMath(e.target.value)}
                />
                {satMath && (Number(satMath) < 200 || Number(satMath) > 800) && (
                  <p className="ob-field-error">Must be 200–800</p>
                )}
              </div>
            </div>
            {satReading && satMath && Number(satReading) >= 200 && Number(satReading) <= 800 && Number(satMath) >= 200 && Number(satMath) <= 800 && (
              <p className="ob-hint">Total: {Number(satReading) + Number(satMath)} / 1600</p>
            )}

            <p className="ob-q">ACT score <span className="ob-optional">(optional)</span></p>
            <input
              className={`ob-input${actScore && (Number(actScore) < 1 || Number(actScore) > 36) ? ' ob-input-error' : ''}`}
              type="number"
              placeholder="Type your score (1–36)"
              value={actScore}
              onChange={e => setActScore(e.target.value)}
            />
            {actScore && (Number(actScore) < 1 || Number(actScore) > 36) && (
              <p className="ob-field-error">ACT score must be between 1 and 36</p>
            )}

            <p className="ob-q">I can afford to pay a yearly tuition of: <span className="ob-optional">(optional)</span></p>
            <select
              className="ob-select"
              value={budget}
              onChange={e => setBudget(e.target.value)}
            >
              <option value="">Select amount range</option>
              {TUITION_RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </>
        )}

        {/* STEP 5 — Final thoughts */}
        {step === 5 && (
          <>
            <p className="ob-q" style={{ marginTop: 0 }}>I heard about ScholarPath through</p>
            <div className="ob-pills">
              {HEARD_OPTIONS.map(h => (
                <button
                  key={h}
                  className={`ob-pill${heardAbout === h ? ' selected' : ''}`}
                  onClick={() => setHeardAbout(h)}
                >{h}</button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Fixed bottom button */}
      <div className="ob-footer">
        <button
          className="ob-next-btn"
          onClick={handleNext}
          disabled={!canNext() || saving}
        >
          {step < 5
            ? 'Next →'
            : saving
            ? 'Setting up your workspace…'
            : 'Get started →'}
        </button>
      </div>

      {/* GPA converter modal */}
      {gpaModal && (
        <div className="ob-modal-overlay" onClick={() => setGpaModal(false)}>
          <div className="ob-modal" onClick={e => e.stopPropagation()}>
            <button className="ob-modal-close" onClick={() => setGpaModal(false)}>
              <X size={18} />
            </button>
            <span className="ob-modal-tag">GUIDE</span>
            <h2 className="ob-modal-title">Converting your grades to 4.0</h2>
            <p className="ob-modal-sub">Pick your grading system to see how it works</p>
            <div className="ob-modal-systems">
              {GPA_SYSTEMS.map(sys => (
                <div key={sys.name} className="ob-modal-sys">
                  <div className="ob-modal-sys-name">{sys.name}</div>
                  <div className="ob-modal-sys-formula">{sys.formula}</div>
                  <div className="ob-modal-sys-example">Example → {sys.example}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
