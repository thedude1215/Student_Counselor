import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import './index.css';

/*
 * Everything except the landing page is code-split.
 *
 * The whole app used to ship as one chunk, so a first-time visitor who only
 * ever saw "/" still downloaded the entire logged-in workspace — the essay
 * editor, the kanban board, the calendar, the PDF import. Home stays eagerly
 * imported because it is the entry point and lazy-loading it would only add a
 * spinner to the most important paint on the site.
 */
const Stories       = lazy(() => import('./pages/Stories'));
const Universities  = lazy(() => import('./pages/Universities'));
const Programs      = lazy(() => import('./pages/Programs'));
const Acceptances   = lazy(() => import('./pages/Acceptances'));
const Nova          = lazy(() => import('./pages/Nova'));
const Auth          = lazy(() => import('./pages/Auth'));
const Onboarding    = lazy(() => import('./pages/Onboarding'));

const WorkspaceLayout      = lazy(() => import('./pages/workspace/WorkspaceLayout'));
const Overview             = lazy(() => import('./pages/workspace/Overview'));
const CollegeList          = lazy(() => import('./pages/workspace/CollegeList'));
const Tasks                = lazy(() => import('./pages/workspace/Tasks'));
const Essays               = lazy(() => import('./pages/workspace/Essays'));
const Profile              = lazy(() => import('./pages/workspace/Profile'));
const Calendar             = lazy(() => import('./pages/workspace/Calendar'));
const Activities           = lazy(() => import('./pages/workspace/Activities'));
const Scholarships         = lazy(() => import('./pages/workspace/Scholarships'));
const Journey              = lazy(() => import('./pages/workspace/Journey'));
const DashboardAddSchools  = lazy(() => import('./pages/workspace/DashboardAddSchools'));

/* Deliberately quiet: chunks are small and usually arrive within a frame or
   two, so a spinner would flash more often than it would inform. */
function RouteFallback() {
  return <div className="route-fallback" aria-busy="true" />;
}

function AppLayout() {
  const location = useLocation();
  const hideFooter = location.pathname === '/nova' || location.pathname === '/auth' || location.pathname === '/onboarding' || location.pathname.startsWith('/dashboard');

  return (
    <>
      <Navbar />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/"             element={<Home />} />
          <Route path="/stories"      element={<Stories />} />
          <Route path="/universities" element={<Universities />} />
          <Route path="/programs"     element={<Programs />} />
          <Route path="/acceptances"  element={<Acceptances />} />
          <Route path="/nova"         element={<Nova />} />
          <Route path="/auth"         element={<Auth />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<Onboarding />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/add-schools" element={<DashboardAddSchools />} />
            <Route path="/dashboard" element={<WorkspaceLayout />}>
              <Route index element={<Overview />} />
              <Route path="profile" element={<Profile />} />
              <Route path="colleges" element={<CollegeList />} />
              <Route path="essays" element={<Essays />} />
              <Route path="activities" element={<Activities />} />
              <Route path="scholarships" element={<Scholarships />} />
              <Route path="journey" element={<Journey />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="calendar" element={<Calendar />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
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
