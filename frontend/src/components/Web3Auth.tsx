import React from 'react';
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import WalrusStatus from './WalrusStatus';

const Web3Auth: React.FC = () => {
  const { user, primaryWallet } = useDynamicContext();

  return (
    <div className="web3-auth">
      <div className="auth-header">
        <h2>🔐 Web3 Voice Authentication</h2>
      </div>
      
      {user && primaryWallet && (
        <div className="user-info">
          <div className="wallet-info">
            <h3>✅ Connected Wallet</h3>
            <div className="wallet-details">
              <p><strong>Address:</strong> {primaryWallet.address}</p>
              <p><strong>Chain:</strong> {primaryWallet.chain}</p>
            </div>
          </div>
          
          <div className="user-details">
            <h3>👤 User Profile</h3>
            <div className="profile-info">
              <p><strong>Email:</strong> {user.email || 'Not provided'}</p>
              <p><strong>Username:</strong> {user.username || 'Not provided'}</p>
            </div>
          </div>
        </div>
      )}
      
      {!user && (
        <div className="connect-prompt">
          <h3>🔗 Connect Your Wallet</h3>
          <p>Please connect your wallet to access voice authentication features.</p>
          <p>Supported wallets: MetaMask, WalletConnect, and more!</p>
        </div>
      )}
      
      <WalrusStatus />
    </div>
  );
};

export default Web3Auth; 