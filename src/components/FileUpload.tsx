import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react';
import { DocumentProcessor } from '../lib/documentProcessor';
import { useAppStore } from '../store';

interface FileUploadProps {
  onUploadComplete?: (success: boolean, message: string, document?: Document) => void;
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addDocument, addLog, documents } = useAppStore();

  // Reset file input when all documents are cleared
  useEffect(() => {
    if (documents.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = '';
      addLog({
        level: 'info',
        category: 'file-upload',
        message: 'File input reset after data clear',
        details: {}
      });
    }
  }, [documents.length, addLog]);

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
      
      onUploadComplete?.(true, successMessage, document);

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
      // Reset file input value to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
          glass-card p-6 text-center cursor-pointer border-dashed border-white/30
          ${isDragOver ? 'border-accent bg-accent/10' : ''}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
          transition-all duration-200
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
        
                <div className="space-y-2">
          <div className="text-2xl">
            {isProcessing ? '⏳' : isDragOver ? '📂' : '📁'}
          </div>
          
          {isProcessing ? (
            <div className="space-y-1">
              <p className="text-gray-300 text-xs">Processing...</p>
              <div className="w-full bg-gray-600 rounded-full h-1">
                <div className="bg-teal-400 h-1 rounded-full animate-pulse w-1/2"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-gray-300 text-xs">
                {isDragOver 
                  ? 'Drop files here' 
                  : 'Drop files or click'
                }
              </p>
              <p className="text-gray-500 text-xs">
                .docx, .txt, .md, .srt, .vtt
              </p>
            </div>
          )}
        </div>
      </div>


    </div>
  );
}
