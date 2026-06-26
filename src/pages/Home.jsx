import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ListChecks, MessageCircle, PenLine } from 'lucide-react';
import LogoTile from '../components/LogoTile';
import HeroConnectionLine from '../components/HeroConnectionLine';
import {
  comparisonRows,
  counselorFeatures,
  getFeaturedStories,
  getFeaturedUniversities,
  homeStats,
  processSteps,
  storyCardColors,
} from '../api/catalog';
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

/* ─── Feature bento mockups ─── */
function FeatureMockup({ type }) {
  if (type === 'essay-review') {
    return (
      <div className="mockup essay-mockup">
        <div className="mockup-toolbar">
          <span>Personal statement</span>
          <span>Reviewing</span>
        </div>
        <p>
          My earliest memory of engineering was not a robot kit, but the water
          pump my father fixed every monsoon. I{' '}
          <span className="typo">
            <s>redisigned</s>
            <span className="correction">redesigned</span>
          </span>{' '}
          his solution at 12, using PVC pipe and a{' '}
          <span className="typo">
            <s>bicicle</s>
            <span className="correction">bicycle</span>
          </span>{' '}
          pump.
        </p>
        <div className="essay-note">
          <PenLine size={14} />
          Strong opening. Add one concrete detail about the problem you solved.
        </div>
      </div>
    );
  }

  if (type === 'deadline-list') {
    return (
      <div className="mockup task-mockup">
        {['Yale supplement', 'CSS Profile', 'Recommendation reminder'].map((task, index) => (
          <div key={task} className="task-row">
            <CheckCircle2 size={16} />
            <span>{task}</span>
            <strong>{index === 0 ? 'Today' : `Nov ${12 + index}`}</strong>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'message-nudge') {
    return (
      <div className="mockup message-mockup">
        <div className="message-bubble incoming">Your Brown deadline is in 5 days.</div>
        <div className="message-bubble outgoing">What should I do first?</div>
        <div className="message-bubble incoming">Finish the activity essay, then send your counselor transcript request.</div>
      </div>
    );
  }

  return (
    <div className="mockup college-mockup">
      {['MIT', 'Brown', 'NYU Abu Dhabi'].map((school, index) => (
        <div key={school} className="college-row">
          <span>{school}</span>
          <strong>{['Reach', 'Match', 'Scholarship fit'][index]}</strong>
        </div>
      ))}
    </div>
  );
}

/* ─── Story card (used in marquee) ─── */
function StoryCard({ story, colorIndex }) {
  const cardColor = storyCardColors[colorIndex % storyCardColors.length];
  return (
    <Link
      to="/stories"
      className="story-card marquee-card"
      style={{ background: cardColor.bg, borderColor: cardColor.border }}
    >
      <img
        src={story.photo}
        alt={story.name}
        className="story-card-photo"
        width="300"
        height="276"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <div className="story-card-body">
        <div className="story-card-uni">
          <LogoTile item={story} size={24} radius={7} />
          <span>{story.university}</span>
        </div>
        <h3 className="story-card-title">{story.title}</h3>
        <div className="story-card-footer">
          <div className="story-card-name">{story.name.split(' ')[0]}</div>
          <div className="story-card-from">from {story.country} {story.flag}</div>
          <span className="story-card-read">Read the story <ArrowRight size={13} /></span>
        </div>
      </div>
    </Link>
  );
}

/* ─── University pill for waitlist ticker ─── */
const WAITLIST_UNIS = [
  'Harvard', 'MIT', 'Stanford', 'Cambridge', 'Oxford',
  'Caltech', 'ETH Zürich', 'Imperial', 'NUS', 'Yale',
  'Princeton', 'Columbia', 'Brown', 'Dartmouth', 'Cornell',
  'Penn', 'Duke', 'NYU Abu Dhabi', 'UCL', 'Edinburgh',
  'U of Toronto', 'UBC', 'Minerva', 'Sciences Po', 'LSE',
  'Tsinghua', 'HKU', 'KAIST', 'Waseda', 'MBZUAI',
];

/* Split into 4 rows, then duplicate for seamless loop */
function chunkForRows(arr, rows) {
  const perRow = Math.ceil(arr.length / rows);
  return Array.from({ length: rows }, (_, i) => {
    const slice = arr.slice(i * perRow, (i + 1) * perRow);
    return [...slice, ...slice]; // duplicate for seamless loop
  });
}

export default function Home() {
  const featuredStories = getFeaturedStories(8); // get 8 for two rows of 4
  const logoRail = [...getFeaturedUniversities(), ...getFeaturedUniversities()];

  // Split stories into two rows; duplicate for seamless marquee
  const row1 = featuredStories.slice(0, 4);
  const row2 = featuredStories.slice(4, 8).length >= 2
    ? featuredStories.slice(4, 8)
    : [...featuredStories].reverse().slice(0, 4);
  const marqueeRow1 = [...row1, ...row1];
  const marqueeRow2 = [...row2, ...row2];

  const tickerRows = chunkForRows(WAITLIST_UNIS, 4);

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

      {/* ── Hero ── */}
      <HeroConnectionLine />
      <section className="hero">
        <div className="wrap hero-wrap">
          <h1 className="hero-title fade-up">
            <span id="hero-every" className="hero-every">Talent</span> is Everywhere.<br />
            Opportunity is Not.
          </h1>
          <p className="hero-sub fade-up d1">
            A top university abroad used to be reserved for the lucky few who happened
            to have access to a college counselor. <strong>Not anymore.</strong> Nova is
            the AI counselor that plans, researches, and walks beside you through every step.
          </p>
          <div className="hero-cta fade-up d2">
            <Link to="/nova" className="btn btn-outline btn-xl">
              Talk to Nova <ArrowRight size={18} />
            </Link>
          </div>

          <div className="logo-strip fade-up d3" aria-label="Universities represented in the ScholarPath community">
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

      {/* ── Stats with count-up animation ── */}
      <section className="stats-section">
        <div className="wrap">
          <h2 className="stats-headline">
            10,000+ students are getting into schools nobody thought they could.{' '}
            <Link to="/stories" className="stats-cta-link">Are you next?</Link>
          </h2>
          <div className="stats-row">
            <StatCounter target={12000} suffix="+" label="students onboarded" />
            <StatCounter target={170}   suffix="+" label="countries represented" />
            <StatCounter target={300}   suffix="+" label="acceptances this cycle" />
            <StatCounter target={40}    suffix="+" label="destination countries" />
          </div>
        </div>
      </section>

      {/* ── Infinite marquee story carousel ── */}
      <section className="cards-section" id="student-proof">
        <div className="wrap">
          <div className="section-header">
            <h2 className="section-h2">Real stories</h2>
            <Link to="/stories" className="see-all">
              See all <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <div className="marquee-wrapper" aria-label="Student success stories">
          {/* Row 1 – scrolls left */}
          <div className="marquee-row">
            <div className="marquee-track">
              {marqueeRow1.map((story, index) => (
                <StoryCard key={`r1-${story.id}-${index}`} story={story} colorIndex={index} />
              ))}
            </div>
          </div>

          {/* Row 2 – scrolls right */}
          <div className="marquee-row">
            <div className="marquee-track reverse">
              {marqueeRow2.map((story, index) => (
                <StoryCard key={`r2-${story.id}-${index}`} story={story} colorIndex={index + 2} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Counselor bento ── */}
      <section className="counselor-section">
        <div className="wrap">
          <h2 className="counselor-title">
            Not a chatbot. A <span className="counselor-word">counselor</span> that
            plans, guides, reviews, and follows up until you hit submit
          </h2>
          <p className="counselor-sub">
            Most AI tools wait for you to ask the right question. Nova takes weight off
            your shoulders and turns it into one clear next step. Every day, for the whole cycle.
          </p>

          <div className="bento">
            {counselorFeatures.map((feature) => (
              <article key={feature.title} className="bento-card" style={{ background: feature.bg }}>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </div>
                <FeatureMockup type={feature.mockup} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── WhatsApp chat bubble section ── */}
      <section className="whatsapp-section">
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

      {/* ── Workspace + 24/7 counselor dashboard ── */}
      <section className="workspace-section">
        <div className="wrap">
          <h2 className="workspace-title">
            Workspace + <span>24/7</span> counselor
          </h2>
          <p className="workspace-sub">
            Your whole application in one place, with a counselor on call around the clock.
          </p>
          <div className="workspace-shell-outer">
            <div className="workspace-shell">
              <aside className="workspace-sidebar">
                <div className="workspace-brand">ScholarPath</div>
                {['Home', 'Profile', 'Colleges', 'Essays', 'Tasks'].map((item, index) => (
                  <div key={item} className={`workspace-nav-item ${index === 0 ? 'active' : ''}`}>{item}</div>
                ))}
              </aside>
              <div className="workspace-main">
                <p className="workspace-date">Friday, April 24</p>
                <h3>Good afternoon, Veronica</h3>
                <p>3 tasks due this week and your first application deadline is in 156 days.</p>
                <div className="workspace-status">
                  <span>Overall</span>
                  <strong>On track</strong>
                  <p>Your college list, testing plan, and essay drafts are moving together.</p>
                </div>
                <div className="workspace-grid">
                  <div>
                    <ListChecks size={18} />
                    <strong>3 due soon</strong>
                    <span>Application tasks</span>
                  </div>
                  <div>
                    <MessageCircle size={18} />
                    <strong>2 new notes</strong>
                    <span>Nova follow-ups</span>
                  </div>
                </div>
              </div>
              <div className="workspace-chat">
                <div className="message-bubble incoming">Should I really apply without a perfect SAT?</div>
                <div className="message-bubble outgoing">Yes. Your research project makes your profile stronger than the score suggests.</div>
                <div className="message-bubble incoming">Then what should I finish today?</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Process steps ── */}
      <section className="process-section">
        <div className="wrap">
          <h2 className="process-title">How ScholarPath works</h2>
          <div className="process-grid">
            {processSteps.map((step) => (
              <article key={step.number} className="process-card">
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ── */}
      <section className="comparison-section">
        <div className="wrap comparison-wrap">
          <h2 className="comparison-title">
            A counselor is different from a generic chatbot
          </h2>
          <div className="comparison-table">
            <div className="comparison-head">Generic AI</div>
            <div className="comparison-head highlight">Nova</div>
            {comparisonRows.map((row) => (
              <div key={row.chatgpt} className="comparison-row">
                <p>{row.chatgpt}</p>
                <p>{row.nova}</p>
              </div>
            ))}
          </div>
          <Link to="/nova" className="btn btn-blue btn-xl comparison-cta">
            Talk to Nova <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Waitlist section with university ticker ── */}
      <section className="waitlist-section">
        <div className="waitlist-content">
          <div className="wrap">
            <div className="waitlist-badge">🎓 Join 12,000+ students</div>
            <h2 className="waitlist-title">
              Your dream university is on this list.
              <br />
              <span>Let's get you in.</span>
            </h2>
            <p className="waitlist-sub">
              Students from 170+ countries are applying to these universities with Nova's help.
            </p>
            <Link to="/nova" className="btn btn-outline btn-xl waitlist-cta">
              Start for free <ArrowRight size={18} />
            </Link>
          </div>

          {/* 4-row scrolling university tickers */}
          <div className="ticker-stack">
            {tickerRows.map((row, rowIdx) => (
              <div key={rowIdx} className="ticker-row" aria-hidden="true">
                <div className={`ticker-track ${rowIdx % 2 === 1 ? 'reverse' : ''}`}>
                  {row.map((uni, i) => (
                    <span key={i} className="uni-pill">{uni}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
