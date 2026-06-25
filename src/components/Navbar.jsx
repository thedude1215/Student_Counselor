import { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import './layout.css';

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  async function handleSignOut() {
    await signOut();
    setMobileOpen(false);
    navigate('/');
  }

  const links = [
    { to: '/nova',         label: 'Nova'         },
    { to: '/stories',      label: 'Stories'      },
    { to: '/universities', label: 'Universities' },
    { to: '/programs',     label: 'Programs'     },
    { to: '/acceptances',  label: 'Acceptances'  },
  ];

  return (
    <nav className="navbar">
      <div className={`nav-inner ${scrolled ? 'scrolled' : ''}`}>

        <Link to="/" className="nav-logo">
          <span className="nav-logo-name">ScholarPath</span>
        </Link>

        <div className="nav-links">
          {links.map(l => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="nav-cta">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-dashboard">
                <LayoutDashboard size={15} />
                Dashboard
              </Link>
              <button className="nav-signout" onClick={handleSignOut} title="Log out">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/auth" className="nav-login">Log in</Link>
          )}
          <Link to="/nova" className="nav-nova">
            <span className="nav-dot" />
            Talk to Nova
          </Link>
          <button className="nav-hamburger" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="nav-mobile">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} className="nav-link"
              onClick={() => setMobileOpen(false)}>{l.label}</NavLink>
          ))}
          {user ? (
            <>
              <NavLink to="/dashboard" className="nav-link" onClick={() => setMobileOpen(false)}>Dashboard</NavLink>
              <button className="nav-link nav-mobile-signout" onClick={handleSignOut}>Log out</button>
            </>
          ) : (
            <NavLink to="/auth" className="nav-link" onClick={() => setMobileOpen(false)}>Log in</NavLink>
          )}
        </div>
      )}
    </nav>
  );
}
