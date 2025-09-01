import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { testPath, reporter = 'json' } = await request.json();
    
    // Execute real Vitest tests
    const command = `npm test ${testPath} -- --reporter=${reporter} --run`;
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 60000 // 60 second timeout
    });
    
    if (stderr && !stderr.includes('PASS') && !stderr.includes('✓')) {
      console.error('Test execution stderr:', stderr);
    }
    
    // Parse the JSON output from Vitest
    let testResults;
    try {
      // Vitest JSON reporter outputs to stdout
      testResults = JSON.parse(stdout);
    } catch (parseError) {
      // If JSON parsing fails, try to extract results from text output
      console.warn('Failed to parse JSON output, attempting text parsing');
      testResults = parseTextOutput(stdout);
    }
    
    return new Response(JSON.stringify(testResults), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Test execution failed:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Test execution failed',
      message: error.message,
      testResults: null
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Fallback parser for text output if JSON parsing fails
function parseTextOutput(output: string) {
  const lines = output.split('\n');
  const suites = [];
  let currentSuite = null;
  
  for (const line of lines) {
    // Look for test suite headers
    if (line.includes('✓') || line.includes('✗') || line.includes('PASS') || line.includes('FAIL')) {
      // Extract test information from text output
      // This is a simplified parser - real implementation would be more robust
      if (line.includes('PASS') || line.includes('FAIL')) {
        const suiteName = line.match(/([^/]+\.test\.ts)/)?.[1] || 'Unknown Suite';
        currentSuite = {
          name: suiteName,
          status: line.includes('PASS') ? 'passed' : 'failed',
          tests: [],
          duration: 0
        };
        suites.push(currentSuite);
      }
    }
  }
  
  return {
    testResults: suites,
    numTotalTests: 0,
    numPassedTests: 0,
    numFailedTests: 0,
    success: true
  };
}
