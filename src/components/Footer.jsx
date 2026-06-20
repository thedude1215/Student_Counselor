import { Link } from 'react-router-dom';
import './layout.css';

export default function Footer() {
  return (
    <footer className="footer">
      {/* Huge watermark wordmark behind — exactly like Borderless */}
      <div className="footer-wordmark">SCHOLARPATH</div>
      <div className="footer-divider" />
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-brand-name">ScholarPath</div>
            <p className="footer-brand-desc">
              Every opportunity in the world, now within reach.
              Helping international high school students find their path to global universities.
            </p>
          </div>
          <div>
            <div className="footer-col-title">Product</div>
            <div className="footer-links">
              <Link to="/nova"         className="footer-link">Nova AI</Link>
              <Link to="/stories"      className="footer-link">Stories</Link>
              <Link to="/universities" className="footer-link">Universities</Link>
              <Link to="/programs"     className="footer-link">Programs</Link>
              <Link to="/acceptances"  className="footer-link">Acceptances</Link>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Company</div>
            <div className="footer-links">
              <a href="#" className="footer-link">About</a>
              <a href="#" className="footer-link">Blog</a>
              <a href="#" className="footer-link">Mentorship</a>
              <a href="mailto:hello@scholarpath.so" className="footer-link">Contact</a>
            </div>
          </div>
          <div>
            <div className="footer-col-title">Social</div>
            <div className="footer-links">
              <a href="#" className="footer-link">Instagram</a>
              <a href="#" className="footer-link">LinkedIn</a>
              <a href="#" className="footer-link">YouTube</a>
              <a href="#" className="footer-link">Twitter / X</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copy">© 2026 ScholarPath. All rights reserved.</p>
          <div className="footer-legal">
            <a href="#" className="footer-link">Privacy</a>
            <a href="#" className="footer-link">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
