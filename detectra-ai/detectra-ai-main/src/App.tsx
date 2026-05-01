import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Project from './pages/Project';
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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
    // Save the current location so we can redirect back after sign-in
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="project" element={<Project />} />
          <Route path="fyp-project" element={<FYPProject />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="research" element={<ResearchLiterature />} />
          <Route
            path="demo"
            element={
              <ProtectedRoute>
                <DetectionDemo />
              </ProtectedRoute>
            }
          />
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
            path="dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/analyze/:jobId"
            element={
              <ProtectedRoute>
                <AnalyzeJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/results/:jobId"
            element={
              <ProtectedRoute>
                <JobResults />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
