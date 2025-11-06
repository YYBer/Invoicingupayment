#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Telegram Bot...${NC}\n"

# Check if .env exists
if [ ! -f "server/.env" ]; then
    echo -e "${RED}Error: server/.env file not found${NC}"
    echo -e "Please create server/.env with your TELEGRAM_BOT_TOKEN"
    exit 1
fi

# Start bot
cd server
npm run bot:dev

echo -e "\n${RED}Bot stopped.${NC}"
