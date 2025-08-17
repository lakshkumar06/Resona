from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import torch
import speechbrain
from speechbrain.pretrained import EncoderClassifier
import os
import json
from pathlib import Path
import tempfile
from pydub import AudioSegment
import numpy as np


from typing import List, Dict, Any, Optional
import subprocess
import time

app = FastAPI(title="Voice Authentication Server", version="1.0.0")

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create embeddings directory
EMBEDDINGS_DIR = Path("embeddings")
EMBEDDINGS_DIR.mkdir(exist_ok=True)

# Initialize ECAPA-TDNN model
try:
    # Use ECAPA-TDNN model from SpeechBrain
    model = EncoderClassifier.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir="pretrained_models/spkrec-ecapa-voxceleb"
    )
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Walrus blockchain integration - frontend handles direct queries

def save_embedding(username: str, embedding):
    """Save embedding to file"""
    embedding_path = EMBEDDINGS_DIR / f"{username}.json"
    embedding_data = {
        "username": username,
        "embedding": embedding,  # embedding is already a list
        "model": "ecapa-tdnn"
    }
    
    with open(embedding_path, 'w') as f:
        json.dump(embedding_data, f)
    
    return embedding_path

def load_all_embeddings():
    """Load all saved embeddings from the embeddings directory"""
    embeddings = {}
    for json_file in EMBEDDINGS_DIR.glob("*.json"):
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)
                embeddings[data["username"]] = np.array(data["embedding"])
        except Exception as e:
            print(f"Error loading {json_file}: {e}")
    return embeddings

async def get_walrus_embedding_by_blob_id(blob_id: str) -> List[float] | None:
    """Retrieve actual embedding data from Walrus storage by blob ID"""
    try:
        # This would be a call to the Walrus API or SDK
        # For now, we'll return None since we don't have direct Walrus access in the backend
        # The frontend handles Walrus operations directly
        
        # In a production environment, you would:
        # 1. Use the Walrus SDK to connect to the network
        # 2. Call the readBlob method with the blob ID
        # 3. Parse the JSON response to extract the embedding
        
        return None
        
    except Exception as e:
        return None

async def get_all_walrus_embeddings() -> List[Dict[str, Any]]:
    """Retrieve all voice fingerprints from Walrus blockchain using stored mappings"""
    try:
        # First check if we have session embeddings from the frontend
        global session_walrus_embeddings
        if session_walrus_embeddings:
            return session_walrus_embeddings
        
        import json
        import os
        
        # Read Walrus mappings from backend data
        mappings_path = os.path.abspath("../backend/data/walrus_mappings.json")
        if not os.path.exists(mappings_path):
            return []
        
        with open(mappings_path, 'r') as f:
            mappings = json.load(f)
        
        # For now, we'll return the mappings as a basic structure
        # In a full implementation, you would retrieve the actual embeddings from Walrus
        # using the blob IDs stored in the mappings
        stored_embeddings = []
        
        for wallet_address, blob_id in mappings.items():
            # Try to retrieve the actual embedding from Walrus
            actual_embedding = await get_walrus_embedding_by_blob_id(blob_id)
            
            if actual_embedding:
                # We have the actual embedding
                stored_embeddings.append({
                    "walletAddress": wallet_address,
                    "blobId": blob_id,
                    "embedding": actual_embedding,
                    "model": "ecapa-tdnn",
                    "timestamp": int(time.time() * 1000),
                    "metadata": {"source": "walrus", "blobId": blob_id}
                })
            else:
                # Fallback to placeholder - this will be handled by the frontend
                stored_embeddings.append({
                    "walletAddress": wallet_address,
                    "blobId": blob_id,
                    "embedding": [],  # Empty embedding will be skipped in comparison
                    "model": "ecapa-tdnn",
                    "timestamp": int(time.time() * 1000),
                    "metadata": {"source": "walrus", "blobId": blob_id, "placeholder": True}
                })
        
        return stored_embeddings
        
    except Exception as e:
        return []

