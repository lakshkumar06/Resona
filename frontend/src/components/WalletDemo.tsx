import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthenticateVoice from './AuthenticateVoice';

interface WalletState {
  isLoggedIn: boolean;
  walletAddress: string;
}

const WalletDemo: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [walletState, setWalletState] = useState<WalletState>({
    isLoggedIn: false,
    walletAddress: ''
  });
  const [showVoiceAuth, setShowVoiceAuth] = useState(false);
  const [importMethod, setImportMethod] = useState<'seed' | 'voice' | null>(null);
  const [seedPhrase, setSeedPhrase] = useState('');
  const [voiceWalletAddress, setVoiceWalletAddress] = useState('');

  // Check for authentication success from voice auth
  useEffect(() => {
    const authStatus = searchParams.get('auth');
    const authWallet = searchParams.get('wallet');
    const authMethod = searchParams.get('method');
    
    console.log('🔍 Checking URL parameters:', { authStatus, authWallet, authMethod });
    console.log('🔍 Current search params string:', searchParams.toString());
    console.log('🔍 Current wallet state:', walletState);
    
    if (authStatus === 'success' && authWallet && authMethod === 'voice') {
      console.log('🎉 Voice authentication successful, auto-logging in...');
      setWalletState({
        isLoggedIn: true,
        walletAddress: authWallet
      });
      setShowVoiceAuth(false);
      // Clear the URL parameters to prevent duplicate redirects
      window.history.replaceState({}, '', '/wallet-demo');
      console.log('✅ URL cleared and wallet state updated');
    } else if (authStatus === 'failed' && authWallet) {
      console.log('❌ Voice authentication failed');
      setShowVoiceAuth(false);
      // Clear the URL parameters to prevent duplicate redirects
      window.history.replaceState({}, '', '/wallet-demo');
    }
  }, [searchParams, walletState]);

  const handleSeedPhraseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (seedPhrase.trim()) {
      const mockAddress = `0x${seedPhrase.slice(0, 8)}...${seedPhrase.slice(-8)}`;
      setWalletState(prev => ({ ...prev, walletAddress: mockAddress }));
      setImportMethod('seed');
      setShowVoiceAuth(true);
    }
  };

  const handleVoiceOnlyImport = () => {
    if (voiceWalletAddress.trim()) {
      setWalletState(prev => ({ ...prev, walletAddress: voiceWalletAddress }));
      setImportMethod('voice');
      setShowVoiceAuth(true);
    }
  };

  const handleVoiceAuthentication = () => {
    // Stay on same page but show voice auth component
    setShowVoiceAuth(true);
  };

  const handleSkipVoiceAuth = () => {
    // Skip voice auth and login directly
    setWalletState(prev => ({ ...prev, isLoggedIn: true }));
    setShowVoiceAuth(false);
  };

  const handleLogout = () => {
    setWalletState({ isLoggedIn: false, walletAddress: '' });
    setShowVoiceAuth(false);
    setImportMethod(null);
    setSeedPhrase('');
    setVoiceWalletAddress('');
  };

  // If voice auth is needed, show the AuthenticateVoice component
  if (showVoiceAuth) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white">
        <div className="container mx-auto px-4 py-8">

          
          <AuthenticateVoice 
            walletAddress={walletState.walletAddress}
            onAuthenticationSuccess={(authenticatedWallet) => {
              console.log('🎉 Authentication success callback received:', authenticatedWallet);
              setWalletState({
                isLoggedIn: true,
                walletAddress: authenticatedWallet
              });
              setShowVoiceAuth(false);
            }}
            onAuthenticationFailure={(failedWallet) => {
              console.log('❌ Authentication failed callback received:', failedWallet);
              setShowVoiceAuth(false);
            }}
          />
        </div>
      </div>
    );
  }

  // If logged in, show dashboard
  if (walletState.isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-6xl font-bold mb-4 text-green-400">SUCCESS!</h1>
          <p className="text-2xl text-gray-300 mb-8">Voice authentication successful</p>
          <p className="text-lg text-gray-400 mb-8">Wallet: {walletState.walletAddress}</p>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg text-xl"
          >
            🔒 Lock Wallet
          </button>
        </div>
      </div>
    );
  }

  // Show wallet login options
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">🔐 Wallet Demo</h1>
            <p className="text-xl text-gray-400">Choose how you want to import your wallet</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Seed Phrase Import */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4">📝 Import with Seed Phrase</h2>
              <form onSubmit={handleSeedPhraseSubmit} className="space-y-4">
                <div>
                  <label htmlFor="seedPhrase" className="block text-sm font-medium mb-2">
                    Enter Seed Phrase
                  </label>
                  <textarea
                    id="seedPhrase"
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                    placeholder="Enter your 12 or 24 word seed phrase..."
                    className="w-full h-24 resize-none bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-lg">
                  Import with Seed Phrase
                </button>
              </form>
            </div>

            {/* Voice Only Import */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4">🎤 Import with Voice Only</h2>
              <p className="text-gray-300 mb-4">
                Import your wallet using only voice authentication. 
                Enter the wallet address you want to authenticate against.
              </p>
              <div className="space-y-4">
                <div>
                  <label htmlFor="voiceWalletAddress" className="block text-sm font-medium mb-2">
                    Wallet Address
                  </label>
                  <input
                    id="voiceWalletAddress"
                    type="text"
                    value={voiceWalletAddress}
                    onChange={(e) => setVoiceWalletAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white"
                    required
                  />
                </div>
                <button 
                  onClick={handleVoiceOnlyImport}
                  disabled={!voiceWalletAddress.trim()}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed py-3 rounded-lg"
                >
                  Import with Voice Only
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletDemo;
