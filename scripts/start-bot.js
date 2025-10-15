#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🤖 Starting Telegram Bot...');

// Path to bot directory
const botDir = path.join(__dirname, '..', 'telegram-bot');
const botFile = path.join(botDir, 'bot.js');

// Check if bot file exists
const fs = require('fs');
if (!fs.existsSync(botFile)) {
  console.error('❌ Bot file not found:', botFile);
  process.exit(1);
}

// Start the bot
const botProcess = spawn('node', ['bot.js'], {
  cwd: botDir,
  stdio: 'inherit',
  shell: true
});

botProcess.on('error', (error) => {
  console.error('❌ Failed to start bot:', error);
});

botProcess.on('close', (code) => {
  console.log(`🤖 Bot process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping bot...');
  botProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping bot...');
  botProcess.kill('SIGTERM');
});

console.log('✅ Bot started successfully!');
console.log('📱 Bot is running and ready to receive withdrawal requests');
