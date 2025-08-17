#!/usr/bin/env python3
"""
Test script for LLM Query Protection Protocol API

This script demonstrates how LLMs can query whether a voice is protected
by comparing against stored voiceprints in the Walrus blockchain.
"""

import requests
import json
import numpy as np
from pathlib import Path

# API endpoints
VOICE_SERVER_URL = "http://localhost:8000"
BACKEND_URL = "http://localhost:3001"

def test_is_protected_with_embedding():
    """Test the isProtected API with a pre-computed embedding"""
    print("🧪 Testing isProtected API with embedding...")
    
    # Create a mock embedding (192-dimensional vector like ECAPA-TDNN)
    mock_embedding = np.random.rand(192).tolist()
    
    # Test data
    test_data = {
        "embedding": json.dumps(mock_embedding),
        "threshold": 0.75,
        "top_k": 3
    }
    
    try:
        response = requests.post(
            f"{VOICE_SERVER_URL}/is-protected",
            data=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ API Response:")
            print(f"   Protected: {result.get('protected', False)}")
            print(f"   Confidence: {result.get('confidence', 0.0)}")
            print(f"   Total checked: {result.get('total_checked', 0)}")
            
            if result.get('matches'):
                print(f"   Top match: {result.get('owner', 'Unknown')}")
                print(f"   NFT link: {result.get('nft', 'None')}")
            
            return result
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

def test_is_protected_with_audio_file():
    """Test the isProtected API with an audio file"""
    print("\n🧪 Testing isProtected API with audio file...")
    
    # Look for a test audio file
    test_files = [
        "test_audio.wav",
        "test_audio.mp3", 
        "sample.wav",
        "sample.mp3"
    ]
    
    audio_file = None
    for file_name in test_files:
        if Path(file_name).exists():
            audio_file = file_name
            break
    
    if not audio_file:
        print("⚠️  No test audio file found. Skipping audio file test.")
        print("   Create a test_audio.wav or test_audio.mp3 file to test with audio.")
        return None
    
    try:
        with open(audio_file, 'rb') as f:
            files = {'file': (audio_file, f, 'audio/wav')}
            data = {
                'threshold': 0.75,
                'top_k': 3
            }
            
            response = requests.post(
                f"{VOICE_SERVER_URL}/is-protected",
                files=files,
                data=data,
                timeout=60
            )
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Audio API Response:")
            print(f"   Protected: {result.get('protected', False)}")
            print(f"   Confidence: {result.get('confidence', 0.0)}")
            print(f"   Total checked: {result.get('total_checked', 0)}")
            
            if result.get('matches'):
                print(f"   Top match: {result.get('owner', 'Unknown')}")
                print(f"   NFT link: {result.get('nft', 'None')}")
            
            return result
        else:
            print(f"❌ Audio API Error: {response.status_code}")
            print(f"   Response: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Audio request failed: {e}")
        return None

def setup_test_data():
    """Setup some test data in the backend"""
    print("\n🔧 Setting up test data...")
    
    # Note: No mock data needed - we only use real Walrus embeddings
    print("ℹ️  Using real Walrus embeddings from mappings file")
    print("ℹ️  No mock data will be created")

def check_servers():
    """Check if required servers are running"""
    print("🔍 Checking server status...")
    
    servers = [
        ("Voice Server", f"{VOICE_SERVER_URL}/health"),
        ("Backend Server", f"{BACKEND_URL}/health")
    ]
    
    all_running = True
    
    for name, url in servers:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {name}: Running")
            else:
                print(f"❌ {name}: Not responding properly")
                all_running = False
        except Exception as e:
            print(f"❌ {name}: Not running ({e})")
            all_running = False
    
    return all_running

def main():
    """Main test function"""
    print(" LLM Query Protection Protocol - Test Suite")
    print("=" * 50)
    
    # Check if servers are running
    if not check_servers():
        print("\n❌ Some servers are not running. Please start:")
        print("   - Voice server: python main.py")
        print("   - Backend server: npm run dev")
        return
    
    # Setup test data
    setup_test_data()
    
    # Test with embedding
    embedding_result = test_is_protected_with_embedding()
    
    # Test with audio file
    audio_result = test_is_protected_with_audio_file()
    
    print("\n📊 Test Summary:")
    print("=" * 30)
    
    if embedding_result:
        print(f"Embedding test: {'✅ PASSED' if embedding_result.get('protected') is not None else '❌ FAILED'}")
    
    if audio_result:
        print(f"Audio test: {'✅ PASSED' if audio_result.get('protected') is not None else '❌ FAILED'}")
    
    print("\n🎉 Test completed!")
    print("\n💡 Usage examples for LLMs:")
    print("   POST /is-protected")
    print("   - file: audio file (WAV/MP3/M4A/FLAC)")
    print("   - embedding: JSON string of embedding vector")
    print("   - threshold: similarity threshold (default: 0.75)")
    print("   - top_k: number of top matches to return (default: 5)")

if __name__ == "__main__":
    main() 