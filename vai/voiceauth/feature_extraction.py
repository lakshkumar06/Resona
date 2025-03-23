import numpy as np
import logging
from sklearn.feature_selection import VarianceThreshold
from sklearn.preprocessing import RobustScaler
import python_speech_features as mfcc
import os

# Configure logging
logging.basicConfig(filename='process.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def calculate_delta(features):
    """
    Calculate the delta MFCC of the input array.
    :param features: 2D array of MFCC features
    :return: 2D array of delta features
    """
    rows, cols = features.shape
    deltas = np.zeros((rows, cols))
    
    for i in range(rows):
        if i == 0:
            deltas[i] = features[i]
        elif i == rows - 1:
            deltas[i] = features[i]
        else:
            deltas[i] = (features[i + 1] - features[i - 1]) / 2
            
    return deltas

def extract_features(audio, rate):
    """
    Extracts MFCC vectors from the audio file and combines them with delta MFCCs,
    creating a feature vector.
    :param audio: Input audio signal
    :param rate: Sampling rate of the audio file
    :return: Combined feature vector of MFCCs and their deltas
    """
    try:
        # Extract MFCC features with defined parameters
        mfcc_feat = mfcc.mfcc(audio, rate, winlen=0.025, winstep=0.01, numcep=20, appendEnergy=True, nfft=2048)
        
        # Log the shape of extracted MFCC features
        logging.info(f"Extracted MFCC features shape: {mfcc_feat.shape}")

        # Check feature variance before scaling
        feature_variances = np.var(mfcc_feat, axis=0)
        logging.info("Feature Variance: {}".format(feature_variances))

        # Filter low variance features only if there are significant variances
        if np.all(feature_variances < 1e-4):
            logging.warning("All features have low variance; skipping filtering.")
        else:
            selector = VarianceThreshold(threshold=1e-5)  # Adjusted threshold to retain more features
            mfcc_feat = selector.fit_transform(mfcc_feat)

        # Scale the MFCC features using RobustScaler
        scaler = RobustScaler()
        mfcc_feat = scaler.fit_transform(mfcc_feat)
        
        # Calculate delta features
        delta_feat = calculate_delta(mfcc_feat)
        
        # Combine MFCC and delta features
        combined_features = np.hstack((mfcc_feat, delta_feat))
        
        return combined_features
    
    except Exception as e:
        logging.error(f"Error extracting features: {e}")
        return None
