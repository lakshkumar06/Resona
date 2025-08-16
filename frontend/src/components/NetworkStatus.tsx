import React, { useState, useEffect } from 'react';
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { switchToZircuitNetwork, getProvider } from '../utils/voiceRegistry';

const NetworkStatus: React.FC = () => {
  const { primaryWallet } = useDynamicContext();
  const [currentNetwork, setCurrentNetwork] = useState<string>('');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [isSwitching, setIsSwitching] = useState<boolean>(false);

  useEffect(() => {
    checkNetwork();
  }, [primaryWallet]);

  const checkNetwork = async () => {
    if (!primaryWallet) return;

    try {
      const provider = getProvider();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);
      
      setCurrentNetwork(`Chain ID: ${chainId}`);
      setIsCorrectNetwork(chainId === 48898); // Zircuit Garfield testnet
    } catch (error) {
      console.error('Error checking network:', error);
      setCurrentNetwork('Unknown network');
      setIsCorrectNetwork(false);
    }
  };

  const handleSwitchNetwork = async () => {
    if (!primaryWallet) return;

    setIsSwitching(true);
    try {
      // Create a mock signer for the network switch function
      const mockSigner = { address: primaryWallet.address } as any;
      const success = await switchToZircuitNetwork(mockSigner);
      
      if (success) {
        // Wait a bit for the network switch to complete
        setTimeout(() => {
          checkNetwork();
        }, 1000);
      }
    } catch (error) {
      console.error('Error switching network:', error);
    } finally {
      setIsSwitching(false);
    }
  };

  if (!primaryWallet) {
    return null;
  }

  return (
    <div className="network-status" style={{
      padding: '15px',
      margin: '15px 0',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h4>🌐 Network Status</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Current Network:</strong> {currentNetwork}
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        {isCorrectNetwork ? (
          <span style={{ color: 'green', fontWeight: 'bold' }}>
            ✅ Connected to Zircuit Garfield Testnet
          </span>
        ) : (
          <span style={{ color: 'red', fontWeight: 'bold' }}>
            ❌ Wrong Network - Need Zircuit Garfield Testnet (Chain ID: 48898)
          </span>
        )}
      </div>
      
      {!isCorrectNetwork && (
        <button
          onClick={handleSwitchNetwork}
          disabled={isSwitching}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          {isSwitching ? '🔄 Switching...' : '🔄 Switch to Zircuit Network'}
        </button>
      )}
      
      <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
        <strong>Note:</strong> Your VoiceRegistry contract is deployed on Zircuit Garfield testnet.
        Make sure you're connected to the correct network before registering voices.
      </div>
    </div>
  );
};

export default NetworkStatus;
