import React, { useState, useEffect } from 'react';
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import axios from 'axios';
import BlockchainInfo from './BlockchainInfo';

const FingerprintChecker: React.FC = () => {
  const { user, primaryWallet } = useDynamicContext();
  const [fingerprintStatus, setFingerprintStatus] = useState<{
    exists: boolean;
    loading: boolean;
    error: string | null;
  }>({
    exists: false,
    loading: false,
    error: null,
  });

  const checkFingerprint = async (walletAddress: string) => {
    setFingerprintStatus({ exists: false, loading: true, error: null });
    
    try {
      // Check both backend and blockchain
      const [backendResponse, blockchainData] = await Promise.allSettled([
        axios.get(`http://localhost:8000/embeddings/${walletAddress}`),
        import('../utils/walrus').then(({ retrieveFingerprint }) => 
          retrieveFingerprint(walletAddress)
        )
      ]);
      
      const backendExists = backendResponse.status === 'fulfilled' && backendResponse.value.data;
      const blockchainExists = blockchainData.status === 'fulfilled' && blockchainData.value !== null;
      
      if (backendExists || blockchainExists) {
        setFingerprintStatus({ 
          exists: true, 
          loading: false, 
          error: null 
        });
        
        // Log detailed information
        if (blockchainExists) {
          console.log('✅ Fingerprint found on blockchain:', blockchainData.value);
        }
        if (backendExists) {
          console.log('✅ Fingerprint found in backend');
        }
      } else {
        setFingerprintStatus({ exists: false, loading: false, error: null });
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No fingerprint found
        setFingerprintStatus({ exists: false, loading: false, error: null });
      } else {
        setFingerprintStatus({ 
          exists: false, 
          loading: false, 
          error: error.response?.data?.detail || 'Error checking fingerprint' 
        });
      }
    }
  };

  useEffect(() => {
    if (primaryWallet?.address) {
      checkFingerprint(primaryWallet.address);
    }
  }, [primaryWallet?.address]);

  if (!user || !primaryWallet) {
    return (
      <div className="fingerprint-checker">
        <h3>🔍 Fingerprint Status</h3>
        <p>Connect your wallet to check fingerprint status.</p>
      </div>
    );
  }

  return (
    <div className="fingerprint-checker">
      <h3>🔍 Fingerprint Status</h3>
      
      {fingerprintStatus.loading && (
        <div className="status-loading">
          <p>🔄 Checking fingerprint status...</p>
        </div>
      )}
      
      {fingerprintStatus.error && (
        <div className="status-error">
          <p>❌ Error: {fingerprintStatus.error}</p>
        </div>
      )}
      
      {!fingerprintStatus.loading && !fingerprintStatus.error && (
        <div className="status-result">
          {fingerprintStatus.exists ? (
            <div className="fingerprint-exists">
              <p>✅ Voice fingerprint found for wallet: {primaryWallet.address}</p>
              <button 
                onClick={() => checkFingerprint(primaryWallet.address)}
                className="refresh-btn"
              >
                🔄 Refresh Status
              </button>
              
              {/* Show blockchain data if fingerprint exists */}
              <BlockchainInfo walletAddress={primaryWallet.address} />
            </div>
          ) : (
            <div className="fingerprint-missing">
              <p>❌ No voice fingerprint found for wallet: {primaryWallet.address}</p>
              <p>Please register your voice fingerprint to use voice authentication.</p>
              <button 
                onClick={() => checkFingerprint(primaryWallet.address)}
                className="refresh-btn"
              >
                🔄 Refresh Status
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FingerprintChecker; 