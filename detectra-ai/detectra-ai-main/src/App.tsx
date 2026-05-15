import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import FYPProject from './pages/FYPProject';
import Timeline from './pages/Timeline';
import ResearchLiterature from './pages/ResearchLiterature';
import DetectionDemo from './pages/DetectionDemo';
import Architecture from './pages/Architecture';
import Pipeline from './pages/Pipeline';
import Capabilities from './pages/Capabilities';
import Pricing from './pages/Pricing';
import Team from './pages/Team';
import BusinessCase from './pages/BusinessCase';
import Contact from './pages/Contact';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import AnalyzeJob from './pages/AnalyzeJob';
import JobResults from './pages/JobResults';
import NotFound from './pages/NotFound';
import { useAuth } from './contexts/AuthContext';

/**
 * Generic protected route — redirects to /signin when no user.
 * `allowGuest` lets routes opt-in to letting unauthenticated users in when
 * Supabase isn't configured (so the analyzer still works in dev/demo mode).
 */
function ProtectedRoute({
  children,
  allowGuest = false,
}: {
  children: React.ReactNode;
  allowGuest?: boolean;
}) {
  const { user, loading, isGuest } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (allowGuest && isGuest) return <>{children}</>;
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/** Old bookmarks / shared links */
function LegacyDashboardAnalyzeRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/analyze/progress/${jobId}`} replace />;
}

function LegacyDashboardResultsRedirect() {
  const { jobId } = useParams();
  return <Navigate to={`/analyze/results/${jobId}`} replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="project" element={<Navigate to="/fyp-project" replace />} />
          <Route path="fyp-project" element={<FYPProject />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="research" element={<ResearchLiterature />} />
          <Route path="demo" element={<DetectionDemo />} />
          <Route path="architecture" element={<Architecture />} />
          <Route path="pipeline" element={<Pipeline />} />
          <Route path="capabilities" element={<Capabilities />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="team" element={<Team />} />
          <Route path="business-case" element={<BusinessCase />} />
          <Route path="contact" element={<Contact />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="signup" element={<SignUp />} />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="analyze"
            element={
              <ProtectedRoute allowGuest>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="analyze/progress/:jobId"
            element={
              <ProtectedRoute allowGuest>
                <AnalyzeJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="analyze/results/:jobId"
            element={
              <ProtectedRoute allowGuest>
                <JobResults />
              </ProtectedRoute>
            }
          />
          <Route path="dashboard" element={<Navigate to="/analyze" replace />} />
          <Route path="dashboard/analyze/:jobId" element={<LegacyDashboardAnalyzeRedirect />} />
          <Route path="dashboard/results/:jobId" element={<LegacyDashboardResultsRedirect />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
