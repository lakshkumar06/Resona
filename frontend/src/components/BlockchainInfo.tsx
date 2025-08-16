import React, { useState, useEffect } from 'react';

interface BlockchainInfoProps {
  walletAddress: string;
}

const BlockchainInfo: React.FC<BlockchainInfoProps> = ({ walletAddress }) => {
  const [blockchainData, setBlockchainData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlockchainData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { retrieveFingerprint } = await import('../utils/walrus');
      const data = await retrieveFingerprint(walletAddress);
      
      if (data) {
        setBlockchainData(data);
      } else {
        setError('No blockchain data found for this wallet');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching blockchain data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchBlockchainData();
    }
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="blockchain-info">
        <h4>🔍 Blockchain Data</h4>
        <div className="loading">Loading blockchain data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="blockchain-info">
        <h4>🔍 Blockchain Data</h4>
        <div className="error">❌ {error}</div>
        <button onClick={fetchBlockchainData} className="refresh-btn">
          🔄 Retry
        </button>
      </div>
    );
  }

  if (!blockchainData) {
    return (
      <div className="blockchain-info">
        <h4>🔍 Blockchain Data</h4>
        <div className="no-data">No fingerprint data found on blockchain</div>
      </div>
    );
  }

  return (
    <div className="blockchain-info">
      <h4>🔍 Blockchain Data</h4>
      <div className="blockchain-details">
        <div className="detail-item">
          <strong>Wallet Address:</strong>
          <span className="address">{blockchainData.walletAddress}</span>
        </div>
        
        <div className="detail-item">
          <strong>Model:</strong>
          <span>{blockchainData.model}</span>
        </div>
        
        <div className="detail-item">
          <strong>Timestamp:</strong>
          <span>{new Date(blockchainData.timestamp).toLocaleString()}</span>
        </div>
        
        <div className="detail-item">
          <strong>Embedding Size:</strong>
          <span>{blockchainData.embedding.length} dimensions</span>
        </div>
        
        {blockchainData.metadata && (
          <div className="detail-item">
            <strong>Version:</strong>
            <span>{blockchainData.metadata.version}</span>
          </div>
        )}
        
        <div className="detail-item">
          <strong>Platform:</strong>
          <span>{blockchainData.metadata?.platform || 'Unknown'}</span>
        </div>
      </div>
      
      <button onClick={fetchBlockchainData} className="refresh-btn">
        🔄 Refresh Data
      </button>
    </div>
  );
};

export default BlockchainInfo; 