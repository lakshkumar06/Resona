import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useQuery } from '@apollo/client';
import { GET_LATEST_VOICE_REGISTRATIONS } from '../lib/queries';
import type { VoiceRegistrationsData, VoiceRegistrationsVariables } from '../types/subgraph';
import * as d3 from "d3";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { logAuthenticationAttempt, type AuthAttemptData } from '../utils/voiceRegistry';

// Type declarations for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    MediaRecorder: any;
  }
}

interface RecordingState {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | undefined;
}



interface Message {
  text: string;
  type: 'success' | 'error' | 'info';
}

interface WordValidation {
  sentence: string;
  spokenSentence: string;
  isListening: boolean;
  isComplete: boolean;
  accuracy: number;
}

interface AuthenticateVoiceProps {
  walletAddress?: string;
  redirectUrl?: string;
  onAuthenticationSuccess?: (walletAddress: string) => void;
  onAuthenticationFailure?: (walletAddress: string) => void;
}

const AuthenticateVoice: React.FC<AuthenticateVoiceProps> = ({ 
  walletAddress: propWalletAddress = '', 
  redirectUrl: propRedirectUrl = '', 
  onAuthenticationSuccess,
  onAuthenticationFailure
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>({ isRecording: false, audioBlob: null, audioUrl: undefined });

  // Get wallet address and redirect URL from props or URL parameters
  const urlWalletAddress = searchParams.get('wallet');
  const urlRedirectUrl = searchParams.get('redirect');
  
  const walletAddress = propWalletAddress || urlWalletAddress || '';
  const redirectUrl = propRedirectUrl || urlRedirectUrl || '';
  
  const [animationLevel, setAnimationLevel] = useState(0);
  const [wordValidation, setWordValidation] = useState<WordValidation>({
    sentence: "",
    spokenSentence: "",
    isListening: false,
    isComplete: false,
    accuracy: 0
  });

  // List of random sentences for validation (8-10 words each)
  const randomSentences = [
    "The quick brown fox jumps over the lazy dog",
    "All work and no play makes Jack a dull boy",
    "A journey of a thousand miles begins with one step",
    "The early bird catches the worm in the morning",
    "Actions speak louder than words in every situation",
    "Practice makes perfect when you work hard enough",
    "The best time to plant a tree was twenty years ago",
    "Success is not final failure is not fatal it is courage",
    "Life is what happens when you are busy making plans",
    "The only way to do great work is to love what you do",
    "Be the change you wish to see in the world today",
    "In the middle of difficulty lies opportunity for growth",
    "The future belongs to those who believe in beauty of dreams",
    "Every expert was once a beginner who never gave up",
    "Happiness is not something ready made it comes from actions"
  ];

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  // Query all voice registrations from the subgraph
  const { data: subgraphData, loading: subgraphLoading, error: subgraphError } = useQuery<VoiceRegistrationsData, VoiceRegistrationsVariables>(
    GET_LATEST_VOICE_REGISTRATIONS,
    {
      variables: { first: 1000 }, // Get up to 1000 registrations
      pollInterval: 30000, // Poll every 30 seconds for updates
    }
  );

  // Debug logging for subgraph data
  useEffect(() => {
    if (subgraphData) {
      console.log('🔍 Subgraph data received:', subgraphData);
      console.log('📊 Total voices:', subgraphData.voices?.length || 0);
      if (subgraphData.voices && subgraphData.voices.length > 0) {
        console.log('📋 Sample voice registration:', subgraphData.voices[0]);
      }
    }
    if (subgraphError) {
      console.error('❌ Subgraph error:', subgraphError);
    }
  }, [subgraphData, subgraphError]);

  // Generate a dynamic blob shape with smooth curves
  const generateBlobPath = (level: number): string => {
    const r = 60 + level * 0.4; // Base radius with deformation
    const points = 10; // Number of control points
    const angleStep = (Math.PI * 2) / points;
    let pathData: [number, number][] = [];

    for (let i = 0; i < points; i++) {
      const angle = i * angleStep;
      const radius = r + Math.sin(i * 2 + level * 0.05) * 2; // Creates a wavy effect
      const x = Math.cos(angle) * radius + 64; // Centering at 64,64
      const y = Math.sin(angle) * radius + 64;
      pathData.push([x, y]);
    }

    // Use d3.line to interpolate with cardinal curve (smooths out corners)
    const lineGenerator = d3
      .line<[number, number]>()
      .curve(d3.curveCatmullRomClosed) // Smooth curved shape
      .x((d: [number, number]) => d[0])
      .y((d: [number, number]) => d[1]);

    const path = lineGenerator(pathData); // Returns the smooth SVG path
    return path || ''; // Return empty string if path is null
  };

  // Audio analysis for blob animation
  useEffect(() => {
    if (recordingState.isRecording) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        dataArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);

        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
        sourceRef.current.connect(analyserRef.current);

        const detectSound = () => {
          if (analyserRef.current && dataArrayRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            const volume = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
            setAnimationLevel(volume * 1.5);
            if (recordingState.isRecording) requestAnimationFrame(detectSound);
          }
        };
        detectSound();
      });
    } else {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current = null;
      }
    }
  }, [recordingState.isRecording]);

  // Handle URL parameter changes
  useEffect(() => {
    // No need to set wallet address since it's now a prop
  }, [urlWalletAddress]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = false; // Only final results
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        console.log('🎤 Speech recognition result received:', event);
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          
          console.log(`📝 Transcript ${i}: "${transcript}" (final: ${isFinal})`);
          
          if (isFinal) {
            const cleanTranscript = transcript.toLowerCase().trim();
            setWordValidation(prev => {
              const newSpokenSentence = cleanTranscript;
              console.log('🗣️ Updated spoken sentence:', newSpokenSentence);
              return {
                ...prev,
                spokenSentence: newSpokenSentence
              };
            });
          }
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        setWordValidation(prev => ({ ...prev, isListening: false }));
      };
      
      recognitionRef.current.onend = () => {
        console.log('🛑 Speech recognition ended');
        setWordValidation(prev => ({ ...prev, isListening: false }));
      };
      
      recognitionRef.current.onstart = () => {
        console.log('🚀 Speech recognition started');
      };
      
      console.log('✅ Speech recognition initialized successfully');
    } else {
      console.warn('⚠️ Speech recognition not supported in this browser');
    }
  }, []);

  // Generate random sentence for validation
  const generateRandomSentence = () => {
    const randomIndex = Math.floor(Math.random() * randomSentences.length);
    const selectedSentence = randomSentences[randomIndex];
    console.log(' Generated random sentence for validation:', selectedSentence);
    setWordValidation(prev => ({
      ...prev,
      sentence: selectedSentence,
      spokenSentence: "",
      isComplete: false,
      accuracy: 0
    }));
  };

  // Calculate sentence validation accuracy
  const calculateAccuracy = (spoken: string, expected: string) => {
    if (expected.length === 0) return 0;
    
    const expectedSentence = expected.toLowerCase().trim();
    const spokenSentence = spoken.toLowerCase().trim();
    
    console.log('🔍 Calculating sentence accuracy:');
    console.log('   Expected sentence:', expectedSentence);
    console.log('   Spoken sentence:', spokenSentence);
    
    if (spokenSentence.length === 0) {
      console.log('   ❌ No speech detected');
      return 0;
    }
    
    // Split sentences into words for comparison
    const expectedWords = expectedSentence.split(' ').filter(word => word.length > 0);
    const spokenWords = spokenSentence.split(' ').filter(word => word.length > 0);
    
    console.log('   Expected words:', expectedWords);
    console.log('   Spoken words:', spokenWords);
    
    let correct = 0;
    let total = expectedWords.length;
    
    for (const expectedWord of expectedWords) {
      const isMatch = spokenWords.some(spokenWord => 
        spokenWord.includes(expectedWord) || 
        expectedWord.includes(spokenWord) ||
        // Fuzzy matching for similar words
        spokenWord.length >= 3 && expectedWord.length >= 3 &&
        (spokenWord.slice(0, 3) === expectedWord.slice(0, 3) ||
         spokenWord.slice(-3) === expectedWord.slice(-3))
      );
      
      if (isMatch) {
        correct++;
        console.log(`   ✅ "${expectedWord}" - MATCHED`);
      } else {
        console.log(`   ❌ "${expectedWord}" - NOT FOUND`);
      }
    }
    
    const accuracy = (correct / total) * 100;
    console.log(`📊 Sentence accuracy: ${correct}/${total} = ${accuracy.toFixed(1)}%`);
    
    return accuracy;
  };

  // Validate spoken words
  const validateSpokenWords = (): boolean => {
    console.log('🔐 Starting word validation...');
    console.log('   Asked sentence:', wordValidation.sentence);
    console.log('   Spoken sentence:', wordValidation.spokenSentence);
    
    const accuracy = calculateAccuracy(wordValidation.spokenSentence, wordValidation.sentence);
    const isValid = accuracy >= 70; // 70% accuracy threshold
    
    console.log(` Validation result: ${isValid ? 'PASSED' : 'FAILED'} (${accuracy.toFixed(1)}% accuracy)`);
    
    setWordValidation(prev => ({
      ...prev,
      accuracy,
      isComplete: true
    }));
    
    return isValid;
  };

  const startRecording = async () => {
    try {
      // Generate random sentence first
      generateRandomSentence();
      
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
        
        console.log('🎵 Recording stopped, processing audio...');
        console.log('   Audio blob size:', audioBlob.size, 'bytes');
        console.log('   Audio duration:', Math.round(audioBlob.size / 16000), 'ms (estimated)');
        
        // Log the validation results
        console.log('🔍 Final Validation Summary:');
        console.log('   Expected sentence:', wordValidation.sentence);
        console.log('   Spoken sentence:', wordValidation.spokenSentence);
        console.log('   Words matched:', wordValidation.spokenSentence ? 
          wordValidation.sentence.split(' ').filter(word => 
            wordValidation.spokenSentence.toLowerCase().includes(word.toLowerCase())
          ).length : 0);
        console.log('   Total words:', wordValidation.sentence.split(' ').length);
        
        setRecordingState({
          isRecording: false,
          audioBlob,
          audioUrl: audioUrl || undefined,
        });

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Stop speech recognition
        if (recognitionRef.current) {
          console.log('🛑 Stopping speech recognition...');
          recognitionRef.current.stop();
        }
      };

      mediaRecorder.start();
      setRecordingState(prev => ({ ...prev, isRecording: true }));
      setMessage(null);
      
      // Start speech recognition
      if (recognitionRef.current) {
        try {
          console.log('🚀 Starting speech recognition...');
          recognitionRef.current.start();
          setWordValidation(prev => ({ ...prev, isListening: true }));
          console.log('✅ Speech recognition started successfully');
        } catch (error) {
          console.error('❌ Failed to start speech recognition:', error);
          setWordValidation(prev => ({ ...prev, isListening: false }));
        }
      } else {
        console.warn('⚠️ Speech recognition not available');
      }
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



  const authenticateAudio = async (audioBlob: Blob) => {
    // Validate spoken words first
    const isValid = validateSpokenWords();
    if (!isValid) {
      setMessage({ 
        text: `Word validation failed. Accuracy: ${wordValidation.accuracy.toFixed(1)}%. Please try again and speak the words clearly.`, 
        type: 'error' 
      });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Always authenticate directly against Walrus blockchain
      await authenticateAgainstWalrus(audioBlob);
    } catch (error: any) {
      console.error('Error authenticating audio:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Error authenticating audio';
      setMessage({ text: `❌ ${errorMessage}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const authenticateAgainstWalrus = async (audioBlob: Blob) => {
    try {
      setMessage({ text: '🔄 Authenticating against Walrus voice database...', type: 'success' });
      
      // Generate embedding first (temporary, not saved)
      const stableId = `voice_recording_${Math.floor(Date.now() / 1000)}`;
      const formData = new FormData();
      formData.append('file', audioBlob, `${stableId}.wav`);
      formData.append('username', `temp_auth_${stableId}`);
      formData.append('temporary', 'true');
      
      const embeddingResponse = await axios.post('http://localhost:8000/generate-embedding', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const embedding = embeddingResponse.data.embedding;
      
      // Log the generated embedding details
      console.log(`🔍 Generated embedding for recording:`, {
        embeddingLength: embedding.length,
        embeddingFirstFew: embedding.slice(0, 5),
        embeddingLastFew: embedding.slice(-5),
        stableId
      });
      
      // Check if a wallet address is provided
      if (!walletAddress || !walletAddress.trim()) {
        setMessage({ 
          text: '❌ Please enter a wallet address to authenticate against', 
          type: 'error' 
        });
        return;
      }
      
      // Use the wallet-specific endpoint
      await authenticateAgainstSpecificWallet(embedding, walletAddress.trim());
      return;
    } catch (error: any) {
      throw new Error(`Blockchain authentication failed: ${error.message}`);
    }
  };

  // New function to authenticate against a specific wallet address using ZK proofs
  const authenticateAgainstSpecificWallet = async (embedding: number[], targetWalletAddress: string) => {
    try {
      setMessage({ text: `🔍 Authenticating against wallet ${targetWalletAddress} using ZK proofs...`, type: 'info' });
      
      // First, get the stored embedding for the target wallet
      const authResponse = await axios.post('http://localhost:3001/api/voice/authenticate-wallet', {
        inputEmbedding: embedding,
        walletAddress: targetWalletAddress,
        subgraphData: subgraphData // Pass subgraph data for wallet lookup
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      const response = authResponse.data;
      
      if (!response.authenticated && response.error) {
        // Handle case where no voice registration found
        if (response.error.includes('No voice registrations found')) {
          setMessage({ 
            text: `❌ No voice registrations found for wallet ${targetWalletAddress}. Please ensure the wallet has registered their voice.`, 
            type: 'error' 
          });
        } else {
          setMessage({ 
            text: `❌ ${response.error}`, 
            type: 'error' 
          });
        }
        return;
      }
      
                     // Backend already generated REAL ZK proof, just display the result
       if (response.zk_proof_generated) {
         if (response.authenticated) {
           const matchedBlobId = response.matched_blob_id || 'Unknown';
           const verificationMethod = response.verification_method || 'unknown';
           const proofDetails = response.proof_details || {};

           console.log(`✅ VOICE MATCH DETECTED for wallet ${targetWalletAddress} using REAL ZK proof!`);
           console.log(` ZK Proof details:`, {
             similarity: response.similarity,
             threshold: response.threshold,
             blobId: matchedBlobId,
             inputEmbeddingLength: embedding.length,
             verification_method: verificationMethod,
             proof_verification: proofDetails.verification_passed,
             public_signals: proofDetails.public_signals
           });

           let messageText = `✅ WALLET CONNECTED: Voice successfully matched to wallet ${targetWalletAddress}! (${verificationMethod}) Blob ID: ${matchedBlobId}`;

           if (proofDetails.verification_passed !== undefined) {
             messageText += `\n🔐 ZK Proof Verification: ${proofDetails.verification_passed ? '✅ PASSED' : '❌ FAILED'}`;
           }
           
           messageText += `\n🔗 Authentication attempt logged on blockchain`;
           messageText += `\n📊 Similarity: ${(response.similarity * 100).toFixed(2)}% | Threshold: ${(response.threshold * 100).toFixed(2)}%`;

           setMessage({
             text: messageText,
             type: 'success'
           });
           
           // Handle success - either redirect or call callback
           if (onAuthenticationSuccess) {
             // Use callback when available (for embedded usage)
             setTimeout(() => {
               console.log(`🎉 Calling success callback for wallet: ${targetWalletAddress}`);
               onAuthenticationSuccess(targetWalletAddress);
             }, 2000); // 2 second delay to show success message
           } else if (redirectUrl) {
             // Fallback to redirect when no callback (for standalone usage)
             setTimeout(() => {
               const successUrl = `${redirectUrl}?auth=success&wallet=${encodeURIComponent(targetWalletAddress)}&method=voice`;
               console.log(`🔄 Redirecting to wallet demo: ${successUrl}`);
               window.location.href = successUrl;
             }, 2000); // 2 second delay to show success message
           }
          } else {
            const verificationMethod = response.verification_method || 'unknown';
            const proofDetails = response.proof_details || {};
            
            console.log(`✅ No voice match found for wallet ${targetWalletAddress} using REAL ZK proof`);
            
            let messageText = `✅ SECURE: No voice match found for wallet ${targetWalletAddress} (${verificationMethod})`;
            
            if (proofDetails.verification_passed !== undefined) {
              messageText += `\n🔐 ZK Proof Verification: ${proofDetails.verification_passed ? '✅ PASSED' : '❌ FAILED'}`;
            }
            
            messageText += `\n🔗 Authentication attempt logged on blockchain`;
            messageText += `\n📊 Similarity: ${(response.similarity * 100).toFixed(2)}% | Threshold: ${(response.threshold * 100).toFixed(2)}%`;
            
            setMessage({ 
              text: messageText, 
              type: 'success' 
            });
            
            // Auto-redirect to wallet demo if redirect URL is provided
            if (redirectUrl) {
              setTimeout(() => {
                const successUrl = `${redirectUrl}?auth=success&wallet=${encodeURIComponent(targetWalletAddress)}&method=voice`;
                console.log(`🔄 Redirecting to wallet demo: ${successUrl}`);
                window.location.href = successUrl;
              }, 2000); // 2 second delay to show success message
            }
          }
               } else {
         // Fallback to basic similarity calculation
         if (response.authenticated) {
           const matchedBlobId = response.matched_blob_id || 'Unknown';
           console.log(`✅ VOICE MATCH DETECTED for wallet ${targetWalletAddress} (fallback)!`);
           setMessage({
             text: `✅ WALLET CONNECTED: Voice successfully matched to wallet ${targetWalletAddress}! Blob ID: ${matchedBlobId}`,
             type: 'success'
           });
           
           // Handle success - either redirect or call callback
           if (onAuthenticationSuccess) {
             // Use callback when available (for embedded usage)
             setTimeout(() => {
               console.log(`🎉 Calling success callback for wallet: ${targetWalletAddress}`);
               onAuthenticationSuccess(targetWalletAddress);
             }, 2000); // 2 second delay to show success message
           } else if (redirectUrl) {
             // Fallback to redirect when no callback (for standalone usage)
             setTimeout(() => {
               const successUrl = `${redirectUrl}?auth=success&wallet=${encodeURIComponent(targetWalletAddress)}&method=voice`;
               console.log(`🔄 Redirecting to wallet demo: ${successUrl}`);
               window.location.href = successUrl;
             }, 2000); // 2 second delay to show success message
           }
         } else {
           console.log(`❌ No voice match found for wallet ${targetWalletAddress} (fallback)`);
           setMessage({
             text: `❌ WALLET NOT CONNECTED: No voice match found for wallet ${targetWalletAddress}`,
             type: 'error'
           });
           
           // Also redirect on failure if redirect URL is provided (user can try again)
           if (redirectUrl) {
             setTimeout(() => {
               const failureUrl = `${redirectUrl}?auth=failed&wallet=${encodeURIComponent(targetWalletAddress)}&method=voice`;
               console.log(`🔄 Redirecting to wallet demo after failed attempt: ${failureUrl}`);
               window.location.href = failureUrl;
             }, 3000); // 3 second delay to show error message
           }
         }
       }
      
      // Clear the audio after successful processing
      setRecordingState({ isRecording: false, audioBlob: null, audioUrl: undefined });
      setWordValidation(prev => ({ ...prev, sentence: "", spokenSentence: "", isComplete: false, accuracy: 0 }));
      
    } catch (error: any) {
      console.error('Error in wallet-specific authentication:', error);
      
      if (error.response?.status === 404) {
        setMessage({ 
          text: `❌ No voice registrations found for wallet ${targetWalletAddress}. Please ensure the wallet has registered their voice.`, 
          type: 'error' 
        });
      } else {
        const errorMessage = error.response?.data?.error || error.message || 'Error authenticating against specific wallet';
        setMessage({ text: `❌ ${errorMessage}`, type: 'error' });
      }
      
      // Clear the audio after error
      setRecordingState({ isRecording: false, audioBlob: null, audioUrl: undefined });
      setWordValidation(prev => ({ ...prev, sentence: "", spokenSentence: "", isComplete: false, accuracy: 0 }));
    }
  };

  const handleAuthenticateRecording = () => {
    if (recordingState.audioBlob) {
      authenticateAudio(recordingState.audioBlob);
    }
  };





  return (
    <div className='h-screen text-white bg-[#0b0b0b] overflow-hidden'>
      {/* Title */}
      <div className='pt-[10vh] text-center'>
        <h1 className="text-[48px] font-bold text-white mt-[0.5em]">Verify</h1>
      </div>

      {/* Wallet Address Input - Hide when processing */}
      {!isProcessing && (
        <div className='text-center mt-8'>
          <div className='flex flex-col items-center space-y-2'>

            <input
              id="walletAddress"
              type="text"
              value={walletAddress}
              onChange={(e) => {
                // Read-only when used as a component prop
                console.log('Wallet address input changed:', e.target.value);
              }}
              placeholder="Wallet Address"
              className="px-4 py-2 bg-[#0b0b0b] text-white border border-gray-600 rounded-lg focus:outline-none focus:border-orange-400 w-120 text-center"
              readOnly={!!propWalletAddress}
            />

          </div>
        </div>
      )}

      {/* Main Content */}
      <div className='flex items-center w-full h-[60vh] justify-center'>
        {/* Left Section - Recording Controls */}
        <div className='w-[60vw] flex flex-col items-center justify-center'>
          {/* Large Microphone Icon, Blob, or Status Messages */}
          <div className="h-[30vh] flex items-center justify-center mb-8">
            {(() => {
              // Show microphone icon when not recording and no status
              if (!recordingState.isRecording && !recordingState.audioBlob && !message) {
                return (
                  <svg className='w-[120px] h-[120px]' viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g>
                      <path fill="#fff" d="M32,48c7.732,0,14-6.268,14-14V14c0-7.732-6.268-14-14-14S18,6.268,18,14v20C18,41.732,24.268,48,32,48z M20,31h5c0.553,0,1-0.447,1-1s-0.447-1-1-1h-5v-4h5c0.553,0,1-0.447,1-1s-0.447-1-1-1h-5v-4h5c0.553,0,1-0.447,1-1s-0.447-1-1-1 h-5v-3c0-6.627,5.373-12,12-12s12,5.373,12,12v3h-5c-0.553,0-1,0.447-1,1s0.447,1,1,1h5v4h-5c-0.553,0-1,0.447-1,1s0.447,1,1,1h5v4 h-5c-0.553,0-1,0.447-1,1s0.447,1,1,1h5v3c0,6.627-5.373,12-12,12s-12-5.373-12-12V31z"/>
                      <path fill="#fff" d="M51,31.002c-1.657,0-2.999,1.342-3,2.998c-0.001,8.838-7.163,15.999-16,15.999S16.001,42.838,16,34 c0-1.656-1.343-3-3-3s-3,1.344-3,3c0,10.43,7.26,19.157,17,21.423v4.576c0,2.209,1.791,4,4,4h2c2.209,0,4-1.791,4-4v-4.576 C46.74,53.157,54,44.43,54,34C53.999,32.344,52.657,31.002,51,31.002z M37,53.345c-0.654,0.168-1.321,0.304-2,0.407v6.247 c0,1.104-0.896,2-2,2h-2c-1.104,0-2-0.896-2-2v-6.247c-0.679-0.104-1.346-0.239-2-0.407C18.379,51.121,12,43.315,12,34 c0-0.553,0.447-1,1-1s1,0.447,1,1c0.001,9.94,8.059,17.999,18,17.999S49.999,43.94,50,34c0.001-0.551,0.447-0.998,1-0.998 s0.999,0.447,1,0.998C52,43.315,45.621,51.121,37,53.345z"/>
                    </g>
                  </svg>
                );
              }
              
              // Show animated blob when recording
              if (recordingState.isRecording) {
                return (
                  <div className="flex flex-col items-center justify-center">
                    <svg className='h-[120px] w-[120px] overflow-visible' viewBox="0 0 128 128">
                      <defs>
                        <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FF6600" />
                          <stop offset="100%" stopColor="#FFCC00" />
                        </linearGradient>
                      </defs>
                      <path d={generateBlobPath(animationLevel)} fill="url(#blobGradient)" />
                    </svg>
                    

                  </div>
                );
              }
              
              // Show processing status with simple progress bar
              if (isProcessing) {
                return (
                  <div className="flex items-center space-x-6">
                    {/* Simple thin progress bar */}
                    <div className="w-2 h-32 bg-gray-700 rounded-full">
                      <div 
                        className="w-2 bg-orange-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ height: '33%' }}
                      ></div>
                    </div>
                    
                    {/* Status text */}
                    <div className="text-left text-white space-y-3">
                      <div className="flex items-center space-x-2">
                        <span>Creating Embedding</span>
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="text-gray-400 text-sm">
                        Comparing
                      </div>

                    </div>
                  </div>
                );
              }
              
              // Show status messages in the center (no blob after submission)
              if (message) {
                return (
                  <div className="text-center max-w-[400px]">
                    <div className={`text-[16px] leading-relaxed ${
                      message.type === 'success' ? 'text-green-400' : 
                      message.type === 'error' ? 'text-red-400' : 
                      'text-blue-400'
                    }`}>
                      {message.text.split('\n').map((line, index) => (
                        <div key={index} className="mb-2">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              
              // Show audio preview when recording is stopped
              if (recordingState.audioBlob) {
                return (
                  <div className="text-center">
                    <audio controls src={recordingState.audioUrl} className="w-full max-w-md" />
                  </div>
                );
              }
              

              
              return null;
            })()}
          </div>

        {/* Recording Controls - Hide when processing */}
        {!isProcessing && (
          <div className="flex gap-[5vw]">
            {/* Recording Button - Only show when no audio is loaded */}
            {!recordingState.audioBlob && (
              <div className="flex flex-col items-center">
                {!recordingState.isRecording ? (
                  <button 
                    onClick={startRecording}
                    disabled={isProcessing}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <svg className='h-8 w-8' viewBox="0 0 18 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12.4286 4.42857C12.4286 2.53502 10.8936 1 9.00001 1C7.10647 1 5.57144 2.53502 5.57144 4.42857V10.1429C5.57144 12.0364 7.10647 13.5714 9.00001 13.5714C10.8936 13.5714 12.4286 12.0364 12.4286 10.1429V4.42857Z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M1 10.1429C1 12.2646 1.84286 14.2994 3.34314 15.7997C4.84344 17.3 6.87829 18.1429 9 18.1429C11.1217 18.1429 13.1566 17.3 14.6568 15.7997C16.1571 14.2994 17 12.2646 17 10.1429" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M9 21.5714V19.2857" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ) : (
                  <>
                    {/* Show sentence during recording */}
                    {wordValidation.sentence && (
                      <div className="text-center mb-8">
                        <p className="text-orange-400 text-sm font-medium mb-2 ">Speak this sentence:</p>
                        <p className="text-white text-lg font-semibold leading-relaxed">"{wordValidation.sentence}"</p>
                      </div>
                    )}
                  <button 
                    onClick={stopRecording}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <svg className='h-8 w-8' viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M1.30563 15.2187C0.898125 15.6263 0.898125 16.2869 1.30563 16.6944C1.71313 17.1019 2.37383 17.1019 2.78133 16.6944L1.30563 15.2187ZM9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622L9.73783 9.73783ZM8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783C8.66972 10.1453 9.33031 10.1453 9.73783 9.73783L8.2622 8.2622ZM16.6944 2.78133C17.1019 2.37383 17.1019 1.71313 16.6944 1.30563C16.2869 0.898125 15.6263 0.898125 15.2187 1.30563L16.6944 2.78133ZM9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783L9.73783 8.2622ZM15.2187 16.6944C15.6263 17.1019 16.2869 17.1019 16.6944 16.6944C17.1019 16.2869 17.1019 15.6263 16.6944 15.2187L15.2187 16.6944ZM8.2622 9.73783C8.66972 10.1453 9.33031 10.1453 9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622L8.2622 9.73783ZM2.78133 1.30563C2.37383 0.898125 1.71313 0.898125 1.30563 1.30563C0.898125 1.71313 0.898125 2.37383 1.30563 2.78133L2.78133 1.30563ZM2.78133 16.6944L9.73783 9.73783L16.6944 15.2187L9.73783 8.2622L8.2622 9.73783ZM9.73783 8.2622L2.78133 1.30563L1.30563 2.78133L8.2622 9.73783L9.73783 8.2622Z" fill="#FF8000"/>
                    </svg>
                  </button>
                  </>
                )}
                <span className="text-white text-lg mt-2">Start</span>
              </div>
            )}
          </div>
        )}


          {/* Authentication Buttons - Only show when not processing */}
          {recordingState.audioBlob && !isProcessing && (
            <div className="flex flex-col items-center space-y-3">
              <button 
                onClick={handleAuthenticateRecording}
                disabled={isProcessing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Connect Voice to Wallet
              </button>
            </div>
          )}
          

        </div>


      </div>
    </div>
  );
};

export default AuthenticateVoice; 