def process_audio_file(audio_file_path: str) -> List[float]:
    """Process audio file and extract embedding"""
    try:
        from pydub import AudioSegment
        import io
        import wave
        
        print(f"🔍 Processing audio file: {audio_file_path}")
        
        # Load and convert audio
        audio = AudioSegment.from_file(audio_file_path)
        print(f"📊 Original audio: {audio.channels} channels, {audio.frame_rate} Hz, {len(audio)} ms")
        
        # Convert to mono and 16kHz
        if audio.channels > 1:
            audio = audio.set_channels(1)
            print(f"🔄 Converted to mono")
        if audio.frame_rate != 16000:
            audio = audio.set_frame_rate(16000)
            print(f"🔄 Converted to 16kHz")
        
        print(f"📊 Processed audio: {audio.channels} channels, {audio.frame_rate} Hz, {len(audio)} ms")
        
        # Export as WAV
        buffer = io.BytesIO()
        audio.export(buffer, format="wav")
        buffer.seek(0)
        
        # Convert to numpy array
        with wave.open(buffer, 'rb') as wav_file:
            frames = wav_file.readframes(wav_file.getnframes())
            audio_data = np.frombuffer(frames, dtype=np.int16)
            audio_data = audio_data.astype(np.float32) / 32768.0
        
        print(f"📊 Audio data: shape={audio_data.shape}, range=[{audio_data.min():.4f}, {audio_data.max():.4f}], mean={audio_data.mean():.4f}")
        
        # Convert to tensor and process
        wav = torch.tensor(audio_data).unsqueeze(0)
        print(f"📊 Tensor shape: {wav.shape}")
        
        if model is None:
            raise Exception("Voice model not loaded")
        
        print(f"🔍 Generating embedding with model: {type(model).__name__}")
        embeddings = model.encode_batch(wav)
        embedding = embeddings.detach().cpu().numpy()
        
        print(f"📊 Raw embedding: shape={embedding.shape}, type={embedding.dtype}")
        
        # Ensure we get a 1D array - flatten if needed
        if embedding.ndim > 1:
            embedding = embedding.flatten()
            print(f"🔄 Flattened embedding to shape: {embedding.shape}")
        
        # Additional safety check - ensure it's a 1D array
        if embedding.ndim != 1:
            embedding = embedding.ravel()
            print(f"🔄 Raveled embedding to shape: {embedding.shape}")
        
        # Convert to list and ensure all elements are numbers
        embedding_list = embedding.tolist()
        
        print(f"📊 Final embedding: length={len(embedding_list)}, range=[{min(embedding_list):.6f}, {max(embedding_list):.6f}], mean={np.mean(embedding_list):.6f}")
        print(f"📊 First 5 values: {embedding_list[:5]}")
        print(f"📊 Last 5 values: {embedding_list[-5:]}")
        
        return embedding_list
        
    except Exception as e:
        print(f"❌ Error in process_audio_file: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")



def zk_verify_embeddings(embedding1, embedding2, input_json_path=None, wasm_path=None, witness_path=None, js_path=None):
    """
    DEPRECATED: This function is no longer used. Voice authentication is now handled by the TypeScript backend.
    """
    raise NotImplementedError("Voice authentication moved to TypeScript backend. Use http://localhost:3001/api/zk/prove-similarity")

@app.get("/")
async def root():
    return {"message": "Voice Authentication Server is running!"}

@app.get("/health")
async def health_check():
    return {"status": "ok", "model_loaded": model is not None}

