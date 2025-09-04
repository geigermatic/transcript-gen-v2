import React, { useState } from 'react';

interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  failureMessage?: string;
}

interface PhaseResult {
  name: string;
  category: 'architecture' | 'ux';
  description: string;
  status: 'not-started' | 'in-progress' | 'complete' | 'failed';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  tests: TestResult[];
}

interface DashboardData {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  phases: Record<string, PhaseResult>;
}

export default function TestDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const [rawJsonData, setRawJsonData] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<{ key: string, phase: PhaseResult } | null>(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🧪 Requesting fresh test run...');
      const response = await fetch('http://localhost:3001/api/test-status');

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📊 Test results received:', result);

      // Store raw JSON for display
      setRawJsonData(JSON.stringify(result, null, 2));
      setData(result);

    } catch (err: any) {
      console.error('❌ Error running tests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 border-green-500 text-green-800';
      case 'in-progress': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'failed': return 'bg-red-100 border-red-500 text-red-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-600';
    }
  };

  const architecturePhases = data ? Object.entries(data.phases).filter(([_, phase]) => phase.category === 'architecture') : [];
  const uxPhases = data ? Object.entries(data.phases).filter(([_, phase]) => phase.category === 'ux') : [];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            TDD Test Dashboard
          </h1>

          <div className="flex items-center gap-4">
            <button
              onClick={runTests}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {loading ? '🔄 Running Tests...' : '🧪 Run All Tests'}
            </button>

            {data && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  Last run: {new Date(data.timestamp).toLocaleTimeString()}
                </div>
                <button
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded"
                >
                  {showRawJson ? '🙈 Hide' : '🔍 Show'} Raw JSON
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Raw JSON Display */}
        {showRawJson && rawJsonData && (
          <div className="mb-8 p-4 bg-gray-50 border border-gray-300 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">🔍 Raw API Response</h3>
              <button
                onClick={() => navigator.clipboard.writeText(rawJsonData)}
                className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded"
              >
                📋 Copy JSON
              </button>
            </div>
            <pre className="bg-white p-4 rounded border text-sm overflow-auto max-h-96 text-gray-800">
              <code>{rawJsonData}</code>
            </pre>
          </div>
        )}

        {/* Summary */}
        {data && (
          <div className="mb-8 grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-blue-600">{data.totalTests}</div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-green-600">{data.passedTests}</div>
              <div className="text-sm text-gray-600">Passed</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-2xl font-bold text-red-600">{data.failedTests}</div>
              <div className="text-sm text-gray-600">Failed</div>
            </div>
          </div>
        )}

        {/* Architecture Phases */}
        {architecturePhases.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🏗️ Architecture Phases
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {architecturePhases.map(([phaseKey, phase]) => (
                <div
                  key={phaseKey}
                  onClick={() => setSelectedPhase({ key: phaseKey, phase })}
                  className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-shadow ${getStatusColor(phase.status)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{phase.name}</h3>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{phaseKey}</span>
                  </div>
                  <p className="text-sm mb-3">{phase.description}</p>
                  <div className="text-sm">
                    <div>Status: <span className="font-medium">{phase.status}</span></div>
                    <div>Tests: {phase.passedTests}/{phase.totalTests}</div>
                    {phase.totalTests > 0 && (
                      <div className="text-xs text-gray-500 mt-1">Click to view test details</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* UX Phases */}
        {uxPhases.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              🎨 UX Development Phases
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {uxPhases.map(([phaseKey, phase]) => (
                <div
                  key={phaseKey}
                  onClick={() => setSelectedPhase({ key: phaseKey, phase })}
                  className={`p-4 rounded-lg border-2 cursor-pointer hover:shadow-lg transition-shadow ${getStatusColor(phase.status)}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{phase.name}</h3>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">{phaseKey}</span>
                  </div>
                  <p className="text-sm mb-3">{phase.description}</p>
                  <div className="text-sm">
                    <div>Status: <span className="font-medium">{phase.status}</span></div>
                    <div>Tests: {phase.passedTests}/{phase.totalTests}</div>
                    {phase.totalTests > 0 && (
                      <div className="text-xs text-gray-500 mt-1">Click to view test details</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data State */}
        {!data && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">
              Click "Run All Tests" to see test results
            </div>
          </div>
        )}

        {/* Test Details Modal */}
        {selectedPhase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedPhase.phase.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">{selectedPhase.phase.description}</span>
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{selectedPhase.key}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPhase(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Phase Summary */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{selectedPhase.phase.totalTests}</div>
                      <div className="text-sm text-gray-600">Total Tests</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{selectedPhase.phase.passedTests}</div>
                      <div className="text-sm text-gray-600">Passed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{selectedPhase.phase.failedTests}</div>
                      <div className="text-sm text-gray-600">Failed</div>
                    </div>
                    <div>
                      <div className={`text-2xl font-bold ${selectedPhase.phase.status === 'complete' ? 'text-green-600' :
                        selectedPhase.phase.status === 'in-progress' ? 'text-yellow-600' :
                          selectedPhase.phase.status === 'failed' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                        {selectedPhase.phase.status}
                      </div>
                      <div className="text-sm text-gray-600">Status</div>
                    </div>
                  </div>
                </div>

                {/* Individual Tests */}
                {selectedPhase.phase.tests && selectedPhase.phase.tests.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Individual Tests</h3>
                    <div className="space-y-3">
                      {selectedPhase.phase.tests.map((test, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-l-4 ${test.status === 'passed'
                            ? 'bg-green-50 border-green-500'
                            : 'bg-red-50 border-red-500'
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${test.status === 'passed' ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                  {test.status === 'passed' ? '✅' : '❌'} {test.status.toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {test.duration}ms
                                </span>
                              </div>
                              <h4 className="font-medium text-gray-900 mt-1">{test.name}</h4>
                              {test.failureMessage && (
                                <div className="mt-2 p-3 bg-red-100 rounded text-sm text-red-800">
                                  <strong>Error:</strong>
                                  <pre className="mt-1 whitespace-pre-wrap">{test.failureMessage}</pre>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No test details available for this phase.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
