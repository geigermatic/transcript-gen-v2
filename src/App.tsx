import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ChatCentricLayout } from './components/ChatCentricLayout';
import { SummaryResultsView } from './components/SummaryResultsView';
import TestDashboard from './pages/TestDashboard';
import { UploadPage } from './pages/UploadPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { DevConsolePage } from './pages/DevConsolePage';
import { SemanticChunkingDemo } from './components/SemanticChunkingDemo';
import { OllamaStatusMonitor } from './components/OllamaStatusMonitor';

// Component to handle scroll restoration
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Always scroll to top when route changes
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  // Also ensure scroll to top after component mounting
  useEffect(() => {
    // Use multiple strategies to ensure we stay at the top
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    // Immediate scroll
    scrollToTop();

    // Also scroll after a short delay to override any component scrolling
    const timer = setTimeout(scrollToTop, 100);
    return () => clearTimeout(timer);
  }, []);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <OllamaStatusMonitor />
      <Routes>
        {/* Main Dashboard - Chat-centric interface */}
        <Route path="/" element={<ChatCentricLayout />} />

        {/* Summary Results View */}
        <Route path="/summary/:documentId" element={<SummaryResultsView />} />

        {/* TDD Test Dashboard */}
        <Route path="/tests" element={<TestDashboard />} />

        {/* Development Tools */}
        <Route path="/chunking-demo" element={<SemanticChunkingDemo />} />

        {/* Supporting Pages */}
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/glossary" element={<GlossaryPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/dev-console" element={<DevConsolePage />} />

        {/* Fallback - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;