import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Stories from './pages/Stories';
import Universities from './pages/Universities';
import Programs from './pages/Programs';
import Acceptances from './pages/Acceptances';
import Nova from './pages/Nova';
import './index.css';

function AppLayout() {
  const location = useLocation();
  const isNova = location.pathname === '/nova';

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"             element={<Home />} />
        <Route path="/stories"      element={<Stories />} />
        <Route path="/universities" element={<Universities />} />
        <Route path="/programs"     element={<Programs />} />
        <Route path="/acceptances"  element={<Acceptances />} />
        <Route path="/nova"         element={<Nova />} />
      </Routes>
      {!isNova && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
