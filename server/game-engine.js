/**
 * Game Engine - Core game logic and state management
 */

const RoomUtils = require('./utils/room-utils');
const coinSpawner = require('./utils/coin-spawner');
const ghostManager = require('./utils/ghost-manager');
const minimapGenerator = require('./utils/minimap-generator');

class GameEngine {
  constructor() {
    this.players = new Map(); // sessionId -> player data
    this.rooms = null; // Will be loaded from world.json
    this.characters = null; // Will be loaded from characters.json
    this.verbs = null; // Will be loaded from verbs.json
    this.gameState = null; // Game state from state manager
    this.io = null; // Socket.io instance
  }

  /**
   * Initialize game engine with world and character data
   */
  initialize(worldData, characterData, verbData, gameState, io) {
    this.rooms = worldData.rooms;
    this.characters = characterData.characters;
    this.verbs = verbData;
    this.gameState = gameState;
    this.io = io;
    this.startingRoom = worldData.startingRoom;

    // Initialize coin spawner
    coinSpawner.initialize(this.rooms, this.gameState);

    console.log('Game engine initialized');
  }

  /**
   * Add new player to game
   */
  addPlayer(sessionId, username, characterId) {
    const character = this.characters.find(c => c.id === characterId);
    if (!character) {
      return { success: false, error: 'Invalid character' };
    }

    // Check if character is already in use
    if (this.gameState.characterLocks[characterId]) {
      return { success: false, error: 'Character already in use' };
    }

    // Create player object
    const player = {
      sessionId,
      username,
      characterId,
      characterName: character.name,
      currentRoom: this.startingRoom,
      inventory: {
        gold: 0,
        items: []
      },
      status: 'active',
      connectedAt: new Date().toISOString(),
      lastAction: new Date().toISOString()
    };

    this.players.set(sessionId, player);
    this.gameState.players[sessionId] = player;
    this.gameState.characterLocks[characterId] = {
      sessionId,
      username,
      lockedAt: new Date().toISOString()
    };

    console.log(`Player ${username} joined as ${character.name}`);
    return { success: true, player };
  }

  /**
   * Remove player from game
   */
  removePlayer(sessionId) {
    const player = this.players.get(sessionId);
    if (!player) return;

    // Release character lock
    delete this.gameState.characterLocks[player.characterId];

    // Remove from players
    this.players.delete(sessionId);
    delete this.gameState.players[sessionId];

    console.log(`Player ${player.username} left the game`);
  }

  /**
   * Get available characters (not currently locked)
   */
  getAvailableCharacters() {
    return this.characters.filter(char =>
      !this.gameState.characterLocks[char.id]
    );
  }

