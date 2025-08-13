import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { DevConsole } from './components/DevConsole';
import { HomePage } from './pages/HomePage';
import { LibraryPage } from './pages/LibraryPage';
import { ChatPage } from './pages/ChatPage';
import { SettingsPage } from './pages/SettingsPage';
import { DevConsolePage } from './pages/DevConsolePage';
import { useDevConsole } from './hooks/useDevConsole';
import { useAppStore } from './store';

function App() {
  const { isDarkMode } = useAppStore();
  const devConsole = useDevConsole();

  return (
    <Router>
      <div className={`min-h-screen ${isDarkMode ? 'dark' : ''}`}>
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/dev-console" element={<DevConsolePage />} />
          </Routes>
        </main>

        {/* Floating Developer Console */}
        {devConsole.isVisible && (
          <DevConsole
            isOpen={devConsole.isOpen}
            onToggle={devConsole.toggle}
            position={devConsole.position}
            onPositionChange={devConsole.changePosition}
          />
        )}
      </div>
    </Router>
  );
}

export default App;