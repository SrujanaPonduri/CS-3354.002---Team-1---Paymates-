#!/bin/bash
# setup_frontend.sh — sets up and starts the Paymates frontend

cd "$(dirname "$0")/paymates/frontend"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the frontend
echo "Starting frontend on http://localhost:3000"
npm run dev
