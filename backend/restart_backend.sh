#!/bin/bash
# restart_backend.sh - Restart backend with OAuth fix

echo "🔄 Restarting ShelfLife.AI Backend with OAuth Fix..."

# Kill any existing uvicorn processes
pkill -f "uvicorn main:app" 2>/dev/null || true

echo "⏱️  Waiting 2 seconds..."
sleep 2

# Start the backend with detailed logging
echo "🚀 Starting backend with enhanced OAuth logging..."
cd /home/netanelm/shelflife-ai/backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug

echo "✅ Backend started with OAuth fix!"
echo "📋 OAuth endpoints now accept both JSON and Form data"
echo "🔍 Check logs for detailed OAuth flow information"
