import React, { useState, useRef } from 'react';
import axios from 'axios';

interface RecordingState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

interface UploadState {
  isUploading: boolean;
  file: File | null;
}

const RecordVoice: React.FC = () => {
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    audioBlob: null,
    audioUrl: null,
  });

  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    file: null,
  });

  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordingState({
          isRecording: false,
          audioBlob,
          audioUrl,
        });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingState(prev => ({ ...prev, isRecording: true }));
      setMessage(null);
    } catch (error) {
      console.error('Error starting recording:', error);
      setMessage({ text: 'Error accessing microphone. Please check permissions.', type: 'error' });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/m4a', 'audio/flac'];
      if (!validTypes.includes(file.type)) {
        setMessage({ text: 'Please select a valid audio file (.wav, .mp3, .m4a, .flac)', type: 'error' });
        return;
      }

      setUploadState({ isUploading: false, file });
      setMessage(null);
    }
  };

  const processAudio = async (audioBlob: Blob, source: 'recording' | 'upload') => {
    if (!username.trim()) {
      setMessage({ text: 'Please enter a username', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const formData = new FormData();
      // Use a stable identifier to avoid timing inconsistencies
      const stableId = `voice_${source}_${Math.floor(Date.now() / 1000)}`;
      formData.append('file', audioBlob, `${stableId}.wav`);
      formData.append('username', username);

      const response = await axios.post('http://localhost:8000/generate-embedding', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      setMessage({ 
        text: `✅ Voice embedding generated successfully! Embedding shape: ${response.data.embedding_shape}`, 
        type: 'success' 
      });

      // Clear the audio after successful processing
      if (source === 'recording') {
        setRecordingState({ isRecording: false, audioBlob: null, audioUrl: null });
      } else {
        setUploadState({ isUploading: false, file: null });
      }

    } catch (error: any) {
      console.error('Error processing audio:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Error processing audio';
      setMessage({ text: `❌ ${errorMessage}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitRecording = () => {
    if (recordingState.audioBlob) {
      processAudio(recordingState.audioBlob, 'recording');
    }
  };

  const handleSubmitUpload = () => {
    if (uploadState.file) {
      processAudio(uploadState.file, 'upload');
    }
  };

  return (
    <div className="record-voice">
      <h2>Voice Authentication</h2>
      
      {/* Username Input */}
      <div className="username-section">
        <label htmlFor="username">Username:</label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          disabled={isProcessing}
        />
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Recording Section */}
      <div className="recording-section">
        <h3>Record Your Voice</h3>
        <div className="recording-controls">
          {!recordingState.isRecording ? (
            <button 
              onClick={startRecording}
              disabled={isProcessing}
              className="record-btn"
            >
              🎤 Start Recording
            </button>
          ) : (
            <button 
              onClick={stopRecording}
              className="stop-btn"
            >
              ⏹️ Stop Recording
            </button>
          )}
        </div>

        {/* Audio Preview */}
        {recordingState.audioUrl && (
          <div className="audio-preview">
            <h4>Recording Preview:</h4>
            <audio controls src={recordingState.audioUrl} />
            <button 
              onClick={handleSubmitRecording}
              disabled={isProcessing}
              className="submit-btn"
            >
              {isProcessing ? '🔄 Processing...' : '📤 Submit Recording'}
            </button>
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <div className="upload-section">
        <h3>Or Upload Audio File</h3>
        <div className="upload-controls">
          <input
            type="file"
            accept=".wav,.mp3,.m4a,.flac"
            onChange={handleFileUpload}
            disabled={isProcessing}
            id="audio-upload"
          />
          <label htmlFor="audio-upload" className="upload-label">
            📁 Choose Audio File
          </label>
        </div>

        {uploadState.file && (
          <div className="file-info">
            <p>Selected file: {uploadState.file.name}</p>
            <button 
              onClick={handleSubmitUpload}
              disabled={isProcessing}
              className="submit-btn"
            >
              {isProcessing ? '🔄 Processing...' : '📤 Submit File'}
            </button>
          </div>
        )}
      </div>

      {/* Processing Indicator */}
      {isProcessing && (
        <div className="processing">
          <p>🔄 Processing voice embedding with ECAPA-TDNN...</p>
          <p>This may take a few moments...</p>
        </div>
      )}
    </div>
  );
};

export default RecordVoice; 