@app.post("/generate-embedding")
async def generate_embedding(
    file: UploadFile = File(...),
    username: str = Form(...),
    temporary: bool = Form(False)
):
    """
    Generate voice embedding from uploaded audio file
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Voice model not loaded")
    
    # Validate file type
    if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a', '.flac')):
        raise HTTPException(
            status_code=400, 
            detail="Only audio files (.wav, .mp3, .m4a, .flac) are supported"
        )
    
    try:
        print(f" Starting voice embedding generation for user: {username}")
        print(f"📁 File: {file.filename}, Size: {file.size} bytes, Type: {file.content_type}")
        
        # Create temporary file
        print("🔄 Creating temporary file...")
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
            # Write uploaded file to temp file
            content = await file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
            print(f"✅ Temporary file created: {temp_file_path}")
        
        # Process audio and generate embedding
        print("🎵 Processing audio file...")
        
        # Add delay for demo visibility
        import time
        print("⏳ Processing audio (this takes time in real scenarios)...")
        time.sleep(1.5)  # 1.5 second delay for demo
        
        embedding = process_audio_file(temp_file_path)
        print(f"✅ Voice embedding generated successfully! Length: {len(embedding)} dimensions")
        
        # Only save embedding if not temporary
        embedding_path = None
        if not temporary:
            print("💾 Saving embedding to local storage...")
            embedding_path = save_embedding(username, embedding)
            print(f"✅ Embedding saved to: {embedding_path}")
        else:
            print("ℹ️ Skipping local storage (temporary mode)")
        
        # Clean up temp file
        print("🧹 Cleaning up temporary file...")
        os.unlink(temp_file_path)
        print("✅ Temporary file cleaned up")
        
        print(f"🎉 Voice embedding generation completed for {username}")
        
        return {
            "success": True,
            "username": username,
            "embedding": embedding,  # embedding is already a list from process_audio_file
            "embedding_shape": [len(embedding)],  # Convert to list since embedding is already a list
            "embedding_path": str(embedding_path) if embedding_path else None,
            "message": f"Voice embedding generated{' and saved' if not temporary else ''} for {username}"
        }
        
    except Exception as e:
        print(f"❌ Error in generate_embedding: {e}")
        # Clean up temp file if it exists
        if 'temp_file_path' in locals():
            try:
                os.unlink(temp_file_path)
                print("🧹 Cleaned up temporary file after error")
            except:
                pass
        
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.get("/embeddings/{username}")
async def get_embedding(username: str):
    """Get saved embedding for a user"""
    embedding_path = EMBEDDINGS_DIR / f"{username}.json"
    
    if not embedding_path.exists():
        raise HTTPException(status_code=404, detail=f"No embedding found for user: {username}")
    
    try:
        with open(embedding_path, 'r') as f:
            embedding_data = json.load(f)
        
        return embedding_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading embedding: {str(e)}")

@app.post("/authenticate")
async def authenticate_voice(
    file: UploadFile = File(None),
    target_username: str = Form(None),
    pre_generated_embedding: str = Form(None)
):
    """
    DEPRECATED: This endpoint is deprecated. Use the TypeScript backend for authentication.
    This server only handles embedding generation.
    """
    raise HTTPException(
        status_code=410, 
        detail="Authentication endpoint deprecated. Use the TypeScript backend at http://localhost:3001/api/zk/prove-similarity for voice authentication."
    )

@app.post("/is-protected")
async def is_protected(
    file: Optional[UploadFile] = File(None),
    embedding: Optional[str] = Form(None),
    threshold: float = Form(0.75),
    top_k: int = Form(5)
):
    """
    LLM Query Protection Protocol API
    
    Check if a voice is protected by comparing against stored voiceprints in Walrus blockchain.
    
    Accepts either:
    - Audio file (WAV/MP3/M4A/FLAC)
    - Pre-computed embedding as JSON string
    
    Returns:
    - protected: boolean indicating if voice matches any stored fingerprint
    - matches: list of top matches with metadata
    - confidence: highest similarity score
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Voice model not loaded")
    
    query_embedding = None
    
    # Process input - either audio file or embedding
    if file:
        # Validate file type
        if not file.filename.lower().endswith(('.wav', '.mp3', '.m4a', '.flac')):
            raise HTTPException(
                status_code=400, 
                detail="Only audio files (.wav, .mp3, .m4a, .flac) are supported"
            )
        
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.split('.')[-1]}") as temp_file:
                content = await file.read()
                temp_file.write(content)
                temp_file_path = temp_file.name
            
            # Process audio and generate embedding
            query_embedding = process_audio_file(temp_file_path)
            
            # Clean up temp file
            os.unlink(temp_file_path)
            
        except Exception as e:
            if 'temp_file_path' in locals():
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
            raise HTTPException(status_code=500, detail=f"Error processing audio file: {str(e)}")
    
    elif embedding:
        try:
            # Parse embedding from JSON string
            embedding_data = json.loads(embedding)
            if isinstance(embedding_data, list):
                query_embedding = np.array(embedding_data)
            elif isinstance(embedding_data, dict) and "embedding" in embedding_data:
                query_embedding = np.array(embedding_data["embedding"])
            else:
                raise ValueError("Invalid embedding format")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid embedding format: {str(e)}")
    
    else:
        raise HTTPException(status_code=400, detail="Either audio file or embedding must be provided")
    
    if query_embedding is None:
        raise HTTPException(status_code=500, detail="Failed to generate query embedding")
    
    try:
        # Get all stored embeddings from Walrus blockchain
        stored_embeddings = await get_all_walrus_embeddings()
        
        if not stored_embeddings:
            return {
                "protected": False,
                "matches": [],
                "confidence": 0.0,
                "message": "No protected voices found in database",
                "total_checked": 0
            }
        
        # Find best matches
        match_found = False
        matched_wallet = None
        best_similarity = 0.0
        total_checked = 0
        
        for stored_data in stored_embeddings:
            total_checked += 1
            stored_embedding = np.array(stored_data.get("embedding", []))
            if len(stored_embedding) == 0:
                continue
            
            similarity = zk_verify_embeddings(query_embedding, stored_embedding)
            if similarity and similarity > best_similarity:
                match_found = True
                matched_wallet = stored_data.get("walletAddress", "unknown")
                best_similarity = similarity
                # Early termination: if we find a match above threshold, we can stop
                if similarity >= threshold:
                    print(f"🚨 VOICE PROTECTION MATCH FOUND with wallet {matched_wallet} at similarity {similarity}")
                    break
        
        # Determine if voice is protected
        is_protected = match_found
        highest_confidence = best_similarity if match_found else 0.0
        
        # Prepare response
        response = {
            "protected": is_protected,
            "confidence": highest_confidence,
            "matches": [], # No direct top_k matches here as zk-SNARK is binary
            "total_checked": total_checked,
            "threshold_used": threshold
        }
        
        # Add metadata for top match if found
        if match_found:
            response.update({
                "owner": matched_wallet,
                "nft": None, # No direct nft_link here as zk-SNARK is binary
                "timestamp": 0, # No direct timestamp here as zk-SNARK is binary
                "model": "ecapa-tdnn" # Assuming a default model for zk-SNARK
            })
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error checking voice protection: {str(e)}")

