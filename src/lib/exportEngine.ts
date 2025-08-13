/**
 * Export Engine for converting summaries to different formats
 */

import { useAppStore } from '../store';
import type { SummarizationResult, ExtractedFacts } from '../types';

export type ExportFormat = 'markdown' | 'html' | 'json';

export interface ExportResult {
  content: string;
  filename: string;
  mimeType: string;
  size: number;
}

export class ExportEngine {
  /**
   * Export a summarization result in the specified format
   */
  static exportSummary(
    summarizationResult: SummarizationResult,
    format: ExportFormat
  ): ExportResult {
    const { addLog } = useAppStore.getState();
    const startTime = Date.now();
    
    let result: ExportResult;
    
    switch (format) {
      case 'markdown':
        result = this.exportAsMarkdown(summarizationResult);
        break;
      case 'html':
        result = this.exportAsHTML(summarizationResult);
        break;
      case 'json':
        result = this.exportAsJSON(summarizationResult);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    const processingTime = Date.now() - startTime;
    
    addLog({
      level: 'info',
      category: 'export',
      message: `Summary exported as ${format.toUpperCase()}`,
      details: {
        documentTitle: summarizationResult.document.title,
        format,
        filename: result.filename,
        fileSize: result.size,
        processingTime,
      }
    });

    return result;
  }

  /**
   * Download the exported content as a file
   */
  static downloadExport(exportResult: ExportResult): void {
    const { addLog } = useAppStore.getState();
    
    try {
      const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = exportResult.filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);

      addLog({
        level: 'info',
        category: 'export',
        message: `File download initiated`,
        details: {
          filename: exportResult.filename,
          size: exportResult.size,
        }
      });
    } catch (error) {
      addLog({
        level: 'error',
        category: 'export',
        message: `File download failed`,
        details: {
          filename: exportResult.filename,
          error: error instanceof Error ? error.message : error,
        }
      });
      throw error;
    }
  }

  /**
   * Export as Markdown format
   */
  private static exportAsMarkdown(result: SummarizationResult): ExportResult {
    const { document, markdownSummary, mergedFacts, processingStats } = result;
    
    let content = `# ${document.title}\n\n`;
    
    // Add metadata
    content += `**Document Information:**\n`;
    content += `- **File:** ${document.filename}\n`;
    content += `- **Date Added:** ${new Date(document.metadata.dateAdded).toLocaleDateString()}\n`;
    content += `- **Word Count:** ${document.metadata.wordCount?.toLocaleString() || 'Unknown'}\n`;
    content += `- **File Size:** ${this.formatFileSize(document.metadata.fileSize)}\n`;
    if (document.tags.length > 0) {
      content += `- **Tags:** ${document.tags.join(', ')}\n`;
    }
    content += `\n`;

    // Add processing stats
    content += `**Processing Statistics:**\n`;
    content += `- **Chunks Processed:** ${processingStats.totalChunks}\n`;
    content += `- **Successful Chunks:** ${processingStats.successfulChunks}\n`;
    content += `- **Processing Time:** ${Math.round(processingStats.processingTime / 1000)}s\n`;
    content += `\n---\n\n`;

    // Add the main summary
    content += markdownSummary;
    
    // Add structured facts section
    content += `\n\n---\n\n## Extracted Facts\n\n`;
    content += this.factsToMarkdown(mergedFacts);
    
    // Add export timestamp
    content += `\n\n---\n\n*Exported on ${new Date().toLocaleString()}*\n`;

    const filename = `${this.sanitizeFilename(document.title)}_summary.md`;
    
    return {
      content,
      filename,
      mimeType: 'text/markdown',
      size: content.length,
    };
  }

