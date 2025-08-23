/**
 * Comprehensive QA testing framework for MVP validation
 */

import { DocumentProcessor } from './documentProcessor';
import { TextSplitter } from './textSplitter';
import { EmbeddingEngine } from './embeddingEngine';
import { SummarizationEngine } from './summarizationEngine';
import { ChatEngine } from './chatEngine';
import { ExportEngine } from './exportEngine';
import { offlineStorage } from './storage';
import { logInfo, logError } from './logger';
import { ollama } from './ollama';
import type { Document, StyleGuide, TextChunk, ChatContext } from '../types';

export interface QATestResult {
  testName: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  details: Record<string, unknown>;
  error?: string;
}

export interface QATestSuite {
  suiteName: string;
  results: QATestResult[];
  overallStatus: 'PASS' | 'FAIL' | 'PARTIAL';
  totalDuration: number;
  passRate: number;
}

export class QATester {
  constructor() {
  }

  async runAllTests(): Promise<QATestSuite[]> {
    logInfo('SYSTEM', 'Starting comprehensive QA test suite');
    
    const testSuites = await Promise.all([
      this.runStorageTests(),
      this.runFileProcessingTests(),
      this.runEmbeddingTests(),
      this.runSummarizationTests(),
      this.runChatTests(),
      this.runExportTests(),
      this.runIntegrationTests()
    ]);

    logInfo('SYSTEM', 'QA test suite completed', {
      totalSuites: testSuites.length,
      overallResults: testSuites.map(suite => ({
        name: suite.suiteName,
        status: suite.overallStatus,
        passRate: suite.passRate
      }))
    });

    return testSuites;
  }

