#!/usr/bin/env python3
"""
Debug script to test the ECAPA-TDNN model directly
"""
import torch
import speechbrain
from speechbrain.pretrained import EncoderClassifier
import numpy as np

def test_model_directly():
    """Test the model directly to understand its output"""
    
    print("🧪 Testing ECAPA-TDNN Model Directly")
    print("=" * 40)
    
    try:
        # Load the model
        print("📥 Loading ECAPA-TDNN model...")
        model = EncoderClassifier.from_hparams(
            source="speechbrain/spkrec-ecapa-voxceleb",
            savedir="pretrained_models/spkrec-ecapa-voxceleb"
        )
        print("✅ Model loaded successfully!")
        
        # Test with a dummy tensor to see what encode_batch returns
        print("\n🔍 Testing encode_batch with dummy data...")
        
        # Create a dummy audio tensor (1 second of silence at 16kHz)
        dummy_audio = torch.zeros(1, 16000)  # 1 second at 16kHz
        
        # Test encode_batch
        result = model.encode_batch([dummy_audio])
        
        print(f"📊 encode_batch result type: {type(result)}")
        print(f"📊 encode_batch result: {result}")
        
        if isinstance(result, torch.Tensor):
            print(f"📊 Tensor shape: {result.shape}")
            print(f"📊 Tensor dtype: {result.dtype}")
        elif isinstance(result, list):
            print(f"📊 List length: {len(result)}")
            for i, item in enumerate(result):
                print(f"📊 Item {i} type: {type(item)}")
                if isinstance(item, torch.Tensor):
                    print(f"📊 Item {i} shape: {item.shape}")
        
        # Test encode_batch with file path (if we have a test file)
        print("\n🔍 Testing encode_batch with file path...")
        
        # Try to find any audio file
        import os
        audio_files = []
        for ext in ['.wav', '.mp3', '.m4a', '.flac']:
            for file in os.listdir('.'):
                if file.endswith(ext):
                    audio_files.append(file)
        
        if audio_files:
            test_file = audio_files[0]
            print(f"🎵 Found test file: {test_file}")
            
            try:
                file_result = model.encode_batch([test_file])
                print(f"📊 File encode_batch result type: {type(file_result)}")
                
                if isinstance(file_result, torch.Tensor):
                    print(f"📊 File result shape: {file_result.shape}")
                    # Convert to numpy
                    numpy_result = file_result.detach().cpu().numpy()
                    print(f"📊 Numpy result shape: {numpy_result.shape}")
                    print(f"📊 Numpy result dtype: {numpy_result.dtype}")
                    print(f"📊 First 5 values: {numpy_result.flatten()[:5]}")
                    
                elif isinstance(file_result, list):
                    print(f"📊 File result list length: {len(file_result)}")
                    for i, item in enumerate(file_result):
                        print(f"📊 Item {i} type: {type(item)}")
                        if isinstance(item, torch.Tensor):
                            print(f"📊 Item {i} shape: {item.shape}")
                            numpy_item = item.detach().cpu().numpy()
                            print(f"📊 Numpy item shape: {numpy_item.shape}")
                            print(f"📊 First 5 values: {numpy_item.flatten()[:5]}")
                
            except Exception as e:
                print(f"❌ Error testing with file: {e}")
        else:
            print("⚠️ No audio files found for testing")
        
        print("\n✅ Debug test completed!")
        
    except Exception as e:
        print(f"❌ Error in debug test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_model_directly() 