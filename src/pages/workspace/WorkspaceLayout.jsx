import { useState, useRef, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, ListChecks, PenLine, CalendarDays, Trophy, User, LogOut } from 'lucide-react';
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
      { to: '/dashboard/colleges',   label: 'College List', icon: GraduationCap },
      { to: '/dashboard/essays',     label: 'Essays',       icon: PenLine },
      { to: '/dashboard/activities', label: 'Activities',   icon: Trophy },
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

export default function WorkspaceLayout() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const initial = name.charAt(0).toUpperCase();

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

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  }

  return (
    <div className="ws-page">
      <aside className="ws-sidebar">
        <div className="ws-side-brand">
          <img src="/scholarpath-logo.svg" alt="ScholarPath" className="ws-side-brand-logo" />
        </div>

        <nav className="ws-nav">
          {GROUPS.map((group, gi) => (
            <div key={gi} className="ws-nav-group">
              {group.label && <div className="ws-nav-label">{group.label}</div>}
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `ws-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
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
        <div className="ws-topbar">
          <Link to="/nova" className="ws-nova-btn">
            <span className="nav-dot" />
            Talk to Nova
          </Link>
        </div>
        <div key={location.pathname} className="ws-page-anim">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
