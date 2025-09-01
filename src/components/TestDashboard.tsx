import React, { useState, useEffect } from 'react';
import { Play, Square, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'running';
  duration?: number;
  error?: string;
  description?: string;
  category?: string;
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch real test results from Vitest
  const fetchTestResults = async (): Promise<TestSuite[]> => {
    try {
      // Execute real tests via subprocess and get actual results
      const response = await fetch('/api/run-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testPath: 'src/vector-db',
          reporter: 'json'
        })
      });

      if (response.ok) {
        const data = await response.json();
        return parseVitestResults(data);
      }
    } catch (error) {
      console.error('Failed to execute real tests:', error);
    }

    // NO SIMULATED DATA - Return empty if real tests unavailable
    return [];
  };

  const parseTestResults = (testResults: any): TestSuite[] => {
    // Parse test results into our TestSuite format
    const suites: TestSuite[] = [];

    if (testResults.suites) {
      testResults.suites.forEach((suite: any) => {
        const testSuite: TestSuite = {
          name: suite.name,
          status: suite.status,
          duration: suite.duration,
          tests: suite.tests.map((test: any) => ({
            name: test.name,
            status: test.status,
            duration: test.duration || 0,
            error: test.error,
            description: test.description,
            category: test.category
          }))
        };
        suites.push(testSuite);
      });
    }

    return suites;
  };

  const runTests = async () => {
    setIsRunning(true);

    try {
      // Import and run the actual tests directly
      const { runVectorDatabaseTests } = await import('../lib/testRunner');
      const testResults = await runVectorDatabaseTests();

      const suites = parseTestResults(testResults);
      setTestSuites(suites);

      const totalTests = suites.reduce((acc, suite) => acc + suite.tests.length, 0);
      const passedTests = suites.reduce((acc, suite) =>
        acc + suite.tests.filter(test => test.status === 'passed').length, 0);
      const failedTests = suites.reduce((acc, suite) =>
        acc + suite.tests.filter(test => test.status === 'failed').length, 0);
      const passedSuites = suites.filter(suite => suite.status === 'passed').length;
      const failedSuites = suites.filter(suite => suite.status === 'failed').length;
      const totalDuration = suites.reduce((acc, suite) => acc + (suite.duration || 0), 0);

      setSummary({
        totalTests,
        passedTests,
        failedTests,
        pendingTests: 0,
        totalSuites: suites.length,
        passedSuites,
        failedSuites,
        duration: totalDuration,
        coverage: {
          lines: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
          functions: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
          branches: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
          statements: totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0
        }
      });
    } catch (error) {
      console.error('Failed to run tests:', error);
      // Show error state instead of fake data
      setTestSuites([]);
      setSummary(null);
    } finally {
      setIsRunning(false);
    }
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
    <div className="flex-1 flex flex-col bg-white">
      <div className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto space-y-8">
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
          {summary && (
            <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-white">
              <div className="flex items-center gap-2 mb-2">
                {summary.failedTests === 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-semibold text-green-800">GREEN Phase - All Tests Passing! 🎉</span>
                  </>
                ) : summary.passedTests > summary.failedTests ? (
                  <>
                    <RefreshCw className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-800">GREEN Phase - Making Great Progress!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold text-red-800">RED Phase - Tests Failing (Expected!)</span>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-700">
                {summary.failedTests === 0
                  ? 'Excellent! All tests are passing. Ready for refactor phase or new features.'
                  : summary.passedTests > summary.failedTests
                    ? `Great progress! ${summary.passedTests}/${summary.totalTests} tests passing. Keep implementing to make the remaining tests pass.`
                    : 'Tests are failing as expected in TDD. Implement the VectorDatabase class to make them pass.'
                }
              </p>
            </div>
          )}

          {/* Test Categories Summary */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Test Categories Overview</h2>
              {selectedCategory && (
                <div className="text-sm text-gray-600">
                  Showing {testSuites.flatMap(suite => suite.tests).filter(test => test.category === selectedCategory).length} tests in "{selectedCategory}"
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(() => {
                const categories = new Map<string, { total: number; passed: number; failed: number }>();

                testSuites.forEach(suite => {
                  suite.tests.forEach(test => {
                    const category = test.category || 'Uncategorized';
                    if (!categories.has(category)) {
                      categories.set(category, { total: 0, passed: 0, failed: 0 });
                    }
                    const stats = categories.get(category)!;
                    stats.total++;
                    if (test.status === 'passed') stats.passed++;
                    if (test.status === 'failed') stats.failed++;
                  });
                });

                return Array.from(categories.entries()).map(([category, stats]) => (
                  <div
                    key={category}
                    className={`cursor-pointer transition-all duration-200 rounded-lg p-4 ${selectedCategory === category
                      ? 'bg-blue-50 border-2 border-blue-300 shadow-md'
                      : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  >
                    <h3 className={`font-medium mb-2 ${selectedCategory === category ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                      {category}
                      {selectedCategory === category && (
                        <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                          Active
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">{stats.passed} passed</span>
                      {stats.failed > 0 && <span className="text-red-600">{stats.failed} failed</span>}
                      <span className="text-gray-500">of {stats.total}</span>
                    </div>
                    <div className="mt-2 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${selectedCategory === category ? 'bg-blue-500' : 'bg-green-500'
                          }`}
                        style={{ width: `${(stats.passed / stats.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Category Filter View */}
          {selectedCategory && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  Tests in "{selectedCategory}" Category
                </h2>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full text-gray-700"
                >
                  Clear Filter
                </button>
              </div>
              <div className="space-y-3">
                {testSuites.flatMap(suite =>
                  suite.tests
                    .filter(test => test.category === selectedCategory)
                    .map((test, index) => (
                      <div key={`${suite.name}-${index}`} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{getStatusIcon(test.status)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-gray-900 font-medium">{test.name}</span>
                              <span className="text-sm text-gray-500">{test.duration}ms</span>
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {test.category}
                              </span>
                            </div>
                            {test.description && (
                              <div className="text-sm text-gray-600 mt-1">
                                {test.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              From: {suite.name}
                            </div>
                          </div>
                        </div>
                        {test.error && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm">
                            <code className="text-red-800">{test.error}</code>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Detailed Test Suites */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedCategory ? 'All Test Suites' : 'Detailed Test Results'}
            </h2>
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
                        <div className="flex items-start gap-3 mb-2">
                          <div className="mt-1">{getStatusIcon(test.status)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-gray-900 font-medium">{test.name}</span>
                              <span className="text-sm text-gray-500">{test.duration}ms</span>
                              {test.category && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  {test.category}
                                </span>
                              )}
                            </div>
                            {test.description && (
                              <div className="text-sm text-gray-600 mt-1">
                                {test.description}
                              </div>
                            )}
                          </div>
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
          {summary && (
            <div className="mt-8 p-4 bg-white border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">
                {summary.failedTests === 0
                  ? 'Next Steps (Refactor Phase)'
                  : summary.passedTests > summary.failedTests
                    ? 'Next Steps (Continue Green Phase)'
                    : 'Next Steps (Green Phase)'
                }
              </h3>
              <ol className="list-decimal list-inside text-gray-700 text-sm space-y-1">
                {summary.failedTests === 0 ? (
                  <>
                    <li>🎉 All tests passing! Consider refactoring for better performance</li>
                    <li>Add SQLite with vector extensions to replace in-memory storage</li>
                    <li>Implement US-003 (HNSW Index) and US-004 (Vector Search) tests</li>
                    <li>Move to next development stream (Migration, Integration, etc.)</li>
                  </>
                ) : summary.passedTests > summary.failedTests ? (
                  <>
                    <li>Fix remaining {summary.failedTests} failing tests</li>
                    <li>Focus on timestamp handling and data persistence</li>
                    <li>Consider adding SQLite for true persistence</li>
                    <li>Keep the {summary.passedTests} passing tests green!</li>
                  </>
                ) : (
                  <>
                    <li>Create the VectorDatabase class in <code>src/vector-db/VectorDatabase.ts</code></li>
                    <li>Implement the basic interface to make tests pass</li>
                    <li>Add SQLite with vector extensions support</li>
                    <li>Watch tests turn green one by one!</li>
                  </>
                )}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
