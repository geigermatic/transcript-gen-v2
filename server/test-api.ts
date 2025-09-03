import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import chokidar from 'chokidar';
import { parseJestToPhases, createEmptyResults } from './jest-parser.js';

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

// Enable CORS for Vite dev server
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Cache for test results - updated when files change
let cachedTestResults: any = null;
let lastTestRun: Date | null = null;
let isRunningTests = false;



/**
 * Run Jest tests and get JSON output
 */
async function runJestTests(): Promise<any> {
  if (isRunningTests) {
    console.log('⏳ Tests already running, using cached results...');
    return cachedTestResults;
  }

  try {
    isRunningTests = true;
    console.log('🧪 Running Vitest tests with JSON output...');

    // Run specific test files to avoid hanging on all tests
    const testFiles = [
      // Phase 1: Vector Database Foundation
      'src/vector-db/__tests__/vector-database.test.ts',
      'src/vector-db/__tests__/vector-storage.test.ts',
      'src/vector-db/__tests__/hnsw-index.test.ts',
      'src/vector-db/__tests__/vector-search.test.ts',
      // Phase 3: Vector Database Integration
      'src/lib/__tests__/chat-engine-integration.test.ts',
      'src/lib/__tests__/embedding-engine-integration.test.ts',
      'src/lib/__tests__/enhanced-chat-engine-integration.test.ts',
      'src/lib/__tests__/phase3-completion.test.ts',
      // Phase 4-6: TDD Tests (should fail until implemented)
      'src/lib/__tests__/phase5-performance-optimization.test.ts',
      'src/lib/__tests__/phase6-production-integration.test.ts',
      'src/lib/__tests__/phase7-advanced-features.test.ts'
    ];

    // Run tests in batches to avoid hanging
    // Note: Vitest returns non-zero exit code when tests fail, but we still want the JSON output
    try {
      const { stdout, stderr } = await execAsync(`npx vitest run ${testFiles.join(' ')} --reporter=json`, {
        cwd: process.cwd(),
        timeout: 60000 // 60 second timeout
      });

      const jestResults = JSON.parse(stdout);
      lastTestRun = new Date();

      console.log(`✅ Jest completed: ${jestResults.numTotalTests} total tests, ${jestResults.numPassedTests} passed`);

      const parsedResults = parseJestToPhases(jestResults, lastTestRun);
      cachedTestResults = parsedResults;

      return parsedResults;

    } catch (execError: any) {
      // Vitest returns non-zero exit code when tests fail, but stdout still contains JSON results
      if (execError.stdout) {
        try {
          const jestResults = JSON.parse(execError.stdout);
          lastTestRun = new Date();

          console.log(`✅ Jest completed with failures: ${jestResults.numTotalTests} total tests, ${jestResults.numPassedTests} passed, ${jestResults.numFailedTests} failed`);

          const parsedResults = parseJestToPhases(jestResults, lastTestRun);
          cachedTestResults = parsedResults;

          return parsedResults;
        } catch (parseError) {
          console.error('❌ Failed to parse Jest results from stdout:', parseError);
        }
      }

      console.error('❌ Jest execution failed:', execError.message);
      throw execError;
    }

  } catch (error: any) {
    console.error('❌ Test execution failed:', error.message);

    // Return empty results if Jest fails completely
    return createEmptyResults(error.message);
  } finally {
    isRunningTests = false;
  }
}

// API Endpoints
app.get('/api/test-status', async (req, res) => {
  try {
    console.log('📡 API: Getting test status...');

    // If we have cached results and they're recent (< 30 seconds), use them
    if (cachedTestResults && lastTestRun && (Date.now() - lastTestRun.getTime()) < 30000) {
      console.log('📋 Using cached test results');
      return res.json(cachedTestResults);
    }

    // Otherwise run fresh tests
    const testResults = await runJestTests();
    res.json(testResults);

  } catch (error: any) {
    console.error('❌ API Error:', error);
    res.status(500).json({
      error: 'Failed to get test status',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/test-status/fresh', async (req, res) => {
  try {
    console.log('📡 API: Force refreshing test status...');

    // Clear cache and force fresh test run
    cachedTestResults = null;
    lastTestRun = null;

    const results = await runJestTests();
    res.json(results);
  } catch (error) {
    console.error('❌ API: Failed to get fresh test status:', error);
    res.status(500).json({
      error: 'Failed to run tests',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    lastTestRun: lastTestRun?.toISOString() || null
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test API Server running on http://localhost:${PORT}`);
  console.log(`📊 Test status endpoint: http://localhost:${PORT}/api/test-status`);

  // Run initial test scan
  runJestTests().then(() => {
    console.log('✅ Initial test scan completed');
  });
});

// File watching for auto-refresh
const watcher = chokidar.watch(['src/**/*.test.ts', 'src/**/*.test.js'], {
  ignored: /node_modules/,
  persistent: true
});

watcher.on('change', (filePath) => {
  console.log(`📝 Test file changed: ${filePath}`);
  console.log('🔄 Invalidating test cache...');
  cachedTestResults = null;
  lastTestRun = null;
});

console.log('👀 Watching test files for changes...');
