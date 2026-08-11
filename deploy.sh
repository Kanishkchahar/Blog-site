#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Building the website..."
node build.js

echo "📦 Staging files for Git..."
git add .

# Check if a custom commit message was provided
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
  COMMIT_MSG="Deploy update: $(date +'%Y-%m-%d %H:%M:%S')"
fi

echo "💾 Committing changes with message: '$COMMIT_MSG'..."
git commit -m "$COMMIT_MSG"

echo "📤 Pushing to GitHub..."
git push

echo "✅ Website successfully built and pushed!"
