import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StyleGuideManager } from '../components/StyleGuideManager';
import { LeftNavigation } from '../components/LeftNavigation';
import { useAppStore } from '../store';

export function SettingsPage() {
  const navigate = useNavigate();
  const { 
    isDarkMode, 
    toggleDarkMode, 
    settings, 
    updateSettings,
    availableModels,
    getCurrentModel
  } = useAppStore();
  
  // Navigation state
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  
  // Handle navigation hover
  const handleNavMouseEnter = () => setIsNavExpanded(true);
  const handleNavMouseLeave = () => setIsNavExpanded(false);

  return (
    <div className="flex h-screen bg-white">
      {/* Left Navigation Panel - Collapsible on Hover */}
      <LeftNavigation
        isNavExpanded={isNavExpanded}
        onNavMouseEnter={handleNavMouseEnter}
        onNavMouseLeave={handleNavMouseLeave}
        currentDocumentId={undefined}
        showNewChatButton={true}
        onNewChat={() => navigate('/')}
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Main Content */}
        <div className="flex-1 px-6 py-8 overflow-y-auto">
          <div className="space-y-8">
                         {/* Page Header */}
                           <div className="glass-panel p-6">
                <h1 className="text-2xl font-bold" style={{ color: '#111827' }}>Settings</h1>
                <p className="text-gray-600">
                  Configure your voice, style preferences, and core application settings for the beta version.
                </p>
              </div>

            {/* Voice & Style Guide - Top Level Section */}
            <StyleGuideManager />

                         {/* Configuration Sections in Columns */}
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* AI Model Configuration */}
               <div className="glass-panel p-6">
                                   <h2 className="text-hierarchy-h2" style={{ color: '#111827' }}>AI Model Configuration</h2>
                 <div className="space-y-4">
                   <div>
                     <label className="block text-gray-700 mb-2 text-sm">Select Model</label>
                    <div className="space-y-3">
                      {availableModels.map((model) => (
                        <div
                          key={model.id}
                          className={`relative p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            settings.chat_default === model.id
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-gray-600 hover:border-gray-500 bg-gray-800/50'
                          }`}
                          onClick={() => updateSettings({ chat_default: model.id })}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                                                         <div className="flex items-center gap-2 mb-1">
                             <h3 className="font-medium text-gray-900">{model.name}</h3>
                             {model.recommended && (
                               <span className="px-2 py-1 bg-green-500/20 text-green-600 text-xs rounded-full">
                                 Recommended
                               </span>
                             )}
                           </div>
                           <p className="text-gray-600 text-sm mb-2">{model.description}</p>
                           <div className="flex gap-4 text-xs text-gray-600">
                                <span>Size: {model.size}</span>
                                <span>Speed: {model.expectedSpeed}</span>
                                <span>RAM: {model.ramUsage}</span>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-full border-2 ${
                              settings.chat_default === model.id
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-500'
                            }`}>
                              {settings.chat_default === model.id && (
                                <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                                         <p className="text-gray-600 text-xs mt-3">
                       Current: {getCurrentModel().name} • {getCurrentModel().size}
                     </p>
                  </div>
                  
                                     <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                     <h3 className="text-blue-600 font-medium mb-2 text-sm">Performance Tips</h3>
                     <p className="text-xs text-gray-700">
                       Larger models (13B+) provide significantly faster processing and better quality. 
                       For M2 MacBook Air 16GB, 13B models are recommended for optimal performance.
                     </p>
                   </div>
                </div>
              </div>

                             {/* Theme */}
               <div className="glass-panel p-6">
                 <h2 className="text-hierarchy-h2" style={{ color: '#111827', fontWeight: '700', fontSize: '2rem', lineHeight: '1.2', letterSpacing: '-0.03em' }}>Theme</h2>
                <div className="space-y-4">
                  <div className="flex flex-col space-y-2">
                                    <button 
                  onClick={toggleDarkMode}
                  className={`glass-button-secondary text-sm ${!isDarkMode ? 'bg-white bg-opacity-20' : ''}`}
                  style={{ color: '#111827' }}
                >
                  {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
