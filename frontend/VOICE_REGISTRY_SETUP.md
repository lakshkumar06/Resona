# Voice Registry Setup Guide

## Overview
This system allows you to register and verify voice fingerprints on the blockchain using your deployed VoiceRegistry contract. It combines Walrus storage for the actual voice embeddings with blockchain verification for ownership and authenticity.

## Setup Steps

### 1. Update Contract Address
In `src/utils/voiceRegistry.ts`, replace `YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE` with your actual deployed VoiceRegistry contract address:

```typescript
const VOICE_REGISTRY_ADDRESS = "0x..."; // Your deployed contract address
```

### 2. Ensure Dependencies
The system requires:
- `ethers` (already installed)
- Your deployed VoiceRegistry contract on Zircuit testnet
- Access to the voice server backend for embedding generation

### 3. How It Works

#### Registration Flow:
1. User records/uploads voice audio
2. Backend generates voice embedding (any dimension)
3. Embedding is stored on Walrus (returns URI)
4. Embedding is quantized and hashed to create commitment
5. Commitment + Walrus URI are stored on VoiceRegistry contract

#### Authentication Flow:
1. User provides voice for authentication
2. Backend generates embedding
3. System checks if embedding commitment exists on contract
4. If found, verifies ownership and returns details

## Key Functions

### `vectorToCommitment(embedding: number[])`
- Takes float array of any dimension
- Quantizes by multiplying by 10000 and rounding
- Encodes as int256[] and hashes with keccak256
- Returns bytes32 commitment

### `registerVoiceOnChain(embedding, walrusUri, signer?)`
- Registers voice on blockchain
- Automatically generates commitment
- Calls contract's `registerVoice(commitment, walrusUri)`
- Returns transaction receipt

### `isVoiceRegistered(embedding)`
- Checks if voice commitment exists on contract
- Returns boolean

### `getVoiceOwner(embedding)`
- Gets owner address for registered voice
- Throws if not registered

### `getVoiceWalrusUri(embedding)`
- Gets Walrus URI for registered voice
- Throws if not registered

## Usage Examples

### Basic Registration
```typescript
import { registerVoiceOnChain } from './utils/voiceRegistry';

const embedding = [/* float values */];
const walrusUri = "walrus://hash";

try {
  const receipt = await registerVoiceOnChain(embedding, walrusUri);
  console.log('Registered:', receipt.hash);
} catch (error) {
  console.error('Failed:', error);
}
```

### Basic Verification
```typescript
import { isVoiceRegistered, getVoiceOwner } from './utils/voiceRegistry';

const embedding = [/* float values */];

try {
  const isRegistered = await isVoiceRegistered(embedding);
  if (isRegistered) {
    const owner = await getVoiceOwner(embedding);
    console.log('Owner:', owner);
  }
} catch (error) {
  console.error('Failed:', error);
}
```

## Integration Points

### RegistrationForm.tsx
- Uses `storeFingerprintOnChain()` which calls both Walrus and VoiceRegistry
- Shows both blockchain transaction hash and Walrus URI on success

### AuthenticateVoice.tsx
- Has toggle between traditional backend auth and blockchain verification
- Uses VoiceRegistry functions for blockchain verification
- Shows contract-based authentication results

## Testing

### Test Connection
Use the "Test VoiceRegistry Connection" button in AuthenticateVoice to verify:
- Network connectivity to Zircuit testnet
- Basic contract accessibility

### Test Functions
Import and use functions from `voiceRegistryExample.ts` for testing individual components.

## Security Notes

- Voice embeddings are quantized and hashed before blockchain storage
- Original voice data remains private (only on Walrus)
- Blockchain stores only commitments and metadata
- Ownership verification prevents unauthorized modifications

## Troubleshooting

### Common Issues:
1. **Contract not found**: Verify contract address and network
2. **Transaction fails**: Check wallet balance and gas settings
3. **Embedding empty**: Ensure embedding array is not empty
4. **Network errors**: Verify Zircuit testnet connectivity

### Debug Mode:
Enable console logging in browser dev tools to see detailed transaction information.
