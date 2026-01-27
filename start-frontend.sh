#!/bin/bash

# Kill any process using port 5173
echo "Killing processes on port 5173..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

# Clear Vite cache
echo "Clearing Vite cache..."
cd /Users/nguyenphong/Desktop/DAMH/frontend
rm -rf node_modules/.vite 2>/dev/null || true

# Wait a moment for port to be released
sleep 2

# Start frontend on port 5173
echo "Starting frontend on port 5173..."
npm run dev
