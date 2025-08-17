import React, { useState, useEffect } from 'react';
import { getWalrusNetworkStatus, getWalrusKeypairAddress, getWalrusBackendWalletAddress, checkWALBalance } from '../utils/walrus';

const WalrusStatus: React.FC = () => {
  const [networkStatus, setNetworkStatus] = useState<string>('');
  const [keypairAddress, setKeypairAddress] = useState<string | null>(null);
  const [backendWalletAddress, setBackendWalletAddress] = useState<string>('');
  const [walBalance, setWalBalance] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string>('');

  useEffect(() => {
    const updateStatus = async () => {
      try {
        setInitError('');
        setNetworkStatus(getWalrusNetworkStatus());
        setKeypairAddress(getWalrusKeypairAddress());
        setBackendWalletAddress(getWalrusBackendWalletAddress());
        
        // Check WAL balance
        const balanceResult = await checkWALBalance();
        setWalBalance(balanceResult.balance);
        
        if (balanceResult.error) {
          setInitError(balanceResult.error);
        }
      } catch (error) {
        console.error('Error updating status:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Update status immediately
    updateStatus();

    // Update status every 5 seconds
    const interval = setInterval(updateStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="walrus-status">
        <h4>🔗 Walrus Network Status</h4>
        <div className="loading">Loading network status...</div>
      </div>
    );
  }

  return (
    <div className="walrus-status">
      <h4>🔗 Walrus Network Status</h4>
      <div className="status-details">
        <div className="status-item">
          <strong>Network:</strong>
          <span className={networkStatus.includes('Connected') ? 'connected' : 'disconnected'}>
            {networkStatus}
          </span>
        </div>
        
        <div className="status-item">
          <strong>Upload Relay:</strong>
          <span className="connected">https://upload-relay.testnet.walrus.space</span>
        </div>
        
        <div className="status-item">
          <strong>Max Tip:</strong>
          <span>1000 MIST</span>
        </div>
        
        <div className="status-item">
          <strong>Timeout:</strong>
          <span>60 seconds</span>
        </div>
        
        <div className="status-item">
          <strong>Backend Wallet:</strong>
          <span className="address">{backendWalletAddress}</span>
        </div>
        
        <div className="status-item">
          <strong>WAL Balance:</strong>
          <span className={parseInt(walBalance) > 0 ? 'connected' : 'disconnected'}>
            {walBalance || '0'} WAL
          </span>
        </div>
        
        {initError && (
          <div className="status-item error">
            <strong>Error:</strong>
            <span className="disconnected">{initError}</span>
          </div>
        )}
        
        {keypairAddress && (
          <div className="status-item">
            <strong>Transaction Address:</strong>
            <span className="address">{keypairAddress}</span>
          </div>
        )}
        
        <div className="status-item">
          <strong>Storage Duration:</strong>
          <span>100 epochs (permanent)</span>
        </div>
        
        <div className="status-item">
          <strong>Deletable:</strong>
          <span>No (permanent storage)</span>
        </div>
      </div>
    </div>
  );
};

export default WalrusStatus; 