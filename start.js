#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DeFi Exchange Platform...');
console.log('=====================================');

// Initialize database first
console.log('🗄️  Step 1: Initializing database...');
const dbInit = spawn('node', ['scripts/start-db.js'], {
  stdio: 'inherit',
  shell: true
});

dbInit.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Database initialized successfully!');
    console.log('');
    
    // Start all services
    console.log('🚀 Step 2: Starting all services...');
    console.log('   - Admin Server (Port 3002)');
    console.log('   - Telegram Bot (Port 3001)');
    console.log('   - Frontend (Port 3000)');
    console.log('');
    
    // Start admin server
    const adminProcess = spawn('node', ['admin-server.js'], {
      stdio: 'pipe',
      shell: true
    });
    
    // Start bot
    const botProcess = spawn('node', ['scripts/start-bot.js'], {
      stdio: 'pipe',
      shell: true
    });
    
    // Start frontend
    const frontendProcess = spawn('npm', ['start'], {
      stdio: 'pipe',
      shell: true
    });
    
    // Log admin server output
    adminProcess.stdout.on('data', (data) => {
      console.log(`[ADMIN] ${data.toString().trim()}`);
    });
    
    adminProcess.stderr.on('data', (data) => {
      console.error(`[ADMIN ERROR] ${data.toString().trim()}`);
    });
    
    // Log bot output
    botProcess.stdout.on('data', (data) => {
      console.log(`[BOT] ${data.toString().trim()}`);
    });
    
    botProcess.stderr.on('data', (data) => {
      console.error(`[BOT ERROR] ${data.toString().trim()}`);
    });
    
    // Log frontend output
    frontendProcess.stdout.on('data', (data) => {
      console.log(`[FRONTEND] ${data.toString().trim()}`);
    });
    
    frontendProcess.stderr.on('data', (data) => {
      console.error(`[FRONTEND ERROR] ${data.toString().trim()}`);
    });
    
    // Handle process termination
    const cleanup = () => {
      console.log('\n🛑 Shutting down all services...');
      adminProcess.kill('SIGINT');
      botProcess.kill('SIGINT');
      frontendProcess.kill('SIGINT');
      process.exit(0);
    };
    
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
    console.log('🎉 All services started successfully!');
    console.log('📱 Frontend: http://localhost:3000');
    console.log('🔧 Admin Panel: http://localhost:3002/admin');
    console.log('🤖 Bot: Running on port 3001');
    console.log('');
    console.log('Press Ctrl+C to stop all services');
    
  } else {
    console.error('❌ Database initialization failed!');
    process.exit(1);
  }
});

dbInit.on('error', (error) => {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
});
