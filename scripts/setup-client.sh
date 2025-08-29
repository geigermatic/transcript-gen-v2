#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎯 Transcript Generator - Client Setup Script${NC}"
echo -e "${CYAN}This script will prepare your environment for testing${NC}"
echo ""

# Function to check if Node.js is installed
check_nodejs() {
    if command -v node &> /dev/null && command -v npm &> /dev/null; then
        local node_version=$(node --version)
        local npm_version=$(npm --version)
        echo -e "${GREEN}✅ Node.js is installed${NC}"
        echo -e "${CYAN}   Node.js: $node_version${NC}"
        echo -e "${CYAN}   npm: $npm_version${NC}"
        return 0
    else
        echo -e "${RED}❌ Node.js is not installed${NC}"
        return 1
    fi
}

# Function to install Node.js on macOS
install_nodejs_macos() {
    echo -e "${BLUE}🔧 Installing Node.js on macOS...${NC}"
    
    # Check if Homebrew is available
    if command -v brew &> /dev/null; then
        echo -e "${CYAN}Using Homebrew to install Node.js...${NC}"
        brew install node
        return $?
    else
        echo -e "${YELLOW}Homebrew not found. Installing Node.js manually...${NC}"
        echo -e "${CYAN}Please download Node.js from: https://nodejs.org/${NC}"
        echo -e "${YELLOW}After installation, please restart this script.${NC}"
        return 1
    fi
}

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
    if ! ollama list | grep -q "gemma3:4b"; then
        missing_models+=("gemma3:4b")
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
    echo -e "${BLUE}📥 Downloading primary LLM model (gemma3:4b)...${NC}"
    echo -e "${YELLOW}This model is ~3.3GB and may take 3-10 minutes to download.${NC}"
    if ollama pull gemma3:4b; then
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

# Function to install project dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing project dependencies...${NC}"
    
    if npm install; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        return 1
    fi
}

# Main setup sequence
echo -e "${BLUE}🔍 Checking Node.js installation...${NC}"

if ! check_nodejs; then
    echo -e "${YELLOW}⚠️  Node.js needs to be installed${NC}"
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${CYAN}Detected macOS. Installing Node.js...${NC}"
        if install_nodejs_macos; then
            echo -e "${GREEN}✅ Node.js installation completed${NC}"
        else
            echo -e "${RED}❌ Node.js installation failed${NC}"
            echo -e "${YELLOW}Please install Node.js manually from: https://nodejs.org/${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Node.js installation not supported on this OS${NC}"
        echo -e "${YELLOW}Please install Node.js manually from: https://nodejs.org/${NC}"
        exit 1
    fi
fi

echo ""
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
            exit 1
        fi
    else
        echo -e "${RED}❌ Ollama installation not supported on this OS${NC}"
        echo -e "${YELLOW}Please install Ollama manually from: https://ollama.ai/download${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}📦 Installing project dependencies...${NC}"

if ! install_dependencies; then
    echo -e "${RED}❌ Failed to install project dependencies${NC}"
    exit 1
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
        exit 1
    fi
fi

echo ""
echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo -e "   1. Run: ${GREEN}npm run dev:full${NC}"
echo -e "   2. Open your browser to: ${GREEN}http://localhost:5173${NC}"
echo -e "   3. Start testing the application!${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo -e "   • The app will automatically start Ollama when needed"
echo -e "   • Check Ollama status: ${GREEN}npm run check-ollama${NC}"
echo -e "   • View available models: ${GREEN}ollama list${NC}"
echo ""
