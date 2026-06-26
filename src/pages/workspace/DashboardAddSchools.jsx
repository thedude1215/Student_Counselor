import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import UniversitySearchGrid from '../../components/UniversitySearchGrid';
import '../Universities.css';

export default function DashboardAddSchools() {
  return (
    <div className="uni-page dash-add-schools">
      {/* Top bar with back button — replaces the public navbar */}
      <div className="dash-add-topbar">
        <div className="wrap">
          <Link to="/dashboard/colleges" className="dash-back-btn">
            <ArrowLeft size={18} />
            Back to College List
          </Link>
        </div>
      </div>

      <div className="uni-top" style={{ paddingTop: '1rem' }}>
        <div className="wrap">
          <h1 className="page-h1">Add Schools</h1>
          <p className="page-sub">Search and add universities to your college list.</p>
        </div>
      </div>

      <UniversitySearchGrid />
    </div>
  );
}
