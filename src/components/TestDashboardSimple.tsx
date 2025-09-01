import React, { useState } from 'react';

export const TestDashboardSimple: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Starting simple test run...');
      
      // Try to import the test runner
      const { runVectorDatabaseTests } = await import('../lib/testRunner');
      console.log('Test runner imported successfully');
      
      // Run the tests
      const results = await runVectorDatabaseTests();
      console.log('Test results:', results);
      
      setError(null);
    } catch (err) {
      console.error('Error in test run:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Simple Test Dashboard</h1>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-medium mb-2">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}
        
        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Running Tests...' : 'Run Tests'}
          </button>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <p className="text-gray-600">
            This is a simplified test dashboard to isolate any issues.
            Check the browser console for detailed logs.
          </p>
        </div>
      </div>
    </div>
  );
};
