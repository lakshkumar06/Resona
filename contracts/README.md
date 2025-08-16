# Voice Registry Smart Contract

This directory contains the VoiceRegistry smart contract for deployment on Zircuit.

## Contract Overview

The VoiceRegistry contract allows users to:
- Register voice commitments with associated metadata
- Revoke their voice registrations
- Query voice registration status and details

## Deployment Instructions

### 1. Set Up Environment Variables

Create a `.env` file in the contracts directory:

```bash
cp .env.example .env
```

Edit `.env` and add your Zircuit private key:
```
ZIRCUIT_PRIVATE_KEY=your_64_character_hex_private_key_here
ZIRCUIT_RPC_URL=https://zircuit1-mainnet.p2pify.com/
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Compile Contract

```bash
npx hardhat compile
```

### 4. Deploy to Zircuit

```bash
npx hardhat run scripts/deploy.js --network zircuit
```

## Contract Functions

- `registerVoice(bytes32 commitment, string walrusUri)` - Register a new voice commitment
- `revokeVoice(bytes32 commitment)` - Revoke a voice registration (owner only)
- `isRegistered(bytes32 commitment)` - Check if a voice is registered
- `getOwner(bytes32 commitment)` - Get the owner of a voice commitment
- `getWalrusUri(bytes32 commitment)` - Get the Walrus URI for a voice commitment

## Network Configuration

The contract is configured to deploy on Zircuit mainnet. Make sure you have:
- ZIRCUIT tokens for gas fees
- A valid private key with sufficient balance
- Access to the Zircuit RPC endpoint

## Verification

After deployment, you can verify your contract on the [Zircuit Explorer](https://explorer.zircuit.com).
