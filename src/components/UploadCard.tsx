/**
 * UploadCard - File upload dropzone with glass styling
 */

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText } from 'lucide-react';
import { DocumentProcessor } from '../lib/documentProcessor';
import { useAppStore } from '../store';
import { logInfo } from '../lib/logger';

interface UploadCardProps {
  onUploadComplete?: (success: boolean, message: string, document?: any) => void;
}

export const UploadCard: React.FC<UploadCardProps> = ({ onUploadComplete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addDocument } = useAppStore();

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
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    logInfo('UPLOAD', `File selection detected: ${files.length} files`, { 
      filenames: files.map(f => f.name) 
    });
    
    if (files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFiles = async (files: File[]) => {
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
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logInfo('INGEST', `Upload failed: ${errorMessage}`, { error });
      onUploadComplete?.(false, errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClick = () => {
    console.log('Upload area clicked');
    logInfo('UPLOAD', 'Upload area clicked - attempting to open file dialog');
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
          <div className="w-12 h-12 mx-auto bg-white bg-opacity-10 rounded-xl flex items-center justify-center">
            {isProcessing ? (
              <div className="w-6 h-6 border-2 border-white border-opacity-30 border-t-blue-500 rounded-full animate-spin" />
            ) : (
              <Upload size={24} className="text-white text-opacity-70" />
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
