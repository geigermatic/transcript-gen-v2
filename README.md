# Local-Only Transcript Summarizer

A privacy-focused, browser-based application for summarizing teaching transcripts and engaging in conversational Q&A using a local Ollama instance.

## Prerequisites

- Node.js 18+ and npm
- [Ollama](https://ollama.ai/) installed and running locally
- Models required:
  - `llama3.1:8b-instruct-q4_K_M` (for chat)
  - `nomic-embed-text` (for embeddings)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start Ollama** (in a separate terminal):
   ```bash
   ollama serve
   ```

3. **Pull required models:**
   ```bash
   ollama pull llama3.1:8b-instruct-q4_K_M
   ollama pull nomic-embed-text
   ```

4. **Check Ollama connection:**
   ```bash
   npm run check-ollama
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

## Features (Planned)

### MVP (Phase 1)
- ✅ **Project scaffolding** - Vite + React + TypeScript with glassmorphic UI
- 🔄 **Document ingestion** - Upload .docx, .txt, .md, .srt, .vtt files
- 🔄 **Library management** - View, search, and organize documents
- 🔄 **Local embeddings** - Generate embeddings using Ollama
- 🔄 **AI chat** - Conversational Q&A grounded in documents
- 🔄 **Summarization** - Extract structured facts and generate summaries
- 🔄 **Style guide** - Customize tone and output style
- 🔄 **Developer console** - Real-time logging and status tracking

### Phase 2
- 🔄 **A/B summaries** - Generate and compare multiple summary candidates
- 🔄 **Learning feedback** - Improve outputs based on user preferences
- 🔄 **Course builder** - Generate course outlines from multiple documents
- 🔄 **SQLite storage** - Durable data persistence

### Phase 3
- 🔄 **Advanced search** - Enhanced library filtering and search
- 🔄 **Style refinements** - Advanced customization options

## Tech Stack

- **Frontend:** Vite + React + TypeScript
- **Styling:** TailwindCSS with glassmorphic design
- **Routing:** React Router
- **State:** Zustand with persistence
- **LLM:** Ollama (local)
- **Document parsing:** Mammoth.js
- **Storage:** localStorage (Phase 1) → SQLite/OPFS (Phase 2)

## Privacy & Security

- 🔒 **Local-only operation** - No external API calls except to local Ollama
- 🔒 **No telemetry** - All data stays on your machine
- 🔒 **Localhost binding** - Application only communicates with 127.0.0.1:11434

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run check-ollama` - Verify Ollama connection

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Route components
├── lib/                # Utilities and API clients
├── store/              # Zustand state management
├── types/              # TypeScript definitions
└── App.tsx             # Main application component
```