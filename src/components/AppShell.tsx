/**
 * AppShell - Main layout wrapper with glassmorphic design
 */

import React from 'react';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  // sidebarCollapsed state removed for beta version

  return (
    <div className="min-h-screen font-sans text-white" style={{
      background: 'linear-gradient(135deg, #1F2937 0%, #374151 25%, #1E3A8A 50%, #0F766E 75%, #0D9488 100%)',
      minHeight: '100vh',
      backgroundAttachment: 'fixed'
    }}>
      {/* Topbar */}
      <Topbar />
      
      {/* Sidebar - Hidden for beta version */}
      {/* <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      /> */}
      
      {/* Main Content - Full width for beta version */}
      <main 
        className="transition-all duration-300 ease-out ml-0"
        style={{ paddingTop: '6rem' }} /* Fixed padding so content doesn't jump */
      >
        <div className="px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
