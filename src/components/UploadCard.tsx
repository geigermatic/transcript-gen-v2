/**
 * UploadCard - File upload dropzone with glass styling
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, FileText } from 'lucide-react';
import { DocumentProcessor } from '../lib/documentProcessor';
import { SummarizationEngine } from '../lib/summarizationEngine';
import { EmbeddingEngine } from '../lib/embeddingEngine';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';
import type { ABSummaryPair, Document } from '../types';

interface UploadCardProps {
  onUploadComplete?: (success: boolean, message: string, document?: Document) => void;
  onProgress?: (current: number, total: number, status?: string) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onUploadComplete, onProgress }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addDocument, addABSummaryPair, addEmbeddings, styleGuide, documents } = useAppStore();

  // Reset file input when all documents are cleared
  useEffect(() => {
    if (documents.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
      logInfo('UI', 'File input reset after data clear');
    }
  }, [documents.length]);

  const triggerSummarization = useCallback(async (document: Document) => {
    try {
      logInfo('SYSTEM', `Starting background processing for: ${document.filename}`);
      
      // Generate embeddings first (needed for chat)
      logInfo('EMBED', `Generating embeddings for: ${document.filename}`);
      const embeddedChunks = await EmbeddingEngine.generateDocumentEmbeddings(
        document.id,
        document.text,
        (progress) => {
          logInfo('EMBED', `Embedding progress: ${progress.current}/${progress.total} chunks (${progress.percentage}%)`);
        }
      );
      
      // Store embeddings in the store
      addEmbeddings(document.id, embeddedChunks);
      logInfo('EMBED', `Embeddings stored for: ${document.filename}`, {
        chunkCount: embeddedChunks.length
      });
      
      // Then generate summary
      logInfo('SUMMARIZE', `Starting summarization for: ${document.filename}`);
      const result = await SummarizationEngine.summarizeDocument(
        document,
        styleGuide,
        (current, total, status) => {
          logInfo('SUMMARIZE', status || `Progress: ${current}%`);
          onProgress?.(current, total, status);
        }
      );

      // Create AB summary pair
      const summaryPair: ABSummaryPair = {
        id: crypto.randomUUID(),
        documentId: document.id,
        documentTitle: document.title || document.filename,
        summaryA: result,
        summaryB: result, // Use same result for both A and B for now
        variantDetails: {
          variantA: { 
            name: 'Default', 
            description: 'Standard processing',
            styleModifications: {},
            promptStrategy: 'Standard summarization with style guide'
          },
          variantB: { 
            name: 'Default', 
            description: 'Standard processing',
            styleModifications: {},
            promptStrategy: 'Standard summarization with style guide'
          }
        },
        createdAt: new Date().toISOString()
      };

      addABSummaryPair(summaryPair);
      
      logInfo('SYSTEM', `Processing completed for: ${document.filename}`, {
        summaryLength: result.markdownSummary.length,
        factsExtracted: Object.keys(result.mergedFacts).length
      });
    } catch (error) {
      logInfo('SYSTEM', `Processing failed for: ${document.filename}`, { error });
    }
  }, [addEmbeddings, addABSummaryPair, styleGuide, onProgress]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    logInfo('UI', `File selection detected: ${files.length} files`, { 
      filenames: files.map(f => f.name) 
    });
    
    if (files.length > 0) {
      handleFiles(files);
    }
  }, [handleFiles]);

  const handleFiles = useCallback(async (files: File[]) => {
    setIsProcessing(true);
    logInfo('INGEST', `Starting upload of ${files.length} file(s)`, { 
      filenames: files.map(f => f.name) 
    });

    try {
      for (const file of files) {
        // Validate file type
        if (!DocumentProcessor.isValidFileType(file)) {
          throw new Error(`Unsupported file type: ${file.name}`);
        }

        logInfo('INGEST', `File validation passed for: ${file.name}`);

        // Process the file
        const processedData = await DocumentProcessor.processFile(file);
        const document = DocumentProcessor.createDocument(file, processedData);
        
        // Add to store
        addDocument(document);

        logInfo('INGEST', `Successfully uploaded: ${file.name}`, {
          documentId: document.id,
          wordCount: document.metadata.wordCount,
          fileSize: file.size
        });

        onUploadComplete?.(true, `Successfully uploaded: ${file.name}`, document);

        // Trigger summarization in background
        triggerSummarization(document);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logInfo('INGEST', `Upload failed: ${errorMessage}`, { error });
      onUploadComplete?.(false, errorMessage);
    } finally {
      setIsProcessing(false);
      // Reset file input value to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [addDocument, onUploadComplete, triggerSummarization]);

  const handleClick = () => {
    console.log('Upload area clicked');
    logInfo('UI', 'Upload area clicked - attempting to open file dialog');
    fileInputRef.current?.click();
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-heading mb-6">Upload</h2>
      
      {/* Drop zone */}
      <div
        className={`drop-zone cursor-pointer ${isDragOver ? 'dragover' : ''} ${
          isProcessing ? 'opacity-50 pointer-events-none' : ''
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".docx,.txt,.md,.srt,.vtt"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="w-12 h-12 mx-auto bg-white/5 border border-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin" />
            ) : (
              <Upload size={24} className="text-white/70" />
            )}
          </div>
          
          <div className="text-center">
            <p className="text-body font-medium mb-2">
              {isProcessing ? 'Processing files...' : 'Drop a file here or click to select'}
            </p>
            <p className="text-caption">
              Supports .docx, .txt, .md, .srt, .vtt files
            </p>
          </div>
        </div>
      </div>

      {/* File type indicators */}
      <div className="mt-4 flex flex-wrap gap-2">
        {['.docx', '.txt', '.md', '.srt', '.vtt'].map((type) => (
          <span key={type} className="tag-badge">
            <FileText size={12} className="mr-1" />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
};
