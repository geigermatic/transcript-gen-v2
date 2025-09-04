import React, { useState } from 'react';
import { EmbeddingEngine, type ChunkingOptions } from '../lib/embeddingEngine';
import { SemanticChunker, type SemanticChunk } from '../lib/semanticChunker';

interface ChunkResult {
  strategy: string;
  chunks: any[];
  stats: any;
  processingTime: number;
}

export const SemanticChunkingDemo: React.FC = () => {
  const [text, setText] = useState(`# Introduction to Machine Learning

Machine learning is a comprehensive field that encompasses various algorithms and techniques. These algorithms enable computers to learn from data without explicit programming. The field has revolutionized many industries and continues to grow rapidly.

## Types of Machine Learning

There are three main types of machine learning: supervised, unsupervised, and reinforcement learning.

### Supervised Learning
Supervised learning uses labeled data to train models. The algorithm learns from input-output pairs and can then make predictions on new, unseen data.

### Unsupervised Learning
Unsupervised learning finds patterns in unlabeled data. It discovers hidden structures without being told what to look for.

### Reinforcement Learning
Reinforcement learning learns through interaction with an environment, receiving rewards or penalties for actions.

## Applications

Machine learning is used in many fields including:
- Healthcare: Medical diagnosis and drug discovery
- Finance: Fraud detection and algorithmic trading
- Technology: Recommendation systems and natural language processing
- Transportation: Autonomous vehicles and route optimization

## Code Example

\`\`\`python
def train_model(data, labels):
    model = MachineLearningModel()
    model.fit(data, labels)
    return model

# Usage
trained_model = train_model(training_data, training_labels)
predictions = trained_model.predict(test_data)
\`\`\`

## Conclusion

Machine learning continues to evolve and find new applications across industries. Understanding its fundamentals is crucial for modern technology development.`);

  const [results, setResults] = useState<ChunkResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const testChunkingStrategies = async () => {
    setIsProcessing(true);
    setResults([]);

    try {
      const strategies: Array<{ name: string; options: ChunkingOptions }> = [
        {
          name: 'Basic TextSplitter',
          options: { strategy: 'basic' }
        },
        {
          name: 'Semantic Chunking',
          options: {
            strategy: 'semantic',
            contentType: 'markdown',
            maxChunkSize: 300,
            preserveStructure: true
          }
        },
        {
          name: 'Adaptive Chunking',
          options: {
            strategy: 'adaptive',
            contentType: 'markdown',
            maxChunkSize: 250,
            overlap: 50,
            preserveStructure: true
          }
        }
      ];

      const testResults: ChunkResult[] = [];

      for (const { name, options } of strategies) {
        const startTime = Date.now();

        try {
          // Use the enhanced EmbeddingEngine chunking
          const chunks = await (EmbeddingEngine as any).chunkText(text, 'demo-doc', options);
          const stats = (EmbeddingEngine as any).getChunkingStats(chunks, options.strategy || 'basic');
          const processingTime = Date.now() - startTime;

          testResults.push({
            strategy: name,
            chunks,
            stats,
            processingTime
          });
        } catch (error) {
          console.error(`Error with ${name}:`, error);
          testResults.push({
            strategy: `${name} (Error)`,
            chunks: [],
            stats: { error: error instanceof Error ? error.message : 'Unknown error' },
            processingTime: Date.now() - startTime
          });
        }
      }

      setResults(testResults);
    } catch (error) {
      console.error('Error testing chunking strategies:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getChunkTypeColor = (chunk: any) => {
    if (chunk.semanticType) {
      switch (chunk.semanticType) {
        case 'heading': return 'bg-blue-900 border-blue-600 text-blue-100';
        case 'paragraph': return 'bg-gray-800 border-gray-600 text-gray-100';
        case 'list': return 'bg-green-900 border-green-600 text-green-100';
        case 'section': return 'bg-purple-900 border-purple-600 text-purple-100';
        default: return 'bg-gray-800 border-gray-600 text-gray-100';
      }
    }
    return 'bg-gray-800 border-gray-600 text-gray-100';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Semantic Chunking Demo</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Test Text (try editing to see how different strategies handle it):
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full h-64 p-3 border border-gray-600 rounded-md font-mono text-sm bg-gray-900 text-gray-100"
          placeholder="Enter text to test chunking strategies..."
        />
      </div>

      <button
        onClick={testChunkingStrategies}
        disabled={isProcessing}
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Test Chunking Strategies'}
      </button>

      {results.length > 0 && (
        <div className="space-y-8">
          {results.map((result, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{result.strategy}</h2>
                <div className="text-sm text-gray-600">
                  {result.processingTime}ms
                </div>
              </div>

              {result.stats.error ? (
                <div className="text-red-100 p-3 bg-red-900 border border-red-600 rounded">
                  Error: {result.stats.error}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div className="bg-gray-800 border border-gray-600 text-gray-100 p-2 rounded">
                      <div className="font-medium">Total Chunks</div>
                      <div className="text-lg">{result.stats.totalChunks}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-600 text-gray-100 p-2 rounded">
                      <div className="font-medium">Avg Length</div>
                      <div className="text-lg">{result.stats.averageChunkLength}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-600 text-gray-100 p-2 rounded">
                      <div className="font-medium">Min Length</div>
                      <div className="text-lg">{result.stats.minChunkLength}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-600 text-gray-100 p-2 rounded">
                      <div className="font-medium">Max Length</div>
                      <div className="text-lg">{result.stats.maxChunkLength}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium">Chunks:</h3>
                    {result.chunks.map((chunk, chunkIndex) => (
                      <div
                        key={chunkIndex}
                        className={`p-3 border rounded-md ${getChunkTypeColor(chunk)}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-xs text-gray-600">
                            Chunk {chunkIndex + 1}
                            {chunk.semanticType && ` • Type: ${chunk.semanticType}`}
                            {chunk.qualityScore && ` • Quality: ${(chunk.qualityScore.overall * 100).toFixed(0)}%`}
                          </div>
                          <div className="text-xs text-gray-500">
                            {chunk.text.length} chars
                          </div>
                        </div>
                        <div className="text-sm whitespace-pre-wrap font-mono bg-gray-900 text-gray-100 p-2 rounded border border-gray-600">
                          {chunk.text.length > 200
                            ? chunk.text.substring(0, 200) + '...'
                            : chunk.text
                          }
                        </div>
                        {chunk.keywords && chunk.keywords.length > 0 && (
                          <div className="mt-2 text-xs">
                            <span className="text-gray-600">Keywords: </span>
                            {chunk.keywords.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
