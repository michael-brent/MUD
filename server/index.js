/**
 * The Jungeon - Main Server Entry Point
 * Multi-user text-based dungeon game with real-time player interaction
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const stateManager = require('./state-manager');
const gameEngine = require('./game-engine');
const WebSocketHandler = require('./websocket-handler');
const ghostManager = require('./utils/ghost-manager');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

// Serve static client files
app.use(express.static(path.join(__dirname, '../client')));

// Basic route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Initialize game server
async function initializeServer() {
  try {
    console.log('Starting The Jungeon server...');

    // Load game data
    console.log('Loading game data...');
    const worldData = await stateManager.loadOrGenerateWorld();
    const characterData = await stateManager.loadCharacterData();
    const verbData = await stateManager.loadVerbData();

    // Load game state
    console.log('Loading game state...');
    const gameState = await stateManager.loadState();

    // Initialize game engine
    console.log('Initializing game engine...');
    gameEngine.initialize(worldData, characterData, verbData, gameState, io);

    // Initialize WebSocket handler
    console.log('Initializing WebSocket handler...');
    const wsHandler = new WebSocketHandler(io);
    wsHandler.initialize();

    // Initialize ghosts
    console.log('Initializing ghost system...');
    const currentGameState = gameEngine.getGameState();
    ghostManager.initialize(worldData.rooms, currentGameState);
    ghostManager.startMovement(worldData.rooms, currentGameState, io);

    // Start autosave
    console.log('Starting autosave...');
    stateManager.startAutosave(() => gameEngine.getGameState());

    console.log('Server initialization complete!');
    console.log('═══════════════════════════════════════');
    console.log('🏰 The Jungeon is ready for adventurers!');
    console.log('═══════════════════════════════════════');

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
function gracefulShutdown() {
  console.log('\nShutting down The Jungeon server...');

  // Stop ghost movement
  ghostManager.stopMovement();

  // Stop autosave
  stateManager.stopAutosave();

  // Save final game state
  const gameState = gameEngine.getGameState();
  stateManager.saveState(gameState).then(() => {
    console.log('Game state saved');
    console.log('Server shut down complete');
    process.exit(0);
  }).catch(err => {
    console.error('Error saving game state:', err);
    process.exit(1);
  });
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n╔═══════════════════════════════════════╗`);
  console.log(`║     THE JUNGEON - MUD Game Server    ║`);
  console.log(`╚═══════════════════════════════════════╝\n`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: http://0.0.0.0:${PORT}\n`);

  await initializeServer();
});
