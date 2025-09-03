import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  duration?: number;
  description?: string;
  businessValue?: string;
  category?: string;
}

interface TestSuite {
  name: string;
  file: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  status: 'passed' | 'failed' | 'pending';
  tests: TestCase[];
  description?: string;
  businessValue?: string;
}

interface PhaseData {
  name: string;
  status: 'complete' | 'in-progress' | 'not-started';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  suites: TestSuite[];
}

interface ApiTestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  phases: Record<string, PhaseData>;
  timestamp: string;
  lastTestRun: string | null;
}

const TestApiDashboard: React.FC = () => {
  const [testResults, setTestResults] = useState<ApiTestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedPhase, setSelectedPhase] = useState<PhaseData | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/test-status');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📊 API Dashboard: Received test data:', data);

      setTestResults(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('❌ API Dashboard: Failed to fetch test results:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch test results');
    } finally {
      setLoading(false);
    }
  };

  const forceRefresh = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3001/api/test-status/fresh');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🔄 API Dashboard: Force refreshed test data:', data);

      setTestResults(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('❌ API Dashboard: Failed to force refresh:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh test results');
    } finally {
      setLoading(false);
    }
  };

  const handlePhaseClick = (phase: PhaseData) => {
    setSelectedPhase(phase);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPhase(null);
  };

  useEffect(() => {
    fetchTestResults();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchTestResults, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">✅ Complete</span>;
      case 'in-progress':
        return <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">🔄 In Progress</span>;
      case 'not-started':
        return <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">⏳ Not Started</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">❓ Unknown</span>;
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'not-started':
        return 'bg-gray-300';
      default:
        return 'bg-gray-300';
    }
  };

  if (loading && !testResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading test results from API...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">API Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTestResults}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (!testResults) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Test Data</h2>
          <p className="text-gray-600">No test results available from API</p>
        </div>
      </div>
    );
  }

  const progressPercentage = testResults.totalTests > 0
    ? (testResults.passedTests / testResults.totalTests) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">TDD Test Dashboard</h1>
              <p className="text-gray-600 mt-1">Real-time test results for Vector Database Implementation</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={forceRefresh}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Refreshing...' : '🔄 Force Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{testResults.totalTests}</div>
            <div className="text-gray-600">Total Tests</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-green-600">{testResults.passedTests}</div>
            <div className="text-gray-600">Passed Tests</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-red-600">{testResults.failedTests}</div>
            <div className="text-gray-600">Failed Tests</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-blue-600">{Math.round(progressPercentage)}%</div>
            <div className="text-gray-600">Success Rate</div>
          </div>
        </div>

        {/* API Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">API Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">Last Updated:</span>
              <span className="ml-2 font-medium">{lastRefresh.toLocaleTimeString()}</span>
            </div>
            <div>
              <span className="text-gray-600">Data Timestamp:</span>
              <span className="ml-2 font-medium">
                {new Date(testResults.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* Development Phases */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Development Phases</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {Object.entries(testResults.phases).map(([phaseKey, phase]) => {
              const phaseProgress = phase.totalTests > 0
                ? (phase.passedTests / phase.totalTests) * 100
                : 0;

              return (
                <div
                  key={phaseKey}
                  className="bg-white border border-gray-200 rounded-lg p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                  onClick={() => handlePhaseClick(phase)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{phase.name}</h3>
                    {getStatusBadge(phase.status)}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tests:</span>
                      <span className="font-medium">{phase.totalTests}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Passed:</span>
                      <span className="font-medium text-green-600">{phase.passedTests}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Failed:</span>
                      <span className="font-medium text-red-600">{phase.failedTests}</span>
                    </div>

                    <div className="mt-3 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getProgressColor(phase.status)}`}
                        style={{ width: `${phaseProgress}%` }}
                      />
                    </div>

                    <div className="text-xs text-gray-500 mt-2">
                      {phase.suites.length} test suite{phase.suites.length !== 1 ? 's' : ''} • {Math.round(phaseProgress)}% complete
                    </div>

                    <div className="text-xs text-blue-600 mt-3 font-medium">
                      👆 Click to view test details
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Raw API Data (for debugging) */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Raw API Response</h2>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96 text-gray-800">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      </div>

      {/* Test Details Modal */}
      {showModal && selectedPhase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedPhase.name}</h2>
                  <p className="text-gray-600 mt-1">
                    {selectedPhase.totalTests} tests • {selectedPhase.passedTests} passed • {selectedPhase.failedTests} failed
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {selectedPhase.suites.map((suite, suiteIndex) => (
                <div key={suiteIndex} className="mb-8 last:mb-0">
                  {/* Suite Header */}
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{suite.name}</h3>
                    {suite.description && (
                      <p className="text-gray-600 mb-2">{suite.description}</p>
                    )}
                    {suite.businessValue && (
                      <p className="text-blue-600 text-sm font-medium mb-3">
                        💼 Business Value: {suite.businessValue}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-gray-600">
                        📁 {suite.file.split('/').pop()}
                      </span>
                      <span className="text-green-600">
                        ✅ {suite.passedTests} passed
                      </span>
                      {suite.failedTests > 0 && (
                        <span className="text-red-600">
                          ❌ {suite.failedTests} failed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Test Cases */}
                  <div className="space-y-3">
                    {(suite.tests || []).length > 0 ? (
                      (suite.tests || []).map((test, testIndex) => (
                        <div
                          key={testIndex}
                          className={`p-4 rounded-lg border-l-4 ${test.status === 'passed'
                            ? 'bg-green-50 border-green-400'
                            : test.status === 'failed'
                              ? 'bg-red-50 border-red-400'
                              : 'bg-gray-50 border-gray-400'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900 mb-1">
                                {test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏳'} {test.name}
                              </h4>
                              {test.description && (
                                <p className="text-gray-600 text-sm mb-2">{test.description}</p>
                              )}
                              {test.businessValue && (
                                <p className="text-blue-600 text-sm">
                                  🎯 <strong>Proves:</strong> {test.businessValue}
                                </p>
                              )}
                            </div>
                            {test.duration && (
                              <span className="text-xs text-gray-500 ml-4">
                                {test.duration}ms
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-600">
                        <p>📋 No detailed test information available for this suite.</p>
                        <p className="text-sm mt-1">Test results are available but descriptions are being extracted.</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Total: {selectedPhase.totalTests} tests across {selectedPhase.suites.length} test suites
                </div>
                <button
                  onClick={closeModal}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestApiDashboard;
