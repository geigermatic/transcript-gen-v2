import path from 'path';
import fs from 'fs';

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

export interface ParsedTestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  phases: Record<string, PhaseData>;
  timestamp: string;
  lastTestRun: string | null;
}

/**
 * Extract test descriptions and business value from test file source code
 */
function extractTestDescriptions(filePath: string): { tests: TestCase[], suiteDescription?: string, businessValue?: string } {
  try {
    console.log(`🔍 Extracting test descriptions from: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Test file not found: ${filePath}`);
      return { tests: [] };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const tests: TestCase[] = [];
    let suiteDescription: string | undefined;
    let businessValue: string | undefined;

    // Extract main suite description from top-level comment block
    const suiteCommentMatch = content.match(/\/\*\*\s*\n\s*\*\s*TDD Test Suite for ([^*]+?)\s*\*\s*\n[\s\S]*?\*\s*([^*]+?)\s*\*\//);
    if (suiteCommentMatch) {
      suiteDescription = suiteCommentMatch[1].trim();
      businessValue = suiteCommentMatch[2].trim();
    }

    // Extract individual test cases with their descriptions
    // Look for it('test name', async () => { followed by comments
    const lines = content.split('\n');
    let currentCategory = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Track describe blocks for categorization
      const describeMatch = line.match(/describe\(['"`]([^'"`]+)['"`],/);
      if (describeMatch) {
        currentCategory = describeMatch[1].trim();
        continue;
      }

      // Look for test cases
      const testMatch = line.match(/it\(['"`]([^'"`]+)['"`],\s*async\s*\(\)\s*=>\s*\{/);
      if (testMatch) {
        const testName = testMatch[1].trim();
        let description = '';
        let businessValue = '';

        // Look for comments in the next few lines
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const commentLine = lines[j].trim();
          if (commentLine.startsWith('//')) {
            const comment = commentLine.replace(/^\/\/\s*/, '').trim();
            if (!description) {
              description = comment;
              businessValue = extractBusinessValueFromComment(comment);
            }
            break;
          }
          // Stop looking if we hit another test or describe
          if (commentLine.includes('it(') || commentLine.includes('describe(') || commentLine.includes('expect(')) {
            break;
          }
        }

        // Generate business value from test name if no comment found
        if (!description) {
          description = `Validates: ${testName}`;
          businessValue = generateBusinessValueFromTestName(testName);
        }

        tests.push({
          name: testName,
          status: 'pending', // Will be updated with actual results
          description,
          businessValue,
          category: currentCategory
        });
      }
    }

    console.log(`✅ Extracted ${tests.length} tests from ${filePath}`);
    return { tests, suiteDescription, businessValue };
  } catch (error) {
    console.error(`❌ Error extracting test descriptions from ${filePath}:`, error);
    return { tests: [] };
  }
}

/**
 * Extract business value from test comments
 */
function extractBusinessValueFromComment(comment: string): string {
  // Remove common prefixes and clean up the comment
  const cleaned = comment
    .replace(/^(RED PHASE:|GREEN PHASE:|REFACTOR PHASE:)/i, '')
    .replace(/^(This will fail|This test)/i, '')
    .replace(/^[-\s]+/, '')
    .trim();

  return cleaned || 'Validates core functionality';
}

/**
 * Generate business value from test name when no comment is available
 */
function generateBusinessValueFromTestName(testName: string): string {
  // Convert test name to business value
  if (testName.includes('initialize')) {
    return 'Ensures system can start up correctly and be ready for use';
  }
  if (testName.includes('performance') || testName.includes('speed') || testName.includes('fast')) {
    return 'Validates system meets performance requirements for user experience';
  }
  if (testName.includes('error') || testName.includes('handle') || testName.includes('gracefully')) {
    return 'Ensures system handles edge cases and errors without crashing';
  }
  if (testName.includes('offline') || testName.includes('network')) {
    return 'Validates system works without internet connectivity';
  }
  if (testName.includes('vector') || testName.includes('embedding')) {
    return 'Proves vector operations work correctly for AI functionality';
  }
  if (testName.includes('search') || testName.includes('query')) {
    return 'Ensures users can find relevant information quickly';
  }
  if (testName.includes('storage') || testName.includes('save') || testName.includes('persist')) {
    return 'Validates data is stored reliably and can be retrieved';
  }
  if (testName.includes('close') || testName.includes('cleanup') || testName.includes('resource')) {
    return 'Ensures system properly manages memory and resources';
  }

  // Default business value
  return 'Validates core system functionality works as expected';
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
      console.log(`🔍 DEBUG: Generated phaseKey '${phaseKey}' for ${filePath}`);
      console.log(`🔍 DEBUG: Available phases: ${Object.keys(phases).join(', ')}`);
      console.log(`🔍 DEBUG: Phase exists? ${!!phases[phaseKey]}`);

      if (phases[phaseKey]) {
        // Extract real test counts from Jest results
        const totalTests = testFile.assertionResults?.length || 0;
        const passedTests = testFile.assertionResults?.filter((test: any) => test.status === 'passed').length || 0;
        const failedTests = totalTests - passedTests;

        // Accumulate real test data
        phases[phaseKey].totalTests += totalTests;
        phases[phaseKey].passedTests += passedTests;
        phases[phaseKey].failedTests += failedTests;

        // Extract test descriptions from source file
        console.log(`🔍 About to extract test descriptions from: ${filePath}`);
        const { tests: extractedTests, suiteDescription, businessValue } = extractTestDescriptions(filePath);
        console.log(`📋 Found ${extractedTests.length} extracted tests for ${filePath}`);

        // Merge Jest results with extracted descriptions
        const testsWithDescriptions: TestCase[] = [];

        if (testFile.assertionResults && Array.isArray(testFile.assertionResults)) {
          console.log(`🧪 Processing ${testFile.assertionResults.length} Jest test results for ${filePath}`);
          testFile.assertionResults.forEach((jestTest: any) => {
            const extractedTest = extractedTests.find(t => t.name === jestTest.title);
            testsWithDescriptions.push({
              name: jestTest.title,
              status: jestTest.status,
              duration: jestTest.duration,
              description: extractedTest?.description || 'Test case validation',
              businessValue: extractedTest?.businessValue || 'Ensures system reliability',
              category: extractedTest?.category
            });
          });
        } else {
          console.warn(`⚠️ No assertionResults found for ${filePath}`);
        }

        // Add real suite info with enhanced details
        if (totalTests > 0) {
          phases[phaseKey].suites.push({
            name: path.basename(filePath, '.test.ts').replace(/\./g, ' '),
            file: filePath,
            totalTests,
            passedTests,
            failedTests,
            status: failedTests === 0 ? 'passed' : 'failed',
            tests: testsWithDescriptions,
            description: suiteDescription,
            businessValue: businessValue
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
