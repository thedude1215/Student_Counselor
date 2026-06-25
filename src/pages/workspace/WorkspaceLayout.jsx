import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, GraduationCap, ListChecks, PenLine, User, CalendarDays, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './workspace.css';

const GROUPS = [
  {
    label: null,
    items: [
      { to: '/dashboard',         label: 'Home',    icon: LayoutDashboard, end: true },
      { to: '/dashboard/profile', label: 'Profile', icon: User },
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
  const { user, profile } = useAuth();
  const name = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="ws-page">
      <div className="ws-shell">
        <aside className="ws-sidebar">
          <div className="ws-side-brand">ScholarPath</div>

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

          <div className="ws-user">
            <div className="ws-avatar">{initial}</div>
            <div className="ws-user-info">
              <div className="ws-user-name">{name}</div>
              <div className="ws-user-email">{user?.email}</div>
            </div>
          </div>
        </aside>
        <main className="ws-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
