#!/bin/bash
set -e

echo "Setting up CareerPulse..."

# Check if we're in the project root
if [ ! -f "careerpulse.py" ]; then
    echo "Error: Run this script from the project root directory"
    exit 1
fi

echo ""
echo "Installing backend dependencies..."
cd backend
if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || true
    echo "  Created backend/.env from .env.example"
    echo "  ⚠️  Please fill in your credentials in backend/.env"
fi
npm install
cd ..

echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo "Installing Python dependencies..."
if command -v pip3 &> /dev/null; then
    pip3 install -r pipeline/requirements.txt
elif command -v pip &> /dev/null; then
    pip install -r pipeline/requirements.txt
else
    echo "  ⚠️  pip not found, install Python dependencies manually:"
    echo "  pip3 install -r pipeline/requirements.txt"
fi

echo ""
echo "Setup complete!"
echo ""
echo "To start in demo mode:"
echo "  python3 careerpulse.py --demo"
echo ""
echo "To start in full mode:"
echo "  python3 careerpulse.py"
