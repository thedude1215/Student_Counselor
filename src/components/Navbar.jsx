import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import './layout.css';

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

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

        {/* ── Logo: SCHOLARPATH exactly like 🌐 BORDERLESS but without icon as requested ── */}
        <Link to="/" className="nav-logo">
          <span className="nav-logo-name">ScholarPath</span>
        </Link>

        {/* ── Nav links ── */}
        <div className="nav-links">
          {links.map(l => (
            <NavLink key={l.to} to={l.to}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="nav-cta">
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
        </div>
      )}
    </nav>
  );
}
