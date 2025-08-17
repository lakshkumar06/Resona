# Voice Server

FastAPI server for voice authentication using ECAPA-TDNN voice embedding generation.

## Features

✅ **FastAPI server** with CORS support  
✅ **ECAPA-TDNN voice embedding** generation using SpeechBrain  
✅ **Audio file upload** support (.wav, .mp3, .m4a, .flac)  
✅ **Voice embedding storage** in JSON format  
✅ **Voice authentication** with zk-SNARK circuit verification  
✅ **Health check endpoint** for monitoring  

## Setup

### 1. Create Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Start the Server
```bash
# Option 1: Using the startup script
python start_server.py

# Option 2: Direct uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server will be available at: http://localhost:8000

## API Endpoints

### Health Check
- **GET** `/health` - Check server status and model loading

### Voice Embedding Generation
- **POST** `/generate-embedding` - Generate voice embedding from audio file
  - Parameters:
    - `file`: Audio file (.wav, .mp3, .m4a, .flac)
    - `username`: Username for embedding storage

### Retrieve Embeddings
- **GET** `/embeddings/{username}` - Get saved embedding for a user

### Voice Authentication
- **POST** `/authenticate` - Authenticate voice by comparing with stored embeddings
  - Parameters:
    - `file`: Audio file (.wav, .mp3, .m4a, .flac)
    - `target_username`: Optional username to match against (if not provided, matches against all users)
  - Returns:
    - `authenticated`: Boolean indicating if authentication succeeded
    - `best_match`: Username of the best matching voice
    - `similarity_score`: zk-SNARK verification score (0-1)
    - `threshold`: Authentication threshold (default: 0.75)
    - `message`: Human-readable result message

## Usage Example

```bash
# Test health endpoint
curl http://localhost:8000/health

# Generate embedding (using curl)
curl -X POST "http://localhost:8000/generate-embedding" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@voice_sample.wav" \
  -F "username=john_doe"

# Authenticate voice (using curl)
curl -X POST "http://localhost:8000/authenticate" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@voice_sample.wav" \
  -F "target_username=david"
```

## File Structure

```
voice-server/
├── main.py              # FastAPI application
├── start_server.py      # Startup script
├── requirements.txt     # Python dependencies
├── debug_model.py       # Debug script for model testing
├── test_embedding.py    # Test script for embedding generation
├── test_authentication.py # Test script for authentication endpoint
├── embeddings/          # Stored voice embeddings
└── pretrained_models/   # Downloaded ECAPA-TDNN model
```

## Model Information

- **Model**: ECAPA-TDNN (Embedding and Clustering for Speaker Recognition)
- **Source**: SpeechBrain pretrained model
- **Embedding Dimension**: 192-dimensional vector
- **Use Case**: Speaker verification and identification

## Troubleshooting

### Common Issues

1. **"list object has no attribute 'shape'" Error**
   - **Cause**: The model's `encode_batch` method expects a tensor, not a list
   - **Solution**: Fixed in the current version - the code now properly loads audio and converts to tensor format

2. **TorchAudio Backend Warning**
   - **Cause**: SpeechBrain can't find a working torchaudio backend
   - **Impact**: Audio files may fail to load
   - **Solution**: The current implementation uses the model's built-in audio loading which handles this

3. **Model Loading Issues**
   - **Cause**: Network issues or missing dependencies
   - **Solution**: Check internet connection and ensure all dependencies are installed

### Testing

Use the included test scripts to verify functionality:

```bash
# Test model directly
python debug_model.py

# Test embedding generation (requires audio file)
python test_embedding.py

# Test authentication endpoint
python test_authentication.py
```

## Status
✅ **Active** - Ready for voice authentication processing 