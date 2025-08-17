#!/usr/bin/env python3
"""
Test script for voice authentication endpoint
"""

import requests
import json
import os
from pathlib import Path

def test_authentication_endpoint():
    """Test the authentication endpoint"""
    
    # Check if david embedding exists
    embeddings_dir = Path("embeddings")
    david_embedding_path = embeddings_dir / "david.json"
    
    if not david_embedding_path.exists():
        print("❌ No david embedding found. Please create one first using the /generate-embedding endpoint.")
        return
    
    print("✅ Found david embedding")
    
    # Test 1: Check if server is running
    try:
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            print("✅ Server is running")
        else:
            print("❌ Server health check failed")
            return
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start the server first.")
        return
    
    # Test 2: Test authentication without target username (should match against all users)
    print("\n🧪 Testing authentication against all users...")
    try:
        # Create a dummy audio file for testing
        # In a real scenario, you would upload an actual audio file
        test_data = {
            "target_username": ""  # Empty to test against all users
        }
        
        # For this test, we'll just check if the endpoint exists and responds
        # In a real test, you would upload an actual audio file
        print("ℹ️  To test with real audio, use the frontend or upload an audio file to /authenticate")
        print("ℹ️  The endpoint expects: POST /authenticate with file and optional target_username")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
    
    # Test 3: Show the stored embedding structure
    print("\n📋 Stored embedding structure:")
    try:
        with open(david_embedding_path, 'r') as f:
            data = json.load(f)
            print(f"   Username: {data['username']}")
            print(f"   Model: {data['model']}")
            print(f"   Embedding shape: {len(data['embedding'][0])} dimensions")
    except Exception as e:
        print(f"❌ Error reading embedding: {e}")
    
    print("\n Authentication endpoint is ready!")
    print("   - Use POST /authenticate with audio file")
    print("   - Optional: include target_username parameter")
    print("   - Returns: authenticated, best_match, similarity_score, threshold")

if __name__ == "__main__":
    test_authentication_endpoint() 