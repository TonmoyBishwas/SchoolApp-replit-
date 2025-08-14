// Simple start script for Replit deployment
console.log('🚀 Starting Cheick Mohamed School Website...');
console.log('📁 Current directory:', process.cwd());
console.log('🌍 Environment:', process.env.REPL_ID ? 'Replit' : 'Local');

// Start the main server
require('./backend/server.js');