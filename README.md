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

## Features

### MVP (Phase 1) - ✅ COMPLETED
- ✅ **Project scaffolding** - Vite + React + TypeScript with glassmorphic UI
- ✅ **Document ingestion** - Upload .docx, .txt, .md, .srt, .vtt files with metadata
- ✅ **Library management** - View, search, and organize documents with filtering
- ✅ **Local embeddings** - Generate embeddings using Ollama with hybrid retrieval
- ✅ **AI chat** - Conversational Q&A grounded in documents with source attribution
- ✅ **Summarization** - Extract structured facts and generate styled summaries
- ✅ **Style guide editor** - Customize tone, keywords, and example phrases
- ✅ **A/B testing** - Compare summary variants with user feedback collection
- ✅ **Export formats** - Export summaries as Markdown, HTML, and JSON
- ✅ **Developer console** - Advanced logging, metrics, and observability tools
- ✅ **Glassmorphic UI** - Professional design system with light/dark modes

### Phase 2 - 🔄 IN PROGRESS
- 🔄 **Learning feedback** - Improve outputs based on user preferences
- 🔄 **Course builder** - Generate course outlines from multiple documents
- 🔄 **SQLite storage** - Durable data persistence

### Phase 3 - 📋 PLANNED
- 📋 **Advanced search** - Enhanced library filtering and search
- 📋 **Style refinements** - Advanced customization options

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

## UI Design System (Glassmorphic)

### Core Glass Components

The application uses a comprehensive glassmorphic design system with the following components:

#### Base Components
```css
.glass-panel           /* Core glass panel with backdrop blur */
.glass-panel-header    /* Header panel with gradient */
.glass-modal          /* Modal dialog panels */
.glass-nav            /* Navigation components */
```

#### Interactive Components
```css
.glass-button         /* Primary glass button */
.glass-button-primary /* Accent color button */
.glass-button-secondary /* Secondary button style */
.glass-card           /* Hoverable card with animation */
.glass-input          /* Glass-styled input fields */
```

#### Typography Hierarchy
```css
.text-hierarchy-h1    /* 4xl font-bold text-white leading-tight */
.text-hierarchy-h2    /* 3xl font-semibold text-white leading-snug */
.text-hierarchy-h3    /* 2xl font-semibold text-white leading-normal */
.text-hierarchy-h4    /* xl font-medium text-white leading-relaxed */
.text-body            /* text-gray-300 leading-relaxed */
.text-body-large      /* lg text-gray-300 leading-loose */
```

#### Design Tokens
```javascript
// Tailwind config extensions
colors: {
  glass: {
    light: 'rgba(255, 255, 255, 0.1)',
    lighter: 'rgba(255, 255, 255, 0.2)',
    dark: 'rgba(255, 255, 255, 0.05)',
    accent: '#3b82f6',
    'accent-hover': '#2563eb',
  }
}

boxShadow: {
  'glass': '0 8px 40px rgba(0, 0, 0, 0.25)',
  'glass-hover': '0 12px 48px rgba(0, 0, 0, 0.35)',
}

backdropBlur: {
  'glass': '16px',
}
```

### Usage Guidelines

1. **Consistency**: Use glass components for all UI elements
2. **Hierarchy**: Follow typography scale for content structure
3. **Accessibility**: Maintain contrast ratios in light/dark modes
4. **Responsiveness**: All components work from mobile to desktop
5. **Performance**: Backdrop blur optimized for modern browsers

## Developer Observability

### Advanced Logging System

The application includes a comprehensive logging system for development and debugging:

#### Developer Console Access

**Keyboard Shortcut**: `Ctrl+`` (or `Cmd+`` on Mac)

**Visibility**:
- Automatically enabled in development mode
- Can be enabled in production via: `localStorage.setItem('dev-console-enabled', 'true')`

#### Log Categories

```typescript
type LogCategory = 
  | 'INGEST'      // Document upload and processing
  | 'INDEX'       // Text chunking and indexing
  | 'EMBED'       // Embedding generation
  | 'RETRIEVE'    // Semantic search and retrieval
  | 'SUMMARIZE'   // Summary generation
  | 'CHAT'        // Conversational AI
  | 'EXPORT'      // File export operations
  | 'UI'          // User interface interactions
  | 'SYSTEM'      // System-level events
  | 'AB_TEST'     // A/B testing operations
  | 'STYLE_GUIDE' // Style guide changes
```

#### Log Levels

- **DEBUG**: Detailed diagnostic information
- **INFO**: General informational messages
- **WARN**: Warning conditions
- **ERROR**: Error conditions with stack traces

#### Usage Examples

```typescript
import { logInfo, logError, logTime } from '../lib/logger';

// Basic logging
logInfo('UI', 'User clicked export button', { format: 'markdown' });
logError('EMBED', 'Failed to generate embeddings', { error: errorMessage });

// Performance timing
const stopTimer = logTime('SUMMARIZE', 'Document summarization');
// ... do work ...
stopTimer(); // Automatically logs duration
```

#### Console Features

1. **Real-time Timeline**: Live log stream with color-coded categories
2. **Advanced Filtering**: Filter by level, category, and text search
3. **Performance Metrics**: Event counts, rates, and duration tracking
4. **Export Capabilities**: Export logs as JSON or NDJSON
5. **Resizable Interface**: Dock to right or bottom with custom sizing
6. **Session Persistence**: Logs saved to session storage (last 200 events)

#### Console Controls

- **Position Toggle**: Switch between right-side and bottom dock
- **Enable/Disable**: Turn logging on/off dynamically
- **Clear Logs**: Reset log history
- **Export Options**: Download complete log history
- **Real-time Metrics**: Live performance dashboard

### Implementation Notes

- **Ring Buffer**: Efficient memory usage (1,000 events max)
- **Performance**: Minimal overhead when logging disabled
- **Browser Console**: Development logs mirrored to browser console
- **Type Safety**: Full TypeScript support with strict typing
- **Error Recovery**: Graceful handling of logging failures

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── DevConsole.tsx  # Advanced developer console
│   ├── Navigation.tsx  # Main navigation with theme toggle
│   └── ...
├── pages/              # Route components
├── lib/                # Utilities and API clients
│   ├── logger.ts       # Advanced logging system
│   ├── exportEngine.ts # Multi-format export
│   └── ...
├── hooks/              # React hooks
│   ├── useLogger.ts    # Logger integration hook
│   ├── useDevConsole.ts# DevConsole state management
│   └── ...
├── store/              # Zustand state management
├── types/              # TypeScript definitions
└── App.tsx             # Main application component
```