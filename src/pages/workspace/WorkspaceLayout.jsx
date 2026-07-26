import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, ListChecks, PenLine, CalendarDays, Trophy, Award, User, LogOut, Map, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './workspace.css';

const GROUPS = [
  {
    label: null,
    items: [
      { to: '/dashboard', label: 'Home', icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Build',
    items: [
      { to: '/dashboard/journey',    label: 'Journey',      icon: Map },
      { to: '/dashboard/colleges',   label: 'College List', icon: GraduationCap },
      { to: '/dashboard/essays',     label: 'Essays',       icon: PenLine },
      { to: '/dashboard/activities', label: 'Activities',   icon: Trophy },
      { to: '/dashboard/scholarships', label: 'Scholarships', icon: Award },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/dashboard/tasks',    label: 'Tasks',    icon: ListChecks },
      { to: '/dashboard/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
];

/* The destination list, shared by the sidebar and the mobile drawer so the two
 * can never drift apart. The label is wrapped rather than left as a bare text
 * node: the icon-only collapse below 820px hides `.ws-nav-item span`, which
 * matched nothing while the label sat directly inside the link — so the labels
 * kept rendering into a 64px rail. */
function NavItems({ onNavigate }) {
  return GROUPS.map((group, gi) => (
    <div key={gi} className="ws-nav-group">
      {group.label && <div className="ws-nav-label">{group.label}</div>}
      {group.items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => `ws-nav-item ${isActive ? 'active' : ''}`}
        >
          <Icon size={17} />
          <span>{label}</span>
        </NavLink>
      ))}
    </div>
  ));
}

export default function WorkspaceLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef(null);
  const navRef = useRef(null);
  const [pill, setPill] = useState({ top: 0, height: 0, opacity: 0 });

  useEffect(() => {
    if (!navRef.current) return;
    const active = navRef.current.querySelector('.ws-nav-item.active');
    if (!active) return;
    const navRect = navRef.current.getBoundingClientRect();
    const itemRect = active.getBoundingClientRect();
    setPill({ top: itemRect.top - navRect.top, height: itemRect.height, opacity: 1 });
  }, [location.pathname]);

  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const initial = name.charAt(0).toUpperCase();
  const currentPage = GROUPS.flatMap(g => g.items).find(item =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)
  )?.label;

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Close the drawer whenever the route changes, so it never sits covering the
  // page you just asked for. Tapping a link already closes it via onNavigate;
  // this also covers browser back/forward. Adjusting during render rather than
  // in an effect avoids rendering the stale open drawer for a frame first.
  const [drawerPath, setDrawerPath] = useState(location.pathname);
  if (drawerPath !== location.pathname) {
    setDrawerPath(location.pathname);
    if (drawerOpen) setDrawerOpen(false);
  }

  // Escape closes it, and the page behind must not scroll while it is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [drawerOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    setDrawerOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <div className="ws-page">
      {/* Phone-width top bar. The sidebar is hidden below 480px, and without
          this there is no route to Journey, Essays, Tasks or sign-out at all. */}
      <header className="ws-mobilebar">
        <button
          className="ws-mobilebar-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
        >
          <Menu size={20} />
        </button>
        <Link to="/dashboard" className="ws-mobilebar-brand">
          <img src="/scholarpath-logo.svg" alt="ScholarPath" />
        </Link>
        <Link to="/nova" state={{ from: currentPage }} className="ws-mobilebar-nova">
          <span className="nav-dot" />
          Nova
        </Link>
      </header>

      {drawerOpen && (
        <div
          className="ws-drawer-scrim"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`ws-drawer${drawerOpen ? ' open' : ''}`} role="dialog" aria-label="Navigation" aria-modal="true">
        <div className="ws-drawer-head">
          <img src="/scholarpath-logo.svg" alt="ScholarPath" className="ws-drawer-logo" />
          <button className="ws-mobilebar-btn" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <Link to="/nova" state={{ from: currentPage }} className="ws-nova-sidebar-btn">
          <span className="nav-dot" />
          Talk to Nova
        </Link>

        <nav className="ws-nav">
          <NavItems onNavigate={() => setDrawerOpen(false)} />
        </nav>

        <div className="ws-drawer-foot">
          <button className="ws-user-menu-item" onClick={() => { setDrawerOpen(false); navigate('/dashboard/profile'); }}>
            <User size={15} />
            My Profile
          </button>
          <button className="ws-user-menu-item ws-user-menu-logout" onClick={handleSignOut}>
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      </div>

      <aside className="ws-sidebar">
        <Link to="/" className="ws-side-brand">
          {/* Cream variant — the sidebar is deep forest, and the -dark logo is
              near-black (#010101), which would disappear against it. */}
          <img src="/scholarpath-logo.svg" alt="ScholarPath" className="ws-side-brand-logo" />
        </Link>

        <Link to="/nova" state={{ from: currentPage }} className="ws-nova-sidebar-btn">
          <span className="nav-dot" />
          Talk to Nova
        </Link>

        <nav className="ws-nav" ref={navRef}>
          <div className="ws-nav-pill" style={{ top: pill.top, height: pill.height, opacity: pill.opacity }} />
          <NavItems />
        </nav>

        <div className="ws-user-wrap" ref={menuRef}>
          {menuOpen && (
            <div className="ws-user-menu">
              <button
                className="ws-user-menu-item"
                onClick={() => { setMenuOpen(false); navigate('/dashboard/profile'); }}
              >
                <User size={15} />
                My Profile
              </button>
              <button className="ws-user-menu-item ws-user-menu-logout" onClick={handleSignOut}>
                <LogOut size={15} />
                Log Out
              </button>
            </div>
          )}
          <button
            className={`ws-user ${menuOpen ? 'open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
          >
            <div className="ws-avatar">{initial}</div>
            <div className="ws-user-info">
              <div className="ws-user-name">{name}</div>
              <div className="ws-user-email">{user?.email}</div>
            </div>
          </button>
        </div>
      </aside>

      <main className="ws-main">
        <div key={location.pathname} className="ws-page-anim">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
