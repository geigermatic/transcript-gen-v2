import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import { parseTestResults, getAllTestFiles } from './test-parser.js';

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

// Enable CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));

app.use(express.json());

/**
 * Run all tests and return results
 * NO CACHING - Always fresh results
 */
app.get('/api/test-status', async (req, res) => {
  console.log('\n🧪 === RUNNING TESTS (NO CACHE) ===');

  try {
    // Get all test files from manifest
    const testFiles = getAllTestFiles();
    console.log(`📋 Running ${testFiles.length} test files:`);
    testFiles.forEach(file => console.log(`   - ${file}`));

    // Build vitest command
    const command = `npx vitest run ${testFiles.join(' ')} --reporter=json`;
    console.log(`🔧 Command: ${command}`);

    // Execute tests
    console.log('⏳ Executing tests...');
    const startTime = Date.now();

    let vitestResults;
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 120000 // 2 minute timeout
      });

      if (stderr) {
        console.log('⚠️  Stderr output:', stderr);
      }

      vitestResults = JSON.parse(stdout);

    } catch (execError: any) {
      // Vitest returns non-zero exit code when tests fail, but we still want the JSON
      if (execError.stdout) {
        console.log('📊 Tests completed with failures, parsing results...');
        vitestResults = JSON.parse(execError.stdout);
      } else {
        throw new Error(`Test execution failed: ${execError.message}`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Tests completed in ${duration}ms`);
    console.log(`📊 Raw results: ${vitestResults.numTotalTests} total, ${vitestResults.numPassedTests} passed, ${vitestResults.numFailedTests} failed`);

    // Parse results
    const parsedResults = parseTestResults(vitestResults);

    console.log('📤 Sending results to client');
    console.log(`📊 Final: ${parsedResults.totalTests} total, ${parsedResults.passedTests} passed, ${parsedResults.failedTests} failed`);
    console.log(`📊 Phases: ${Object.keys(parsedResults.phases).length} phases found`);

    res.json(parsedResults);

  } catch (error: any) {
    console.error('❌ ERROR:', error.message);
    console.error('❌ Stack:', error.stack);

    res.status(500).json({
      error: 'Test execution failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  console.log('💚 Health check requested');
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Simple API server is running'
  });
});

/**
 * Get test manifest
 */
app.get('/api/manifest', (req, res) => {
  try {
    const testFiles = getAllTestFiles();
    res.json({
      testFiles,
      totalFiles: testFiles.length
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to load manifest',
      message: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 === TDD TEST API SERVER STARTED ===');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🔗 Test endpoint: http://localhost:${PORT}/api/test-status`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 Manifest: http://localhost:${PORT}/api/manifest`);
  console.log('🎯 NO CACHING - Every request runs fresh tests');
  console.log('=======================================\n');
});
