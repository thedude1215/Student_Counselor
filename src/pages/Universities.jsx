import UniversitySearchGrid from '../components/UniversitySearchGrid';
import './Universities.css';

export default function Universities() {
  return (
    <div className="uni-page">
      <div className="uni-top">
        <div className="wrap">
          <h1 className="page-h1">Universities</h1>
          <p className="page-sub">Browse and compare universities across 90+ countries.</p>
        </div>
      </div>
      <UniversitySearchGrid />
    </div>
  );
}
