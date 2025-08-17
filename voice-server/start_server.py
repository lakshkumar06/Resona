#!/usr/bin/env python3
"""
Startup script for the Voice Authentication Server
"""
import uvicorn
import sys
import os

def main():
    print("🚀 Starting Voice Authentication Server...")
    print("📁 Working directory:", os.getcwd())
    
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 