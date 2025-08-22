/**
 * StatusCard - Processing status and progress indicators
 */

import React from 'react';
import { Database, Zap, FileText, CheckCircle, Activity } from 'lucide-react';
import { useAppStore } from '../store';

interface StatusCardProps {
  className?: string;
}

interface StatusItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  current: number;
  total: number;
  status: 'idle' | 'processing' | 'completed' | 'error';
}

export const StatusCard: React.FC<StatusCardProps> = ({ className = '' }) => {
  const { documents, embeddings, abSummaryPairs } = useAppStore();
  
  try {

  // Add null checks to prevent errors
  const safeDocuments = documents || [];
  const safeEmbeddings = embeddings || new Map();
  const safeAbSummaryPairs = abSummaryPairs || [];

  // Calculate real status based on actual store data
  const totalDocs = safeDocuments.length;
  const indexedDocs = safeDocuments.filter(doc => 
    doc?.metadata?.wordCount && doc.metadata.wordCount > 0
  ).length;
  
  // Check actual embeddings from store (real data, not estimated)
  const documentsWithEmbeddings = safeDocuments.filter(doc => safeEmbeddings.has(doc.id));
  const embeddedDocsCount = documentsWithEmbeddings.length;
  
  // Count actual embedded chunks from store
  const totalEmbeddedChunks = Array.from(safeEmbeddings.values()).reduce((total, chunks) => {
    return total + (chunks?.length || 0);
  }, 0);
  
  // Estimate total chunks needed (for progress calculation)
  const estimateChunks = (wordCount: number) => Math.ceil(wordCount / 500);
  const totalEstimatedChunks = safeDocuments.reduce((total, doc) => {
    return total + (doc?.metadata?.wordCount ? estimateChunks(doc.metadata.wordCount) : estimateChunks(1000));
  }, 0);
  
  // Check actual summaries from store (real data, not estimated)
  const documentsWithSummaries = safeDocuments.filter(doc => 
    safeAbSummaryPairs.some(pair => pair?.documentId === doc.id)
  );
  const summarizedDocsCount = documentsWithSummaries.length;



  const statusItems: StatusItem[] = [
    {
      id: 'index',
      label: 'Index',
      icon: <Database size={16} />,
      current: indexedDocs,
      total: totalDocs,
      status: totalDocs === 0 ? 'idle' : indexedDocs === totalDocs ? 'completed' : indexedDocs > 0 ? 'processing' : 'idle'
    },
    {
      id: 'embed',
      label: 'Embed',
      icon: <Zap size={16} />,
      current: totalEmbeddedChunks,
      total: totalEstimatedChunks,
      status: totalDocs === 0 ? 'idle' : 
              embeddedDocsCount === totalDocs ? 'completed' : 
              embeddedDocsCount > 0 ? 'processing' : 'idle'
    },
    {
      id: 'summarize',
      label: 'Summarize',
      icon: <FileText size={16} />,
      current: summarizedDocsCount,
      total: totalDocs,
      status: totalDocs === 0 ? 'idle' : 
              summarizedDocsCount === totalDocs ? 'completed' : 
              summarizedDocsCount > 0 ? 'processing' : 'idle'
    }
  ];

  const getStatusColor = (status: StatusItem['status']) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'processing': return 'text-accent';
      case 'error': return 'text-red-400';
      default: return 'text-white text-opacity-40';
    }
  };

  const getProgressWidth = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.min((current / total) * 100, 100);
  };

  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading">Processing Status</h2>
        <div className="status-indicator">
          <Activity size={14} />
          <span>{totalDocs > 0 ? 'Active' : 'Idle'}</span>
        </div>
      </div>

      <div className="space-y-6">
        {totalDocs === 0 ? (
          <div className="text-center py-8">
            <Activity size={32} className="mx-auto text-white text-opacity-30 mb-3" />
            <p className="text-body mb-2">No documents to process</p>
            <p className="text-caption">
              Upload documents to see processing status
            </p>
          </div>
        ) : statusItems.map((item) => (
          <div key={item.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`${getStatusColor(item.status)} transition-colors`}>
                  {item.icon}
                </div>
                <span className="text-body font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-caption">
                  {item.current} / {item.total}
                </span>
                {item.status === 'completed' && (
                  <CheckCircle size={14} className="text-green-400" />
                )}
                {item.status === 'processing' && (
                  <div className="w-3 h-3 border border-accent border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="progress-container">
              <div className="w-full bg-white bg-opacity-10 rounded-lg h-2 overflow-hidden">
                <div
                  className={`progress-bar ${
                    item.status === 'completed' 
                      ? 'bg-green-400' 
                      : item.status === 'processing'
                      ? 'bg-accent'
                      : 'bg-white bg-opacity-30'
                  }`}
                  style={{ width: `${getProgressWidth(item.current, item.total)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overall status summary */}
      <div className="mt-6 pt-4 border-t border-white border-opacity-10">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-white">{totalDocs}</div>
            <div className="text-caption">Documents</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-accent">{totalEmbeddedChunks}</div>
            <div className="text-caption">Embeddings</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-green-400">
              {Math.round((totalEmbeddedChunks / Math.max(totalEstimatedChunks, 1)) * 100)}%
            </div>
            <div className="text-caption">Complete</div>
          </div>
        </div>
      </div>
    </div>
  );
  } catch (error) {
    console.error('StatusCard Error:', error);
    return (
      <div className={`glass-card p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠️ Status Unavailable</div>
          <div className="text-caption">Processing status temporarily unavailable</div>
        </div>
      </div>
    );
  }
};
