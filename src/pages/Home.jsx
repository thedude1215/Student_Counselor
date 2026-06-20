import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ListChecks, MessageCircle, PenLine } from 'lucide-react';
import LogoTile from '../components/LogoTile';
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
          pump my father fixed every monsoon.
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

export default function Home() {
  const featuredStories = getFeaturedStories(4);
  const logoRail = [...getFeaturedUniversities(), ...getFeaturedUniversities()];

  return (
    <main className="home">
      <section className="hero">
        <div className="wrap hero-wrap">
          <h1 className="hero-title fade-up">
            Every university in the world, now within reach
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

      <section className="stats-section">
        <div className="wrap">
          <h2 className="stats-headline">
            10,000+ students are getting into schools nobody thought they could.{' '}
            <Link to="/stories" className="stats-cta-link">Are you next?</Link>
          </h2>
          <div className="stats-row">
            {homeStats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <div className="stat-num">{stat.value}</div>
                <div className="stat-lbl">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cards-section" id="student-proof">
        <div className="wrap">
          <div className="section-header">
            <h2 className="section-h2">Real stories</h2>
            <Link to="/stories" className="see-all">
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="cards-grid">
            {featuredStories.map((story, index) => {
              const cardColor = storyCardColors[index % storyCardColors.length];

              return (
                <Link
                  to="/stories"
                  key={story.id}
                  className="story-card"
                  style={{ background: cardColor.bg, borderColor: cardColor.border }}
                >
                  <img
                    src={story.photo}
                    alt={story.name}
                    className="story-card-photo"
                    onError={(event) => { event.currentTarget.style.display = 'none'; }}
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
            })}
          </div>
        </div>
      </section>

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

      <section className="workspace-section">
        <div className="wrap">
          <h2 className="workspace-title">
            Workspace + <span>24/7</span> counselor
          </h2>
          <p className="workspace-sub">
            Your whole application in one place, with a counselor on call around the clock.
          </p>
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
      </section>

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
    </main>
  );
}
