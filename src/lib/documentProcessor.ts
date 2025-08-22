import mammoth from 'mammoth';
import type { Document, DocumentMetadata } from '../types';
import { useAppStore } from '../store';

export interface ProcessedDocument {
  text: string;
  metadata: DocumentMetadata;
}

export class DocumentProcessor {
  private static addLog(level: 'info' | 'warn' | 'error', message: string, details?: Record<string, unknown>) {
    const { addLog } = useAppStore.getState();
    addLog({
      level,
      category: 'document-ingestion',
      message,
      details,
    });
  }

  static async processFile(file: File): Promise<ProcessedDocument> {
    this.addLog('info', `Starting processing of file: ${file.name}`);
    
    try {
      const text = await this.extractText(file);
      const metadata = this.generateMetadata(file, text);
      
      this.addLog('info', `Successfully processed ${file.name}`, {
        fileSize: file.size,
        wordCount: metadata.wordCount,
        textLength: text.length,
      });

      return { text, metadata };
    } catch (error) {
      this.addLog('error', `Failed to process ${file.name}`, { error: error instanceof Error ? error.message : error });
      throw error;
    }
  }

  private static async extractText(file: File): Promise<string> {
    const fileType = file.name.toLowerCase().split('.').pop();
    
    this.addLog('info', `Extracting text from ${fileType} file`);

    switch (fileType) {
      case 'docx':
        return this.extractFromDocx(file);
      case 'txt':
      case 'md':
      case 'srt':
      case 'vtt':
        return this.extractFromText(file);
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }

  private static async extractFromDocx(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages.length > 0) {
        this.addLog('warn', 'Mammoth conversion warnings', { messages: result.messages });
      }
      
      return result.value.trim();
    } catch (error) {
      throw new Error(`Failed to extract text from .docx file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async extractFromText(file: File): Promise<string> {
    try {
      const text = await file.text();
      return text.trim();
    } catch (error) {
      throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static generateMetadata(file: File, text: string): DocumentMetadata {
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
    
    return {
      filename: file.name,
      dateAdded: new Date().toISOString(),
      fileSize: file.size,
      fileType: file.type || 'unknown',
      wordCount,
    };
  }

  static createDocument(file: File, processedData: ProcessedDocument): Document {
    const document: Document = {
      id: crypto.randomUUID(),
      filename: file.name,
      title: this.generateTitle(file.name),
      tags: [], // Placeholder for future tagging functionality
      text: processedData.text,
      metadata: processedData.metadata,
      uploadedAt: new Date().toISOString(),
    };

    this.addLog('info', `Created document record`, {
      id: document.id,
      title: document.title,
      wordCount: document.metadata.wordCount,
    });

    return document;
  }

  private static generateTitle(filename: string): string {
    // Remove file extension and replace underscores/hyphens with spaces
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  static isValidFileType(file: File): boolean {
    const validExtensions = ['docx', 'txt', 'md', 'srt', 'vtt'];
    const extension = file.name.toLowerCase().split('.').pop();
    return validExtensions.includes(extension || '');
  }

  static getFileTypeIcon(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'docx': return '📄';
      case 'txt': return '📝';
      case 'md': return '📋';
      case 'srt': 
      case 'vtt': return '🎬';
      default: return '📁';
    }
  }
}
