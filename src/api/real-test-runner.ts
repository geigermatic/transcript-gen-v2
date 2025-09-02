// API endpoint for running real tests from the browser
// This allows the dashboard to get actual test results

import { runActualTests, runPhaseTests, getAllPhaseTestStatus } from '../lib/realTimeTestRunner';

export async function POST(request: Request) {
  try {
    const { action, testPattern, phase } = await request.json();
    
    console.log(`🧪 API: Running tests - action: ${action}, pattern: ${testPattern}, phase: ${phase}`);
    
    let result;
    
    switch (action) {
      case 'run-all':
        result = await runActualTests();
        break;
        
      case 'run-pattern':
        if (!testPattern) {
          throw new Error('testPattern is required for run-pattern action');
        }
        result = await runActualTests(testPattern);
        break;
        
      case 'run-phase':
        if (!phase) {
          throw new Error('phase is required for run-phase action');
        }
        result = await runPhaseTests(phase);
        break;
        
      case 'get-all-phases':
        result = await getAllPhaseTestStatus();
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log(`✅ API: Test execution completed for ${action}`);
    
    return new Response(JSON.stringify({
      success: true,
      result,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ API: Test execution failed:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET endpoint for simple test status checks
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'run-all';
    const testPattern = url.searchParams.get('pattern');
    const phase = url.searchParams.get('phase');
    
    console.log(`🧪 API GET: Running tests - action: ${action}`);
    
    let result;
    
    switch (action) {
      case 'run-all':
        result = await runActualTests();
        break;
        
      case 'run-pattern':
        if (!testPattern) {
          throw new Error('pattern parameter is required for run-pattern action');
        }
        result = await runActualTests(testPattern);
        break;
        
      case 'run-phase':
        if (!phase) {
          throw new Error('phase parameter is required for run-phase action');
        }
        result = await runPhaseTests(parseInt(phase));
        break;
        
      case 'get-all-phases':
        result = await getAllPhaseTestStatus();
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    
    console.log(`✅ API GET: Test execution completed for ${action}`);
    
    return new Response(JSON.stringify({
      success: true,
      result,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ API GET: Test execution failed:', error.message);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
