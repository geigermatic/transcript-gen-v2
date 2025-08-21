#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Transcript Generator Development Environment${NC}"
echo ""

# Function to check if Ollama is running
check_ollama() {
    if curl -f http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama is already running${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Ollama is not running${NC}"
        return 1
    fi
}

# Function to start Ollama
start_ollama() {
    echo -e "${BLUE}🔧 Starting Ollama...${NC}"
    
    # Check if ollama command exists
    if ! command -v ollama &> /dev/null; then
        echo -e "${RED}❌ Ollama is not installed or not in PATH${NC}"
        echo -e "${YELLOW}Please install Ollama from: https://ollama.ai/download${NC}"
        echo ""
        echo -e "${BLUE}Continuing with frontend only (AI features will not work)${NC}"
        echo ""
        return 1
    fi
    
    # Start Ollama in background
    echo -e "${BLUE}Starting Ollama server...${NC}"
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    
    # Wait for Ollama to start
    echo -e "${YELLOW}Waiting for Ollama to start...${NC}"
    for i in {1..30}; do
        if check_ollama; then
            echo -e "${GREEN}✅ Ollama started successfully! (PID: $OLLAMA_PID)${NC}"
            echo ""
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    echo ""
    echo -e "${RED}❌ Ollama failed to start within 30 seconds${NC}"
    echo -e "${YELLOW}You may need to start it manually with: ollama serve${NC}"
    echo ""
    return 1
}

# Function to cleanup on exit
cleanup() {
    if [ ! -z "$OLLAMA_PID" ]; then
        echo -e "${YELLOW}🛑 Stopping Ollama (PID: $OLLAMA_PID)${NC}"
        kill $OLLAMA_PID 2>/dev/null
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Main startup sequence
echo -e "${BLUE}🔍 Checking Ollama status...${NC}"

if check_ollama; then
    echo -e "${GREEN}✅ Ollama is ready${NC}"
else
    start_ollama
fi

echo ""
echo -e "${BLUE}🌐 Starting Vite development server...${NC}"
echo -e "${GREEN}📱 Frontend will be available at: http://localhost:5173${NC}"
echo -e "${GREEN}🤖 AI features will work if Ollama is running${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "   • Press Ctrl+C to stop both servers"
echo -e "   • Check Ollama status: npm run check-ollama"
echo -e "   • Manual Ollama start: ollama serve"
echo ""

# Start Vite dev server
npm run dev
