/**
 * Ollama API client for local LLM communication
 * Connects to http://127.0.0.1:11434 for chat and embeddings
 */

export interface OllamaConfig {
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface EmbeddingResponse {
  embedding: number[];
}

export class OllamaClient {
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = {
      baseUrl: 'http://127.0.0.1:11434',
      chatModel: 'llama3.1:8b-instruct-q4_K_M',
      embeddingModel: 'nomic-embed-text',
      ...config,
    };
  }

  // Update the model dynamically
  updateModel(modelId: string) {
    this.config.chatModel = modelId;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      try {
        const response = await fetch(`${this.config.baseUrl}/api/tags`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response.ok;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Ollama availability check timed out after 3 seconds');
          return false;
        }
        throw error;
      }
    } catch (error) {
      console.warn('Ollama not available:', error);
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for chat
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.chatModel,
          messages,
          stream: false,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      const data: ChatResponse = await response.json();
      return data.message.content;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Chat request timed out after 10 seconds. Ollama may be unresponsive or not running.');
      }
      throw error;
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for embeddings
    
    try {
      const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.embeddingModel,
          prompt: text,
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Embedding request failed: ${response.statusText}`);
      }

      const data: EmbeddingResponse = await response.json();
      return data.embedding;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Embedding request timed out after 30 seconds. Ollama may be unresponsive.');
      }
      throw error;
    }
  }

  /**
   * Attempt to start Ollama server (this is a best-effort attempt)
   * Note: This may not work in all environments due to security restrictions
   */
  async attemptStartOllama(): Promise<boolean> {
    try {
      // This is a best-effort attempt - in many environments, 
      // we can't programmatically start system services
      console.log('Attempting to start Ollama server...');
      
      // We can't actually start Ollama from the browser due to security restrictions
      // But we can provide helpful instructions
      console.log('Ollama startup attempt: Browser security restrictions prevent automatic startup');
      console.log('Please start Ollama manually with: ollama serve');
      
      return false; // Always return false since we can't actually start it
    } catch (error) {
      console.error('Failed to start Ollama:', error);
      return false;
    }
  }
}

// Default client instance
export const ollama = new OllamaClient();
