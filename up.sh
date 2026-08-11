#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Building the website..."
node build.js

# Free port 8000 if already in use
echo "🔍 Checking port 8000..."
fuser -k 8000/tcp 2>/dev/null && echo "⚠️  Killed existing process on port 8000" || true

echo "🌐 Starting local server on http://localhost:8000..."
python3 -m http.server -d site 8000
