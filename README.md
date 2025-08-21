# Transcript Generator v2

A powerful desktop application for generating AI-powered summaries of transcripts, lessons, and teaching content using local LLMs via Ollama.

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Ollama](https://ollama.ai/download) installed and in your PATH

### Installation
```bash
npm install
```

### Development

#### Option 1: Full Development Environment (Recommended)
**Automatically starts both Ollama and the frontend server:**

**macOS/Linux:**
```bash
npm run dev:full
```

**Windows:**
```bash
npm run dev:full:win
```

This will:
- ✅ Check if Ollama is running
- 🔧 Start Ollama automatically if it's not running
- 🌐 Start the Vite development server
- 🎯 Give you a complete development environment

#### Option 2: Frontend Only
**If you want to manage Ollama manually:**
```bash
npm run dev
```

Then in another terminal:
```bash
npm run start-ollama
```

### Other Commands
```bash
# Check Ollama status
npm run check-ollama

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🔧 Ollama Management

The development scripts automatically handle Ollama for you:

- **Auto-start**: Ollama starts automatically if not running
- **Status checking**: Verifies Ollama is ready before starting frontend
- **Graceful fallback**: Continues with frontend if Ollama can't start
- **Clean shutdown**: Stops Ollama when you exit the dev environment

## 📱 Usage

1. **Upload transcripts** (.docx, .txt, .md, .srt, .vtt)
2. **Configure your style guide** in Settings → Voice & Style Guide
3. **Generate summaries** using your custom voice and tone
4. **Chat with your content** using AI-powered Q&A
5. **Test your style guide** using the built-in Style Guide Tester

## 🎯 Features

- **Local AI Processing**: All AI operations run locally via Ollama
- **Custom Style Guides**: Create your own writing voice and tone
- **Dual Summaries**: Raw facts + stylized summaries
- **Interactive Chat**: Ask questions about your content
- **Batch Processing**: Handle multiple documents efficiently
- **Real-time Monitoring**: Track Ollama status and processing progress

## 🛠️ Development

### Project Structure
```
src/
├── components/          # React components
├── lib/                # Core libraries (AI, processing, etc.)
├── store/              # Zustand state management
├── types/              # TypeScript type definitions
└── pages/              # Page components
```

### Key Technologies
- **Frontend**: React 19 + TypeScript + Vite
- **AI**: Ollama (local LLMs)
- **State**: Zustand
- **Styling**: Tailwind CSS
- **Document Processing**: Custom text analysis pipeline

## 🚨 Troubleshooting

### Ollama Issues
```bash
# Check if Ollama is running
npm run check-ollama

# Start Ollama manually
npm run start-ollama

# Restart Ollama
pkill ollama && npm run start-ollama
```

### Development Issues
```bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset development environment
npm run dev:full
```

## 📄 License

This project is private and proprietary.