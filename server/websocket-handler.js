/**
 * WebSocket Handler - Manages Socket.io connections and message routing
 */

const commandParser = require('./command-parser');
const gameEngine = require('./game-engine');
const timeoutManager = require('./utils/timeout-manager');

class WebSocketHandler {
  constructor(io) {
    this.io = io;
    this.sessions = new Map(); // socket.id -> session data
  }

  /**
   * Initialize WebSocket event handlers
   */
  initialize() {
    this.io.on('connection', (socket) => {
      console.log('New connection:', socket.id);

      // Login handler
      socket.on('login', (data) => {
        this.handleLogin(socket, data);
      });

      // Character selection handler
      socket.on('select_character', (data) => {
        this.handleCharacterSelection(socket, data);
      });

      // Command handler
      socket.on('command', (data) => {
        this.handleCommand(socket, data);
      });

      // Say handler
      socket.on('say', (data) => {
        this.handleSay(socket, data);
      });

      // Emote handler
      socket.on('emote', (data) => {
        this.handleEmote(socket, data);
      });

      // Ping handler
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });

    console.log('WebSocket handler initialized');
  }

  handleLogin(socket, data) {
    const { username } = data;

    if (!username || !username.trim()) {
      socket.emit('error', { message: 'Invalid username' });
      return;
    }

    // Store session data
    this.sessions.set(socket.id, {
      username: username.trim(),
      characterId: null
    });

    // Send available characters
    const availableCharacters = gameEngine.getAvailableCharacters();

    socket.emit('available_characters', {
      characters: availableCharacters
    });

    console.log(`User ${username} logged in`);
  }

  handleCharacterSelection(socket, data) {
    const { characterId } = data;
    const session = this.sessions.get(socket.id);

    if (!session) {
      socket.emit('error', { message: 'Not logged in' });
      return;
    }

    // Add player to game engine
    const result = gameEngine.addPlayer(socket.id, session.username, characterId);

    if (!result.success) {
      socket.emit('error', { message: result.error });
      return;
    }

    // Update session
    session.characterId = characterId;

    // Start idle detection
    timeoutManager.updateActivity(socket.id, (sessionId) => {
      gameEngine.updatePlayerStatus(sessionId, 'idle');
    });

    // Send room description
    const description = gameEngine.getRoomDescription(socket.id);
    socket.emit('room_description', description);

    // Send inventory
    socket.emit('inventory_update', result.player.inventory);

    // Broadcast to room that player joined
    gameEngine.broadcastToRoom(result.player.currentRoom, {
      type: 'room_event',
      message: `${result.player.characterName} enters the game.`
    }, socket.id);

    console.log(`Player ${session.username} selected character ${characterId}`);
  }

  handleCommand(socket, data) {
    const { command } = data;

    if (!command || !command.trim()) {
      return;
    }

    // Update activity
    timeoutManager.updateActivity(socket.id, (sessionId) => {
      gameEngine.updatePlayerStatus(sessionId, 'idle');
    });

    // Parse command
    const parsed = commandParser.parse(command);

    if (parsed.type === 'error') {
      socket.emit('error', { message: parsed.message });
      return;
    }

    // Route to appropriate handler
    this.routeCommand(socket, parsed);
  }

