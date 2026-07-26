import UniversitySearchGrid from '../components/UniversitySearchGrid';
import './Universities.css';

export default function Universities() {
  /* The page title, counts, Nova and search all live inside the grid's own
     hero band — the search needs the component's state, so lifting only the
     heading out here would split one visual block across two files. */
  return (
    <div className="uni-page">
      <UniversitySearchGrid hero />
    </div>
  );
}
