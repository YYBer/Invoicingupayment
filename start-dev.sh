#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Invoicingu Development Environment...${NC}\n"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${RED}Shutting down services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

# Trap SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start backend server
echo -e "${GREEN}[1/2] Starting Backend Server (port 3001)...${NC}"
cd server
npm run server:dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo -e "${GREEN}[2/2] Starting Frontend (port 8080)...${NC}"
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Services started successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
echo -e "📱 Frontend:  ${GREEN}http://localhost:8080${NC}"
echo -e "🔧 Backend:   ${GREEN}http://localhost:3001${NC}"
echo -e "❤️  Health:    ${GREEN}http://localhost:3001/health${NC}"
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}Press Ctrl+C to stop all services${NC}\n"

# Wait for background processes
wait
