"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const client_1 = require("@mysten/sui/client");
const walrus_1 = require("@mysten/walrus");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Storage file for Walrus mappings
const MAPPINGS_FILE = path_1.default.join(__dirname, '../data/walrus_mappings.json');
// Ensure data directory exists
const dataDir = path_1.default.dirname(MAPPINGS_FILE);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
// Walrus blockchain configuration
const WALRUS_RPC_URL = process.env.WALRUS_RPC_URL || 'https://walrus-mainnet.sui.io';
const WALRUS_BACKEND_PRIVATE_KEY = process.env.WALRUS_BACKEND_PRIVATE_KEY;
// Initialize Walrus client
let walrusClient = null;
let suiClient = null;
try {
    if (WALRUS_BACKEND_PRIVATE_KEY) {
        // Initialize Sui client
        suiClient = new client_1.SuiClient({
            url: (0, client_1.getFullnodeUrl)('testnet'), // Start with testnet for safety
        });
        // Initialize Walrus client
        walrusClient = new walrus_1.WalrusClient({
            network: 'testnet',
            suiClient,
        });
        console.log('✅ Walrus client initialized successfully');
    }
    else {
        console.log('⚠️  WALRUS_BACKEND_PRIVATE_KEY not set - Walrus client not initialized');
    }
}
catch (error) {
    console.error('❌ Error initializing Walrus client:', error);
    walrusClient = null;
    suiClient = null;
}
// Helper function to read mappings
function readMappings() {
    try {
        if (fs_1.default.existsSync(MAPPINGS_FILE)) {
            const data = fs_1.default.readFileSync(MAPPINGS_FILE, 'utf8');
            return JSON.parse(data);
        }
    }
    catch (error) {
        console.error('Error reading mappings file:', error);
    }
    return {};
}
// Helper function to write mappings
function writeMappings(mappings) {
    try {
        fs_1.default.writeFileSync(MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
    }
    catch (error) {
        console.error('Error writing mappings file:', error);
    }
}
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check route
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
// Walrus embeddings API for LLM query protection
app.get('/api/walrus/embeddings', async (req, res) => {
    try {
        // First try to get embeddings from Walrus blockchain
        if (walrusClient) {
            try {
                console.log('Attempting to read embeddings from Walrus blockchain...');
                // Read mappings to get blob IDs
                const mappings = readMappings();
                const embeddings = [];
                for (const [walletAddress, blobId] of Object.entries(mappings)) {
                    try {
                        // Read blob from Walrus blockchain
                        const blob = await walrusClient.readBlob({ blobId });
                        if (blob) {
                            // Convert blob back to JSON
                            const jsonString = new TextDecoder().decode(blob);
                            const fingerprintData = JSON.parse(jsonString);
                            embeddings.push({
                                walletAddress: fingerprintData.walletAddress || walletAddress,
                                embedding: fingerprintData.embedding,
                                timestamp: fingerprintData.timestamp || Date.now(),
                                model: fingerprintData.model || "ecapa-tdnn",
                                metadata: fingerprintData.metadata || {
                                    version: "1.0.0",
                                    platform: "web3-voice-auth"
                                },
                                blobId: blobId
                            });
                        }
                    }
                    catch (blobError) {
                        console.error(`Error reading blob ${blobId} for wallet ${walletAddress}:`, blobError);
                        // Continue with other blobs
                    }
                }
                if (embeddings.length > 0) {
                    console.log(`✅ Retrieved ${embeddings.length} embeddings from Walrus blockchain`);
                    return res.json(embeddings);
                }
            }
            catch (walrusError) {
                console.error('Error reading from Walrus blockchain:', walrusError);
                console.log('Falling back to local storage...');
            }
        }
        // Fallback: Get embeddings from the voice server's local storage
        console.log('Reading embeddings from local storage...');
        const embeddingsDir = path_1.default.join(__dirname, '../../voice-server/embeddings');
        const embeddings = [];
        if (fs_1.default.existsSync(embeddingsDir)) {
            const files = fs_1.default.readdirSync(embeddingsDir);
            for (const file of files) {
                if (file.endsWith('.json')) {
                    try {
                        const filePath = path_1.default.join(embeddingsDir, file);
                        const data = fs_1.default.readFileSync(filePath, 'utf8');
                        const embeddingData = JSON.parse(data);
                        embeddings.push({
                            walletAddress: embeddingData.username || file.replace('.json', ''),
                            embedding: embeddingData.embedding,
                            timestamp: Date.now(),
                            model: embeddingData.model || "ecapa-tdnn",
                            metadata: {
                                version: "1.0.0",
                                platform: "web3-voice-auth"
                            },
                            blobId: file.replace('.json', '')
                        });
                    }
                    catch (error) {
                        console.error(`Error reading embedding file ${file}:`, error);
                    }
                }
            }
        }
        console.log(`Returning ${embeddings.length} embeddings from local storage`);
        res.json(embeddings);
    }
    catch (error) {
        console.error('Error fetching embeddings:', error);
        res.status(500).json({
            error: 'Failed to fetch embeddings',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Store mapping endpoint (for testing)
app.post('/api/walrus/store-mapping', (req, res) => {
    try {
        const { walletAddress, blobId } = req.body;
        if (!walletAddress || !blobId) {
            return res.status(400).json({ error: 'walletAddress and blobId are required' });
        }
        const mappings = readMappings();
        mappings[walletAddress] = blobId;
        writeMappings(mappings);
        res.json({ success: true, message: 'Mapping stored successfully' });
    }
    catch (error) {
        console.error('Error storing mapping:', error);
        res.status(500).json({
            error: 'Failed to store mapping',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Health check available at http://localhost:${PORT}/health`);
    console.log(`Walrus embeddings API available at http://localhost:${PORT}/api/walrus/embeddings`);
});
//# sourceMappingURL=server.js.map