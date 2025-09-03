import path from 'path';

export interface TestSuite {
  name: string;
  file: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  status: 'passed' | 'failed' | 'pending';
}

export interface PhaseData {
  name: string;
  status: 'not-started' | 'in-progress' | 'complete';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  suites: TestSuite[];
}

export interface ParsedTestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  phases: Record<string, PhaseData>;
  timestamp: string;
  lastTestRun: string | null;
}

/**
 * Parse Jest JSON output into our phase-based format
 * This function contains ZERO hardcoded values - all data comes from real Jest execution
 */
export function parseJestToPhases(jestResults: any, lastTestRun: Date | null = null): ParsedTestResults {
  console.log('📊 Parsing Jest results into phases...');

  // Initialize phases with zero values - will be populated from real test data
  const phases: Record<string, PhaseData> = {
    phase1: {
      name: 'Phase 1: Vector Database Foundation',
      status: 'not-started',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      suites: []
    },
    phase2: {
      name: 'Phase 2: Advanced Vector Features',
      status: 'not-started',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      suites: []
    },
    phase3: {
      name: 'Phase 3: Vector Database Integration',
      status: 'not-started',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      suites: []
    },
    phase4: {
      name: 'Phase 4: Performance Optimization',
      status: 'not-started',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      suites: []
    },
    phase5: {
      name: 'Phase 5: Production Integration',
      status: 'not-started',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      suites: []
    },
    phase6: {
      name: 'Phase 6: Advanced Features',
      status: 'not-started',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      suites: []
    }
  };

  // Process each test suite from Jest results - REAL DATA ONLY
  if (jestResults.testResults && Array.isArray(jestResults.testResults)) {
    jestResults.testResults.forEach((testFile: any) => {
      const filePath = testFile.name || '';
      const phase = determinePhaseFromPath(filePath);
      const phaseKey = `phase${phase}`;

      if (phases[phaseKey]) {
        // Extract real test counts from Jest results
        const totalTests = testFile.assertionResults?.length || 0;
        const passedTests = testFile.assertionResults?.filter((test: any) => test.status === 'passed').length || 0;
        const failedTests = totalTests - passedTests;

        // Accumulate real test data
        phases[phaseKey].totalTests += totalTests;
        phases[phaseKey].passedTests += passedTests;
        phases[phaseKey].failedTests += failedTests;

        // Add real suite info
        if (totalTests > 0) {
          phases[phaseKey].suites.push({
            name: path.basename(filePath, '.test.ts').replace(/\./g, ' '),
            file: filePath,
            totalTests,
            passedTests,
            failedTests,
            status: failedTests === 0 ? 'passed' : 'failed'
          });
        }

        console.log(`📋 Phase ${phase}: ${path.basename(filePath)} - ${passedTests}/${totalTests} tests passing`);
      }
    });
  }

  // Determine phase status based on real test results
  Object.values(phases).forEach(phase => {
    if (phase.totalTests === 0) {
      phase.status = 'not-started';
    } else if (phase.failedTests === 0 && phase.passedTests > 0) {
      phase.status = 'complete';
    } else {
      phase.status = 'in-progress';
    }
  });

  // Calculate totals from real data
  const totalTests = Object.values(phases).reduce((sum, phase) => sum + phase.totalTests, 0);
  const passedTests = Object.values(phases).reduce((sum, phase) => sum + phase.passedTests, 0);
  const failedTests = totalTests - passedTests;

  console.log(`✅ Parsed results: ${totalTests} total, ${passedTests} passed, ${failedTests} failed`);

  // Log phase completion status (including empty phases for TDD)
  Object.entries(phases).forEach(([key, phase]) => {
    if (phase.totalTests > 0) {
      console.log(`📊 ${key}: ${phase.status} (${phase.passedTests}/${phase.totalTests})`);
    } else {
      console.log(`📊 ${key}: ${phase.status} (0/0) - placeholder for future development`);
    }
  });

  return {
    totalTests,
    passedTests,
    failedTests,
    phases,
    timestamp: new Date().toISOString(),
    lastTestRun: lastTestRun?.toISOString() || null
  };
}

/**
 * Determine phase based on file path - DYNAMIC DETECTION
 * No hardcoded test counts, only path-based phase mapping
 */
export function determinePhaseFromPath(filePath: string): number {
  const normalizedPath = filePath.toLowerCase();
  console.log(`🔍 DEBUG: Determining phase for ${filePath}`);
  console.log(`🔍 DEBUG: Normalized path: ${normalizedPath}`);

  // Phase 2: Advanced Vector Features (vector search and HNSW index) - CHECK FIRST!
  console.log(`🔍 DEBUG: Checking Phase 2 conditions...`);
  console.log(`🔍 DEBUG: includes('vector-search'): ${normalizedPath.includes('vector-search')}`);
  console.log(`🔍 DEBUG: includes('hnsw-index'): ${normalizedPath.includes('hnsw-index')}`);
  if (normalizedPath.includes('vector-search') ||
    normalizedPath.includes('hnsw-index') ||
    normalizedPath.includes('advanced-vector') ||
    normalizedPath.includes('phase2')) {
    console.log(`🎯 DEBUG: ${filePath} matched Phase 2!`);
    return 2;
  }

  // Phase 1: Vector Database Foundation (basic vector database functionality)
  if (normalizedPath.includes('vector-database') ||
    normalizedPath.includes('vector-storage') ||
    normalizedPath.includes('sqlite-vector')) {
    console.log(`🎯 DEBUG: ${filePath} matched Phase 1!`);
    return 1;
  }



  // Phase 3: Vector Database Integration
  if (normalizedPath.includes('embedding-engine') ||
    normalizedPath.includes('chat-engine') ||
    normalizedPath.includes('enhanced-chat') ||
    normalizedPath.includes('phase3') ||
    normalizedPath.includes('integration')) {
    return 3;
  }

  // Phase 4: Performance Optimization
  if (normalizedPath.includes('phase5-performance-optimization') ||
    normalizedPath.includes('performance-optimization')) {
    return 4;
  }

  // Phase 5: Production Integration
  if (normalizedPath.includes('phase6-production-integration') ||
    normalizedPath.includes('production-integration')) {
    return 5;
  }

  // Phase 6: Advanced Features
  if (normalizedPath.includes('phase7-advanced-features') ||
    normalizedPath.includes('advanced-features')) {
    return 6;
  }

  // Default to phase 1 for unrecognized paths
  return 1;
}

/**
 * Create empty results structure for error cases
 */
export function createEmptyResults(errorMessage?: string): ParsedTestResults {
  return {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    phases: {},
    timestamp: new Date().toISOString(),
    lastTestRun: null,
    ...(errorMessage && { error: errorMessage })
  };
}
