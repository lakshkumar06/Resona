from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import os
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
import os
import logging
# from register_user import record_audio_for_user  # Importing the record_audio_for_user function
from voiceauth.gmm import load_features_from_directory, train_gmm, save_gmm_model
import sounddevice as sd
import numpy as np
import wavio
from DeepfakeDetection.DataProcessing import process_audio
from DeepfakeDetection.run_record import DeepfakeDetector
from DeepfakeDetection.train import Deep4SNet
import joblib
from scipy.io import wavfile
from voiceauth.feature_extraction import extract_features
from .blockchain import Blockchain
import hashlib
import time
from datetime import datetime



class Audio(APIView):
    """"
    View to handle audio file uploads.
    """ 
    permission_classes = ['AllowAny']
    
    @csrf_exempt
    def save_audio(request):
        if request.method == "POST":

            username = request.user.name
            audio_file = request.FILES.get("audio")

            if not username or not audio_file:
                return JsonResponse({"error": "Missing username or audio file"}, status=400)

            user_dir = os.path.join("Data", username)
            os.makedirs(user_dir, exist_ok=True)

            file_path = os.path.join(user_dir, f"sample_{len(os.listdir(user_dir)) + 1}.wav")
            
            with open(file_path, "wb") as f:
                for chunk in audio_file.chunks():
                    f.write(chunk)

            return JsonResponse({"message": "Audio saved", "file_path": file_path})

        return JsonResponse({"error": "Invalid request"}, status=400)

    def clear_audio(request):
        """
        View to clear all audio files for a user.
        """
        if request.method == "POST":
            username = request.user.name
            user_dir = os.path.join("Data", username)

            if os.path.exists(user_dir):
                for file in os.listdir(user_dir):
                    file_path = os.path.join(user_dir, file)
                    if os.path.isfile(file_path):
                        os.remove(file_path)

                return JsonResponse({"message": "All audio files cleared"})
            else:
                return JsonResponse({"error": "User directory does not exist"}, status=404)

        return JsonResponse({"error": "Invalid request"}, status=400)

    @csrf_exempt
    def create_watermark(request):
        """
        View to create a watermark for the audio file and store it in blockchain.
        """
        if request.method == "POST":
            username = request.user.name
            audio_directory = os.path.join("Data", username)
            print(audio_directory)

        try:
            # Ensure the directory exists
            ubm_model_path = r'model/ubm_model.pkl'  # Replace with actual path to your UBM model
            model_save_directory = r'voiceauth/model'
            os.makedirs(model_save_directory, exist_ok=True)  # Create directory if it doesn't exist
            gmm_model_save_path = os.path.join(model_save_directory, f"{username}.gmm")  # Path where GMM will be saved
            print(f"GMM model will be saved to: {gmm_model_save_path}")
            n_components = 32  # Adjust as needed
            print(f"Number of components for GMM: {n_components}")
            
            # Load features from the audio directory
            print(f"Loading features from directory: {audio_directory}")
            features = load_features_from_directory(audio_directory)
            print(f"Features loaded. Number of features: {features.shape[0]}")
            if features.size == 0:
                print("No valid features extracted. Please check your audio recordings.")
                return JsonResponse({"error": "No valid features extracted"}, status=400)
            
            # Train GMM model
            print(f"Training GMM model with {n_components} components...")
            gmm_model = train_gmm(features, ubm_model_path, n_components)
            print("GMM model trained successfully.")
            
            # Save the trained GMM model with the username
            print(f"Saving the trained GMM model to: {gmm_model_save_path}")
            save_gmm_model(gmm_model, gmm_model_save_path)
            print(f"Model saved successfully for user: {username}")

            # Calculate hash of the GMM model file
            with open(gmm_model_save_path, 'rb') as f:
                model_hash = hashlib.sha256(f.read()).hexdigest()

            # Store in blockchain
            blockchain_path = os.path.join('voiceauth', 'blockchain.json')
            blockchain = Blockchain.load_chain(blockchain_path)
            
            # Create block data
            block_data = {
                "username": username,
                "model_hash": model_hash,
                "model_path": gmm_model_save_path,
                "timestamp": time.time()
            }
            
            # Add block to blockchain
            blockchain.add_block(block_data)
            
            # Save updated blockchain
            blockchain.save_chain(blockchain_path)
            print(f"GMM model hash stored in blockchain for user: {username}")
            
        except Exception as e:
            print(f"An error occurred during the sign-up process: {e}")
            logging.error(f"Error during sign up for {username}: {e}")
            return JsonResponse({"error": "An error occurred during the sign-up process"}, status=500)
        return JsonResponse({"message": "Watermark created and stored in blockchain successfully"}, status=200)

    @csrf_exempt
    def test_watermark(request):
        """
        View to test watermark by checking recorded audio against stored GMM model.
        """
        if request.method == "POST":
            try:
                username = request.user.name
                user_dir = os.path.join("recordings", username)
                os.makedirs(user_dir, exist_ok=True)

                # Get the uploaded audio file from the request
                audio_file = request.FILES.get('audio')
                if not audio_file:
                    return JsonResponse({"error": "No audio file provided"}, status=400)

                # Save the uploaded file
                output_file = os.path.join(user_dir, f"{username}_recording.wav")
                with open(output_file, 'wb+') as destination:
                    for chunk in audio_file.chunks():
                        destination.write(chunk)

                # Process audio file
                cutoff_frequency = 4000
                histogram_path = process_audio(output_file, cutoff_frequency=cutoff_frequency, output_dir=user_dir)

                # Initialize DeepfakeDetector and predict
                detector = DeepfakeDetector(r"DeepfakeDetection/models/best_model.pth")
                result = detector.predict_single(histogram_path)

                if not result:
                    return JsonResponse({"error": "Failed to process audio"}, status=400)

                if result['prediction'] == 'REAL':
                    model_path = os.path.join(r'voiceauth/model', f"{username}.gmm")
                    
                    # Known log-likelihoods from authentication samples
                    known_log_likelihoods = [-36.5, -35.8, -37.2]
                    
                    gmm_model = joblib.load(model_path)
                    rate, audio = wavfile.read(output_file)
                    features = extract_features(audio, rate)
                    
                    log_likelihood = gmm_model.score(features)
                    threshold = np.percentile(known_log_likelihoods, 90) + 6.0
                    
                    if log_likelihood > threshold:
                        return JsonResponse({
                            "message": "Authentication successful",
                            "log_likelihood": log_likelihood,
                            "threshold": threshold,
                            "deepfake_results": result
                        })
                    else:
                        return JsonResponse({
                            "error": "Authentication failed",
                            "log_likelihood": log_likelihood, 
                            "threshold": threshold,
                            "deepfake_results": result
                        }, status=401)
                else:
                    return JsonResponse({
                        "error": "Cloned voice detected",
                        "deepfake_results": result
                    }, status=401)

            except Exception as e:
                logging.error(f"Error during authentication for {username}: {e}")
                return JsonResponse({"error": str(e)}, status=500)

        return JsonResponse({"error": "Invalid request method"}, status=400)

    def display_blockchain(request):
        """
        View to display blockchain data to users.
        Returns all watermarks (GMM models) stored in the blockchain.
        """
        if request.method == "GET":
            try:
                # Load the blockchain
                blockchain_path = os.path.join('voiceauth', 'blockchain.json')
                blockchain = Blockchain.load_chain(blockchain_path)
                
                # Skip the genesis block and format the data
                blockchain_data = []
                for block in blockchain.chain[1:]:  # Skip genesis block
                    block_data = {
                        "username": block.data["username"],
                        "model_hash": block.data["model_hash"],
                        "model_path": block.data["model_path"],
                        "timestamp": datetime.fromtimestamp(block.data["timestamp"]).strftime('%Y-%m-%d %H:%M:%S'),
                        "block_index": block.index,
                        "block_hash": block.hash
                    }
                    blockchain_data.append(block_data)
                
                # Sort by timestamp in descending order (newest first)
                blockchain_data.sort(key=lambda x: x["timestamp"], reverse=True)
                
                return JsonResponse({
                    "message": "Blockchain data retrieved successfully",
                    "total_blocks": len(blockchain_data),
                    "blockchain": blockchain_data
                })
                
            except Exception as e:
                logging.error(f"Error retrieving blockchain data: {e}")
                return JsonResponse({
                    "error": "Failed to retrieve blockchain data",
                    "details": str(e)
                }, status=500)
        
        return JsonResponse({"error": "Invalid request method"}, status=400)

    def get_user_watermark(request):
        """
        View to get a specific user's watermark from the blockchain.
        """
        if request.method == "GET":
            try:
                username = request.user.name
                blockchain_path = os.path.join('voiceauth', 'blockchain.json')
                blockchain = Blockchain.load_chain(blockchain_path)
                
                # Find the user's watermark in the blockchain
                user_watermark = None
                for block in blockchain.chain[1:]:  # Skip genesis block
                    if block.data["username"] == username:
                        user_watermark = {
                            "username": block.data["username"],
                            "model_hash": block.data["model_hash"],
                            "model_path": block.data["model_path"],
                            "timestamp": datetime.fromtimestamp(block.data["timestamp"]).strftime('%Y-%m-%d %H:%M:%S'),
                            "block_index": block.index,
                            "block_hash": block.hash
                        }
                        break
                
                if user_watermark:
                    return JsonResponse({
                        "message": "User watermark retrieved successfully",
                        "watermark": user_watermark
                    })
                else:
                    return JsonResponse({
                        "error": "No watermark found for this user"
                    }, status=404)
                
            except Exception as e:
                logging.error(f"Error retrieving user watermark: {e}")
                return JsonResponse({
                    "error": "Failed to retrieve user watermark",
                    "details": str(e)
                }, status=500)
        
        return JsonResponse({"error": "Invalid request method"}, status=400)