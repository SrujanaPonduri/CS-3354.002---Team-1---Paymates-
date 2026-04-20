#!/bin/bash
# setup_backend.sh — sets up and starts the Paymates backend

cd "$(dirname "$0")/paymates/backend"

# Create virtual environment if it doesn't exist
if [ ! -d "../../.venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv ../../.venv
fi

# Activate virtual environment
source ../../.venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt --quiet

# Start the backend
echo "Starting backend on http://localhost:5001"
python app.py
