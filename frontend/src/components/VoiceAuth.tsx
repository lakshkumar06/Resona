import React from 'react';
import { Link } from 'react-router-dom';

const VoiceAuth: React.FC = () => {
  return (
    <div className="voice-auth">
      <h1>🎤 Voice Auth Protocol</h1>
      <p className="subtitle">Secure Web3 authentication using your voice</p>
      
      <div className="features">
        <div className="feature">
          <h3>🔐 Wallet Connection</h3>
          <p>Connect your Web3 wallet to get started</p>
        </div>
        
        <div className="feature">
          <h3>🎤 Voice Registration</h3>
          <p>Record your voice to create a unique fingerprint</p>
        </div>
        
        <div className="feature">
          <h3>⛓️ Blockchain Storage</h3>
          <p>Your voice fingerprint is stored securely on the blockchain</p>
        </div>
        
        <div className="feature">
          <h3>🔍 Voice Authentication</h3>
          <p>Authenticate using your voice instead of passwords</p>
        </div>
      </div>
      
      <div className="actions">
        <Link to="/web3-auth" className="btn btn-primary">
          🔐 Connect Wallet
        </Link>
        <Link to="/register" className="btn btn-secondary">
          🎤 Register Voice
        </Link>
        <Link to="/authenticate" className="btn btn-secondary">
          🔍 Authenticate
        </Link>
      </div>
    </div>
  );
};

export default VoiceAuth; 