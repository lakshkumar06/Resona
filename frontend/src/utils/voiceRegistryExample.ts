import { 
  vectorToCommitment, 
  sanitizeEmbedding,
  registerVoiceOnChain, 
  isVoiceRegistered,
  getVoiceOwner,
  getVoiceWalrusUri 
} from './voiceRegistry';

/**
 * Example usage of voice registry functions
 */

// Example voice embedding (random values for demonstration)
const exampleEmbedding = Array.from({ length: 128 }, () => Math.random() * 2 - 1);

// Example Walrus URI
const exampleWalrusUri = "walrus://example-hash-here";

/**
 * Example: Register a voice
 */
export async function exampleRegisterVoice() {
  try {
    console.log('Example: Registering voice...');
    
    // Generate commitment from embedding
    const commitment = vectorToCommitment(exampleEmbedding);
    console.log('Generated commitment:', commitment);
    
    // Register on blockchain (requires signer)
    // const receipt = await registerVoiceOnChain(exampleEmbedding, exampleWalrusUri);
    // console.log('Registration successful:', receipt.hash);
    
    return commitment;
  } catch (error) {
    console.error('Registration failed:', error);
    throw error;
  }
}

/**
 * Example: Check if voice is registered
 */
export async function exampleCheckRegistration() {
  try {
    console.log('Example: Checking voice registration...');
    
    const isRegistered = await isVoiceRegistered(exampleEmbedding);
    console.log('Is registered:', isRegistered);
    
    if (isRegistered) {
      const owner = await getVoiceOwner(exampleEmbedding);
      const walrusUri = await getVoiceWalrusUri(exampleEmbedding);
      
      console.log('Owner:', owner);
      console.log('Walrus URI:', walrusUri);
    }
    
    return isRegistered;
  } catch (error) {
    console.error('Check failed:', error);
    throw error;
  }
}

/**
 * Example: Generate commitment for verification
 */
export function exampleGenerateCommitment(embedding: number[]) {
  try {
    const commitment = vectorToCommitment(embedding);
    console.log('Commitment for verification:', commitment);
    return commitment;
  } catch (error) {
    console.error('Commitment generation failed:', error);
    throw error;
  }
}

/**
 * Example: Sanitize raw embedding data
 */
export function exampleSanitizeEmbedding(rawEmbedding: any[]) {
  try {
    const cleanEmbedding = sanitizeEmbedding(rawEmbedding);
    console.log('Sanitized embedding length:', cleanEmbedding.length);
    console.log('Sanitized sample values:', cleanEmbedding.slice(0, 5));
    return cleanEmbedding;
  } catch (error) {
    console.error('Sanitization failed:', error);
    throw error;
  }
}

// Export the example embedding for testing
export { exampleEmbedding, exampleWalrusUri };