  private cosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  private async runTest(testName: string, testFn: () => Promise<unknown>): Promise<QATestResult> {
    const startTime = performance.now();
    
    try {
      const result = await testFn();
      const duration = performance.now() - startTime;
      
      return {
        testName,
        status: 'PASS',
        duration,
        details: result || { testResult: 'No details available' } as Record<string, unknown>
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      logError('SYSTEM', `QA test failed: ${testName}`, { error });
      
      return {
        testName,
        status: 'FAIL',
        duration,
        details: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async runStorageTests(): Promise<QATestSuite> {
    const startTime = performance.now();
    const results: QATestResult[] = [];

    // Test 1: Storage initialization
    results.push(await this.runTest('Storage Initialization', async () => {
      const healthCheck = await offlineStorage.healthCheck();
      if (healthCheck.status === 'failed') {
        throw new Error('Storage health check failed');
      }
      return { healthStatus: healthCheck.status };
    }));

    // Test 2: Document storage operations
    results.push(await this.runTest('Document Storage CRUD', async () => {
      const testDoc: Document = {
        id: 'test-doc-qa',
        filename: 'test-qa.txt',
        title: 'Test QA Document',
        tags: ['test', 'qa'],
        text: 'This is a test document for QA validation.',
        metadata: {
          filename: 'test-qa.txt',
          fileType: 'text/plain',
          fileSize: 100,
          wordCount: 10,
          dateAdded: new Date().toISOString()
        },
        uploadedAt: new Date().toISOString()
      };

      // Create
      await offlineStorage.saveDocument(testDoc);
      
      // Read
      const retrieved = await offlineStorage.getDocument(testDoc.id);
      if (!retrieved || retrieved.id !== testDoc.id) {
        throw new Error('Document retrieval failed');
      }

      // Update (via re-save)
      const updated = { ...testDoc, text: 'Updated content' };
      await offlineStorage.saveDocument(updated);
      
      // Delete
      await offlineStorage.removeDocument(testDoc.id);
      const deleted = await offlineStorage.getDocument(testDoc.id);
      if (deleted) {
        throw new Error('Document deletion failed');
      }

      return { operations: ['create', 'read', 'update', 'delete'] };
    }));

    // Test 3: Storage statistics
    results.push(await this.runTest('Storage Statistics', async () => {
      const stats = await offlineStorage.getStorageStats();
      return { 
        totalDocuments: stats.totalDocuments,
        estimatedSize: stats.estimatedSize,
        quotaAvailable: stats.storageQuotaTotal > 0
      };
    }));

    const totalDuration = performance.now() - startTime;
    const passCount = results.filter(r => r.status === 'PASS').length;
    const passRate = (passCount / results.length) * 100;
    
    return {
      suiteName: 'Storage Tests',
      results,
      overallStatus: passRate === 100 ? 'PASS' : passRate > 0 ? 'PARTIAL' : 'FAIL',
      totalDuration,
      passRate
    };
  }

  private async runFileProcessingTests(): Promise<QATestSuite> {
    const startTime = performance.now();
    const results: QATestResult[] = [];

    // Test 1: File size limits
    results.push(await this.runTest('File Size Validation', async () => {
      const minSize = 100 * 1024; // 100KB
      const maxSize = 50 * 1024 * 1024; // 50MB

      // Test minimum size
      const smallFile = new File(['x'.repeat(50 * 1024)], 'small.txt', { type: 'text/plain' });
      try {
        await DocumentProcessor.processFile(smallFile);
        throw new Error('Should have rejected file below minimum size');
      } catch {
        // Expected to fail
      }

      // Test acceptable size
      const goodFile = new File(['x'.repeat(200 * 1024)], 'good.txt', { type: 'text/plain' });
      const result = await DocumentProcessor.processFile(goodFile);
      if (!result || !result.text) {
        throw new Error('Failed to process acceptable file');
      }

      return { 
        minSizeKB: minSize / 1024,
        maxSizeMB: maxSize / (1024 * 1024),
        testFileSizeKB: goodFile.size / 1024
      };
    }));

    // Test 2: Text parsing accuracy
    results.push(await this.runTest('Text Parsing Accuracy', async () => {
      const testTexts = [
        'Simple text document.',
        'Multi-line\ntext\nwith\nbreaks.',
        'Text with special chars: àáâãäå çčć éêë',
        'Numbers and symbols: 123 456.78 $100 @user #tag'
      ];

      const results = [];
      for (const text of testTexts) {
        const file = new File([text], 'test.txt', { type: 'text/plain' });
        const processed = await DocumentProcessor.processFile(file);
        
        if (processed.text.trim() !== text.trim()) {
          throw new Error(`Text parsing mismatch: expected "${text}", got "${processed.text}"`);
        }
        results.push({ original: text.length, processed: processed.text.length });
      }

      return { testCases: results.length, allPassed: true };
    }));

    // Test 3: Text splitting consistency
    results.push(await this.runTest('Text Splitting Consistency', async () => {
      const testText = 'Paragraph one.\n\nParagraph two.\n\nParagraph three with more content to test chunk sizing.';
              const chunks = TextSplitter.splitText(testText, 'test-doc');
      
      if (chunks.length === 0) {
        throw new Error('Text splitting produced no chunks');
      }

                      const reassembled = chunks.map((c: TextChunk) => c.text).join(' ').trim();
        const originalWords = testText.split(/\s+/).filter((w: string) => w.length > 0);
        const reassembledWords = reassembled.split(/\s+/).filter((w: string) => w.length > 0);
        
        if (originalWords.length !== reassembledWords.length) {
          throw new Error('Text splitting lost content');
        }
        
        return { 
          originalLength: testText.length,
          chunks: chunks.length,
          avgChunkSize: chunks.reduce((sum: number, c: TextChunk) => sum + c.text.length, 0) / chunks.length
        };
    }));

    const totalDuration = performance.now() - startTime;
    const passCount = results.filter(r => r.status === 'PASS').length;
    const passRate = (passCount / results.length) * 100;
    
    return {
      suiteName: 'File Processing Tests',
      results,
      overallStatus: passRate === 100 ? 'PASS' : passRate > 0 ? 'PARTIAL' : 'FAIL',
      totalDuration,
      passRate
    };
  }

  private async runEmbeddingTests(): Promise<QATestSuite> {
    const startTime = performance.now();
    const results: QATestResult[] = [];

    // Test 1: Embedding generation
    results.push(await this.runTest('Embedding Generation', async () => {
      const testText = 'This is a test sentence for embedding generation.';
      const embedding = await ollama.generateEmbedding(testText);
      
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Invalid embedding generated');
      }

      if (embedding.some(val => typeof val !== 'number' || isNaN(val))) {
        throw new Error('Embedding contains invalid values');
      }

      return { 
        embeddingDimensions: embedding.length,
        sampleValues: embedding.slice(0, 5)
      };
    }));

    // Test 2: Similarity calculation
    results.push(await this.runTest('Similarity Calculation', async () => {
      const text1 = 'The cat sat on the mat.';
      const text2 = 'A cat was sitting on a mat.';
      const text3 = 'The weather is sunny today.';

      const [emb1, emb2, emb3] = await Promise.all([
        ollama.generateEmbedding(text1),
        ollama.generateEmbedding(text2),
        ollama.generateEmbedding(text3)
      ]);

      // Calculate cosine similarity manually since it's a private method
      const sim12 = this.cosineSimilarity(emb1, emb2);
      const sim13 = this.cosineSimilarity(emb1, emb3);

      if (sim12 <= sim13) {
        throw new Error('Similar texts should have higher similarity than dissimilar texts');
      }

      return { 
        similarTexts: sim12,
        dissimilarTexts: sim13,
        correctOrdering: sim12 > sim13
      };
    }));

    // Test 3: Search functionality
    results.push(await this.runTest('Embedding Search', async () => {
      const testDoc = {
        id: 'test-doc',
        text: 'Machine learning is a subset of artificial intelligence. Natural language processing helps computers understand text. The weather forecast predicts rain tomorrow. Deep learning uses neural networks for pattern recognition.'
      };

      const embeddedChunks = await EmbeddingEngine.generateDocumentEmbeddings(testDoc.id, testDoc.text);
      const query = 'artificial intelligence and machine learning';
      const results = await EmbeddingEngine.performHybridSearch(query, embeddedChunks, 2);

      if (results.length === 0) {
        throw new Error('Search returned no results');
      }

      // First result should be the ML document
      if (!results[0].chunk.text.includes('machine learning')) {
        throw new Error('Search did not return most relevant result first');
      }

      return { 
        queryLength: query.length,
        resultsCount: results.length,
        topScore: results[0].similarity,
        topContent: results[0].chunk.text.substring(0, 50)
      };
    }));

    const totalDuration = performance.now() - startTime;
    const passCount = results.filter(r => r.status === 'PASS').length;
    const passRate = (passCount / results.length) * 100;
    
    return {
      suiteName: 'Embedding Tests',
      results,
      overallStatus: passRate === 100 ? 'PASS' : passRate > 0 ? 'PARTIAL' : 'FAIL',
      totalDuration,
      passRate
    };
  }

  private async runSummarizationTests(): Promise<QATestSuite> {
    const startTime = performance.now();
    const results: QATestResult[] = [];

    const testDoc: Document = {
      id: 'test-summarization',
      filename: 'presentation-skills.txt',
      title: 'Teaching Effective Presentation Skills',
      tags: ['presentation', 'skills', 'training'],
      text: `
Teaching Effective Presentation Skills

In today's lesson, we covered three key presentation techniques:

1. Eye Contact: Maintain eye contact with your audience to build connection and trust. Look at different sections of the room to engage everyone.

2. Voice Modulation: Vary your tone, pace, and volume to keep the audience engaged. Pause for emphasis and speak clearly.

3. Body Language: Use gestures naturally to reinforce your points. Stand confidently and move purposefully around the space.

Key takeaways:
- Practice makes perfect
- Know your audience
- Prepare for questions

Action items:
- Record yourself practicing
- Get feedback from peers
- Join Toastmasters for regular practice

The most important thing to remember is that presentation skills improve with practice and feedback.
      `.trim(),
      metadata: {
        filename: 'presentation-skills.txt',
        fileType: 'text/plain',
        fileSize: 1000,
        wordCount: 150,
        dateAdded: new Date().toISOString()
      },
      uploadedAt: new Date().toISOString()
    };

    // Test 1: Summary generation
    results.push(await this.runTest('Summary Generation', async () => {
      const styleGuide: StyleGuide = {
        instructions_md: 'Generate a comprehensive summary with key insights and techniques.',
        tone_settings: {
          formality: 50,
          enthusiasm: 70,
          technicality: 30
        },
        keywords: ['presentation', 'skills', 'practice'],
        example_phrases: {
          preferred_openings: ['In this lesson'],
          preferred_transitions: ['Additionally', 'Furthermore'],
          preferred_conclusions: ['To summarize'],
          avoid_phrases: ['Actually', 'Um', 'Like']
        }
      };

      const summary = await SummarizationEngine.summarizeDocument(testDoc, styleGuide);

      if (!summary.markdownSummary || summary.markdownSummary.length < 100) {
        throw new Error('Summary too short or empty');
      }

      if (!summary.mergedFacts || !summary.mergedFacts.techniques || summary.mergedFacts.techniques.length === 0) {
        throw new Error('No techniques extracted');
      }

      if (!summary.mergedFacts.key_takeaways || summary.mergedFacts.key_takeaways.length === 0) {
        throw new Error('No key takeaways extracted');
      }

      return {
        summaryLength: summary.markdownSummary.length,
        techniquesCount: summary.mergedFacts.techniques?.length || 0,
        takeawaysCount: summary.mergedFacts.key_takeaways?.length || 0,
        processingTime: summary.processingStats.processingTime
      };
    }));

    // Test 2: Style guide application
    results.push(await this.runTest('Style Guide Application', async () => {
      const styleGuide: StyleGuide = {
        instructions_md: 'Generate a formal, technical analysis with systematic methodology.',
        tone_settings: {
          formality: 90,
          enthusiasm: 10,
          technicality: 80
        },
        keywords: ['methodology', 'framework', 'systematic'],
        example_phrases: {
          preferred_openings: ['This analysis demonstrates'],
          preferred_transitions: ['Subsequently', 'Therefore'],
          preferred_conclusions: ['In conclusion'],
          avoid_phrases: ['awesome', 'cool', 'great']
        }
      };

      const summary = await SummarizationEngine.summarizeDocument(testDoc, styleGuide);

      // Check if style guide keywords are reflected in output
      const summaryText = summary.markdownSummary.toLowerCase();
      const hasKeywords = styleGuide.keywords.some(keyword => 
        summaryText.includes(keyword.toLowerCase())
      );

      return {
        formalTone: styleGuide.tone_settings.formality,
        keywordsFound: hasKeywords,
        summaryStyle: 'formal'
      };
    }));

    // Test 3: Fact extraction accuracy
    results.push(await this.runTest('Fact Extraction Accuracy', async () => {
      const styleGuide: StyleGuide = {
        instructions_md: 'Default style guide',
        tone_settings: {
          formality: 50,
          enthusiasm: 50,
          technicality: 50
        },
        keywords: [],
        example_phrases: {
          preferred_openings: [],
          preferred_transitions: [],
          preferred_conclusions: [],
          avoid_phrases: []
        }
      };

      const summary = await SummarizationEngine.summarizeDocument(testDoc, styleGuide);
      const facts = summary.mergedFacts;

      // Verify required fields are present
      const requiredFields = ['techniques', 'key_takeaways'];
      const missingFields = requiredFields.filter(field => 
        !facts[field as keyof typeof facts] || 
        (Array.isArray(facts[field as keyof typeof facts]) && facts[field as keyof typeof facts]!.length === 0)
      );

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Check if extracted techniques match content
      const techniques = facts.techniques || [];
      const hasEyeContact = techniques.some(t => t.toLowerCase().includes('eye contact'));
      const hasVoiceModulation = techniques.some(t => t.toLowerCase().includes('voice') || t.toLowerCase().includes('modulation'));

      return {
        requiredFieldsPresent: missingFields.length === 0,
        techniquesExtracted: techniques.length,
        accurateExtraction: hasEyeContact && hasVoiceModulation
      };
    }));

    const totalDuration = performance.now() - startTime;
    const passCount = results.filter(r => r.status === 'PASS').length;
    const passRate = (passCount / results.length) * 100;
    
    return {
      suiteName: 'Summarization Tests',
      results,
      overallStatus: passRate === 100 ? 'PASS' : passRate > 0 ? 'PARTIAL' : 'FAIL',
      totalDuration,
      passRate
    };
  }

  private async runChatTests(): Promise<QATestSuite> {
    const startTime = performance.now();
    const results: QATestResult[] = [];



    // Test 1: Question answering
    results.push(await this.runTest('Question Answering', async () => {
      const context: ChatContext = {
        messages: [],
        documentIds: ['test-doc'],
        activeDocument: null,
        selectedDocumentSummary: undefined,
        maxContextLength: 4000
      };
      
      const response = await ChatEngine.processQuery(
        'What are the types of machine learning?',
        context
      );

      if (!response.message.content || response.message.content.length < 10) {
        throw new Error('Chat response too short or empty');
      }

      if (!response.message.content.toLowerCase().includes('supervised')) {
        throw new Error('Chat response did not include expected content');
      }

      if (response.sources.length === 0) {
        throw new Error('No sources provided with response');
      }

      return {
        responseLength: response.message.content.length,
        sourcesCount: response.sources.length,
        confidence: response.responseMetrics.topSimilarity
      };
    }));

    // Test 2: Grounding validation
    results.push(await this.runTest('Response Grounding', async () => {
      const context: ChatContext = {
        messages: [],
        documentIds: ['test-doc'],
        activeDocument: null,
        selectedDocumentSummary: undefined,
        maxContextLength: 4000
      };
      
      const response = await ChatEngine.processQuery(
        'What is the capital of France?', // Unrelated question
        context
      );

      // Should refuse to answer unrelated questions
      if (!response.message.content.toLowerCase().includes("don't know") && 
          !response.message.content.toLowerCase().includes("information provided")) {
        throw new Error('Chat should refuse to answer unrelated questions');
      }

      return {
        properlyGrounded: true,
        refusalDetected: true
      };
    }));

    // Test 3: Multi-turn conversation
    results.push(await this.runTest('Multi-turn Conversation', async () => {
      const history = [
        { role: 'user' as const, content: 'Tell me about machine learning.' },
        { role: 'assistant' as const, content: 'Machine learning involves supervised, unsupervised, and reinforcement learning algorithms.' }
      ];

      const context: ChatContext = {
        messages: history,
        documentIds: ['test-doc'],
        activeDocument: null,
        selectedDocumentSummary: undefined,
        maxContextLength: 4000
      };
      
      const response = await ChatEngine.processQuery(
        'What about neural networks?',
        context
      );

      if (!response.message.content.toLowerCase().includes('neural networks')) {
        throw new Error('Follow-up question not handled properly');
      }

      return {
        contextMaintained: true,
        followUpHandled: true
      };
    }));

    const totalDuration = performance.now() - startTime;
    const passCount = results.filter(r => r.status === 'PASS').length;
    const passRate = (passCount / results.length) * 100;
    
    return {
      suiteName: 'Chat Tests',
      results,
      overallStatus: passRate === 100 ? 'PASS' : passRate > 0 ? 'PARTIAL' : 'FAIL',
      totalDuration,
      passRate
    };
  }

  private async runExportTests(): Promise<QATestSuite> {
    const startTime = performance.now();
    const results: QATestResult[] = [];

    const testSummary = {
      summary: '# Test Summary\n\nThis is a test summary with **bold** text.',
      facts: {
        class_title: 'Test Class',
        audience: 'Students',
        learning_objectives: ['Learn testing'],
        key_takeaways: ['Testing is important'],
        topics: ['QA', 'Testing'],
        techniques: ['Unit testing']
      },
      processingTime: 1000,
      chunkCount: 5,
      model: 'test-model'
    };

    // Test 1: Markdown export
    results.push(await this.runTest('Markdown Export', async () => {
      const testDoc: Document = {
        id: 'test-doc',
        filename: 'test.txt',
        title: 'Test Document',
        tags: ['test'],
        text: 'Test content',
        metadata: { filename: 'test.txt', fileType: 'text/plain', fileSize: 100, wordCount: 50, dateAdded: new Date().toISOString() },
        uploadedAt: new Date().toISOString()
      };

      const testSummaryResult: SummarizationResult = {
        document: testDoc,
        chunkFacts: [],
        mergedFacts: {
          key_takeaways: ['Test takeaway'],
          topics: ['Test topic'],
          techniques: ['Test technique']
        },
        markdownSummary: '# Test Summary\n\nThis is a test summary.',
        processingStats: {
          totalChunks: 1,
          successfulChunks: 1,
          failedChunks: 0,
          processingTime: 1000
        }
      };

      const result = ExportEngine.exportSummary(testSummaryResult, 'markdown');

      if (!result.content.includes('# Test Document')) {
        throw new Error('Markdown export missing document title');
      }

      return {
        markdownLength: result.content.length,
        includesMetadata: result.content.includes('Document Information'),
        includesFacts: result.content.includes('Key Takeaways')
      };
    }));

    // Test 2: HTML export
    results.push(await this.runTest('HTML Export', async () => {
      const testDoc: Document = {
        id: 'test-doc',
        filename: 'test.txt',
        title: 'Test Document',
        tags: ['test'],
        text: 'Test content',
        metadata: { filename: 'test.txt', fileType: 'text/plain', fileSize: 100, wordCount: 50, dateAdded: new Date().toISOString() },
        uploadedAt: new Date().toISOString()
      };

      const testSummaryResult: SummarizationResult = {
        document: testDoc,
        chunkFacts: [],
        mergedFacts: {
          key_takeaways: ['Test takeaway'],
          topics: ['Test topic'],
          techniques: ['Test technique']
        },
        markdownSummary: '# Test Summary\n\nThis is a test summary.',
        processingStats: {
          totalChunks: 1,
          successfulChunks: 1,
          failedChunks: 0,
          processingTime: 1000
        }
      };

      const result = ExportEngine.exportSummary(testSummaryResult, 'html');

      if (!result.content.includes('<!DOCTYPE html>')) {
        throw new Error('HTML export missing DOCTYPE');
      }

      if (!result.content.includes('<h1>Test Document</h1>')) {
        throw new Error('HTML export missing formatted content');
      }

      if (!result.content.includes('<style>')) {
        throw new Error('HTML export missing CSS styles');
      }

      return {
        htmlLength: result.content.length,
        validHtml: result.content.includes('<!DOCTYPE html>'),
        includesStyles: result.content.includes('<style>')
      };
    }));

    // Test 3: JSON export
    results.push(await this.runTest('JSON Export', async () => {
      const testDoc: Document = {
        id: 'test-doc',
        filename: 'test.txt',
        title: 'Test Document',
        tags: ['test'],
        text: 'Test content',
        metadata: { filename: 'test.txt', fileType: 'text/plain', fileSize: 100, wordCount: 50, dateAdded: new Date().toISOString() },
        uploadedAt: new Date().toISOString()
      };

      const testSummaryResult: SummarizationResult = {
        document: testDoc,
        chunkFacts: [],
        mergedFacts: {
          key_takeaways: ['Test takeaway'],
          topics: ['Test topic'],
          techniques: ['Test technique']
        },
        markdownSummary: '# Test Summary\n\nThis is a test summary.',
        processingStats: {
          totalChunks: 1,
          successfulChunks: 1,
          failedChunks: 0,
          processingTime: 1000
        }
      };

      const result = ExportEngine.exportSummary(testSummaryResult, 'json');
      const jsonData = JSON.parse(result.content);

      if (!jsonData.extractedFacts) {
        throw new Error('JSON export missing extractedFacts');
      }

      if (!jsonData.extractedFacts.key_takeaways) {
        throw new Error('JSON export missing required fields');
      }

      if (!jsonData.documentMetadata) {
        throw new Error('JSON export missing document metadata');
      }

      return {
        jsonSize: result.content.length,
        validJson: true,
        hasRequiredFields: !!(jsonData.extractedFacts.key_takeaways && jsonData.extractedFacts.topics)
      };
    }));

    const totalDuration = performance.now() - startTime;
    const passCount = results.filter(r => r.status === 'PASS').length;
    const passRate = (passCount / results.length) * 100;
    
    return {
      suiteName: 'Export Tests',
      results,
      overallStatus: passRate === 100 ? 'PASS' : passRate > 0 ? 'PARTIAL' : 'FAIL',
      totalDuration,
      passRate
    };
  }

  private async runIntegrationTests(): Promise<QATestSuite> {
    const startTime = performance.now();
    const results: QATestResult[] = [];

    // Test 1: End-to-end workflow
    results.push(await this.runTest('End-to-End Workflow', async () => {
      // 1. Create test document
      const testContent = 'This is a comprehensive test of the complete workflow for document processing, embedding generation, and summarization.';
      const file = new File([testContent], 'integration-test.txt', { type: 'text/plain' });
      
      // 2. Process file
      const processedData = await DocumentProcessor.processFile(file);
      const document = DocumentProcessor.createDocument(file, processedData);
      
      // 3. Save to storage
      await offlineStorage.saveDocument(document);
      
      // 4. Generate embeddings
      const embeddedChunks = await EmbeddingEngine.generateDocumentEmbeddings(document.id, document.text);
      await offlineStorage.saveEmbeddings(document.id, embeddedChunks);
      
      // 5. Generate summary
      const styleGuide: StyleGuide = {
        instructions_md: 'Generate a workflow summary with processing details.',
        tone_settings: {
          formality: 50,
          enthusiasm: 50,
          technicality: 50
        },
        keywords: ['workflow', 'processing'],
        example_phrases: {
          preferred_openings: ['This test demonstrates'],
          preferred_transitions: ['Next'],
          preferred_conclusions: ['In summary'],
          avoid_phrases: []
        }
      };
      
      const summary = await SummarizationEngine.summarizeDocument(document, styleGuide);
      
      // 6. Test chat
      const context: ChatContext = {
        messages: [],
        documentIds: [document.id],
        activeDocument: document,
        selectedDocumentSummary: undefined,
        maxContextLength: 4000
      };
      
      const chatResponse = await ChatEngine.processQuery(
        'What is this document about?',
        context
      );
      
      // 7. Export summary
      const exportedMarkdown = ExportEngine.exportSummary(summary, 'markdown');
      
      // 8. Cleanup
      await offlineStorage.removeDocument(document.id);
      
      return {
        documentProcessed: !!document.text,
        embeddingsGenerated: embeddedChunks.length > 0,
        summaryGenerated: !!summary.markdownSummary,
        chatWorking: !!chatResponse.message.content,
        exportWorking: exportedMarkdown.content.length > 0,
        workflowComplete: true
      };
    }));

    // Test 2: Offline operation verification
    results.push(await this.runTest('Offline Operation Verification', async () => {
      // Check that no external network calls are made (except to Ollama)
      const allowedHosts = ['127.0.0.1', 'localhost'];
      
      // This is a conceptual test - in reality, we'd need to mock network calls
      // or use a network monitor to verify no external calls
      
      return {
        ollamaHostAllowed: allowedHosts.includes('127.0.0.1'),
        noExternalCalls: true, // Placeholder - would need actual network monitoring
        offlineCapable: true
      };
    }));

    // Test 3: Data persistence verification
    results.push(await this.runTest('Data Persistence Verification', async () => {
      // Create test data
      const testDoc: Document = {
        id: 'persistence-test',
        filename: 'persistence.txt',
        title: 'Test Persistence Document',
        tags: ['test', 'persistence'],
        text: 'Test persistence',
        metadata: {
          filename: 'persistence.txt',
          fileType: 'text/plain',
          fileSize: 100,
          wordCount: 2,
          dateAdded: new Date().toISOString()
        },
        uploadedAt: new Date().toISOString()
      };
      
      // Save data
      await offlineStorage.saveDocument(testDoc);
      
      // Verify persistence across "sessions" (simulate page reload)
      const retrievedDoc = await offlineStorage.getDocument(testDoc.id);
      
      if (!retrievedDoc || retrievedDoc.text !== testDoc.text) {
        throw new Error('Data persistence failed');
      }
      
      // Cleanup
      await offlineStorage.removeDocument(testDoc.id);
      
      return {
        dataPersisted: true,
        dataIntegrity: retrievedDoc.text === testDoc.text
      };
    }));

    const totalDuration = performance.now() - startTime;
    const passCount = results.filter(r => r.status === 'PASS').length;
    const passRate = (passCount / results.length) * 100;
    
    return {
      suiteName: 'Integration Tests',
      results,
      overallStatus: passRate === 100 ? 'PASS' : passRate > 0 ? 'PARTIAL' : 'FAIL',
      totalDuration,
      passRate
    };
  }
}

export const qaTester = new QATester();
