#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Transcript Generator Development Environment${NC}"
echo ""

# Function to check if Ollama is installed
check_ollama_installed() {
    if command -v ollama &> /dev/null; then
        echo -e "${GREEN}✅ Ollama is installed${NC}"
        return 0
    else
        echo -e "${RED}❌ Ollama is not installed${NC}"
        return 1
    fi
}

# Function to install Ollama on macOS
install_ollama_macos() {
    echo -e "${BLUE}🔧 Installing Ollama on macOS...${NC}"
    
    # Check if Homebrew is available
    if command -v brew &> /dev/null; then
        echo -e "${CYAN}Using Homebrew to install Ollama...${NC}"
        brew install ollama
        return $?
    else
        echo -e "${YELLOW}Homebrew not found. Installing Ollama manually...${NC}"
        echo -e "${CYAN}Downloading Ollama installer...${NC}"
        
        # Download and install Ollama
        curl -fsSL https://ollama.ai/install.sh | sh
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Ollama installed successfully!${NC}"
            # Add Ollama to PATH for current session
            export PATH="$HOME/.local/bin:$PATH"
            return 0
        else
            echo -e "${RED}❌ Ollama installation failed${NC}"
            return 1
        fi
    fi
}

# Function to check if required models are available
check_required_models() {
    echo -e "${BLUE}🔍 Checking required models...${NC}"
    
    local missing_models=()
    
    # Check primary LLM model
    if ! ollama list | grep -q "llama3.1:8b-instruct-q4_K_M"; then
        missing_models+=("llama3.1:8b-instruct-q4_K_M")
    else
        echo -e "${GREEN}✅ Primary LLM model available${NC}"
    fi
    
    # Check embedding model
    if ! ollama list | grep -q "nomic-embed-text"; then
        missing_models+=("nomic-embed-text")
    else
        echo -e "${GREEN}✅ Embedding model available${NC}"
    fi
    
    if [ ${#missing_models[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ All required models are available${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Missing models: ${missing_models[*]}${NC}"
        return 1
    fi
}

# Function to download required models
download_required_models() {
    echo -e "${BLUE}📥 Downloading required models...${NC}"
    echo -e "${CYAN}This may take several minutes depending on your internet connection.${NC}"
    echo ""
    
    # Download primary LLM model
    echo -e "${BLUE}📥 Downloading primary LLM model (llama3.1:8b-instruct-q4_K_M)...${NC}"
    echo -e "${YELLOW}This model is ~4.7GB and may take 5-15 minutes to download.${NC}"
    if ollama pull llama3.1:8b-instruct-q4_K_M; then
        echo -e "${GREEN}✅ Primary LLM model downloaded successfully${NC}"
    else
        echo -e "${RED}❌ Failed to download primary LLM model${NC}"
        return 1
    fi
    
    echo ""
    
    # Download embedding model
    echo -e "${BLUE}📥 Downloading embedding model (nomic-embed-text)...${NC}"
    echo -e "${YELLOW}This model is ~1.5GB and may take 2-5 minutes to download.${NC}"
    if ollama pull nomic-embed-text; then
        echo -e "${GREEN}✅ Embedding model downloaded successfully${NC}"
    else
        echo -e "${RED}❌ Failed to download embedding model${NC}"
        return 1
    fi
    
    echo ""
    echo -e "${GREEN}✅ All required models downloaded successfully!${NC}"
    return 0
}

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
echo -e "${BLUE}🔍 Checking Ollama installation...${NC}"

if ! check_ollama_installed; then
    echo -e "${YELLOW}⚠️  Ollama needs to be installed${NC}"
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${CYAN}Detected macOS. Installing Ollama...${NC}"
        if install_ollama_macos; then
            echo -e "${GREEN}✅ Ollama installation completed${NC}"
        else
            echo -e "${RED}❌ Ollama installation failed${NC}"
            echo -e "${YELLOW}Please install Ollama manually from: https://ollama.ai/download${NC}"
            echo -e "${BLUE}Continuing with frontend only (AI features will not work)${NC}"
            echo ""
            # Continue to start Vite
        fi
    else
        echo -e "${RED}❌ Ollama installation not supported on this OS${NC}"
        echo -e "${YELLOW}Please install Ollama manually from: https://ollama.ai/download${NC}"
        echo -e "${BLUE}Continuing with frontend only (AI features will not work)${NC}"
        echo ""
        # Continue to start Vite
    fi
fi

echo ""
echo -e "${BLUE}🔍 Checking Ollama status...${NC}"

if check_ollama; then
    echo -e "${GREEN}✅ Ollama is ready${NC}"
else
    start_ollama
fi

echo ""
echo -e "${BLUE}🔍 Checking required models...${NC}"

if ! check_required_models; then
    echo -e "${YELLOW}⚠️  Required models need to be downloaded${NC}"
    
    if download_required_models; then
        echo -e "${GREEN}✅ All models are now available${NC}"
    else
        echo -e "${RED}❌ Failed to download required models${NC}"
        echo -e "${YELLOW}AI features may not work properly${NC}"
        echo -e "${BLUE}Continuing with frontend...${NC}"
    fi
fi

echo ""
echo -e "${BLUE}🌐 Starting Vite development server...${NC}"
echo -e "${GREEN}📱 Frontend will be available at: http://localhost:5173${NC}"
echo -e "${GREEN}🤖 AI features will work if Ollama and models are available${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "   • Press Ctrl+C to stop both servers"
echo -e "   • Check Ollama status: npm run check-ollama"
echo -e "   • Manual Ollama start: ollama serve"
echo -e "   • View available models: ollama list"
echo ""

# Start Vite dev server
npm run dev:vite-only
