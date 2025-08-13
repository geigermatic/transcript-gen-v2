/**
 * AppShell - Main layout wrapper with glassmorphic design
 */

import React, { useState } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen font-sans text-white" style={{
      background: 'linear-gradient(135deg, #1F2937 0%, #374151 25%, #1E3A8A 50%, #0F766E 75%, #0D9488 100%)',
      minHeight: '100vh',
      backgroundAttachment: 'fixed'
    }}>
      {/* Topbar */}
      <Topbar sidebarCollapsed={sidebarCollapsed} />
      
      {/* Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      {/* Main Content */}
      <main 
        className={`transition-all duration-300 ease-out ${
          sidebarCollapsed ? 'ml-24' : 'ml-84'
        }`}
        style={{ paddingTop: '6rem' }} /* Fixed padding so content doesn't jump */
      >
        <div className="px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};