  /**
   * Process player movement command
   */
  movePlayer(sessionId, direction) {
    const player = this.players.get(sessionId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const currentRoom = this.rooms[player.currentRoom];
    if (!currentRoom) {
      return { success: false, error: 'Current room not found' };
    }

    // Check if exit exists
    if (!currentRoom.exits || !currentRoom.exits[direction]) {
      return {
        success: false,
        error: `You can't go ${direction} from here.`
      };
    }

    const exit = currentRoom.exits[direction];

    // Check if exit is locked
    const lockStatus = RoomUtils.isExitLocked(currentRoom, direction, player.inventory);
    if (lockStatus.locked) {
      if (lockStatus.canUnlock) {
        // Unlock the door
        exit.type = 'open';
        this.broadcastToRoom(player.currentRoom, {
          type: 'room_event',
          message: lockStatus.unlockMessage
        }, sessionId);
      } else {
        return {
          success: false,
          error: lockStatus.reason
        };
      }
    }

    // Move player
    const destinationRoomId = exit.to;
    const oldRoom = player.currentRoom;

    // Broadcast departure to old room
    this.broadcastToRoom(oldRoom, {
      type: 'room_event',
      message: `${player.characterName} leaves ${direction}.`
    }, sessionId);

    // Update player location
    player.currentRoom = destinationRoomId;
    player.lastAction = new Date().toISOString();

    // Broadcast arrival to new room
    this.broadcastToRoom(destinationRoomId, {
      type: 'room_event',
      message: `${player.characterName} arrives.`
    }, sessionId);

    // Get new room description
    const newRoom = this.rooms[destinationRoomId];
    const description = RoomUtils.generateDescription(newRoom, this.gameState.players, this.gameState);

    // Check for ghost encounter
    const ghostEncounter = ghostManager.checkEncounter(player, destinationRoomId, this.gameState);

    return {
      success: true,
      description,
      ghostEncounter
    };
  }

  /**
   * Process object interaction
   */
  interactWithObject(sessionId, verb, objectName) {
    const player = this.players.get(sessionId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const currentRoom = this.rooms[player.currentRoom];
    const object = RoomUtils.findObject(currentRoom, objectName);

    if (!object) {
      return {
        success: false,
        error: `There is no ${objectName} here.`
      };
    }

    const roomState = this.gameState.roomStates[player.currentRoom];
    const currentState = roomState.objectStates[object.id] || object.state;

    const interactionCheck = RoomUtils.canInteractWith(object, verb, currentState);
    if (!interactionCheck.valid) {
      return {
        success: false,
        error: interactionCheck.message
      };
    }

    const interaction = interactionCheck.interaction;

    // Update object state
    if (interaction.newState) {
      roomState.objectStates[object.id] = interaction.newState;
    }

    // Handle item rewards
    if (interaction.giveItem) {
      player.inventory.items.push(interaction.giveItem);
    }

    // Handle coin spawning
    if (interaction.spawnCoins) {
      roomState.coins += interaction.spawnCoins;
    }

    // Broadcast interaction to room
    this.broadcastToRoom(player.currentRoom, {
      type: 'room_event',
      message: interaction.message
    });

    player.lastAction = new Date().toISOString();

    return {
      success: true,
      message: interaction.message,
      inventory: player.inventory
    };
  }

  /**
   * Collect coins from current room
   */
  collectCoins(sessionId) {
    const player = this.players.get(sessionId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const roomState = this.gameState.roomStates[player.currentRoom];
    const coinCount = roomState.coins || 0;

    if (coinCount === 0) {
      return {
        success: false,
        error: 'There are no coins to collect here.'
      };
    }

    // Transfer coins to player
    player.inventory.gold += coinCount;
    roomState.coins = 0;

    // Handle coin spawning
    const roomConfig = this.rooms[player.currentRoom];
    coinSpawner.handleCollection(player.currentRoom, this.gameState, roomConfig);

    // Broadcast to room
    this.broadcastToRoom(player.currentRoom, {
      type: 'room_event',
      message: `${player.characterName} collects ${coinCount} gold coin${coinCount !== 1 ? 's' : ''}.`
    }, sessionId);

    player.lastAction = new Date().toISOString();

    return {
      success: true,
      message: `You collected ${coinCount} gold coin${coinCount !== 1 ? 's' : ''}.`,
      inventory: player.inventory
    };
  }

  /**
   * Drop coins in current room
   */
  dropCoins(sessionId) {
    const player = this.players.get(sessionId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const coinCount = player.inventory.gold;

    if (coinCount === 0) {
      return {
        success: false,
        error: 'You have no coins to drop.'
      };
    }

    // Transfer coins to room
    const roomState = this.gameState.roomStates[player.currentRoom];
    roomState.coins += coinCount;
    player.inventory.gold = 0;

    // Broadcast to room
    this.broadcastToRoom(player.currentRoom, {
      type: 'room_event',
      message: `${player.characterName} drops ${coinCount} gold coin${coinCount !== 1 ? 's' : ''}.`
    }, sessionId);

    player.lastAction = new Date().toISOString();

    return {
      success: true,
      message: `You dropped ${coinCount} gold coin${coinCount !== 1 ? 's' : ''}.`,
      inventory: player.inventory
    };
  }

  /**
   * Get room description for player
   */
  getRoomDescription(sessionId) {
    const player = this.players.get(sessionId);
    if (!player) {
      return null;
    }

    const room = this.rooms[player.currentRoom];
    return RoomUtils.generateDescription(room, this.gameState.players, this.gameState);
  }

  /**
   * Handle say command
   */
  say(sessionId, message) {
    const player = this.players.get(sessionId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    this.broadcastToRoom(player.currentRoom, {
      type: 'room_event',
      message: `${player.characterName} says: "${message}"`
    });

    player.lastAction = new Date().toISOString();

    return { success: true };
  }

  /**
   * Handle action verb
   */
  performAction(sessionId, verb) {
    const player = this.players.get(sessionId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Find verb template
    const verbData = this.verbs.actionVerbs.find(v => v.verb === verb);
    if (!verbData) {
      return {
        success: false,
        error: `Unknown action: ${verb}`
      };
    }

    const message = verbData.template.replace('{name}', player.characterName);

    this.broadcastToRoom(player.currentRoom, {
      type: 'room_event',
      message
    });

    player.lastAction = new Date().toISOString();

    return { success: true, message };
  }

  /**
   * Broadcast message to all players in a room
   */
  broadcastToRoom(roomId, data, excludeSessionId = null) {
    for (const [sessionId, player] of this.players.entries()) {
      if (player.currentRoom === roomId && sessionId !== excludeSessionId) {
        const socket = this.io.sockets.sockets.get(sessionId);
        if (socket) {
          socket.emit(data.type, data);
        }
      }
    }
  }

  /**
   * Send message to specific player
   */
  sendToPlayer(sessionId, data) {
    const socket = this.io.sockets.sockets.get(sessionId);
    if (socket) {
      socket.emit(data.type, data);
    }
  }

  /**
   * Update player status
   */
  updatePlayerStatus(sessionId, status) {
    const player = this.players.get(sessionId);
    if (player) {
      player.status = status;
    }
  }

  /**
   * Get help text
   */
  getHelpText() {
    const commands = [
      'Movement:',
      '  go [direction] - Move in a direction (north, south, east, west)',
      '  n/s/e/w - Quick directional shortcuts',
      '',
      'Exploration:',
      '  look - Look around the current room',
      '  map - Display 5x5 ASCII minimap',
      '',
      'Items & Gold:',
      '  collect - Collect all coins in the room',
      '  drop - Drop all your coins in the room',
      '  inventory - View your inventory',
      '',
      'Interaction:',
      '  [verb] [object] - Interact with an object (touch, open, press)',
      '',
      'Communication:',
      '  say [message] - Say something to players in the room',
      '  /[action] - Perform an action (/dance, /wave, /bow, etc.)',
      '',
      'System:',
      '  help - Show this help message'
    ];

    const verbs = this.verbs.actionVerbs.map(v => v.verb);

    return {
      commands,
      verbs
    };
  }

  /**
   * Get minimap for player
   */
  getMinimap(sessionId) {
    const player = this.players.get(sessionId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const currentRoom = this.rooms[player.currentRoom];
    if (!currentRoom) {
      return { success: false, error: 'Current room not found' };
    }

    const minimap = minimapGenerator.generateWithState(
      currentRoom,
      this.rooms,
      this.gameState
    );

    return {
      success: true,
      minimap
    };
  }

  /**
   * Get current game state
   */
  getGameState() {
    return this.gameState;
  }
}

module.exports = new GameEngine();
