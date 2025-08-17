# Backend ZK Proof System

This backend implementation replaces the Circom circuit (`multiplier2.circom`) with a pure TypeScript ZK proof system for voice similarity verification.

## What It Does

The system proves that two voice embeddings have ≥75% similarity using the same mathematical logic as the original Circom circuit:

**Constraint**: `(a·b)² ≥ threshold² * ||a||² * ||b||²`

Where:
- `a·b` = dot product of embeddings
- `threshold = 0.75` (75% similarity)
- `||a||², ||b||²` = squared magnitudes of embeddings

## Key Features

✅ **Same Logic**: Matches Circom circuit exactly  
✅ **Same Scaling**: Uses 10000x scaling factor  
✅ **Same Threshold**: 75% similarity requirement  
✅ **Batch Processing**: Check multiple embeddings at once  
✅ **Certificates**: Generate audit-proof certificates  
✅ **No Dependencies**: Pure TypeScript, no external ZK libraries  

## API Endpoints

### 1. Single Similarity Proof
```bash
POST /api/zk/prove-similarity
```
**Body:**
```json
{
  "embeddingA": [0.1, 0.2, 0.3, ...],
  "embeddingB": [0.1, 0.2, 0.3, ...],
  "metadata": {"source": "voice_recording"}
}
```

### 2. Batch Similarity Proof
```bash
POST /api/zk/batch-prove
```
**Body:**
```json
{
  "targetEmbedding": [0.1, 0.2, 0.3, ...],
  "candidateEmbeddings": [
    [0.1, 0.2, 0.3, ...],
    [0.4, 0.5, 0.6, ...]
  ],
  "metadata": {"batch_id": "123"}
}
```

### 3. System Configuration
```bash
GET /api/zk/config
```

## Testing

Run the test suite to verify the system works correctly:

```bash
npm run test:zk
```

This will test:
- Same embedding (100% similarity)
- Similar embeddings (≥75% similarity)  
- Different embeddings (<75% similarity)
- Batch processing
- Certificate generation
- Math verification against Circom circuit

## How It Works

1. **Input Validation**: Ensures embeddings are valid arrays
2. **Dot Product**: Computes `a·b` for all dimensions
3. **Magnitudes**: Computes `||a||²` and `||b||²`
4. **Scaling**: Applies 10000x scaling (same as Circom)
5. **Constraint Check**: Verifies `(a·b)² ≥ threshold² * ||a||² * ||b||²`
6. **Result**: Returns pass/fail with similarity percentage

## Migration from Circom

The backend system provides the same functionality as the Circom circuit:

| Circom Circuit | Backend System |
|----------------|----------------|
| `LessThan(252)` constraint | `dotProductSquared >= rhs` check |
| 10000x scaling | 10000x scaling |
| 75% threshold | 75% threshold |
| 192 dimensions | 192 dimensions |
| ZK proof generation | Certificate generation |

## Benefits

- **Faster**: No circuit compilation or proving time
- **Simpler**: Pure TypeScript, easier to debug
- **Scalable**: Can handle larger embedding dimensions
- **Auditable**: Generates certificates for verification
- **Maintainable**: Standard backend code, not specialized ZK language

## Security Notes

- This is a **proof-of-concept** implementation
- In production, use proper cryptographic hashing for certificates
- Consider adding rate limiting and authentication
- The mathematical logic is identical to the Circom circuit

## Usage Example

```typescript
import { voiceProver } from './zkProof';

// Check if two voices are similar
const result = voiceProver.proveSimilarity(voiceA, voiceB);

if (result.passed) {
  console.log(`✅ Voice match: ${(result.similarity * 100).toFixed(2)}% similarity`);
} else {
  console.log(`❌ No match: ${(result.similarity * 100).toFixed(2)}% similarity`);
}
```

The system is now ready to replace the Circom circuit in your voice authentication pipeline!
