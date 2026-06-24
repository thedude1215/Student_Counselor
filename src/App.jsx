import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Stories from './pages/Stories';
import Universities from './pages/Universities';
import Programs from './pages/Programs';
import Acceptances from './pages/Acceptances';
import Nova from './pages/Nova';
import Auth from './pages/Auth';
import WorkspaceLayout from './pages/workspace/WorkspaceLayout';
import Overview from './pages/workspace/Overview';
import CollegeList from './pages/workspace/CollegeList';
import Tasks from './pages/workspace/Tasks';
import Essays from './pages/workspace/Essays';
import Profile from './pages/workspace/Profile';
import Calendar from './pages/workspace/Calendar';
import Activities from './pages/workspace/Activities';
import './index.css';

function AppLayout() {
  const location = useLocation();
  const hideFooter = location.pathname === '/nova' || location.pathname === '/auth';

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
        <Route path="/auth"         element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <WorkspaceLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Overview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="colleges" element={<CollegeList />} />
          <Route path="essays" element={<Essays />} />
          <Route path="activities" element={<Activities />} />
          <Route path="tasks" element={<Tasks />} />
          <Route path="calendar" element={<Calendar />} />
        </Route>
      </Routes>
      {!hideFooter && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </BrowserRouter>
  );
}
