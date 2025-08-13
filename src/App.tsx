import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlassDashboard } from './components/GlassDashboard';
import { UploadPage } from './pages/UploadPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { LibraryPage } from './pages/LibraryPage';
import { SettingsPage } from './pages/SettingsPage';
import { DevConsolePage } from './pages/DevConsolePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Main Dashboard - All functionality consolidated here */}
        <Route path="/" element={<GlassDashboard />} />
        
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