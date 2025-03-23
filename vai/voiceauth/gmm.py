import numpy as np  # Corrected import statement
import logging
from sklearn.mixture import GaussianMixture
import joblib
from scipy.io import wavfile
from voiceauth.feature_extraction import extract_features
from tqdm import tqdm
import time
from multiprocessing import Pool
import os

# Configure logging
logging.basicConfig(filename='gmm_training.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

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
    """Load and extract features from all WAV files in the specified directory."""
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
        all_features = np.vstack(features_list)  # Concatenate the features into a single array
        logging.info(f"Total features concatenated: {all_features.shape}")
        return all_features
    else:
        logging.warning("No features were loaded. Please check your audio files.")
        return np.array([])

def train_gmm(features, ubm_model_path, n_components):
    """Train a GMM using UBM as baseline."""
    
    # Load UBM model parameters
    ubm_model = joblib.load(ubm_model_path)
    
    # Check shapes of UBM parameters
    logging.info("UBM Means shape: {}".format(ubm_model.means_.shape))
    logging.info("UBM Covariances shape: {}".format(ubm_model.covariances_.shape))

    # Ensure that covariances_ is a 3D array where each covariance matrix is diagonal
    covariances = ubm_model.covariances_

    # Check if covariances has the shape (n_components, n_features)
    if covariances.ndim == 2:  # If covariance is diagonal (2D shape)
        covariances = np.expand_dims(covariances, axis=2)  # Add a third dimension to make it (n_components, n_features, n_features)
    
    # Regularize each covariance matrix (diagonal)
    regularized_covariances = covariances + 1e-10 * np.eye(covariances.shape[1])

    # Initialize the precision matrices (inverse of the covariance matrices)
    # Here we need to use the diagonal elements and invert them
    precisions_init = np.array([1.0 / regularized_covariances[i, :, i] for i in range(n_components)])

    # Initialize GMM with UBM parameters
    gmm_model = GaussianMixture(
        n_components=n_components,
        means_init=ubm_model.means_,
        precisions_init=precisions_init,  # Use the regularized precision matrix
        covariance_type='diag',
        max_iter=200
    )
    
    logging.info("Fitting the GMM model to the extracted features...")
    
    start_time = time.time()
    
    gmm_model.fit(features)
    
    elapsed_time = time.time() - start_time
    logging.info(f"GMM model training completed successfully in {elapsed_time:.2f} seconds.")
    
    return gmm_model

def save_gmm_model(gmm_model, model_path):
    """Save the trained GMM model."""
    try:
        joblib.dump(gmm_model, model_path)
        logging.info(f"GMM model trained and saved successfully at {model_path}.")
    except Exception as e:
        logging.error(f"Error saving GMM model: {e}")
