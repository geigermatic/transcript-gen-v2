# Local-Only Transcript Summarizer — PRD v3

## Overview
A **local, browser-based application** (no Electron) that summarizes teaching transcripts and supports ChatGPT‑like conversational Q&A using a local Ollama instance. All data and learning stay on the user’s machine, ensuring privacy and IP protection.

The target user is a non-technical meditation and techniques teacher who needs to generate summaries, course materials, and descriptions in her own voice for use on her website and in course development.

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

### Document Ingestion
- **Formats:** `.docx` (required), `.txt`, `.md`, `.srt`, `.vtt`
- **Processing:** Convert to plain text in-browser and store in local library.
- Maintain metadata: title, source file name, date added, tags.

### Library Management
- View all ingested documents with metadata and tags.
- Search and filter library entries.
- Support collections for grouping documents into courses/modules.

### Indexing & Retrieval ("Agent")
- Smart paragraph splitting with fallback if no double line breaks.
- Compute paragraph embeddings locally.
- Hybrid retrieval (keyword + cosine similarity) for Q&A and grounding summaries.
- Diagnostics: show indexing progress, paragraph/embedding counts, and top retrieved snippets.

### Conversational Chat
- Multi-turn chat with short memory.
- Answers grounded in retrieved excerpts.
- Abstain when unsupported.
- Support formatting requests (e.g., bullet lists).

### Summarization
- Per-chunk JSON facts extraction using strict schema (see below).
- Merge facts into a final structure.
- Generate final markdown summary using merged facts, style guide, and optional grounding excerpts.

### Voice & Style Guide
- User-editable tone/style settings (sliders, keywords, preferred phrases, sample outputs).
- Applied to both summarization and chat prompts.

### A/B Summaries & Learning
- Generate two candidates for each summary.
- User selects winner and optionally provides reason.
- Persist choices and reasons locally.
- Update style guide/preferences from feedback.

### Course Builder (Phase 2)
- Select multiple documents from library.
- Generate course/module outline with lesson descriptions in user’s style.
- Export as Markdown/HTML.

### Export
- One-click export of summaries and facts as Markdown, HTML, or JSON.

---

## Developer Observability (MVP)
- **In-app developer console** (toggleable in development builds):
  - Timestamped logs for ingestion, indexing, embeddings, retrieval, summarization, A/B generation, and feedback events.
  - Color-coded log levels.
- **Real-time status indicators**:
  - Progress counters and “now processing” banners for each step.
- **Browser console logging**: full verbose mode for development, toggleable off for production.

---

## Glassmorphic UI
- Semi-transparent, blurred panels with soft shadows and rounded corners.
- Minimalist layout with large click targets and clear navigation.
- Light/dark mode.
- Responsive for desktop and tablet.

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

## Acceptance Criteria
- Ingest `.docx` → summarize → output JSON + markdown with techniques included.
- View library and search documents.
- Style guide applied to summaries and chat responses.
- A/B selection updates style guide and affects future outputs.
- Developer logging visible in development builds.
- Glassmorphic UI meets design guidelines.

---

## Rollout Plan
1. MVP: ingestion (.docx required), library, summarization, chat, developer logging.
2. Phase 2: A/B + learning, course builder, durable SQLite/OPFS storage, export formats.
3. Phase 3: Advanced search/filtering, style guide refinements.
