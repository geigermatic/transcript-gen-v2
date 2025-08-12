import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/library', label: 'Library', icon: '📚' },
    { path: '/chat', label: 'Chat', icon: '💬' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
    { path: '/dev-console', label: 'Dev Console', icon: '🔧' },
  ];

  return (
    <nav className="glass-panel m-4 p-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">
            Transcript Summarizer
          </h1>
          <div className="flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`glass-button flex items-center space-x-2 text-white ${
                  location.pathname === item.path
                    ? 'bg-white bg-opacity-20'
                    : 'hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
