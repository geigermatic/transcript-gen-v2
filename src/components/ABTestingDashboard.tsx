import React from 'react';
import { ABSummaryEngine } from '../lib/abSummaryEngine';
import { useAppStore } from '../store';

export const ABTestingDashboard: React.FC = () => {
  const { abSummaryPairs } = useAppStore();
  
  let stats: any;
  let recentTests: any[] = [];
  
  try {
    stats = ABSummaryEngine.getABTestingStats();
    recentTests = (abSummaryPairs || [])
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  } catch (error) {
    console.error('Error in ABTestingDashboard:', error);
    stats = {
      totalTests: 0,
      completedTests: 0,
      variantAWins: 0,
      variantBWins: 0,
      completionRate: 0
    };
    recentTests = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">A/B Testing Dashboard</h2>
        <div className="text-2xl">🧪</div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-panel p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats?.totalTests || 0}</div>
          <div className="text-gray-600 text-sm">Total Tests</div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats?.completedTests || 0}</div>
          <div className="text-gray-600 text-sm">Completed</div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{stats?.variantAWins || 0}</div>
          <div className="text-gray-600 text-sm">Variant A Wins</div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats?.variantBWins || 0}</div>
          <div className="text-gray-600 text-sm">Variant B Wins</div>
        </div>
        <div className="glass-panel p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats?.completionRate || 0}%</div>
          <div className="text-gray-600 text-sm">Completion Rate</div>
        </div>
      </div>

      {/* Win Rate Analysis */}
      {(stats?.completedTests || 0) > 0 && (
        <div className="glass-panel p-4">
          <h4 className="text-gray-900 font-medium mb-3">Win Rate Analysis</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Professional & Structured (A)</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{ 
                      width: `${(stats?.completedTests || 0) > 0 ? ((stats?.variantAWins || 0) / (stats?.completedTests || 1)) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-purple-600 text-sm font-medium w-12">
                  {(stats?.completedTests || 0) > 0 ? Math.round(((stats?.variantAWins || 0) / (stats?.completedTests || 1)) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Conversational & Engaging (B)</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-600 h-2 rounded-full"
                    style={{ 
                      width: `${(stats?.completedTests || 0) > 0 ? ((stats?.variantBWins || 0) / (stats?.completedTests || 1)) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-orange-600 text-sm font-medium w-12">
                  {(stats?.completedTests || 0) > 0 ? Math.round(((stats?.variantBWins || 0) / (stats?.completedTests || 1)) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Tests */}
      <div className="glass-panel p-4">
        <h4 className="text-gray-900 font-medium mb-3">Recent A/B Tests</h4>
        {recentTests.length === 0 ? (
          <div className="text-center text-gray-600 py-4">
            <div className="text-4xl mb-2">🔬</div>
            <p>No A/B tests yet. Generate your first A/B summary to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTests.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 truncate">
                    {test?.documentTitle || 'Unknown Document'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {test?.createdAt ? new Date(test.createdAt).toLocaleDateString() : 'Unknown Date'} at{' '}
                    {test?.createdAt ? new Date(test.createdAt).toLocaleTimeString() : 'Unknown Time'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="text-gray-600">A:</span>
                    <span className="text-purple-600 ml-1">
                      {test?.variantDetails?.variantA?.name || 'Professional'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-600">B:</span>
                    <span className="text-orange-600 ml-1">
                      {test?.variantDetails?.variantB?.name || 'Conversational'}
                    </span>
                  </div>
                  <div className="text-sm">
                    {test?.userFeedback ? (
                      <span className={`font-medium ${
                        test.userFeedback.winner === 'A' ? 'text-purple-600' : 'text-orange-600'
                      }`}>
                        ✓ {test.userFeedback.winner}
                      </span>
                    ) : (
                      <span className="text-gray-500">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Insights */}
      {(stats?.completedTests || 0) > 0 && (
        <div className="glass-panel p-4">
          <h4 className="text-gray-900 font-medium mb-3">User Feedback Insights</h4>
          <div className="space-y-2">
            {(abSummaryPairs || [])
              .filter(test => test?.userFeedback?.reason)
              .slice(0, 3)
              .map((test) => (
                <div key={test?.id || Math.random()} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-gray-900 font-medium">
                      {test?.documentTitle || 'Unknown Document'}
                    </span>
                    <span className={`text-sm font-medium ${
                      test?.userFeedback?.winner === 'A' ? 'text-purple-600' : 'text-orange-600'
                    }`}>
                      Winner: {test?.userFeedback?.winner || 'Unknown'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm italic">
                    "{test?.userFeedback?.reason || 'No reason provided'}"
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="glass-panel p-4">
        <h4 className="text-gray-900 font-medium mb-3">How to Use A/B Testing</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Open any document in the Library and scroll to the A/B Summary Testing section</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Click "Generate A/B Summaries" to create two different summary variants</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>Compare the summaries side-by-side and select your preferred version</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>Optionally provide feedback on why you preferred that version</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">5.</span>
            <span>Your feedback helps improve the AI's understanding of your preferences</span>
          </div>
        </div>
      </div>
    </div>
  );
};
