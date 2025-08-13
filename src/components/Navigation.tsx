import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';

export function Navigation() {
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useAppStore();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/library', label: 'Library', icon: '📚' },
    { path: '/chat', label: 'Chat', icon: '💬' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    { path: '/dev-console', label: 'Dev Console', icon: '🔧' },
  ];

  const handleNavigation = (path: string, label: string) => {
    logInfo('UI', `Navigation: ${label} clicked`, { path, currentPath: location.pathname });
  };

  const handleThemeToggle = () => {
    toggleDarkMode();
    logInfo('UI', `Theme toggled to ${!isDarkMode ? 'dark' : 'light'} mode`);
  };

  return (
    <nav className="glass-nav mx-4 mt-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-hierarchy-h3">
              Transcript Summarizer
            </h1>
            <div className="hidden md:flex text-sm text-gray-400">
              Local AI • Privacy First
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <button
              onClick={handleThemeToggle}
              className="glass-button-secondary"
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>

            {/* Navigation Items */}
            <div className="hidden lg:flex space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => handleNavigation(item.path, item.label)}
                  className={`glass-button-secondary flex items-center space-x-2 transition-all duration-200 ${
                    location.pathname === item.path
                      ? 'bg-blue-500 text-white'
                      : 'hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="hidden xl:inline">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden">
              <details className="relative">
                <summary className="glass-button-secondary cursor-pointer">
                  ☰ Menu
                </summary>
                <div className="absolute right-0 mt-2 glass-modal w-48 z-50">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => handleNavigation(item.path, item.label)}
                      className={`flex items-center space-x-3 px-4 py-3 text-white hover:bg-white/10 transition-colors ${
                        location.pathname === item.path ? 'bg-blue-500' : ''
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
