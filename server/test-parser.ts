import fs from 'fs';
import path from 'path';

// Load test manifest
const manifestPath = path.join(process.cwd(), 'test-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

export interface TestResult {
  name: string;
  status: 'passed' | 'failed';
  duration: number;
  failureMessage?: string;
}

export interface PhaseResult {
  name: string;
  category: 'architecture' | 'ux';
  description: string;
  status: 'not-started' | 'in-progress' | 'complete' | 'failed';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  tests: TestResult[];
}

export interface DashboardData {
  timestamp: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  phases: Record<string, PhaseResult>;
}

/**
 * Determine phase from test file path
 */
function determinePhaseFromPath(filePath: string): string | null {
  const normalizedPath = filePath.toLowerCase();

  console.log(`🔍 Checking file: ${filePath}`);

  // UX Phase detection (check first for priority)
  if (normalizedPath.includes('ux-phase-1a')) return 'uxPhase1A';
  if (normalizedPath.includes('ux-phase-1b')) return 'uxPhase1B';
  if (normalizedPath.includes('ux-phase-1c')) return 'uxPhase1C';
  if (normalizedPath.includes('ux-phase-1d')) return 'uxPhase1D';
  if (normalizedPath.includes('ux-phase-1e')) return 'uxPhase1E';

  // Architecture phase detection
  if (normalizedPath.includes('vector-database.test.ts')) return 'phase1';
  if (normalizedPath.includes('vector-storage.test.ts')) return 'phase2';
  if (normalizedPath.includes('hnsw-index.test.ts')) return 'phase2';
  if (normalizedPath.includes('vector-search.test.ts')) return 'phase2';
  if (normalizedPath.includes('chat-engine-integration.test.ts')) return 'phase3';
  if (normalizedPath.includes('embedding-engine-integration.test.ts')) return 'phase3';
  if (normalizedPath.includes('enhanced-chat-engine-integration.test.ts')) return 'phase3';
  if (normalizedPath.includes('phase3-completion.test.ts')) return 'phase3';
  if (normalizedPath.includes('phase4-tdd-foundation.test.ts')) return 'phase4';
  if (normalizedPath.includes('phase5-performance-optimization.test.ts')) return 'phase5';
  if (normalizedPath.includes('phase5-production-integration.test.ts')) return 'phase5';
  if (normalizedPath.includes('phase6-advanced-features.test.ts')) return 'phase6';
  if (normalizedPath.includes('phase7-advanced-performance.test.ts')) return 'phase7';
  if (normalizedPath.includes('phase8-enterprise-production.test.ts')) return 'phase8';

  console.log(`⚠️  No phase found for: ${filePath}`);
  return null;
}

/**
 * Parse Vitest JSON results into dashboard format
 */
export function parseTestResults(vitestJson: any): DashboardData {
  console.log('📊 Parsing test results...');

  // Initialize phases from manifest
  const phases: Record<string, PhaseResult> = {};

  for (const [phaseKey, phaseInfo] of Object.entries(manifest.phases)) {
    phases[phaseKey] = {
      name: (phaseInfo as any).name,
      category: (phaseInfo as any).category,
      description: (phaseInfo as any).description,
      status: 'not-started',
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      tests: []
    };
  }

  console.log(`📋 Initialized ${Object.keys(phases).length} phases from manifest:`);
  for (const [key, phase] of Object.entries(phases)) {
    console.log(`   - ${key}: ${phase.name} (${phase.category})`);
  }

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Process test results
  if (vitestJson.testResults) {
    for (const testFile of vitestJson.testResults) {
      const phaseKey = determinePhaseFromPath(testFile.name);

      if (!phaseKey || !phases[phaseKey]) {
        console.log(`⚠️  Skipping unrecognized test file: ${testFile.name}`);
        continue;
      }

      const phase = phases[phaseKey];

      // Process individual tests
      if (testFile.assertionResults) {
        for (const test of testFile.assertionResults) {
          const testResult: TestResult = {
            name: test.title,
            status: test.status === 'passed' ? 'passed' : 'failed',
            duration: test.duration || 0,
            failureMessage: test.failureMessages?.[0]
          };

          phase.tests.push(testResult);
          phase.totalTests++;
          totalTests++;

          if (testResult.status === 'passed') {
            phase.passedTests++;
            passedTests++;
          } else {
            phase.failedTests++;
            failedTests++;
          }
        }
      }

      // Determine phase status
      if (phase.totalTests === 0) {
        phase.status = 'not-started';
      } else if (phase.passedTests === phase.totalTests) {
        phase.status = 'complete';
      } else if (phase.passedTests > 0) {
        phase.status = 'in-progress';
      } else {
        phase.status = 'failed';
      }

      console.log(`📊 ${phaseKey}: ${phase.passedTests}/${phase.totalTests} tests passed`);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalTests,
    passedTests,
    failedTests,
    phases
  };
}

/**
 * Get all test files from manifest
 */
export function getAllTestFiles(): string[] {
  return [...manifest.architecture, ...manifest.ux];
}
