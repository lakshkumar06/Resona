// Voice Protection API Utility Functions

export interface ProtectionResult {
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

export interface VoiceProtectionOptions {
  threshold?: number;
  topK?: number;
}

/**
 * Check if a voice is protected using an audio file
 */
export async function checkVoiceProtectionWithFile(
  file: File, 
  options: VoiceProtectionOptions = {}
): Promise<ProtectionResult> {
  const { threshold = 0.75, topK = 5 } = options;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('threshold', threshold.toString());
  formData.append('top_k', topK.toString());

  const response = await fetch('http://localhost:8000/is-protected', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Check if a voice is protected using an embedding array
 */
export async function checkVoiceProtectionWithEmbedding(
  embedding: number[], 
  options: VoiceProtectionOptions = {}
): Promise<ProtectionResult> {
  const { threshold = 0.75, topK = 5 } = options;
  
  const formData = new FormData();
  formData.append('embedding', JSON.stringify(embedding));
  formData.append('threshold', threshold.toString());
  formData.append('top_k', topK.toString());

  const response = await fetch('http://localhost:8000/is-protected', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Record audio and check if it's protected
 */
export async function recordAndCheckVoiceProtection(
  durationMs: number = 5000,
  options: VoiceProtectionOptions = {}
): Promise<ProtectionResult> {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const mediaRecorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(chunks, { type: 'audio/wav' });
          const file = new File([blob], 'recorded_audio.wav', { type: 'audio/wav' });
          
          try {
            const result = await checkVoiceProtectionWithFile(file, options);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        mediaRecorder.start();
        
        setTimeout(() => {
          mediaRecorder.stop();
          stream.getTracks().forEach(track => track.stop());
        }, durationMs);
      })
      .catch(_error => {
        reject(new Error('Failed to access microphone'));
      });
  });
}

/**
 * Simple check - just returns true/false if voice is protected
 */
export async function isVoiceProtected(
  input: File | number[],
  options: VoiceProtectionOptions = {}
): Promise<boolean> {
  try {
    let result: ProtectionResult;
    
    if (input instanceof File) {
      result = await checkVoiceProtectionWithFile(input, options);
    } else {
      result = await checkVoiceProtectionWithEmbedding(input, options);
    }
    
    return result.protected;
  } catch (error) {
    console.error('Error checking voice protection:', error);
    return false;
  }
}

/**
 * Get detailed protection info with owner details
 */
export async function getVoiceProtectionDetails(
  input: File | number[],
  options: VoiceProtectionOptions = {}
): Promise<{
  isProtected: boolean;
  owner?: string;
  confidence: number;
  nftLink?: string;
  timestamp?: number;
}> {
  try {
    let result: ProtectionResult;
    
    if (input instanceof File) {
      result = await checkVoiceProtectionWithFile(input, options);
    } else {
      result = await checkVoiceProtectionWithEmbedding(input, options);
    }
    
    return {
      isProtected: result.protected,
      owner: result.owner,
      confidence: result.confidence,
      nftLink: result.nft,
      timestamp: result.timestamp
    };
  } catch (error) {
    console.error('Error getting voice protection details:', error);
    return {
      isProtected: false,
      confidence: 0
    };
  }
}

// Example usage functions for common scenarios

/**
 * Quick check for LLM integration
 */
export async function llmCheckVoiceProtection(
  voiceInput: string | File
): Promise<{ protected: boolean; owner?: string; confidence: number }> {
  try {
    let result: ProtectionResult;
    
    if (typeof voiceInput === 'string') {
      // Assume it's a JSON string of embedding
      const embedding = JSON.parse(voiceInput);
      result = await checkVoiceProtectionWithEmbedding(embedding);
    } else {
      result = await checkVoiceProtectionWithFile(voiceInput);
    }
    
    return {
      protected: result.protected,
      owner: result.owner,
      confidence: result.confidence
    };
  } catch (error) {
    console.error('LLM voice protection check failed:', error);
    return {
      protected: false,
      confidence: 0
    };
  }
}

/**
 * Batch check multiple voices
 */
export async function batchCheckVoiceProtection(
  inputs: (File | number[])[],
  options: VoiceProtectionOptions = {}
): Promise<ProtectionResult[]> {
  const results: ProtectionResult[] = [];
  
  for (const input of inputs) {
    try {
      let result: ProtectionResult;
      
      if (input instanceof File) {
        result = await checkVoiceProtectionWithFile(input, options);
      } else {
        result = await checkVoiceProtectionWithEmbedding(input, options);
      }
      
      results.push(result);
    } catch (error) {
      console.error('Error in batch check:', error);
      results.push({
        protected: false,
        confidence: 0,
        matches: [],
        total_checked: 0,
        threshold_used: options.threshold || 0.75
      });
    }
  }
  
  return results;
} 