import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  duration?: number;
  error?: string;
  assertionResults?: Array<{
    title: string;
    status: 'passed' | 'failed' | 'pending';
    failureMessages?: string[];
  }>;
}

interface TestSuite {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  tests: TestResult[];
  duration?: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

interface TestRunSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  pendingTests: number;
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  duration: number;
  coverage?: {
    lines: number;
    functions: number;
    branches: number;
    statements: number;
  };
}

export const TestDashboard: React.FC = () => {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [summary, setSummary] = useState<TestRunSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [selectedSuite, setSelectedSuite] = useState<string | null>(null);

  // Simulate test results (in real implementation, this would connect to Vitest)
  const mockTestData = (): TestSuite[] => [
    {
      name: 'VectorDatabase - US-001: SQLite Vector Database Setup',
      status: 'failed',
      duration: 150,
      tests: [
        {
          name: 'should initialize SQLite with vector extensions',
          status: 'failed',
          duration: 45,
          error: "Cannot find module '../VectorDatabase'"
        },
        {
          name: 'should work offline without external dependencies',
          status: 'failed',
          duration: 32,
          error: "Cannot find module '../VectorDatabase'"
        },
        {
          name: 'should initialize in under 1 second',
          status: 'failed',
          duration: 28,
          error: "Cannot find module '../VectorDatabase'"
        }
      ]
    },
    {
      name: 'VectorDatabase - US-002: Basic Vector Storage',
      status: 'failed',
      duration: 200,
      tests: [
        {
          name: 'should store embeddings and retrieve them identically',
          status: 'failed',
          duration: 67,
          error: "Cannot find module '../VectorDatabase'"
        },
        {
          name: 'should handle single embedding insertion',
          status: 'failed',
          duration: 43,
          error: "Cannot find module '../VectorDatabase'"
        },
        {
          name: 'should persist embeddings across database restarts',
          status: 'failed',
          duration: 55,
          error: "Cannot find module '../VectorDatabase'"
        }
      ]
    }
  ];

  const runTests = async () => {
    setIsRunning(true);
    
    // Simulate test run
    setTimeout(() => {
      const suites = mockTestData();
      setTestSuites(suites);
      
      const totalTests = suites.reduce((acc, suite) => acc + suite.tests.length, 0);
      const failedTests = suites.reduce((acc, suite) => 
        acc + suite.tests.filter(test => test.status === 'failed').length, 0);
      
      setSummary({
        totalTests,
        passedTests: 0,
        failedTests,
        pendingTests: 0,
        totalSuites: suites.length,
        passedSuites: 0,
        failedSuites: suites.length,
        duration: 350,
        coverage: {
          lines: 0,
          functions: 0,
          branches: 0,
          statements: 0
        }
      });
      
      setIsRunning(false);
    }, 2000);
  };

  useEffect(() => {
    // Initial test run
    runTests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'running':
        return 'bg-blue-50 border-blue-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">TDD Test Dashboard</h1>
        <p className="text-gray-600">Real-time test results for 1K Document Architecture</p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={runTests}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Tests
            </>
          )}
        </button>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoRun}
            onChange={(e) => setAutoRun(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-700">Auto-run on file changes</span>
        </label>
      </div>

      {/* Summary */}
      {summary && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{summary.totalTests}</div>
            <div className="text-sm text-gray-600">Total Tests</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-red-600">{summary.failedTests}</div>
            <div className="text-sm text-gray-600">Failed Tests</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{summary.duration}ms</div>
            <div className="text-sm text-gray-600">Duration</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-2xl font-bold text-gray-600">{summary.coverage?.lines || 0}%</div>
            <div className="text-sm text-gray-600">Coverage</div>
          </div>
        </div>
      )}

      {/* TDD Phase Indicator */}
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <XCircle className="w-5 h-5 text-red-500" />
          <span className="font-semibold text-red-800">RED Phase - Tests Failing (Expected!)</span>
        </div>
        <p className="text-red-700 text-sm">
          All tests are failing because we haven't implemented the VectorDatabase class yet. 
          This is the correct first step in TDD - write tests first, see them fail, then implement.
        </p>
      </div>

      {/* Test Suites */}
      <div className="space-y-4">
        {testSuites.map((suite, index) => (
          <div key={index} className={`border rounded-lg ${getStatusColor(suite.status)}`}>
            <div 
              className="p-4 cursor-pointer"
              onClick={() => setSelectedSuite(selectedSuite === suite.name ? null : suite.name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(suite.status)}
                  <span className="font-medium text-gray-900">{suite.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>{suite.tests.length} tests</span>
                  <span>{suite.duration}ms</span>
                </div>
              </div>
            </div>

            {selectedSuite === suite.name && (
              <div className="border-t border-gray-200 bg-white">
                {suite.tests.map((test, testIndex) => (
                  <div key={testIndex} className="p-4 border-b border-gray-100 last:border-b-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(test.status)}
                      <span className="text-gray-900">{test.name}</span>
                      <span className="text-sm text-gray-500">{test.duration}ms</span>
                    </div>
                    {test.error && (
                      <div className="ml-7 p-3 bg-red-50 border border-red-200 rounded text-sm">
                        <code className="text-red-800">{test.error}</code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Next Steps */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Next Steps (Green Phase)</h3>
        <ol className="list-decimal list-inside text-blue-700 text-sm space-y-1">
          <li>Create the VectorDatabase class in <code>src/vector-db/VectorDatabase.ts</code></li>
          <li>Implement the basic interface to make tests pass</li>
          <li>Add SQLite with vector extensions support</li>
          <li>Watch tests turn green one by one!</li>
        </ol>
      </div>
    </div>
  );
};
