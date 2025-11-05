import TelegramBot, { Message } from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get the Telegram Bot API token from environment variables
const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is not defined in .env file');
  process.exit(1);
}

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

console.log('Bot server started successfully!');

// Listen for the /app command
bot.onText(/\/app/, (msg: Message) => {
  const chatId = msg.chat.id;

  // Send the response
  bot.sendMessage(chatId, 't.me/Invoicingupayment_bot/invoicingupayment');

  console.log(`Responded to /app command from chat ${chatId}`);
});

// Handle any errors
bot.on('polling_error', (error: Error) => {
  console.error('Polling error:', error);
});

// Optional: Handle /start command for better UX
bot.onText(/\/start/, (msg: Message) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Welcome! Use /app to get the Invoicingu link.');
});

console.log('Bot is running. Waiting for messages...');
