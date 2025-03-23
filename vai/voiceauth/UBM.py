import numpy as np
import logging
from sklearn.mixture import GaussianMixture
import joblib
from scipy.io import wavfile
from feature_extraction import extract_features  # Importing the feature extraction function
from tqdm import tqdm  # Import tqdm for progress bar
import time
from multiprocessing import Pool
import os

# Configure logging for the main script as well (if not already done)
logging.basicConfig(filename='process.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def process_file(file_path):
    """Process a single WAV file and extract features."""
    try:
        rate, audio = wavfile.read(file_path)
        logging.info(f"Successfully read file: {os.path.basename(file_path)} with sample rate: {rate}")
        
        features = extract_features(audio, rate)
        
        if features is not None:
            logging.info(f"Features extracted from {os.path.basename(file_path)}: shape {features.shape}")
        
        return features
    
    except Exception as e:
        logging.error(f"Error reading file {file_path}: {e}")
        return None

def load_features_from_directory(directory):
    """Load all extracted features from WAV files in the specified directory."""
    features_list = []
    
    # List all WAV files in the directory
    wav_files = [f for f in os.listdir(directory) if f.endswith('.wav')]
    logging.info(f"Found {len(wav_files)} WAV files in '{directory}'.")

    # Use multiprocessing to extract features in parallel
    with Pool() as pool:
        results = list(tqdm(pool.imap(process_file, [os.path.join(directory, f) for f in wav_files]), total=len(wav_files)))

    # Filter out None results and concatenate features
    features_list = [result for result in results if result is not None]
    
    if features_list:
        all_features = np.vstack(features_list)
        logging.info(f"Total features concatenated: {all_features.shape}")
        return all_features
    else:
        logging.warning("No features were loaded. Please check your audio files.")
        return np.array([])

def train_ubm(features, n_components=64, max_iter=200, patience=10):
    """Train a Universal Background Model (UBM) using GMM with early stopping."""
    logging.info("Initializing Gaussian Mixture Model for UBM training.")
    
    ubm_model = GaussianMixture(n_components=n_components, covariance_type='diag', max_iter=max_iter)
    
    logging.info("Fitting the UBM model to the extracted features...")
    
    start_time = time.time()  # Start timing
    best_log_likelihood = -np.inf
    no_improvement_count = 0
    
    for iteration in range(max_iter):
        ubm_model.fit(features)
        current_log_likelihood = ubm_model.score(features) * len(features)  # Total log likelihood
        
        logging.info(f"Iteration {iteration + 1}/{max_iter}, Log Likelihood: {current_log_likelihood:.2f}")
        
        # Check for improvement
        if current_log_likelihood > best_log_likelihood:
            best_log_likelihood = current_log_likelihood
            no_improvement_count = 0  # Reset counter if we have an improvement
        else:
            no_improvement_count += 1
        
        # Check for early stopping
        if no_improvement_count >= patience:
            logging.info("Early stopping triggered.")
            break
    
    elapsed_time = time.time() - start_time  # Calculate elapsed time
    logging.info(f"UBM model training completed successfully in {elapsed_time:.2f} seconds.")
    
    return ubm_model

if __name__ == "__main__":
    # Directory containing WAV files for UBM training
    feature_directory = "Data/selected_wav"  # Update with your actual path

    # Load features from directory using the separate module
    logging.info('Starting feature loading...')
    all_features = load_features_from_directory(feature_directory)

    if all_features.size == 0:
        logging.error("No features loaded. Exiting.")
        exit(1)

    logging.info(f"Total features loaded: {all_features.shape}")

    # Train UBM
    n_components = 32  
    logging.info("Starting UBM training...")
    
    ubm_model = train_ubm(all_features, n_components)

    # Save the trained UBM model
    model_path = 'model/ubm_model.pkl'
    
    try:
        joblib.dump(ubm_model, model_path)
        logging.info(f"UBM model trained and saved successfully at {model_path}.")
        
    except Exception as e:
        logging.error(f"Error saving UBM model: {e}")