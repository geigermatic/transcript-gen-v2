import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GlassDashboard } from './components/GlassDashboard';
import { MainWorkspace } from './components/MainWorkspace';
import { HomePage } from './pages/HomePage';
import { UploadPage } from './pages/UploadPage';
import { GlossaryPage } from './pages/GlossaryPage';
import { LibraryPage } from './pages/LibraryPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { DevConsolePage } from './pages/DevConsolePage';

function App() {
  return (
    <Router>
      <Routes>
        {/* New Glassmorphic Dashboard - Default */}
        <Route path="/" element={<GlassDashboard />} />
        
        {/* Glassmorphic Pages */}
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/glossary" element={<GlossaryPage />} />
        
        {/* Existing Application Routes */}
        <Route path="/home" element={<HomePage />} />
        <Route path="/workspace" element={<MainWorkspace />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/dev-console" element={<DevConsolePage />} />
        
        {/* Fallback - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;