/**
 * QA Test Runner component for Developer Console
 */

import React, { useState } from 'react';
import { qaTester, type QATestSuite } from '../lib/qa-testing';
import { logInfo } from '../lib/logger';

export const QATestRunner: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<QATestSuite[]>([]);
  const [expandedSuite, setExpandedSuite] = useState<string | null>(null);

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    
    try {
      logInfo('SYSTEM', 'Starting comprehensive QA test suite');
      const results = await qaTester.runAllTests();
      setTestResults(results);
      
      const overallStatus = results.every(suite => suite.overallStatus === 'PASS') ? 'PASS' :
                           results.some(suite => suite.overallStatus === 'PASS') ? 'PARTIAL' : 'FAIL';
      
      logInfo('SYSTEM', `QA test suite completed: ${overallStatus}`, {
        totalSuites: results.length,
        passingSuites: results.filter(s => s.overallStatus === 'PASS').length
      });
    } catch (error) {
      console.error('QA test suite failed:', error);
      logInfo('SYSTEM', 'QA test suite failed', { error });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: 'PASS' | 'FAIL' | 'PARTIAL' | 'SKIP') => {
    switch (status) {
      case 'PASS': return 'text-green-600';
      case 'FAIL': return 'text-red-600';
      case 'PARTIAL': return 'text-yellow-600';
      case 'SKIP': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: 'PASS' | 'FAIL' | 'PARTIAL' | 'SKIP') => {
    switch (status) {
      case 'PASS': return '✓';
      case 'FAIL': return '✗';
      case 'PARTIAL': return '⚠';
      case 'SKIP': return '○';
      default: return '?';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const downloadResults = () => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `qa-test-results-${timestamp}.json`;
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      testResults,
      summary: {
        totalSuites: testResults.length,
        passingSuites: testResults.filter(s => s.overallStatus === 'PASS').length,
        totalTests: testResults.reduce((sum, suite) => sum + suite.results.length, 0),
        passingTests: testResults.reduce((sum, suite) => 
          sum + suite.results.filter(test => test.status === 'PASS').length, 0
        )
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    logInfo('EXPORT', `QA test results exported: ${filename}`);
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-900">QA Test Suite</h2>
        <div className="flex gap-2">
          {testResults.length > 0 && (
                      <button
            onClick={downloadResults}
            className="text-sm"
            style={{ 
              background: '#E5E7EB',
              border: '1px solid #D1D5DB',
              borderRadius: '16px',
              padding: '12px 16px',
              color: '#111827',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            📥 Export Results
          </button>
          )}
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="text-sm"
            style={{ 
              background: '#3B82F6',
              border: '1px solid #2563EB',
              borderRadius: '16px',
              padding: '12px 16px',
              color: '#FFFFFF',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: isRunning ? 0.5 : 1
            }}
          >
            {isRunning ? '⏳ Running...' : '▶️ Run All Tests'}
          </button>
        </div>
      </div>

      {isRunning && (
        <div className="mb-4 glass-panel p-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-600 text-sm">Running comprehensive QA tests...</span>
          </div>
        </div>
      )}

      {testResults.length > 0 && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-gray-100 p-3 rounded border border-gray-200">
            <h4 className="text-gray-900 font-medium mb-2">Test Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Suites:</span>
                <span className="text-gray-900 ml-2">{testResults.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Passing Suites:</span>
                <span className="text-green-600 ml-2">
                  {testResults.filter(s => s.overallStatus === 'PASS').length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Total Duration:</span>
                <span className="text-gray-900 ml-2">
                  {formatDuration(testResults.reduce((sum, s) => sum + s.totalDuration, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Test Suites */}
          <div className="space-y-2">
            {testResults.map((suite) => (
              <div key={suite.suiteName} className="border border-gray-300 rounded bg-gray-50">
                <button
                  onClick={() => setExpandedSuite(
                    expandedSuite === suite.suiteName ? null : suite.suiteName
                  )}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg ${getStatusColor(suite.overallStatus)}`}>
                      {getStatusIcon(suite.overallStatus)}
                    </span>
                    <span className="text-gray-900 font-medium">{suite.suiteName}</span>
                    <span className="text-sm text-gray-600">
                      ({suite.passRate.toFixed(1)}% pass rate)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{formatDuration(suite.totalDuration)}</span>
                    <span>{expandedSuite === suite.suiteName ? '▼' : '▶'}</span>
                  </div>
                </button>

                {expandedSuite === suite.suiteName && (
                  <div className="border-t border-gray-300 p-3">
                    <div className="space-y-2">
                      {suite.results.map((test, index) => (
                        <div key={index} className="flex items-start justify-between p-2 bg-white rounded border border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-sm ${getStatusColor(test.status)}`}>
                                {getStatusIcon(test.status)}
                              </span>
                              <span className="text-gray-900 text-sm">{test.testName}</span>
                            </div>
                            
                            {test.error && (
                              <div className="text-red-600 text-xs mt-1 font-mono">
                                Error: {test.error}
                              </div>
                            )}
                            
                            {Object.keys(test.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-700">
                                  Show Details
                                </summary>
                                <pre className="text-xs text-gray-700 mt-1 p-2 bg-gray-50 rounded overflow-x-auto border border-gray-200">
                                  {JSON.stringify(test.details, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                          
                          <div className="text-xs text-gray-600 ml-2">
                            {formatDuration(test.duration)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isRunning && testResults.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <p className="mb-2">No test results yet</p>
          <p className="text-sm">Click "Run All Tests" to validate MVP functionality</p>
        </div>
      )}
    </div>
  );
};
