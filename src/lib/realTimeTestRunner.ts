// Real-Time Test Runner - Integrates with actual Vitest execution
// Provides real pass/fail status for TDD dashboard

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface RealTestResult {
  name: string;
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  duration: number;
  error?: string;
  file: string;
}

export interface RealTestSuite {
  name: string;
  file: string;
  status: 'passed' | 'failed' | 'pending';
  tests: RealTestResult[];
  duration: number;
}

export interface RealTestRunResult {
  suites: RealTestSuite[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  timestamp: string;
}

/**
 * Run actual tests and get real results
 */
export async function runActualTests(testPattern?: string): Promise<RealTestRunResult> {
  console.log('🧪 Running actual Vitest tests...');
  
  try {
    const pattern = testPattern || 'src/**/*.test.ts';
    const startTime = Date.now();
    
    // Run Vitest with JSON reporter
    const command = `npm test -- --reporter=json --run "${pattern}"`;
    console.log('Executing:', command);
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 120000, // 2 minutes
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('✅ Tests completed, parsing results...');
    
    // Parse Vitest JSON output
    const result = parseVitestJsonOutput(stdout, duration);
    
    console.log('📊 Test results:', {
      totalTests: result.totalTests,
      passedTests: result.passedTests,
      failedTests: result.failedTests,
      skippedTests: result.skippedTests,
      duration: result.duration
    });
    
    return result;
    
  } catch (error: any) {
    console.error('❌ Test execution failed:', error.message);
    
    // Try to parse partial results from error output
    if (error.stdout) {
      try {
        const partialResult = parseVitestJsonOutput(error.stdout, 0);
        console.log('⚠️ Parsed partial results from failed execution');
        return partialResult;
      } catch (parseError) {
        console.error('Failed to parse partial results:', parseError);
      }
    }
    
    // Return empty results if everything fails
    return {
      suites: [],
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      duration: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Parse Vitest JSON output into our format
 */
function parseVitestJsonOutput(stdout: string, duration: number): RealTestRunResult {
  const lines = stdout.split('\n');
  let testData = null;
  
  // Find the JSON result line from Vitest
  for (const line of lines) {
    if (line.trim()) {
      try {
        const parsed = JSON.parse(line);
        // Look for Vitest JSON structure
        if (parsed.testResults || parsed.numTotalTests !== undefined || parsed.success !== undefined) {
          testData = parsed;
          break;
        }
      } catch {
        // Not JSON, continue
      }
    }
  }
  
  if (!testData) {
    console.warn('⚠️ Could not find JSON output, attempting text parsing');
    return parseVitestTextOutput(stdout, duration);
  }
  
  return convertVitestJsonToOurFormat(testData, duration);
}

/**
 * Convert Vitest JSON format to our format
 */
function convertVitestJsonToOurFormat(vitestData: any, duration: number): RealTestRunResult {
  const suites: RealTestSuite[] = [];
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  
  // Handle different Vitest JSON formats
  if (vitestData.testResults) {
    // Format 1: testResults array
    vitestData.testResults.forEach((fileResult: any) => {
      const suite = convertFileResultToSuite(fileResult);
      suites.push(suite);
      
      totalTests += suite.tests.length;
      passedTests += suite.tests.filter(t => t.status === 'passed').length;
      failedTests += suite.tests.filter(t => t.status === 'failed').length;
      skippedTests += suite.tests.filter(t => t.status === 'skipped' || t.status === 'pending').length;
    });
  } else if (vitestData.files) {
    // Format 2: files array
    vitestData.files.forEach((file: any) => {
      const suite = convertFileToSuite(file);
      suites.push(suite);
      
      totalTests += suite.tests.length;
      passedTests += suite.tests.filter(t => t.status === 'passed').length;
      failedTests += suite.tests.filter(t => t.status === 'failed').length;
      skippedTests += suite.tests.filter(t => t.status === 'skipped' || t.status === 'pending').length;
    });
  } else {
    // Format 3: Summary format
    totalTests = vitestData.numTotalTests || 0;
    passedTests = vitestData.numPassedTests || 0;
    failedTests = vitestData.numFailedTests || 0;
    skippedTests = vitestData.numPendingTests || 0;
  }
  
  return {
    suites,
    totalTests,
    passedTests,
    failedTests,
    skippedTests,
    duration,
    timestamp: new Date().toISOString()
  };
}

/**
 * Convert Vitest file result to our suite format
 */
function convertFileResultToSuite(fileResult: any): RealTestSuite {
  const tests: RealTestResult[] = [];
  
  if (fileResult.assertionResults) {
    fileResult.assertionResults.forEach((assertion: any) => {
      tests.push({
        name: assertion.title || assertion.fullName || 'Unknown test',
        status: mapVitestStatus(assertion.status),
        duration: assertion.duration || 0,
        error: assertion.failureMessages?.[0],
        file: fileResult.name || 'unknown'
      });
    });
  }
  
  return {
    name: extractSuiteName(fileResult.name || 'Unknown Suite'),
    file: fileResult.name || 'unknown',
    status: fileResult.status === 'passed' ? 'passed' : 'failed',
    tests,
    duration: fileResult.duration || 0
  };
}

/**
 * Convert Vitest file to our suite format (alternative format)
 */
function convertFileToSuite(file: any): RealTestSuite {
  const tests: RealTestResult[] = [];
  
  // Recursively extract tests from Vitest file structure
  function extractTests(node: any, parentName = '') {
    if (node.type === 'test') {
      tests.push({
        name: node.name || 'Unknown test',
        status: mapVitestStatus(node.result?.state),
        duration: node.result?.duration || 0,
        error: node.result?.errors?.[0]?.message,
        file: file.filepath || 'unknown'
      });
    } else if (node.tasks) {
      node.tasks.forEach((task: any) => extractTests(task, node.name));
    }
  }
  
  extractTests(file);
  
  return {
    name: extractSuiteName(file.filepath || file.name || 'Unknown Suite'),
    file: file.filepath || file.name || 'unknown',
    status: file.result?.state === 'pass' ? 'passed' : 'failed',
    tests,
    duration: file.result?.duration || 0
  };
}

/**
 * Map Vitest status to our status
 */
function mapVitestStatus(vitestStatus: string): RealTestResult['status'] {
  switch (vitestStatus) {
    case 'passed':
    case 'pass':
      return 'passed';
    case 'failed':
    case 'fail':
      return 'failed';
    case 'skipped':
    case 'skip':
      return 'skipped';
    case 'pending':
    case 'todo':
      return 'pending';
    default:
      return 'failed';
  }
}

/**
 * Extract suite name from file path
 */
function extractSuiteName(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  return fileName.replace(/\.test\.(ts|js)$/, '').replace(/[-_]/g, ' ');
}

/**
 * Fallback: Parse text output when JSON parsing fails
 */
function parseVitestTextOutput(stdout: string, duration: number): RealTestRunResult {
  console.log('📝 Parsing text output as fallback...');
  
  const lines = stdout.split('\n');
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  
  // Look for summary lines
  for (const line of lines) {
    const passMatch = line.match(/(\d+) passed/);
    const failMatch = line.match(/(\d+) failed/);
    const totalMatch = line.match(/Tests\s+(\d+) passed/);
    
    if (passMatch) passedTests = parseInt(passMatch[1]);
    if (failMatch) failedTests = parseInt(failMatch[1]);
    if (totalMatch) totalTests = parseInt(totalMatch[1]);
  }
  
  if (totalTests === 0) {
    totalTests = passedTests + failedTests;
  }
  
  return {
    suites: [],
    totalTests,
    passedTests,
    failedTests,
    skippedTests: 0,
    duration,
    timestamp: new Date().toISOString()
  };
}

/**
 * Run tests for a specific phase
 */
export async function runPhaseTests(phase: number): Promise<RealTestRunResult> {
  const phasePatterns: Record<number, string[]> = {
    1: ['src/vector-db/__tests__/vector-database.test.ts', 'src/vector-db/__tests__/basic-vector-storage.test.ts'],
    2: ['src/vector-db/__tests__/hnsw-index.test.ts', 'src/vector-db/__tests__/vector-search.test.ts'],
    3: ['src/lib/__tests__/embedding-engine-integration.test.ts', 'src/lib/__tests__/chat-engine-integration.test.ts', 'src/lib/__tests__/enhanced-chat-engine-integration.test.ts', 'src/lib/__tests__/phase3-completion.test.ts'],
    4: ['src/lib/__tests__/performance-optimization.test.ts'],
    5: ['src/lib/__tests__/production-integration.test.ts'],
    6: ['src/lib/__tests__/advanced-features.test.ts']
  };
  
  const patterns = phasePatterns[phase];
  if (!patterns) {
    throw new Error(`Unknown phase: ${phase}`);
  }
  
  // Run tests for all files in the phase
  const pattern = patterns.join(' ');
  return runActualTests(pattern);
}

/**
 * Get current test status for all phases
 */
export async function getAllPhaseTestStatus(): Promise<Record<number, RealTestRunResult>> {
  const results: Record<number, RealTestRunResult> = {};
  
  // Run tests for each phase
  for (let phase = 1; phase <= 6; phase++) {
    try {
      console.log(`🧪 Running Phase ${phase} tests...`);
      results[phase] = await runPhaseTests(phase);
    } catch (error) {
      console.error(`❌ Failed to run Phase ${phase} tests:`, error);
      results[phase] = {
        suites: [],
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        duration: 0,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  return results;
}
