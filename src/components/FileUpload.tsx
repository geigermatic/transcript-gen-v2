import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { DocumentProcessor } from '../lib/documentProcessor';
import { useAppStore } from '../store';
import { HelpTooltip } from './Tooltip';

interface FileUploadProps {
  onUploadComplete?: (success: boolean, message: string) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addDocument, addLog } = useAppStore();

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = async (files: File[]) => {
    addLog({
      level: 'info',
      category: 'file-upload',
      message: `Starting upload of ${files.length} file(s)`,
      details: { filenames: files.map(f => f.name) }
    });

    for (const file of files) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    setProcessingFile(file.name);
    setIsProcessing(true);

    try {
      // Validate file type
      if (!DocumentProcessor.isValidFileType(file)) {
        const message = `Unsupported file type: ${file.name}`;
        addLog({
          level: 'error',
          category: 'file-upload',
          message,
          details: { filename: file.name, type: file.type }
        });
        onUploadComplete?.(false, message);
        return;
      }

      // Process the file
      const processedData = await DocumentProcessor.processFile(file);
      const document = DocumentProcessor.createDocument(file, processedData);
      
      // Add to store
      addDocument(document);

      const successMessage = `Successfully uploaded: ${file.name}`;
      addLog({
        level: 'info',
        category: 'file-upload',
        message: successMessage,
        details: { 
          documentId: document.id,
          wordCount: document.metadata.wordCount,
          fileSize: file.size 
        }
      });
      
      onUploadComplete?.(true, successMessage);

    } catch (error) {
      const errorMessage = `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      addLog({
        level: 'error',
        category: 'file-upload',
        message: errorMessage,
        details: { filename: file.name, error }
      });
      onUploadComplete?.(false, errorMessage);
    } finally {
      setIsProcessing(false);
      setProcessingFile('');
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragOver 
            ? 'border-blue-400 bg-blue-400 bg-opacity-10' 
            : 'border-gray-400 hover:border-gray-300'
          }
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
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
          <div className="text-4xl">
            {isProcessing ? '⏳' : isDragOver ? '📂' : '📁'}
          </div>
          
          {isProcessing ? (
            <div className="space-y-2">
              <p className="text-gray-300 font-medium">
                Processing: {processingFile}
              </p>
              <div className="w-full bg-gray-600 rounded-full h-2">
                <div className="bg-blue-400 h-2 rounded-full animate-pulse w-1/2"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-300 mb-4">
                {isDragOver 
                  ? 'Drop files here to upload' 
                  : 'Drag and drop files here, or click to browse'
                }
              </p>
              <div className="flex items-center justify-center">
                <p className="text-sm text-gray-400">
                  Supported formats: .docx, .txt, .md, .srt, .vtt
                </p>
                <HelpTooltip 
                  content="Upload teaching transcripts, documents, or subtitle files. Files should be between 100KB and 50MB. All processing happens locally on your machine - your documents never leave your computer."
                  position="bottom"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Browse Button */}
      <div className="flex justify-center">
        <button
          onClick={handleBrowseClick}
          disabled={isProcessing}
          className="glass-button text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing...' : 'Browse Files'}
        </button>
      </div>
    </div>
  );
}
