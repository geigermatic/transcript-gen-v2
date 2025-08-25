# 🚀 Client Deployment Guide

This guide will help you deploy the Transcript Generator application on a test computer for client feedback and testing.

## 🎯 Quick Start (Recommended)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd transcript-gen-v2

# 2. Run the automated setup
npm run setup

# 3. Start the application
npm run dev:full
```

## 🔧 What the Setup Scripts Do

The setup scripts automatically handle:

✅ **Node.js Installation** - Checks and installs Node.js if needed  
✅ **Ollama Installation** - Installs Ollama AI runtime  
✅ **Model Downloading** - Downloads required AI models (~6.2GB total)  
✅ **Dependencies** - Installs all project dependencies  
✅ **Environment Verification** - Ensures everything is ready  

## 📋 System Requirements

### Minimum Requirements:
- **OS**: macOS 10.15+ or Linux
- **RAM**: 8GB (16GB recommended for optimal performance)
- **Storage**: 10GB free space (for models and dependencies)
- **Internet**: Required for initial setup and model downloads

### Recommended Requirements:
- **OS**: macOS 12+ or Linux
- **RAM**: 16GB+
- **Storage**: 20GB+ free space
- **Internet**: Stable connection for model downloads

## 🚨 Important Notes

### Model Download Times:
- **Primary LLM Model**: ~4.7GB, takes 5-15 minutes
- **Embedding Model**: ~1.5GB, takes 2-5 minutes
- **Total Setup Time**: 10-30 minutes depending on internet speed

### First Run Experience:
- Models are downloaded only once
- Subsequent runs will be much faster
- The application will work offline after initial setup

## 🛠️ Manual Setup (Alternative)

If you prefer manual setup or encounter issues:

### 1. Install Node.js
- Download from: https://nodejs.org/
- Choose LTS version (recommended)

### 2. Install Ollama
- Download from: https://ollama.ai/download
- Follow platform-specific instructions

### 3. Download Required Models
```bash
# Start Ollama
ollama serve

# Download models (in separate terminal)
ollama pull llama3.1:8b-instruct-q4_K_M
ollama pull nomic-embed-text
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Start Application
```bash
npm run dev:full
```

## 🔍 Troubleshooting

### Common Issues:

#### "Ollama not found"
- Ensure Ollama is installed and in PATH
- Try restarting the terminal after installation

#### "Models not available"
- Check if models were downloaded: `ollama list`
- Re-run setup script: `npm run setup`

#### "Port already in use"
- Check if another instance is running
- Kill existing processes: `pkill ollama` (macOS/Linux)

#### "Permission denied"
- Ensure scripts are executable: `chmod +x scripts/*.sh`
- Run with appropriate permissions

### Getting Help:
- Check Ollama status: `npm run check-ollama`
- View available models: `ollama list`
- Check application logs in the browser console

## 📱 Client Testing Instructions

Once setup is complete:

1. **Open Browser**: Navigate to `http://localhost:5173`
2. **Upload Documents**: Try uploading various file types (.docx, .txt, .md)
3. **Test Summarization**: Generate summaries with different style guides
4. **Test Chat**: Ask questions about uploaded content
5. **Performance**: Note processing times and responsiveness

## 🔄 Updates and Maintenance

### Updating the Application:
```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies (if needed)
npm install

# Restart the application
npm run dev:full
```

### Updating Models:
```bash
# Update specific model
ollama pull llama3.1:8b-instruct-q4_K_M

# Or update all models
ollama pull --all
```

## 📊 Performance Expectations

### Typical Performance on M2 MacBook Air (16GB RAM):
- **Model Loading**: 0-30 seconds (first run vs. cached)
- **Document Processing**: 1-3 minutes for 30-60 min transcripts
- **Chat Response**: 2-5 seconds for simple questions
- **Memory Usage**: 4-8GB during active processing

### Performance Tips:
- Close other applications during heavy processing
- Use smaller models for faster responses
- Process documents in smaller batches if needed

## 🎉 Success Criteria

The setup is successful when:
- ✅ Application opens in browser at `http://localhost:5173`
- ✅ Ollama status shows "Connected" in the UI
- ✅ Models are listed as available
- ✅ Document upload and processing works
- ✅ Chat functionality responds to questions

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review the troubleshooting section
3. Check application logs and console output
4. Contact the development team with specific error messages

---

**Happy Testing! 🚀**
