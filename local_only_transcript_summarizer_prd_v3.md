# Local-Only Transcript Summarizer — PRD v3

## Overview
A **local, browser-based application** (no Electron) that summarizes teaching transcripts and supports ChatGPT‑like conversational Q&A using a local Ollama instance. All data and learning stay on the user's machine, ensuring privacy and IP protection.

The target user is a non-technical meditation and techniques teacher who needs to generate summaries, course materials, and descriptions in her own voice for use on her website and in course development.

**Current Status:** MVP complete with integrated dashboard interface, style guide management, and real-time Ollama status monitoring.

---

## Goals
- Ingest `.docx` and other supported transcript/document formats into a **local library**.
- Generate accurate summaries of long (30–60 min) recordings or documents, including specific **techniques used**.
- Provide **multi-turn conversational Q&A** grounded in transcripts.
- Enable **voice/style customization** so outputs match the user’s preferred tone and structure.
- Allow **A/B summary comparisons** with winner selection and reasoning.
- Learn from user feedback to bias future summaries/answers.
- Maintain **beautiful, world-class glassmorphic UI** for non-technical users.
- Provide full developer observability in early builds with detailed logs and status tracking.

---

## Tech Stack
- **Frontend:** Vite + React + TypeScript
- **Local LLM:** Ollama chat API (`llama3.1:8b-instruct-q4_K_M`, configurable)
- **Local Embeddings:** Ollama (`nomic-embed-text`)
- **Storage (MVP):** browser localStorage (upgrade to SQLite/OPFS for durability in Phase 2)

---

## Security / Privacy
- Runs on `localhost` only.
- Only communicates with `http://127.0.0.1:11434` (Ollama).
- No telemetry or external calls.
- All data persists locally.

---

## Features

### ✅ Integrated Dashboard (COMPLETED)
- **Single-page interface** combining upload, library, summarization, and chat
- **Real-time progress tracking** with detailed status updates and chunk counters
- **Glassmorphic design** with consistent visual hierarchy and spacing
- **Auto-scrolling prevention** - always starts at top of page
- **Clear All Data** functionality for fresh starts

### ✅ Document Ingestion (COMPLETED)
- **Formats:** `.docx` (required), `.txt`, `.md`, `.srt`, `.vtt`
- **Processing:** Convert to plain text in-browser and store in local library
- **Upload validation** with file size and format checking
- **Automatic processing** - embeddings and summarization start immediately after upload
- **Recent documents panel** with metadata display (shows up to 10 documents)

### ✅ Library Management (COMPLETED)
- View all ingested documents with metadata and word counts
- Persistent storage using browser localStorage with Zustand
- Document selection for processing and chat context
- File input reset handling for reliable re-uploads

### ✅ Indexing & Retrieval (COMPLETED)
- **Configurable chunking** - adjustable character/word limits and max chunks
- **Parallel processing** for improved performance on large documents
- **Local embeddings** using Ollama's `nomic-embed-text` model
- **Real-time progress updates** during embedding generation
- **Chat integration** - embeddings automatically used for conversational context

### ✅ Conversational Chat (COMPLETED)
- **Integrated chat interface** directly in main dashboard
- **Context-aware responses** grounded in uploaded documents
- **Multi-turn conversations** with proper message history
- **Real-time typing indicators** and error handling
- **Markdown rendering** for formatted responses
- **No external routing** - everything accessible from main page

### ✅ Summarization (COMPLETED)
- **Batch processing** with configurable chunk sizes for optimal performance
- **Real-time progress tracking** with detailed step-by-step updates
- **JSON facts extraction** using strict schema validation
- **Synopsis generation** - 4-6 sentence overview at start of each summary
- **Markdown rendering** with proper formatting in output panel
- **Style guide integration** - tone and preferences applied to all outputs

### ✅ Voice & Style Guide (COMPLETED)
- **Integrated settings page** with glassmorphic design consistency
- **Text analysis feature** - paste newsletter/sample text to auto-generate style guide
- **Real-time Ollama status monitoring** with setup instructions
- **Inline editing mode** with save/reset functionality
- **Tone sliders** for formality, enthusiasm, and technicality
- **Keywords and phrases management** with add/remove capabilities
- **Custom instructions** editing with live preview
- **Lucide icon system** for consistent, professional interface

### A/B Summaries & Learning (PLANNED)
- Generate two candidates for each summary
- User selects winner and optionally provides reason
- Persist choices and reasons locally
- Update style guide/preferences from feedback

### Course Builder (Phase 2)
- Select multiple documents from library
- Generate course/module outline with lesson descriptions in user's style
- Export as Markdown/HTML

