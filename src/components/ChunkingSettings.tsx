/**
 * Chunking and Processing Speed Settings Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChunkingConfigManager, PROCESSING_PRESETS } from '../lib/chunkingConfig';
import { Zap, Settings, Clock, Target, AlertTriangle } from 'lucide-react';

interface ChunkingSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  documentWordCount?: number;
}

export const ChunkingSettings: React.FC<ChunkingSettingsProps> = ({
  isOpen,
  onClose,
  documentWordCount = 1000
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('balanced');
  const [estimation, setEstimation] = useState<{
    estimatedChunks: number;
    estimatedTimeMinutes: number;
    description: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const currentConfig = ChunkingConfigManager.getCurrentConfig();
      // Find matching preset
      const preset = Object.entries(PROCESSING_PRESETS).find(
        ([, config]) => config.chunking.mode === currentConfig.chunking.mode
      );
      if (preset) {
        setSelectedPreset(preset[0]);
      }
      updateEstimation(preset?.[0] || 'balanced');
    }
  const updateEstimation = useCallback((presetKey: string) => {
    ChunkingConfigManager.setConfig(presetKey as keyof typeof PROCESSING_PRESETS);
    const est = ChunkingConfigManager.getEstimatedProcessingTime(documentWordCount);
    setEstimation(est);
  }, [documentWordCount]);

  }, [isOpen, updateEstimation]);

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    updateEstimation(presetKey);
  };

  const handleApply = () => {
    ChunkingConfigManager.setConfig(selectedPreset as keyof typeof PROCESSING_PRESETS);
    onClose();
  };

  const presets = ChunkingConfigManager.getAvailablePresets();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl glass-panel p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings size={24} />
              Processing Speed Settings
            </h2>
            <p className="text-gray-400 mt-1">
              Adjust chunk sizes and processing mode for faster summarization
            </p>
          </div>
          <button
            onClick={onClose}
            className="glass-button text-white hover:bg-red-500 hover:bg-opacity-20"
          >
            ✕
          </button>
        </div>

        {/* Current Document Info */}
        <div className="glass-panel p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-blue-400" />
            <span className="text-white font-medium">Current Document</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Word Count:</span>
              <p className="text-white">{documentWordCount.toLocaleString()}</p>
            </div>
            {estimation && (
              <>
                <div>
                  <span className="text-gray-400">Estimated Chunks:</span>
                  <p className="text-white">{estimation.estimatedChunks}</p>
                </div>
                <div>
                  <span className="text-gray-400">Estimated Time:</span>
                  <p className="text-white">{estimation.estimatedTimeMinutes.toFixed(1)} min</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Preset Options */}
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold text-white">Speed Presets</h3>
          
          {presets.map((preset) => {
            const isSelected = selectedPreset === preset.key;
            const Icon = getPresetIcon(preset.key);
            
            return (
              <div
                key={preset.key}
                className={`glass-panel p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'ring-2 ring-blue-400 bg-blue-500 bg-opacity-10' 
                    : 'hover:bg-white hover:bg-opacity-5'
                }`}
                onClick={() => handlePresetChange(preset.key)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={isSelected ? 'text-blue-400' : 'text-gray-400'} />
                    <div>
                      <h4 className="text-white font-medium flex items-center gap-2">
                        {preset.name}
                        <span className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-300">
                          {preset.estimatedSpeed}
                        </span>
                      </h4>
                      <p className="text-gray-400 text-sm mt-1">{preset.description}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-400">Chunk Size</div>
                    <div className="text-white">{(preset.chunkSize / 5).toFixed(0)} words</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Warning for ultra-fast mode */}
        {selectedPreset === 'ultra-fast' && (
          <div className="glass-panel p-4 mb-6 bg-yellow-500 bg-opacity-10 border border-yellow-500 border-opacity-20">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-yellow-400 font-medium">Ultra-Fast Mode Notice</h4>
                <p className="text-yellow-200 text-sm mt-1">
                  This mode sacrifices some analysis depth for speed. Best for quick overviews 
                  of large documents. For detailed analysis, consider "Fast" or "Balanced" modes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Technical Details */}
        {selectedPreset && (
          <div className="glass-panel p-4 mb-6">
            <h4 className="text-white font-medium mb-3">Technical Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Chunk Size:</span>
                <p className="text-white">{PROCESSING_PRESETS[selectedPreset as keyof typeof PROCESSING_PRESETS].chunking.chunkSize} characters</p>
              </div>
              <div>
                <span className="text-gray-400">Overlap:</span>
                <p className="text-white">{PROCESSING_PRESETS[selectedPreset as keyof typeof PROCESSING_PRESETS].chunking.overlap} characters</p>
              </div>
              <div>
                <span className="text-gray-400">Parallel Processing:</span>
                <p className="text-white">
                  {PROCESSING_PRESETS[selectedPreset as keyof typeof PROCESSING_PRESETS].chunking.parallelProcessing ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Batch Size:</span>
                <p className="text-white">{PROCESSING_PRESETS[selectedPreset as keyof typeof PROCESSING_PRESETS].chunking.batchSize}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="glass-button text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="glass-button bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

function getPresetIcon(presetKey: string) {
  switch (presetKey) {
    case 'ultra-fast':
      return Zap;
    case 'fast':
      return Clock;
    case 'balanced':
      return Settings;
    case 'quality':
      return Target;
    default:
      return Settings;
  }
}
