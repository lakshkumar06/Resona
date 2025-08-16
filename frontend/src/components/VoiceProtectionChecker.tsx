import React, { useState, useRef } from 'react';
import './VoiceProtectionChecker.css';

interface ProtectionResult {
  protected: boolean;
  confidence: number;
  matches: Array<{
    wallet_address: string;
    similarity_score: number;
    timestamp: number;
    model: string;
    metadata: any;
    nft_link?: string;
  }>;
  total_checked: number;
  threshold_used: number;
  owner?: string;
  nft?: string;
  timestamp?: number;
  model?: string;
}

const VoiceProtectionChecker: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ProtectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(0.75);
  const [topK, setTopK] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [embeddingInput, setEmbeddingInput] = useState('');

  const checkProtection = async (formData: FormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:8000/is-protected', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to check voice protection');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('threshold', threshold.toString());
    formData.append('top_k', topK.toString());

    await checkProtection(formData);
  };

  const handleEmbeddingSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!embeddingInput.trim()) {
      setError('Please enter an embedding');
      return;
    }

    try {
      // Validate JSON format
      JSON.parse(embeddingInput);
    } catch {
      setError('Invalid JSON format for embedding');
      return;
    }

    const formData = new FormData();
    formData.append('embedding', embeddingInput);
    formData.append('threshold', threshold.toString());
    formData.append('top_k', topK.toString());

    await checkProtection(formData);
  };

  const handleRecordAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([blob], 'recorded_audio.wav', { type: 'audio/wav' });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('threshold', threshold.toString());
        formData.append('top_k', topK.toString());

        await checkProtection(formData);
      };

      mediaRecorder.start();
      
      // Record for 5 seconds
      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 5000);

    } catch (err) {
      setError('Failed to access microphone');
    }
  };

  return (
    <div className="voice-protection-checker">
      <div className="header">
        <h2>🔒 Voice Protection Checker</h2>
        <p>Check if a voice is protected without requiring wallet connection</p>
      </div>

      <div className="controls">
        <div className="threshold-controls">
          <label>
            Similarity Threshold: {threshold}
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
            />
          </label>
          
          <label>
            Top K Matches:
            <input
              type="number"
              min="1"
              max="10"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
            />
          </label>
        </div>

        <div className="input-methods">
          <div className="method">
            <h3>📁 Upload Audio File</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".wav,.mp3,.m4a,.flac"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
          </div>

          <div className="method">
            <h3>🎤 Record Audio</h3>
            <button 
              onClick={handleRecordAudio}
              disabled={isLoading}
              className="record-btn"
            >
              {isLoading ? 'Recording...' : 'Record 5s Audio'}
            </button>
          </div>

          <div className="method">
            <h3>📊 Submit Embedding</h3>
            <form onSubmit={handleEmbeddingSubmit}>
              <textarea
                value={embeddingInput}
                onChange={(e) => setEmbeddingInput(e.target.value)}
                placeholder="Paste embedding JSON array here..."
                rows={4}
                disabled={isLoading}
              />
              <button type="submit" disabled={isLoading || !embeddingInput.trim()}>
                Check Protection
              </button>
            </form>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>Checking voice protection...</p>
        </div>
      )}

      {error && (
        <div className="error">
          <h3>❌ Error</h3>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="result">
          <div className={`status ${result.protected ? 'protected' : 'not-protected'}`}>
            <h3>
              {result.protected ? '🛡️ Voice is Protected (zk-SNARK Verified)' : '⚠️ Voice is Not Protected (zk-SNARK Verified)'}
            </h3>
            <div className="confidence">
              <strong>Verification Method:</strong> Zero-Knowledge Proof (zk-SNARK)
            </div>
          </div>

          <div className="details">
            <div className="summary">
              <p><strong>Total voices checked:</strong> {result.total_checked}</p>
              <p><strong>Threshold used:</strong> {(result.threshold_used * 100).toFixed(1)}%</p>
            </div>

            {result.protected && result.owner && (
              <div className="owner-info">
                <h4>Owner Information</h4>
                <p><strong>Wallet Address:</strong> {result.owner}</p>
                {result.nft && <p><strong>NFT Link:</strong> <a href={result.nft} target="_blank" rel="noopener noreferrer">{result.nft}</a></p>}
                {result.timestamp && <p><strong>Protected Since:</strong> {new Date(result.timestamp).toLocaleString()}</p>}
                {result.model && <p><strong>Model:</strong> {result.model}</p>}
              </div>
            )}

            {result.matches && result.matches.length > 0 && (
              <div className="matches">
                <h4>Top Matches</h4>
                <div className="matches-list">
                  {result.matches.map((match, index) => (
                    <div key={index} className="match-item">
                      <div className="match-header">
                        <span className="rank">#{index + 1}</span>
                        <span className="score">{(match.similarity_score * 100).toFixed(1)}%</span>
                      </div>
                      <div className="match-details">
                        <p><strong>Wallet:</strong> {match.wallet_address}</p>
                        <p><strong>Model:</strong> {match.model}</p>
                        <p><strong>Timestamp:</strong> {new Date(match.timestamp).toLocaleString()}</p>
                        {match.nft_link && (
                          <p><strong>NFT:</strong> <a href={match.nft_link} target="_blank" rel="noopener noreferrer">View NFT</a></p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="api-info">
        <h3>🔗 API Endpoint</h3>
        <p><strong>POST</strong> <code>http://localhost:8000/is-protected</code></p>
        <p>This endpoint allows LLMs to query voice protection status without requiring wallet connection.</p>
      </div>
    </div>
  );
};

export default VoiceProtectionChecker; 