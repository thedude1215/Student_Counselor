import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Award, Target, Flag } from 'lucide-react';
import LogoTile from '../components/LogoTile';
import FlightPath from '../components/FlightPath';
import HeroConnectionLine from '../components/HeroConnectionLine';
import NovaMascot from '../components/NovaMascot';
import { ProfileArt, CollegeListArt, EssayArt, TasksArt } from './HomeActArt.jsx';
import { getFeaturedUniversities } from '../api/catalog';
import { useAuth } from '../context/AuthContext.jsx';
import './Home.css';

/* ─── Count-up animation hook ─── */
function useCountUp(ref, target, suffix = '', duration = 1800) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let animId;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        let start = null;
        const step = (ts) => {
          if (!start) start = ts;
          const progress = Math.min((ts - start) / duration, 1);
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
          if (progress < 1) animId = requestAnimationFrame(step);
        };
        animId = requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  }, [ref, target, suffix, duration]);
}

/* ─── Individual stat counter ─── */
function StatCounter({ target, suffix, label }) {
  const ref = useRef(null);
  useCountUp(ref, target, suffix);
  return (
    <div className="stat-card">
      <div className="stat-num" ref={ref}>0{suffix}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

/* ─── The four acts ───
 * Names and headlines are kept identical to the dashboard's Journey map
 * (see workspace/Journey.jsx). A visitor who signs up lands in a structure
 * they have already been walked through — that continuity is the point.
 */
const ACTS = [
  {
    num: 'I',
    name: 'The Foundation',
    headline: 'Tell us who you are.',
    copy: `Nova opens the way a counselor would on day one — your grades, your
           budget, your country, the schools you daydream about. Everything that
           follows is shaped by that. No generic advice, ever.`,
    cta: 'Build your profile',
    to: '/dashboard/profile',
    expression: 'curious',
    holding: 'compass',
    note: 'Nova knows you now',
  },
  {
    num: 'II',
    name: 'The List',
    headline: 'Decide what to study, and where.',
    copy: `No flattery, no filler schools. Nova weighs your grades, your budget,
           and real international admit rates — then tells you straight: reach,
           match, or likely, and exactly why.`,
    cta: 'Explore universities',
    to: '/universities',
    expression: 'thinking',
    holding: 'map',
    note: '94% profile fit',
    noteGreen: true,
  },
  {
    num: 'III',
    name: 'The Story',
    headline: 'Write essays that sound like you.',
    copy: `From blank page to final draft — feedback anchored to your exact
           sentences, in your own voice. Nova never writes it for you; it makes
           what you wrote impossible to ignore.`,
    cta: 'Get your draft reviewed',
    to: '/dashboard/essays',
    expression: 'focused',
    holding: 'pen',
    note: 'In your voice \u2713',
  },
  {
    num: 'IV',
    name: 'The Finish',
    headline: 'Track every deadline to the end.',
    copy: `Every deadline, test date, and supplement in one place, ordered by what
           actually matters this week. Nova updates it the moment something moves
           — and nudges you before anything slips.`,
    cta: 'See your timeline',
    to: '/dashboard/tasks',
    expression: 'cheering',
    holding: 'check',
    note: '4 days to your first deadline',
    noteGreen: true,
  },
];

const FAQS = [
  {
    q: 'Is using Nova considered cheating?',
    a: "No. Nova works the way a school counselor does — it plans with you, reviews your work, and tells you the truth about your chances. It never writes essays for you or invents achievements. Wealthy families have always had counselors; Nova just makes that normal for everyone.",
  },
  {
    q: 'Does Nova write my essays for me?',
    a: "Never. Nova reviews your drafts line by line — what works, what falls flat, and how to fix it — but every word stays yours. Admissions officers can spot a ghost-written essay; an essay in your own voice, sharpened by honest feedback, is what actually gets you in.",
  },
  {
    q: "I'm not in the US. Does this actually work for my country?",
    a: "That's exactly who ScholarPath is built for. Nova knows the Common App, UCAS, and direct-application systems across 40+ destination countries — plus the scholarships, admit rates, and aid policies that apply specifically to international students.",
  },
  {
    q: 'Is ScholarPath free?',
    a: "Yes. The counselor, the college matching, the essay reviews, the scholarship search — free. We believe the students who need this most are precisely the ones who can't pay for it.",
  },
  {
    q: 'Is my data safe?',
    a: "Your profile is used for one thing: personalizing your guidance. We don't sell your data, and you can delete your account and everything in it at any time.",
  },
];

/* ─── One act of the journey ───
 * data-waypoint marks the anchor the page-long flight path threads through.
 * `is-seen` lands on the artwork when it scrolls in, so the replicas can play
 * their real entrance animations (the essay highlight sweep, for one).
 */
function Act({ act, index, flip, children }) {
  const artRef = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = artRef.current;
    if (!el || seen) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setSeen(true);
        observer.disconnect();
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [seen]);

  return (
    <section className={`act act-${index + 1}`} data-waypoint={`act-${index + 1}`}>
      <div className={`wrap act-wrap${flip ? ' flip' : ''}`}>
        <div className="act-text">
          <div className="act-label">
            <span className="act-badge">
              <NovaMascot size={22} expression={act.expression} />
            </span>
            <span className="act-num">Act {act.num}</span>
            <span className="act-name">{act.name}</span>
          </div>
          <h2 className="act-h2">{act.headline}</h2>
          <p className="act-sub">{act.copy}</p>
          <Link to={act.to} className="act-link">
            {act.cta} <ArrowRight size={15} />
          </Link>
        </div>
        <div className={`act-art${seen ? ' is-seen' : ''}`} ref={artRef}>
          {children}
          <div className={`sticker-note${act.noteGreen ? ' note-green' : ''}`}>{act.note}</div>
          <div className="act-art-nova" aria-hidden="true">
            <NovaMascot size={104} expression={act.expression} holding={act.holding} idle />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const logoRail = [...getFeaturedUniversities(), ...getFeaturedUniversities()];

  /* WhatsApp chat messages */
  const chatMessages = [
    { from: 'user', text: 'I got a 1480 SAT. Is it worth applying to Harvard?' },
    { from: 'nova', text: "Yes — submit it. A 1480 is within Harvard's range, and your research publication matters far more to the committee than another 40 points. 📚", time: '14:02' },
    { from: 'user', text: 'What should I work on before the Nov 1 deadline?' },
    { from: 'nova', text: "Three things: finalize your 'Why Harvard' supplement, ask Prof. Mehta to submit his rec by Oct 20, and check your Common App activities section one more time. Want me to send you a checklist? ✅", time: '14:03' },
    { from: 'user', text: 'Yes please!' },
    { from: 'nova', text: "Sending now. You've got this, Arnav. 🎯", time: '14:03' },
  ];

  return (
    <main className="home">

      {/* ══════════════════════════════════════
          DEPARTURE — night. The journey begins.
      ══════════════════════════════════════ */}
      <HeroConnectionLine />
      <FlightPath />
      <section className="hero" data-waypoint="departure">
        <div className="hero-mascot" aria-hidden="true"><NovaMascot size={72} idle /></div>

        <div className="wrap hero-wrap">
          <h1 className="hero-title fade-up">
            <span id="hero-every" className="hero-every">Talent</span> is Everywhere.<br />
            Opportunity is Not.
          </h1>
          <p className="hero-sub fade-up d1">
            ScholarPath puts a world-class counselor in every student's pocket. Nova
            knows your grades, your budget, and your dream schools — and works beside
            you the whole cycle, from first list to final submit.{' '}
            <strong>From anywhere on Earth.</strong>
          </p>
          <div className="hero-cta fade-up d2">
            <Link to="/nova" className="btn btn-outline btn-xl">
              Start your journey <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        <div className="logo-strip-wrap fade-up d3">
          <div className="logo-strip" aria-label="Universities represented in the ScholarPath community">
            <div className="logo-strip-track">
              {logoRail.map((university, index) => (
                <LogoTile
                  key={`${university.name}-${index}`}
                  item={university}
                  className="home-logo-tile"
                  radius={14}
                  size={64}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          THE RECEIPTS — still night, one notch deeper.
      ══════════════════════════════════════ */}
      <section className="stats-section" data-waypoint="receipts">
        <div className="wrap stats-wrap">
          <div className="stats-text">
            <span className="eyebrow on-dark">The receipts</span>
            <h2 className="stats-headline">
              Talent is everywhere. These students proved opportunity can be, too.{' '}
              <Link to="/stories" className="stats-cta-link">Your turn.</Link>
            </h2>
          </div>
          <div className="stats-grid">
            <StatCounter target={12000} suffix="+" label="students onboarded" />
            <StatCounter target={170}   suffix="+" label="countries represented" />
            <StatCounter target={300}   suffix="+" label="acceptances this cycle" />
            <StatCounter target={40}    suffix="+" label="destination countries" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          THE FOUR ACTS — the light comes up, act by act.
      ══════════════════════════════════════ */}

      {/* ── Act I · The Foundation ── */}
      <Act act={ACTS[0]} index={0}><ProfileArt /></Act>

      {/* ── Act II · The List ── */}
      <Act act={ACTS[1]} index={1} flip><CollegeListArt /></Act>

      {/* ── Act III · The Story ── */}
      <Act act={ACTS[2]} index={2}><EssayArt /></Act>

      {/* ── Act IV · The Finish ── */}
      <Act act={ACTS[3]} index={3} flip><TasksArt /></Act>

      {/* ══════════════════════════════════════
          SCHOLARSHIPS — full daylight.
      ══════════════════════════════════════ */}
      <section className="feat-section" data-waypoint="scholarships">
        <div className="wrap feat-wrap">
          <div className="feat-text">
            <span className="eyebrow">Money on the table</span>
            <h2 className="feat-h2">Scholarships that actually fit you.</h2>
            <p className="feat-sub">
              Full rides, need-blind schools, country-specific awards — curated
              for international students and matched to your profile, with every
              deadline tracked so nothing slips.
            </p>
            <Link to={user ? '/dashboard/scholarships' : '/nova'} className="feat-link">
              Find your scholarships <ArrowRight size={15} />
            </Link>
          </div>
          <div className="feat-art">
            <div className="sticker-card tilt-l">
              <div className="sticker-card-head">
                <strong>Schwarzman Scholars</strong>
                <span className="sticker-pill pill-aid">Full ride</span>
              </div>
              <ul className="sticker-rows">
                <li><Award size={14} /> Tuition + housing + travel</li>
                <li><CalendarDays size={14} /> Due Sep 9 — 39 days left</li>
                <li><Target size={14} /> Matched: your leadership profile</li>
              </ul>
            </div>
            <div className="sticker-note tilt-r">$55K+ / year</div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          THE MAP — dusk. Zoom out; see the whole route.
      ══════════════════════════════════════ */}
      <section className="map-section" data-waypoint="map">
        <div className="wrap map-wrap">
          <span className="eyebrow on-dark">The whole route</span>
          <h2 className="map-title">All of it, on one map.</h2>
          <p className="map-sub">
            Four acts, twelve milestones, one line from where you are to where
            you're going. Every student gets the same map — and Nova walks the
            whole thing beside you.
          </p>

          <ol className="map-acts">
            {ACTS.map((act) => (
              <li key={act.name} className="map-act">
                <span className="map-act-node">
                  <Flag size={13} />
                </span>
                <span className="map-act-num">Act {act.num}</span>
                <span className="map-act-name">{act.name}</span>
              </li>
            ))}
          </ol>

          <Link to="/nova" className="btn btn-outline btn-lg map-cta">
            See your map <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ══════════════════════════════════════
          NOVA ON WHATSAPP — night.
      ══════════════════════════════════════ */}
      <section className="whatsapp-section" data-waypoint="nova">
        <div className="wrap whatsapp-wrap">
          <div className="whatsapp-text">
            <div className="whatsapp-badge">
              <span className="wa-dot" />
              Available on WhatsApp
            </div>
            <h2 className="whatsapp-title">
              Message Nova on WhatsApp. Get answers in seconds.
            </h2>
            <p className="whatsapp-sub">
              No app to download. No dashboard to learn. Just message Nova like you
              message a friend — and get expert admissions advice, deadline reminders,
              and essay feedback, right in your chat.
            </p>
            <a href="https://wa.me/14155238886" className="btn btn-dark btn-lg wa-cta" target="_blank" rel="noopener noreferrer">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2C8.268 2 2 8.268 2 16c0 2.478.664 4.8 1.824 6.796L2 30l7.42-1.784A13.93 13.93 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2z" fill="#25D366"/>
                <path d="M22.5 19.5c-.4-.2-2.4-1.2-2.8-1.3-.4-.1-.6-.2-.9.2-.3.4-1 1.3-1.3 1.6-.2.3-.5.3-.9.1-.4-.2-1.8-.7-3.4-2.1-1.3-1.1-2.1-2.5-2.4-2.9-.2-.4 0-.6.2-.8.2-.2.4-.5.6-.7.2-.2.2-.4.3-.6.1-.2 0-.5-.1-.7-.1-.2-.9-2.1-1.2-2.9-.3-.7-.6-.6-.9-.6h-.7c-.3 0-.7.1-1 .4C9 9.6 8 10.6 8 12.6c0 2 1.4 3.9 1.6 4.2.2.3 2.8 4.4 6.9 6 .9.4 1.7.6 2.3.8.9.3 1.8.3 2.4.2.7-.1 2.3-.9 2.6-1.8.3-.9.3-1.7.2-1.8-.1-.2-.4-.3-.8-.5z" fill="white"/>
              </svg>
              Message Nova on WhatsApp
            </a>
          </div>

          <div className="phone-frame-wrap">
            <div className="phone-frame">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="wa-header">
                  <div className="wa-avatar">N</div>
                  <div className="wa-header-info">
                    <div className="wa-name">Nova · ScholarPath</div>
                    <div className="wa-status">online</div>
                  </div>
                </div>
                <div className="wa-messages">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`wa-bubble ${msg.from}`}>
                      <div className="wa-text">{msg.text}</div>
                      {msg.time && <span className="wa-time">{msg.time}</span>}
                    </div>
                  ))}
                </div>
                <div className="wa-input-row">
                  <div className="wa-input-pill">Type a message…</div>
                  <div className="wa-send-btn">
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          VALUE — night.
      ══════════════════════════════════════ */}
      <section className="value-section" data-waypoint="value">
        <div className="wrap value-wrap">
          <span className="eyebrow on-dark">Yes, really</span>
          <h2 className="value-title">
            A $10,000 counselor.<br />
            <span>For $0.</span>
          </h2>
          <p className="value-sub">
            Private counselors charge thousands per application cycle. Nova does the
            same job — planning, matching, reviewing, reminding — for free, in every
            timezone. Because talent shouldn't need a trust fund.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FAQ — night.
      ══════════════════════════════════════ */}
      <section className="faq-section" data-waypoint="faq">
        <div className="wrap faq-wrap">
          <span className="eyebrow on-dark">Still unsure?</span>
          <h2 className="faq-title">Questions, answered.</h2>
          <div className="faq-list">
            {FAQS.map((faq) => (
              <details key={faq.q} className="faq-item">
                <summary>{faq.q}</summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          ARRIVAL — deepest night. The plane lands.
      ══════════════════════════════════════ */}
      <section className="arrival-section" data-waypoint="arrival">
        <div className="wrap arrival-wrap">
          <div className="arrival-mascot" aria-hidden="true">
            <NovaMascot size={64} expression="cheering" idle />
          </div>
          <h2 className="arrival-title">
            Your journey starts with one message.
          </h2>
          <p className="arrival-sub">
            No waitlist. No credit card. Tell Nova where you are, and it will draw
            the rest of the map with you.
          </p>
          <Link to="/nova" className="btn btn-outline btn-xl arrival-cta">
            Start your journey <ArrowRight size={18} />
          </Link>
        </div>
      </section>

    </main>
  );
}
