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

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      console.warn('Ollama not available:', error);
      return false;
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
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
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.statusText}`);
    }

    const data: ChatResponse = await response.json();
    return data.message.content;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.config.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.embeddingModel,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding request failed: ${response.statusText}`);
    }

    const data: EmbeddingResponse = await response.json();
    return data.embedding;
  }
}

// Default client instance
export const ollama = new OllamaClient();
