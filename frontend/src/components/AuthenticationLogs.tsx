import React, { useState, useEffect } from 'react';
import { getAuthAttemptsForOwner, getTotalAuthAttempts } from '../utils/voiceRegistry';

interface AuthAttempt {
  attemptedBy: string;
  targetOwner: string;
  targetCommitment: string;
  success: boolean;
  similarity: number;
  threshold: number;
  timestamp: number;
  metadata: any;
}

interface AuthenticationLogsProps {
  walletAddress: string;
}

const AuthenticationLogs: React.FC<AuthenticationLogsProps> = ({ walletAddress }) => {
  const [authAttempts, setAuthAttempts] = useState<AuthAttempt[]>([]);
  const [totalAttempts, setTotalAttempts] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAuthAttempts = async () => {
    if (!walletAddress) return;

    setLoading(true);
    setError(null);

    try {
      // Get authentication attempts for this wallet
      const attempts = await getAuthAttemptsForOwner(walletAddress, 0, 20);
      setAuthAttempts(attempts);

      // Get total number of attempts across all wallets
      const total = await getTotalAuthAttempts();
      setTotalAttempts(total);

      console.log(`📊 Loaded ${attempts.length} authentication attempts for wallet ${walletAddress}`);
    } catch (error) {
      console.error('Error loading authentication attempts:', error);
      setError('Failed to load authentication logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuthAttempts();
  }, [walletAddress]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const truncateAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!walletAddress) {
    return (
      <div className="p-6 bg-gray-900 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">🔗 Authentication Logs</h3>
        <p className="text-gray-400">Please provide a wallet address to view authentication logs.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-900 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white">🔗 Authentication Logs</h3>
        <button
          onClick={loadAuthAttempts}
          disabled={loading}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Target Wallet:</span>
            <p className="text-white font-mono">{truncateAddress(walletAddress)}</p>
          </div>
          <div>
            <span className="text-gray-400">Total System Attempts:</span>
            <p className="text-white font-bold">{totalAttempts.toString()}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900 border border-red-700 rounded-lg">
          <p className="text-red-200">❌ {error}</p>
        </div>
      )}

      <div className="space-y-3">
        {authAttempts.length === 0 && !loading ? (
          <div className="p-4 bg-gray-800 rounded-lg text-center">
            <p className="text-gray-400">No authentication attempts found for this wallet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Authentication attempts will appear here after voice authentication attempts.
            </p>
          </div>
        ) : (
          authAttempts.map((attempt, index) => (
            <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    attempt.success 
                      ? 'bg-green-900 text-green-200 border border-green-700' 
                      : 'bg-red-900 text-red-200 border border-red-700'
                  }`}>
                    {attempt.success ? '✅ SUCCESS' : '❌ FAILED'}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {formatTimestamp(attempt.timestamp)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Similarity</div>
                  <div className={`font-bold ${
                    attempt.similarity >= attempt.threshold ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(attempt.similarity * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Attempted By:</span>
                  <p className="text-white font-mono text-xs">{truncateAddress(attempt.attemptedBy)}</p>
                </div>
                <div>
                  <span className="text-gray-400">Threshold:</span>
                  <p className="text-white">{(attempt.threshold * 100).toFixed(2)}%</p>
                </div>
              </div>

              {attempt.metadata && (
                <div className="mt-3 p-2 bg-gray-900 rounded border border-gray-600">
                  <div className="text-xs text-gray-400 mb-1">Metadata:</div>
                  <div className="text-xs text-gray-300 font-mono overflow-hidden">
                    {typeof attempt.metadata === 'object' ? (
                      <div className="space-y-1">
                        {attempt.metadata.verificationMethod && (
                          <div>Method: {attempt.metadata.verificationMethod}</div>
                        )}
                        {attempt.metadata.blobId && (
                          <div>Blob ID: {truncateAddress(attempt.metadata.blobId)}</div>
                        )}
                        {attempt.metadata.zkProofGenerated && (
                          <div className="text-blue-300">🔐 ZK Proof Generated</div>
                        )}
                      </div>
                    ) : (
                      <div>{JSON.stringify(attempt.metadata).slice(0, 100)}...</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {authAttempts.length > 0 && (
        <div className="mt-6 p-3 bg-blue-900 border border-blue-700 rounded-lg">
          <p className="text-blue-200 text-sm">
            💡 <strong>Note:</strong> All authentication attempts are logged on-chain with ZK proofs. 
            This provides an immutable audit trail while preserving privacy through zero-knowledge verification.
          </p>
        </div>
      )}
    </div>
  );
};

export default AuthenticationLogs;