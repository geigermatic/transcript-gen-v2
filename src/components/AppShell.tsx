/**
 * AppShell - Main layout wrapper with glassmorphic design
 */

import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="min-h-screen font-sans text-white" style={{
      background: 'linear-gradient(135deg, #1F2937 0%, #374151 25%, #1E3A8A 50%, #0F766E 75%, #0D9488 100%)',
      minHeight: '100vh',
      backgroundAttachment: 'fixed'
    }}>
      {/* Main Content - Full width for beta version */}
      <main className="transition-all duration-300 ease-out">
        <div className="px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
};
