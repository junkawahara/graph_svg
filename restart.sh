#!/bin/bash

# DrawSVG restart script for WSL

# Kill existing Electron processes
pkill -f "electron ." 2>/dev/null

# Wait a moment for processes to terminate
sleep 1

# Start the app
cd "$(dirname "$0")"
npm start
