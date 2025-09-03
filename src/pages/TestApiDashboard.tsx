import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface TestSuite {
  name: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
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
                <div key={phaseKey} className="bg-white border border-gray-200 rounded-lg p-6">
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
    </div>
  );
};

export default TestApiDashboard;