  /**
   * Export as HTML format
   */
  private static exportAsHTML(result: SummarizationResult): ExportResult {
    const { document, markdownSummary, mergedFacts, processingStats } = result;
    
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHtml(document.title)} - Summary</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
            background: #f9f9f9;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        h3 { color: #7f8c8d; }
        .metadata { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .metadata strong { color: #2c3e50; }
        .facts-section { background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .fact-category { margin-bottom: 15px; }
        .fact-category h4 { margin-bottom: 5px; color: #495057; }
        .fact-list { margin-left: 20px; }
        .fact-list li { margin-bottom: 3px; }
        .export-info { text-align: center; color: #6c757d; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; }
        code { background: #f1f3f4; padding: 2px 4px; border-radius: 3px; }
        blockquote { border-left: 4px solid #3498db; margin-left: 0; padding-left: 20px; color: #555; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${this.escapeHtml(document.title)}</h1>
        
        <div class="metadata">
            <h3>Document Information</h3>
            <strong>File:</strong> ${this.escapeHtml(document.filename)}<br>
            <strong>Date Added:</strong> ${new Date(document.metadata.dateAdded).toLocaleDateString()}<br>
            <strong>Word Count:</strong> ${document.metadata.wordCount?.toLocaleString() || 'Unknown'}<br>
            <strong>File Size:</strong> ${this.formatFileSize(document.metadata.fileSize)}<br>`;
    
    if (document.tags.length > 0) {
      html += `            <strong>Tags:</strong> ${document.tags.map(tag => this.escapeHtml(tag)).join(', ')}<br>`;
    }
    
    html += `
            <br>
            <strong>Processing Statistics:</strong><br>
            Chunks Processed: ${processingStats.totalChunks} | 
            Successful: ${processingStats.successfulChunks} | 
            Time: ${Math.round(processingStats.processingTime / 1000)}s
        </div>

        <div class="summary-content">
            ${this.markdownToHTML(markdownSummary)}
        </div>

        <div class="facts-section">
            <h2>Extracted Facts</h2>
            ${this.factsToHTML(mergedFacts)}
        </div>

        <div class="export-info">
            Exported on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;

    const filename = `${this.sanitizeFilename(document.title)}_summary.html`;
    
    return {
      content: html,
      filename,
      mimeType: 'text/html',
      size: html.length,
    };
  }

  /**
   * Export as JSON format (matching PRD schema)
   */
  private static exportAsJSON(result: SummarizationResult): ExportResult {
    const { document, mergedFacts, processingStats } = result;
    
    // Create JSON matching the PRD schema exactly
    const jsonData = {
      // Document metadata (not in PRD schema but useful)
      document_info: {
        title: document.title,
        filename: document.filename,
        date_added: document.metadata.dateAdded,
        word_count: document.metadata.wordCount,
        file_size: document.metadata.fileSize,
        file_type: document.metadata.fileType,
        tags: document.tags,
      },
      
      // Processing information
      processing_stats: {
        total_chunks: processingStats.totalChunks,
        successful_chunks: processingStats.successfulChunks,
        failed_chunks: processingStats.failedChunks,
        processing_time_ms: processingStats.processingTime,
      },
      
      // Facts matching PRD schema exactly
      extracted_facts: {
        class_title: mergedFacts.class_title || null,
        date_or_series: mergedFacts.date_or_series || null,
        audience: mergedFacts.audience || null,
        learning_objectives: mergedFacts.learning_objectives || [],
        key_takeaways: mergedFacts.key_takeaways || [],
        topics: mergedFacts.topics || [],
        techniques: mergedFacts.techniques || [],
        action_items: mergedFacts.action_items || [],
        notable_quotes: mergedFacts.notable_quotes || [],
        open_questions: mergedFacts.open_questions || [],
        timestamp_refs: mergedFacts.timestamp_refs || [],
      },
      
      // Export metadata
      export_info: {
        timestamp: new Date().toISOString(),
        format_version: "1.0",
        exported_by: "Local Transcript Summarizer v2",
      }
    };

    const content = JSON.stringify(jsonData, null, 2);
    const filename = `${this.sanitizeFilename(document.title)}_summary.json`;
    
    return {
      content,
      filename,
      mimeType: 'application/json',
      size: content.length,
    };
  }

  /**
   * Convert facts to Markdown format
   */
  private static factsToMarkdown(facts: ExtractedFacts): string {
    let markdown = '';
    
    if (facts.class_title) {
      markdown += `**Class Title:** ${facts.class_title}\n\n`;
    }
    
    if (facts.date_or_series) {
      markdown += `**Date/Series:** ${facts.date_or_series}\n\n`;
    }
    
    if (facts.audience) {
      markdown += `**Audience:** ${facts.audience}\n\n`;
    }

    if (facts.learning_objectives?.length > 0) {
      markdown += `### Learning Objectives\n`;
      facts.learning_objectives.forEach(item => markdown += `- ${item}\n`);
      markdown += '\n';
    }

    if (facts.key_takeaways?.length > 0) {
      markdown += `### Key Takeaways\n`;
      facts.key_takeaways.forEach(item => markdown += `- ${item}\n`);
      markdown += '\n';
    }

    if (facts.topics?.length > 0) {
      markdown += `### Topics Covered\n`;
      facts.topics.forEach(item => markdown += `- ${item}\n`);
      markdown += '\n';
    }

    if (facts.techniques?.length > 0) {
      markdown += `### Techniques & Methods\n`;
      facts.techniques.forEach(item => markdown += `- ${item}\n`);
      markdown += '\n';
    }

    if (facts.action_items && facts.action_items.length > 0) {
      markdown += `### Action Items\n`;
      facts.action_items.forEach(item => markdown += `- ${item}\n`);
      markdown += '\n';
    }

    if (facts.notable_quotes && facts.notable_quotes.length > 0) {
      markdown += `### Notable Quotes\n`;
      facts.notable_quotes.forEach(item => markdown += `> ${item}\n\n`);
    }

    if (facts.open_questions && facts.open_questions.length > 0) {
      markdown += `### Open Questions\n`;
      facts.open_questions.forEach(item => markdown += `- ${item}\n`);
      markdown += '\n';
    }

    if (facts.timestamp_refs && facts.timestamp_refs.length > 0) {
      markdown += `### Timestamp References\n`;
      facts.timestamp_refs.forEach(item => markdown += `- ${item}\n`);
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * Convert facts to HTML format
   */
  private static factsToHTML(facts: ExtractedFacts): string {
    let html = '';
    
    if (facts.class_title) {
      html += `<div class="fact-category"><strong>Class Title:</strong> ${this.escapeHtml(facts.class_title)}</div>`;
    }
    
    if (facts.date_or_series) {
      html += `<div class="fact-category"><strong>Date/Series:</strong> ${this.escapeHtml(facts.date_or_series)}</div>`;
    }
    
    if (facts.audience) {
      html += `<div class="fact-category"><strong>Audience:</strong> ${this.escapeHtml(facts.audience)}</div>`;
    }

    const sections = [
      { title: 'Learning Objectives', items: facts.learning_objectives },
      { title: 'Key Takeaways', items: facts.key_takeaways },
      { title: 'Topics Covered', items: facts.topics },
      { title: 'Techniques & Methods', items: facts.techniques },
      { title: 'Action Items', items: facts.action_items },
      { title: 'Notable Quotes', items: facts.notable_quotes },
      { title: 'Open Questions', items: facts.open_questions },
      { title: 'Timestamp References', items: facts.timestamp_refs },
    ];

    sections.forEach(section => {
      if (section.items && section.items.length > 0) {
        html += `<div class="fact-category">`;
        html += `<h4>${section.title}</h4>`;
        html += `<ul class="fact-list">`;
        section.items.forEach(item => {
          html += `<li>${this.escapeHtml(item)}</li>`;
        });
        html += `</ul></div>`;
      }
    });

    return html;
  }

  /**
   * Simple Markdown to HTML conversion
   */
  private static markdownToHTML(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[h|ul|li])(.+)$/gm, '<p>$1</p>')
      .replace(/<\/ul>\s*<ul>/g, '')
      .replace(/^<p><\/p>$/gm, '');
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Sanitize filename for download
   */
  private static sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase()
      .substring(0, 50);
  }

  /**
   * Format file size for display
   */
  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