### Export (PLANNED)
- One-click export of summaries and facts as Markdown, HTML, or JSON

---

## ✅ Developer Observability (COMPLETED)
- **Comprehensive logging system** with categorized, timestamped logs:
  - `UI`, `SYSTEM`, `INGEST`, `EMBED`, `SUMMARIZE`, `CHAT`, `EXPORT` categories
  - Real-time log display in development console
  - Detailed progress tracking with status messages
- **Real-time status indicators**:
  - Progress bars with percentage completion
  - Step-by-step processing updates ("Extracting facts from chunk X/Y")
  - Chunk counters and processing timers
  - Ollama connection status monitoring
- **Error handling and user feedback**:
  - Graceful error messages with actionable instructions
  - Ollama setup guidance when service unavailable
  - File upload validation with clear error reporting

---

## ✅ Glassmorphic UI (COMPLETED)
- **Consistent design system** with custom Tailwind classes:
  - `glass-panel`, `glass-card`, `glass-button-primary`, `glass-button-secondary`
  - `text-hierarchy-h1`, `text-hierarchy-h2`, `text-hierarchy-h3` for typography
  - Semi-transparent backgrounds with backdrop blur effects
- **Professional iconography** using Lucide React icons throughout
- **Unified layout system** with `AppShell` component for consistent navigation
- **Content readability optimization**:
  - High-contrast text areas for summary content
  - Proper visual hierarchy and spacing
  - Responsive design for desktop and tablet
- **Dark theme** optimized for long reading sessions

---

## Data Model
(LocalStorage → SQLite/OPFS in Phase 2)
- `library.documents`: `{ id, filename, title, tags, text, metadata }`
- `library.facts`: `{ document_id, merged_json }`
- `agent.paragraphs.<id>`: `string[]`
- `agent.embeddings.<id>`: `float[][]`
- `style_guide`: `{ instructions_md, tone_settings, keywords }`
- `preferences`: `[ { id, document_id, candidateA, candidateB, winner, reason, created_at } ]`
- `settings`: `{ default_model, chat_default }`

---

## JSON Facts Schema
```json
{
  "type": "object",
  "properties": {
    "class_title": { "type": "string" },
    "date_or_series": { "type": "string" },
    "audience": { "type": "string" },
    "learning_objectives": { "type": "array", "items": { "type": "string" } },
    "key_takeaways": { "type": "array", "items": { "type": "string" } },
    "topics": { "type": "array", "items": { "type": "string" } },
    "techniques": { "type": "array", "items": { "type": "string" } },
    "action_items": { "type": "array", "items": { "type": "string" } },
    "notable_quotes": { "type": "array", "items": { "type": "string" } },
    "open_questions": { "type": "array", "items": { "type": "string" } },
    "timestamp_refs": { "type": "array", "items": { "type": "string" } }
  },
  "required": ["key_takeaways", "topics", "techniques"]
}
```

---

## Prompts
- **Per-chunk extraction:** strict JSON only; apply style guide; optionally include grounding excerpts.
- **Final summary:** use merged facts; apply style guide; optionally include grounding excerpts.
- **Chat:** strict guardrail to answer only from excerpts.

---

## ✅ Acceptance Criteria (MVP COMPLETE)
- ✅ **Ingest `.docx`** → summarize → output JSON + markdown with techniques included
- ✅ **View library** and manage documents with metadata
- ✅ **Style guide integration** applied to summaries and chat responses
- ✅ **Comprehensive developer logging** visible in development builds
- ✅ **Glassmorphic UI** with consistent design system and professional icons
- ✅ **Real-time progress tracking** with detailed status updates
- ✅ **Integrated chat interface** with context-aware responses
- ✅ **Ollama status monitoring** with setup guidance
- ✅ **Text-based style guide creation** with AI analysis

### Pending for Phase 2:
- ⏳ A/B selection and learning from user feedback
- ⏳ Export functionality (Markdown, HTML, JSON)
- ⏳ Advanced search and filtering
- ⏳ Course builder with multi-document workflows

---

## Rollout Plan
1. ✅ **MVP (COMPLETED)**: Document ingestion (`.docx` required), library management, summarization with style guides, integrated chat, comprehensive developer logging, glassmorphic UI
2. ⏳ **Phase 2 (NEXT)**: A/B testing + learning, export functionality, course builder, durable SQLite/OPFS storage
3. ⏳ **Phase 3 (FUTURE)**: Advanced search/filtering, collections, enhanced style guide features, performance optimizations

---

## 🚀 Current Status: MVP Complete
The application successfully meets all primary objectives with a polished, production-ready interface. Ready for user testing and feedback collection to inform Phase 2 development priorities.
