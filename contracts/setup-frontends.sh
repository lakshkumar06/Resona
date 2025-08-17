#!/bin/bash

echo "🚀 Setting up Resona Frontends..."

echo "📦 Installing main frontend dependencies..."
cd frontend
npm install

echo "📦 Installing wallet demo dependencies..."
cd ../walletdemo
npm install

echo "✅ Dependencies installed successfully!"
echo ""
echo "🌐 To run both frontends:"
echo ""
echo "Terminal 1 (Main Frontend - Port 5173):"
echo "  cd frontend && npm run dev"
echo ""
echo "Terminal 2 (Wallet Demo - Port 5174):"
echo "  cd walletdemo && npm run dev"
echo ""
echo "🔗 URLs:"
echo "  Main Frontend: http://localhost:5173"
echo "  Wallet Demo:   http://localhost:5174"
echo ""
echo " Flow:"
echo "  1. Open wallet demo on port 5174"
echo "  2. Enter seed phrase to import wallet"
echo "  3. Choose voice authentication"
echo "  4. Get redirected to main frontend for voice auth"
echo "  5. After success, get redirected back to wallet dashboard"
