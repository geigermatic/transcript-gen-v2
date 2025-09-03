/**
 * Simple API client for test status - NO HARDCODED VALUES
 * Replaces all the complex browserTestRunner.ts and trulyDynamicTestExtractor.ts
 */

export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  duration?: number;
  description?: string;
  businessValue?: string;
  category?: string;
}

export interface TestSuite {
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

export interface PhaseData {
  name: string;
  status: 'not-started' | 'in-progress' | 'complete';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  suites: TestSuite[];
}

export interface TestRunResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  phases: Record<string, PhaseData>;
  timestamp: string;
  lastTestRun: string | null;
  error?: string;
}

/**
 * Fetch real test status from API server
 * This is the ONLY source of test data - no hardcoded values anywhere
 */
export async function getTestStatus(): Promise<TestRunResult> {
  try {
    console.log('📡 Fetching real test status from API...');

    const response = await fetch('/api/test-status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    console.log('✅ Received test data from API:', {
      totalTests: data.totalTests,
      passedTests: data.passedTests,
      failedTests: data.failedTests,
      phases: Object.keys(data.phases || {}),
      timestamp: data.timestamp
    });

    return data;

  } catch (error: any) {
    console.error('❌ Failed to fetch test status from API:', error);

    // Return error state - no fallback data, let user know API is down
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      phases: {},
      timestamp: new Date().toISOString(),
      lastTestRun: null,
      error: `API Error: ${error.message}`
    };
  }
}

/**
 * Check if API server is healthy
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch('/api/health');
    return response.ok;
  } catch (error) {
    console.warn('⚠️ API health check failed:', error);
    return false;
  }
}