@app.post("/submit-walrus-embeddings")
async def submit_walrus_embeddings(embeddings: List[Dict[str, Any]]):
    """
    Accept Walrus embeddings from frontend for authentication
    This allows the backend to use actual embedding data instead of placeholders
    """
    try:
        # Store the embeddings in memory for this session
        # In production, you might want to store this in a database or cache
        global session_walrus_embeddings
        session_walrus_embeddings = embeddings
        
        return {
            "success": True,
            "message": f"Successfully received {len(embeddings)} Walrus embeddings",
            "count": len(embeddings)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing Walrus embeddings: {str(e)}")

@app.get("/walrus-mappings")
async def get_walrus_mappings():
    """
    Get Walrus mappings for voice authentication
    """
    try:
        import json
        import os
        
        # Try to read from the backend data directory
        mappings_path = os.path.abspath("../backend/data/walrus_mappings.json")
        if not os.path.exists(mappings_path):
            # Fallback to voice-server directory if backend path doesn't exist
            mappings_path = os.path.abspath("walrus_mappings.json")
        
        if os.path.exists(mappings_path):
            with open(mappings_path, 'r') as f:
                mappings = json.load(f)
            
            return {"mappings": mappings}
        else:
            return {"mappings": {}, "error": "Mappings file not found"}
            
    except Exception as e:
        return {"mappings": {}, "error": f"Error reading mappings: {str(e)}"}

# Global variable to store session embeddings
session_walrus_embeddings = []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 