  routeCommand(socket, parsed) {
    let result;

    switch (parsed.type) {
      case 'movement':
        result = gameEngine.movePlayer(socket.id, parsed.direction);
        if (result.success) {
          socket.emit('room_description', result.description);

          // Handle ghost encounter
          if (result.ghostEncounter) {
            const encounter = result.ghostEncounter;
            if (encounter.type === 'encounter') {
              socket.emit('private_message', {
                message: `${encounter.message}\nYou lost ${encounter.goldLost} gold! (${encounter.goldRemaining} remaining)`
              });
              // Update inventory to reflect gold loss
              const player = gameEngine.players.get(socket.id);
              if (player) {
                socket.emit('inventory_update', player.inventory);
              }
            } else if (encounter.type === 'observation') {
              socket.emit('private_message', {
                message: encounter.message
              });
            } else if (encounter.type === 'encounter_no_gold') {
              socket.emit('private_message', {
                message: encounter.message
              });
            }
          }
        } else {
          socket.emit('error', { message: result.error });
        }
        break;

      case 'interaction':
        result = gameEngine.interactWithObject(socket.id, parsed.verb, parsed.target);
        if (result.success) {
          socket.emit('private_message', { message: result.message });
          if (result.inventory) {
            socket.emit('inventory_update', result.inventory);
          }
        } else {
          socket.emit('error', { message: result.error });
        }
        break;

      case 'collect':
        result = gameEngine.collectCoins(socket.id);
        if (result.success) {
          socket.emit('private_message', { message: result.message });
          socket.emit('inventory_update', result.inventory);
        } else {
          socket.emit('error', { message: result.error });
        }
        break;

      case 'drop':
        result = gameEngine.dropCoins(socket.id);
        if (result.success) {
          socket.emit('private_message', { message: result.message });
          socket.emit('inventory_update', result.inventory);
        } else {
          socket.emit('error', { message: result.error });
        }
        break;

      case 'inventory':
        const player = gameEngine.players.get(socket.id);
        if (player) {
          socket.emit('inventory_update', player.inventory);
          socket.emit('private_message', {
            message: `Gold: ${player.inventory.gold}, Items: ${player.inventory.items.join(', ') || 'none'}`
          });
        }
        break;

      case 'look':
        const description = gameEngine.getRoomDescription(socket.id);
        if (description) {
          socket.emit('room_description', description);
        }
        break;

      case 'map':
        result = gameEngine.getMinimap(socket.id);
        if (result.success) {
          socket.emit('private_message', { message: result.minimap });
        } else {
          socket.emit('error', { message: result.error });
        }
        break;

      case 'help':
        const helpText = gameEngine.getHelpText();
        socket.emit('help', helpText);
        break;

      case 'say':
        result = gameEngine.say(socket.id, parsed.message);
        if (!result.success) {
          socket.emit('error', { message: result.error });
        }
        break;

      case 'emote':
        result = gameEngine.say(socket.id, `*${parsed.action}*`);
        if (!result.success) {
          socket.emit('error', { message: result.error });
        }
        break;

      case 'action':
        result = gameEngine.performAction(socket.id, parsed.verb);
        if (!result.success) {
          socket.emit('error', { message: result.error });
        }
        break;

      default:
        socket.emit('error', { message: 'Unknown command type' });
    }
  }

  handleSay(socket, data) {
    const { message } = data;

    if (!message || !message.trim()) {
      return;
    }

    // Update activity
    timeoutManager.updateActivity(socket.id, (sessionId) => {
      gameEngine.updatePlayerStatus(sessionId, 'idle');
    });

    const result = gameEngine.say(socket.id, message);
    if (!result.success) {
      socket.emit('error', { message: result.error });
    }
  }

  handleEmote(socket, data) {
    const { action } = data;

    if (!action || !action.trim()) {
      return;
    }

    // Update activity
    timeoutManager.updateActivity(socket.id, (sessionId) => {
      gameEngine.updatePlayerStatus(sessionId, 'idle');
    });

    const result = gameEngine.say(socket.id, `*${action}*`);
    if (!result.success) {
      socket.emit('error', { message: result.error });
    }
  }

  handleDisconnect(socket) {
    console.log('Player disconnected:', socket.id);

    const session = this.sessions.get(socket.id);
    if (session && session.characterId) {
      const player = gameEngine.players.get(socket.id);
      if (player) {
        // Broadcast departure
        gameEngine.broadcastToRoom(player.currentRoom, {
          type: 'room_event',
          message: `${player.characterName} has disconnected.`
        }, socket.id);

        // Start character timeout
        timeoutManager.startCharacterTimeout(socket.id, (sessionId) => {
          // Release character after timeout
          gameEngine.removePlayer(sessionId);
          this.sessions.delete(sessionId);
        });
      }
    }

    // Clear idle timer
    timeoutManager.clearSession(socket.id);
  }
}

module.exports = WebSocketHandler;
