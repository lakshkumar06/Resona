#!/usr/bin/env python3
"""
Test script for voice embedding generation
"""
import sys
import os
import numpy as np
from pathlib import Path

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import process_audio_file, save_embedding

def test_embedding_generation():
    """Test the embedding generation with a sample audio file"""
    
    # Check if we have any audio files in the current directory
    audio_extensions = ['.wav', '.mp3', '.m4a', '.flac']
    audio_files = []
    
    for ext in audio_extensions:
        audio_files.extend(Path('.').glob(f'*{ext}'))
    
    if not audio_files:
        print("❌ No audio files found for testing.")
        print("Please place a .wav, .mp3, .m4a, or .flac file in this directory.")
        return False
    
    # Use the first audio file found
    test_file = str(audio_files[0])
    print(f"🎵 Testing with audio file: {test_file}")
    
    try:
        # Generate embedding
        print("🔄 Generating embedding...")
        embedding = process_audio_file(test_file)
        
        print(f"✅ Embedding generated successfully!")
        print(f"📊 Embedding shape: {embedding.shape}")
        print(f"📊 Embedding type: {type(embedding)}")
        print(f"📊 Embedding dtype: {embedding.dtype}")
        print(f"📊 First 5 values: {embedding[:5]}")
        
        # Test saving
        print("💾 Testing embedding save...")
        save_path = save_embedding("test_user", embedding)
        print(f"✅ Embedding saved to: {save_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Voice Embedding Generation")
    print("=" * 40)
    
    success = test_embedding_generation()
    
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Tests failed!")
        sys.exit(1) 