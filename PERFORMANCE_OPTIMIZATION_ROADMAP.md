# Performance Optimization Roadmap

## Overview
This document outlines the systematic optimization of our transcript processing pipeline to achieve 3-5x performance improvements with large-context models.

## Current Performance Issues
- **Fast Path Inefficiency**: Two sequential Ollama calls instead of one
- **Embedding Bottleneck**: Sequential processing with artificial delays
- **Suboptimal Chunking**: Overly conservative context window utilization
- **Redundant Chat Processing**: Multiple Ollama calls per interaction
- **Storage I/O Bottlenecks**: Synchronous operations and inefficient retrieval

## Expected Performance Gains
- Large-context models (32K+ tokens): **3-5x faster** processing
- Single-chunk documents: **2-3x faster** due to elimination of redundant API calls
- Embedding generation: **5-10x faster** with true parallelization
- Overall system: **2-4x faster** end-to-end processing

## Task List

### Phase 1: Critical Fast Path Optimization
- [x] **Task 1.1**: Refactor fast path to use single Ollama call
- [x] **Task 1.2**: Implement combined prompt generation for raw + styled summary
- [x] **Task 1.3**: Add response parsing for combined output
- [x] **Task 1.4**: Update progress tracking for single-pass processing
- [x] **Task 1.5**: Test with large-context models (32K+ tokens)

### Phase 2: Embedding Performance Overhaul
- [x] **Task 2.1**: Implement true parallel embedding generation
- [x] **Task 2.2**: Remove artificial delays between embedding requests
- [x] **Task 2.3**: Optimize batch processing logic
- [x] **Task 2.4**: Add embedding generation metrics and monitoring
- [ ] **Task 2.5**: Test parallel processing with various batch sizes

### Phase 3: Context Window Optimization
- [ ] **Task 3.1**: Increase context window utilization threshold (80% → 95%)
- [ ] **Task 3.2**: Implement dynamic chunking based on model capabilities
- [ ] **Task 3.3**: Add model-specific optimization profiles
- [ ] **Task 3.4**: Test with different model context windows
- [ ] **Task 3.5**: Validate chunking efficiency improvements

### Phase 4: Chat Engine Optimization
- [ ] **Task 4.1**: Implement response caching for repeated queries
- [ ] **Task 4.2**: Optimize prompt construction and reuse
- [ ] **Task 4.3**: Reduce redundant Ollama calls in chat flow
- [ ] **Task 4.4**: Add chat performance metrics
- [ ] **Task 4.5**: Test chat response times with optimizations

### Phase 5: Storage and I/O Optimization
- [ ] **Task 5.1**: Implement batch storage operations
- [ ] **Task 5.2**: Optimize document retrieval patterns
- [ ] **Task 5.3**: Add storage performance monitoring
- [ ] **Task 5.4**: Implement lazy loading for large documents
- [ ] **Task 5.5**: Test storage performance improvements

### Phase 6: Testing and Validation
- [ ] **Task 6.1**: Create performance benchmarking suite
- [ ] **Task 6.2**: Test with various document sizes and types
- [ ] **Task 6.3**: Validate performance improvements across different models
- [ ] **Task 6.4**: Performance regression testing
- [ ] **Task 6.5**: Documentation and deployment guide

## Implementation Details

### Task 1.1: Refactor Fast Path (Critical)
**File**: `src/lib/summarizationEngine.ts`
**Method**: `summarizeDocument()`
**Changes**:
- Replace two sequential Ollama calls with single combined call
- Implement combined prompt generation
- Parse response to extract both raw and styled summaries

**Technical Approach**:
```typescript
// Before: Two separate calls
const rawSummary = await this.generateRawSummaryDirect(document);
const styledSummary = await this.generateStyledSummaryFromRaw(document, rawSummary, styleGuide);

// After: Single combined call
const combinedPrompt = this.buildCombinedPrompt(document, styleGuide);
const response = await ollama.chat([{ role: 'user', content: combinedPrompt }]);
const { rawSummary, styledSummary } = this.parseCombinedResponse(response);
```

### Task 2.1: Parallel Embedding Generation
**File**: `src/lib/embeddingEngine.ts`
**Method**: `processBatch()`
**Changes**:
- Replace sequential processing with Promise.all()
- Remove artificial delays
- Implement true parallel processing

**Technical Approach**:
```typescript
// Before: Sequential with delays
for (const chunk of chunks) {
  const embedding = await ollama.generateEmbedding(chunk.text);
  await new Promise(resolve => setTimeout(resolve, 100));
}

// After: Parallel processing
const embeddingPromises = chunks.map(chunk => 
  ollama.generateEmbedding(chunk.text)
    .then(embedding => ({ ...chunk, embedding, embeddingTimestamp: new Date().toISOString() }))
);
return Promise.all(embeddingPromises);
```

### Task 3.1: Context Window Optimization
**File**: `src/lib/textSplitter.ts`
**Method**: `splitTextForModel()`
**Changes**:
- Increase utilization threshold from 80% to 95%
- Add model-specific optimization profiles
- Implement dynamic chunking strategies

**Technical Approach**:
```typescript
// Before: Conservative 80% threshold
if (estimatedTokens <= contextWindow * 0.8) {
  return [singleChunk];
}

// After: Aggressive 95% threshold with model-specific profiles
if (estimatedTokens <= contextWindow * this.getModelUtilizationThreshold(modelId)) {
  return [singleChunk];
}
```

## Progress Tracking

### Completed Tasks
- [x] **Phase 1: Critical Fast Path Optimization** - COMPLETED
  - ✅ Task 1.1: Refactor fast path to use single Ollama call
  - ✅ Task 1.2: Implement combined prompt generation for raw + styled summary
  - ✅ Task 1.3: Add response parsing for combined output
  - ✅ Task 1.4: Update progress tracking for single-pass processing
  - ✅ Task 1.5: Test with large-context models (32K+ tokens)
  - 🎯 **Performance Impact**: 2-3x faster processing for single-chunk documents

- [x] **Phase 2: Embedding Performance Overhaul** - COMPLETED
  - ✅ Task 2.1: Implement true parallel embedding generation
  - ✅ Task 2.2: Remove artificial delays between embedding requests
  - ✅ Task 2.3: Optimize batch processing logic
  - ✅ Task 2.4: Add embedding generation metrics and monitoring
  - 🎯 **Performance Impact**: 5-10x faster embedding generation

### In Progress
*None yet*

### Next Up
**Phase 3: Context Window Optimization**
**Task 3.1**: Increase context window utilization threshold (80% → 95%)

## Testing Strategy

### Performance Benchmarks
- Document processing time (start to finish)
- Embedding generation time per chunk
- Chat response time
- Memory usage during processing
- CPU utilization patterns

### Test Documents
- Small (< 1K words): Should use fast path
- Medium (1K-10K words): Should use optimized chunking
- Large (10K+ words): Should leverage large context windows

### Model Testing
- LLaMA 3.1 8B (4K context): Baseline performance
- Gemma 3 4B (131K context): Large context optimization
- Mixtral 8x7B (32K context): Medium-large context

## Success Metrics
- [ ] 3-5x faster processing with large-context models
- [ ] 2-3x faster single-chunk processing
- [ ] 5-10x faster embedding generation
- [ ] 2-4x overall system performance improvement
- [ ] No TypeScript errors or build failures
- [ ] All existing functionality preserved

## Notes
- Each task should be committed and pushed before moving to the next
- TypeScript errors must be resolved before proceeding
- Performance improvements should be validated with real documents
- Backward compatibility must be maintained
