import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import Layout from './components/layout/Layout.tsx';

import SignIn from './pages/SignIn.tsx';
import SignUp from './pages/SignUp.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Jobs from './pages/Jobs.tsx';
import ResumeBuilder from './pages/ResumeBuilder.tsx';
import CoverLetter from './pages/CoverLetter.tsx';
import Skills from './pages/Skills.tsx';
import InterviewPrep from './pages/InterviewPrep.tsx';
import Chat from './pages/Chat.tsx';
import Applications from './pages/Applications.tsx';

function App() {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={!isAuthenticated ? <SignIn /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!isAuthenticated ? <SignUp /> : <Navigate to="/dashboard" />} />
        <Route path="/login" element={<Navigate to="/signin" replace />} />
        <Route path="/register" element={<Navigate to="/signup" replace />} />

        <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/signin" />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="applications" element={<Applications />} />
          <Route path="resumes" element={<ResumeBuilder />} />
          <Route path="cover-letter" element={<CoverLetter />} />
          <Route path="skills" element={<Skills />} />
          <Route path="interview-prep" element={<InterviewPrep />} />
          <Route path="chat" element={<Chat />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
