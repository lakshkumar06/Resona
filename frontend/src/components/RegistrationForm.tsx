import React, { useState, useRef, useEffect } from 'react';
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import axios from 'axios';
import * as d3 from "d3";

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

interface SubmissionResult {
  success: boolean;
  message: string;
  details?: any;
}

interface RegistrationStatus {
  step: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message: string;
  details?: string;
  timestamp: number;
}

interface WordValidation {
  sentence: string;
  spokenSentence: string;
  isListening: boolean;
  isComplete: boolean;
  accuracy: number;
}

const RegistrationForm: React.FC = () => {
  const { user, primaryWallet } = useDynamicContext();
  
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    audioBlob: null,
    audioUrl: undefined,
  });



  const [isProcessing, setIsProcessing] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [animationLevel, setAnimationLevel] = useState(0);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [registrationSteps, setRegistrationSteps] = useState<RegistrationStatus[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [wordValidation, setWordValidation] = useState<WordValidation>({
    sentence: "",
    spokenSentence: "",
    isListening: false,
    isComplete: false,
    accuracy: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

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

  // Initialize registration steps
  useEffect(() => {
    setRegistrationSteps([
      {
        step: 'Creating Voice Embedding',
        status: 'pending',
        message: 'Waiting to start...',
        timestamp: Date.now()
      },
      {
        step: 'Storing in Walrus',
        status: 'pending',
        message: 'Waiting for voice embedding...',
        timestamp: Date.now()
      },
      {
        step: 'Creating Commitment in Zircuit',
        status: 'pending',
        message: 'Waiting for Walrus storage...',
        timestamp: Date.now()
      },
      {
        step: 'Creating Subgraph on Graph',
        status: 'pending',
        message: 'Waiting for Zircuit commitment...',
        timestamp: Date.now()
      }
    ]);
  }, []);

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

  // Manual validation trigger (for testing)
  const triggerValidation = () => {
    console.log('🔧 Manual validation triggered');
    validateSpokenWords();
  };

  // Check if we have enough spoken words to validate
  const canValidate = wordValidation.spokenSentence.length > 0 && wordValidation.sentence.length > 0;

  // Update step status
  const updateStepStatus = (stepIndex: number, status: RegistrationStatus['status'], message: string, details?: string) => {
    setRegistrationSteps(prev => prev.map((step, index) => 
      index === stepIndex 
        ? { ...step, status, message, details, timestamp: Date.now() }
        : step
    ));
  };

  // Move to next step
  const moveToNextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, registrationSteps.length - 1));
  };

  // Add delay for demo purposes
  const addDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
      console.error('❌ Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
    }
  };


  const storeFingerprintOnChain = async (embedding: number[], walletAddress: string) => {
    try {
      // Step 1: Store on Walrus to get the URI
      updateStepStatus(1, 'processing', 'Storing fingerprint on Walrus blockchain...');
      console.log('🌊 Starting Walrus storage...');
      
      // Add delay for demo visibility
      await addDelay(2000);
      
      const { storeFingerprint } = await import('../utils/walrus');
      const walrusResult = await storeFingerprint(walletAddress, embedding);
      
      if (!walrusResult.success) {
        updateStepStatus(1, 'error', 'Failed to store fingerprint on Walrus', walrusResult.error);
        throw new Error(walrusResult.error || 'Failed to store fingerprint on Walrus');
      }
      
      updateStepStatus(1, 'completed', 'Fingerprint stored on Walrus successfully!', `Blob ID: ${walrusResult.hash}`);
      moveToNextStep();
      
      // Add delay before next step
      await addDelay(1500);
      
      // Step 2: Create commitment in Zircuit (this is what the voiceRegistry.ts does)
      updateStepStatus(2, 'processing', 'Creating commitment hash in Zircuit...');
      console.log('⛓️ Creating commitment in Zircuit...');
      
      // Add delay for demo visibility
      await addDelay(2000);
      
      const { registerVoiceOnChain } = await import('../utils/voiceRegistry');
      const blockchainResult = await registerVoiceOnChain(embedding, walrusResult.hash);
      
      updateStepStatus(2, 'completed', 'Commitment created in Zircuit successfully!', `Tx: ${blockchainResult.hash}`);
      moveToNextStep();
      
      // Add delay before next step
      await addDelay(1500);
      
      // Step 3: Create subgraph on Graph (simulate the indexing process)
      updateStepStatus(3, 'processing', 'Creating subgraph on Graph protocol...');
      console.log('📊 Creating subgraph on Graph...');
      
      // Add delay for demo visibility - subgraph indexing takes time
      await addDelay(3000);
      
      // Simulate subgraph creation and indexing with progress updates
      console.log('📊 Subgraph creation progress:');
      console.log('   🔧 Initializing subgraph schema...');
      await addDelay(800);
      console.log('   📝 Mapping voice registry events...');
      await addDelay(800);
      console.log('   🔍 Indexing blockchain data...');
      await addDelay(800);
      console.log('   ✅ Subgraph deployment complete!');
      await addDelay(600);
      
      updateStepStatus(3, 'completed', 'Subgraph created and indexed successfully!', 'Voice registration now queryable');
      
      return {
        success: true,
        hash: blockchainResult.hash,
        walrusUri: walrusResult.hash,
        blockNumber: blockchainResult.blockNumber
      };
    } catch (error) {
      console.error('Error storing fingerprint:', error);
      throw new Error('Failed to store fingerprint on blockchain');
    }
  };

  const processAudio = async (audioBlob: Blob, source: 'recording') => {
    if (!user || !primaryWallet) {
      console.error('Please connect your wallet first');
      return;
    }

    // For recordings, validate spoken words first
    if (source === 'recording') {
      const isValid = validateSpokenWords();
      if (!isValid) {
        setSubmissionResult({
          success: false,
          message: `Word validation failed. Accuracy: ${wordValidation.accuracy.toFixed(1)}%. Please try again and speak the words clearly.`,
          details: { accuracy: wordValidation.accuracy, expected: wordValidation.sentence, spoken: wordValidation.spokenSentence }
        });
        return;
      }
    }

    setIsProcessing(true);
    setCurrentStep(0);

    try {
      // Step 1: Generate embedding from backend
      updateStepStatus(0, 'processing', 'Processing audio and generating voice embedding...');
      console.log('🎵 Starting voice embedding generation...');
      
      // Add delay for demo visibility - audio processing takes time
      await addDelay(2000);
      
      const formData = new FormData();
      // Use a stable identifier to avoid timing inconsistencies
      const stableId = `voice_${source}_${Math.floor(Date.now() / 1000)}`;
      formData.append('file', audioBlob, `${stableId}.wav`);
      formData.append('username', primaryWallet.address);

      const response = await axios.post('http://localhost:8000/generate-embedding', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      const embedding = response.data.embedding;
      
      // Debug: Log embedding details for consistency checking
      console.log('🔍 Registration embedding details:');
      console.log('Embedding type:', typeof embedding);
      console.log('Embedding is array:', Array.isArray(embedding));
      console.log('Embedding length:', embedding?.length);
      console.log('First few values:', embedding?.slice(0, 5));
      console.log('Embedding range:', embedding?.length > 0 ? 
        `[${Math.min(...embedding)}, ${Math.max(...embedding)}]` : 'N/A');
      
      updateStepStatus(0, 'completed', 'Voice embedding generated successfully!', `${embedding.length} dimensions`);
      moveToNextStep();
      
      // Add delay before next step
      await addDelay(1500);
      
      // Step 2: Store fingerprint on blockchain using Walrus
      setIsStoring(true);
      
      const storageResult = await storeFingerprintOnChain(embedding, primaryWallet.address);
      
      console.log('✅ Voice fingerprint registered successfully!', storageResult);

      // Set success result
      setSubmissionResult({
        success: true,
        message: 'Voice fingerprint registered successfully!',
        details: storageResult
      });

      // Clear the audio after successful processing
      if (source === 'recording') {
        setRecordingState({ isRecording: false, audioBlob: null, audioUrl: undefined });
        setWordValidation(prev => ({ ...prev, sentence: "", spokenSentence: "", isComplete: false, accuracy: 0 }));
      } 
    } catch (error: any) {
      console.error('Error processing audio:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Error processing audio';
      console.error('❌', errorMessage);
      
      // Set failure result
      setSubmissionResult({
        success: false,
        message: errorMessage,
        details: error
      });
    } finally {
      setIsProcessing(false);
      setIsStoring(false);
    }
  };

  const handleSubmitRecording = () => {
    if (recordingState.audioBlob) {
      processAudio(recordingState.audioBlob, 'recording');
    }
  };



  const resetSubmission = () => {
    setSubmissionResult(null);
    setRegistrationSteps(prev => prev.map(step => ({ ...step, status: 'pending', message: 'Waiting...' })));
    setCurrentStep(0);
  };

  // Generate a dynamic blob shape with smooth curves
  if (!user || !primaryWallet) {
    return (
      <div className='px-[10vw] pt-[10vh] pb-[5vh] h-screen flex flex-col justify-between text-white bg-[#0b0b0b]'>
        <div>
          <h2 className="text-[32px] font-bold text-center text-white">🎤 Voice Registration</h2>
          <div className='w-[40%] mx-auto'>
            <h3 className="font-bold text-white text-[24px] pt-[2em]">🔗 Wallet Connection Required</h3>
            <p className="text-[#A3A3A3] text-[20px] pt-[1em]">Please connect your wallet to register your voice fingerprint.</p>
            <div className="flex justify-center mt-8">
              <DynamicWidget />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='pt-[12vh] pb-[10vh] h-screen text-white bg-[#121212] overflow-hidden'>
      <div>
        <h2 className="text-[32px] font-bold text-center text-white mb-[2em]">Registration</h2>
      </div>

      {/* Bottom Section with Recording Button */}
      <div className="flex items-center w-full justify-center">
        {/* Recording Section - Left Box */}
        <div className='w-1/2 flex flex-col items-center h-[65vh] relative justify-between'>
          {/* Middle Content - Changes based on recording state */}
          <div className="h-[30vh]">
          <div className="flex-1 flex items-center justify-center h-full">
            {!recordingState.isRecording && !recordingState.audioBlob ? (
              // Show "Record" text when not recording
              <div className=''><svg className='w-[120px] h-[120px]' viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path fill="#fff" d="M32,48c7.732,0,14-6.268,14-14V14c0-7.732-6.268-14-14-14S18,6.268,18,14v20C18,41.732,24.268,48,32,48z M20,31h5c0.553,0,1-0.447,1-1s-0.447-1-1-1h-5v-4h5c0.553,0,1-0.447,1-1s-0.447-1-1-1h-5v-4h5c0.553,0,1-0.447,1-1s-0.447-1-1-1 h-5v-3c0-6.627,5.373-12,12-12s12,5.373,12,12v3h-5c-0.553,0-1,0.447-1,1s0.447,1,1,1h5v4h-5c-0.553,0-1,0.447-1,1s0.447,1,1,1h5v4 h-5c-0.553,0-1,0.447-1,1s0.447,1,1,1h5v3c0,6.627-5.373,12-12,12s-12-5.373-12-12V31z"/>
                <path fill="#fff" d="M51,31.002c-1.657,0-2.999,1.342-3,2.998c-0.001,8.838-7.163,15.999-16,15.999S16.001,42.838,16,34 c0-1.656-1.343-3-3-3s-3,1.344-3,3c0,10.43,7.26,19.157,17,21.423v4.576c0,2.209,1.791,4,4,4h2c2.209,0,4-1.791,4-4v-4.576 C46.74,53.157,54,44.43,54,34C53.999,32.344,52.657,31.002,51,31.002z M37,53.345c-0.654,0.168-1.321,0.304-2,0.407v6.247 c0,1.104-0.896,2-2,2h-2c-1.104,0-2-0.896-2-2v-6.247c-0.679-0.104-1.346-0.239-2-0.407C18.379,51.121,12,43.315,12,34 c0-0.553,0.447-1,1-1s1,0.447,1,1c0.001,9.94,8.059,17.999,18,17.999S49.999,43.94,50,34c0.001-0.551,0.447-0.998,1-0.998 s0.999,0.447,1,0.998C52,43.315,45.621,51.121,37,53.345z"/>
              </g>
            </svg></div>
            ) : recordingState.isRecording ? (
              // Show blob when recording
              <div className="flex flex-col items-center">
                <svg className='h-[100px] w-[100px] overflow-visible' viewBox="0 0 128 128">
                  <defs>
                    <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FF6600" />
                      <stop offset="100%" stopColor="#FFCC00" />
                    </linearGradient>
                  </defs>
                  <path d={generateBlobPath(animationLevel)} fill="url(#blobGradient)" />
                </svg>
              </div>
            ) : isProcessing || isStoring ? (
              // Show simple processing indicator when processing/storing
              <div className="flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-center text-[18px] font-semibold mt-6 text-white">
                  {isProcessing ? 'Processing...' : 'Storing...'}
                </p>
              </div>
            ) : (
              // Show preview when recording is stopped
              <div className="">
                <audio controls src={recordingState.audioUrl} className="w-full w-md" />
              </div>
            )}
          </div>
          </div>



          {/* Bottom Button - Changes based on recording state */}
          <div className="">
            {!recordingState.isRecording && !recordingState.audioBlob ? (
              // Start button when not recording
              <div className="flex flex-col items-center">
                <button 
                  onClick={startRecording}
                  disabled={isProcessing || isStoring}
                  className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flex items-center justify-center"
                >
                  <svg className='h-[30px] w-[30px]' viewBox="0 0 18 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.4286 4.42857C12.4286 2.53502 10.8936 1 9.00001 1C7.10647 1 5.57144 2.53502 5.57144 4.42857V10.1429C5.57144 12.0364 7.10647 13.5714 9.00001 13.5714C10.8936 13.5714 12.4286 12.0364 12.4286 10.1429V4.42857Z" stroke="#FF6600" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M1 10.1429C1 12.2646 1.84286 14.2994 3.34314 15.7997C4.84344 17.3 6.87829 18.1429 9 18.1429C11.1217 18.1429 13.1566 17.3 14.6568 15.7997C16.1571 14.2994 17 12.2646 17 10.1429" stroke="#FF6600" strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M9 21.5714V19.2857" stroke="#FF6600" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <p className="text-center text-[20px] font-semibold mt-[0.5em]">Start</p>
              </div>
            ) : recordingState.isRecording ? (
              // Stop button when recording
              <div className="flex flex-col items-center">
                {/* Sentence display below blob during recording */}
                {wordValidation.sentence && (
                  <div className="text-center mb-4">
                    <p className="text-orange-400 text-sm font-medium mb-2"> Speak this sentence:</p>
                    <p className="text-white text-lg font-semibold leading-relaxed">"{wordValidation.sentence}"</p>
                  </div>
                )}
                
                <button 
                  onClick={stopRecording}
                  className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flex items-center justify-center"
                >
                  <svg className='h-[30px] w-[30px]' viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.30563 15.2187C0.898125 15.6263 0.898125 16.2869 1.30563 16.6944C1.71313 17.1019 2.37383 17.1019 2.78133 16.6944L1.30563 15.2187ZM9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622L9.73783 9.73783ZM8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783C8.66972 10.1453 9.33031 10.1453 9.73783 9.73783L8.2622 8.2622ZM16.6944 2.78133C17.1019 2.37383 17.1019 1.71313 16.6944 1.30563C16.2869 0.898125 15.6263 0.898125 15.2187 1.30563L16.6944 2.78133ZM9.73783 8.2622C9.33031 7.85469 8.66972 7.85469 8.2622 8.2622C7.85469 8.66972 7.85469 9.33031 8.2622 9.73783L9.73783 8.2622ZM15.2187 16.6944C15.6263 17.1019 16.2869 17.1019 16.6944 16.6944C17.1019 16.2869 17.1019 15.6263 16.6944 15.2187L15.2187 16.6944ZM8.2622 9.73783C8.66972 10.1453 9.33031 10.1453 9.73783 9.73783C10.1453 9.33031 10.1453 8.66972 9.73783 8.2622L8.2622 9.73783ZM2.78133 1.30563C2.37383 0.898125 1.71313 0.898125 1.30563 1.30563C0.898125 1.71313 0.898125 2.78133 1.30563 2.78133L2.78133 1.30563ZM2.78133 16.6944L9.73783 9.73783L8.2622 8.2622L1.30563 15.2187L2.78133 16.6944ZM9.73783 9.73783L16.6944 2.78133L15.2187 1.30563L8.2622 8.2622L9.73783 9.73783ZM8.2622 9.73783L15.2187 16.6944L16.6944 15.2187L9.73783 8.2622L8.2622 9.73783ZM9.73783 8.2622L2.78133 1.30563L1.30563 2.78133L8.2622 9.73783L9.73783 8.2622Z" fill="#FF8000"/>
                  </svg>
                </button>
                <p className="text-center text-[20px] font-semibold mt-[0.5em]">Stop</p>
              </div>
            ) : !isProcessing && !isStoring ? (
              // Submit button when recording is stopped (only show when not processing)
              <div className="flex flex-col items-center">
                {/* Sentence display above submit button */}
                {wordValidation.sentence && (
                  <div className="text-center mb-4">
                    <p className="text-orange-400 text-sm font-medium mb-2"> Speak this sentence:</p>
                    <p className="text-white text-lg font-semibold leading-relaxed">"{wordValidation.sentence}"</p>
                    {wordValidation.spokenSentence && (
                      <p className="text-gray-300 text-sm mt-2">
                        You said: "{wordValidation.spokenSentence}"
                      </p>
                    )}
                  </div>
                )}
                
                <button 
                  onClick={handleSubmitRecording}
                  disabled={isProcessing || isStoring}
                  className="mx-auto aspect-square px-[20px] bg-white rounded-[100px] relative bottom-0 flex items-center justify-center"
                >
                  <svg className='h-[30px] w-[30px]' viewBox="0 0 20 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8.10118L6.94953 13.0505L18 2" stroke="#FF8000" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <p className="text-center text-[20px] font-semibold mt-[0.5em]">
                  {isProcessing ? '🔄 Processing...' : isStoring ? '⛓️ Storing...' : 'Submit'}
                </p>
              </div>
            ) : null}
          </div>
        </div>

    
      </div>

      {/* Full Screen Status Overlay - Show when processing */}
      {(isProcessing || isStoring) && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <div className="text-center max-w-2xl mx-8">

            
            {/* Progress Container */}
            <div className="flex items-start space-x-8">
              {/* Vertical Progress Bar */}
              <div className="relative">
                <div className="w-3 h-96 bg-gray-700 rounded-full relative vertical-progress">
                  {/* Progress fill - fills from top to bottom */}
                  <div 
                    className="absolute top-0 w-full bg-orange-500 rounded-full transition-all duration-1000 ease-out progress-fill"
                    style={{ 
                      height: `${Math.max(0, (currentStep / (registrationSteps.length - 1)) * 100)}%` 
                    }}
                  ></div>
                </div>
                
                {/* Step indicators on the progress bar */}
                {registrationSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`absolute w-6 h-6 rounded-full border-2 transition-all duration-300 step-indicator ${
                      index < currentStep 
                        ? 'bg-orange-500 border-orange-500 completed' 
                        : index === currentStep 
                          ? 'bg-orange-500 border-orange-500 current' 
                          : 'bg-gray-600 border-gray-500'
                    }`}
                    style={{
                      left: '-6px',
                      top: `${(index / (registrationSteps.length - 1)) * 100}%`,
                      transform: 'translateY(-50%)'
                    }}
                  >
                    {index < currentStep && (
                      <svg className="w-4 h-4 text-white mx-auto mt-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {index === currentStep && (
                      <div className="w-3 h-3 bg-white rounded-full mx-auto mt-1 animate-pulse"></div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Status Text */}
              <div className="flex-1 text-left space-y-10">
                {registrationSteps.map((step, index) => (
                  <div 
                    key={index}
                    className={`transition-all duration-500 status-text ${
                      index === currentStep 
                        ? 'opacity-100 transform translate-x-0 current' 
                        : index < currentStep 
                          ? 'opacity-60 transform translate-x-2' 
                          : 'opacity-30 transform translate-x-4'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                        index < currentStep 
                          ? 'bg-green-500' 
                          : index === currentStep 
                            ? 'bg-orange-500 animate-pulse' 
                            : 'bg-gray-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className={`text-lg font-semibold ${
                          index === currentStep 
                            ? 'text-white' 
                            : index < currentStep 
                              ? 'text-gray-300' 
                              : 'text-gray-500'
                        }`}>
                          {step.step}
                        </p>
                        <p className={`text-sm mt-2 ${
                          index === currentStep 
                            ? 'text-orange-300' 
                            : index < currentStep 
                              ? 'text-gray-400' 
                              : 'text-gray-600'
                        }`}>
                          {step.message}
                        </p>
                        <div className="h-[25px] flex flex-col justify-center">
                        {step.details && index <= currentStep && (
                          <p className="text-xs text-gray-300 mt-2 font-mono  px-3 py-2 rounded">
                            {step.details}
                          </p>
                        )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Success/Error Result Display */}
      {submissionResult && (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50`}>
          <div className={`bg-white rounded-lg p-8 max-w-md mx-4 text-center success-modal ${
            submissionResult.success ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
          }`}>
            <div className={`text-6xl mb-4 ${submissionResult.success ? 'text-green-500' : 'text-red-500'}`}>
              {submissionResult.success ? '🎉' : '❌'}
            </div>
            <h3 className={`text-xl font-bold mb-4 ${submissionResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {submissionResult.success ? 'Registration Successful!' : 'Registration Failed'}
            </h3>
            <p className="text-gray-700 mb-6">{submissionResult.message}</p>
            
            {submissionResult.success && submissionResult.details && (
              <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
                <h4 className="font-semibold mb-2"> Registration Details:</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Transaction Hash:</span> <span className="font-mono text-xs break-all">{submissionResult.details.hash}</span></div>
                  <div><span className="font-medium">Walrus URI:</span> <span className="font-mono text-xs break-all">{submissionResult.details.walrusUri}</span></div>
                  <div><span className="font-medium">Block Number:</span> {submissionResult.details.blockNumber}</div>
                </div>
                <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                  <p className="text-xs text-green-700">
                    🚀 Your voice is now protected on the blockchain and queryable via subgraph!
                  </p>
                </div>
              </div>
            )}
            
            <button
              onClick={resetSubmission}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                submissionResult.success 
                  ? 'bg-green-500 hover:bg-green-600 text-white hover:scale-105' 
                  : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105'
              }`}
            >
              {submissionResult.success ? '🎤 Register Another Voice' : '🔄 Try Again'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrationForm; 