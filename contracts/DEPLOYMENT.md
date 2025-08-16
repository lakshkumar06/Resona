# Voice Registry Mirror Contract Deployment

This guide covers deploying the `VoiceRegistryMirror.sol` contract to Polygon Amoy testnet and setting up the relay system.

## Prerequisites

1. **Polygon Amoy Testnet MATIC**: Get testnet MATIC from [Polygon Faucet](https://faucet.polygon.technology/)
2. **Private Key**: Your wallet private key (already configured in hardhat.config.js)

## Deployment Steps

### 1. Compile Contracts
```bash
npm run compile
```

### 2. Deploy Mirror Contract to Polygon Amoy
```bash
npm run deploy:mirror
```

This will deploy the `VoiceRegistryMirror` contract and output the contract address.

### 3. Update Configuration
Edit `config.js` and update the contract addresses:
- `MIRROR_CONTRACT_ADDRESS`: The address from step 2
- `ZIRCUIT_CONTRACT_ADDRESS`: Your deployed Zircuit contract address

### 4. Verify Contract (Optional)
```bash
npx hardhat verify --network polygonAmoy <MIRROR_CONTRACT_ADDRESS>
```

## Running the Relay

### 1. Start the Relay
```bash
npm run relay
```

The relay will:
- Monitor `VoiceRegistered` events on Zircuit
- Automatically mirror registrations to Polygon Amoy
- Log all activities to console

### 2. Stop the Relay
Press `Ctrl+C` to stop the relay process.

## Contract Details

### VoiceRegistryMirror.sol
- **Function**: `mirrorVoiceRegistration(bytes32, string, uint256)`
- **Events**: `VoiceRegistered(bytes32, address, string, uint256)`
- **Purpose**: Mirrors voice registrations from Zircuit to Polygon Amoy

### Network Configuration
- **Zircuit**: Garfield testnet (chain ID: 99999)
- **Polygon Amoy**: Testnet (chain ID: 80002)

## Troubleshooting

1. **Insufficient MATIC**: Ensure you have testnet MATIC for gas fees
2. **Contract Addresses**: Verify all addresses in `config.js` are correct
3. **RPC Issues**: Check network connectivity and RPC endpoint status
4. **Private Key**: Ensure your private key has sufficient funds on both networks

## Security Notes

- Never commit private keys to version control
- Use environment variables for production deployments
- Verify contract addresses before running relay
- Monitor relay logs for any errors or failed transactions
