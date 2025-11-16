/**
 * Ghost Management System
 * Handles ghost spawning, movement, and player encounters
 */

class GhostManager {
  constructor() {
    this.MIN_GHOSTS = 3;
    this.MAX_GHOSTS = 5;
    this.MOVEMENT_INTERVAL = 60000; // 60 seconds
    this.ENCOUNTER_CHANCE = 0.5; // 50% chance
    this.MIN_GOLD_LOSS = 0.10; // 10% of gold
    this.MAX_GOLD_LOSS = 0.30; // 30% of gold

    this.ghosts = [];
    this.movementTimer = null;
  }

  /**
   * Initialize ghosts in the dungeon
   */
  initialize(rooms, gameState) {
    console.log('Spawning ghosts...');

    const roomIds = Object.keys(rooms);
    const ghostCount = Math.floor(Math.random() * (this.MAX_GHOSTS - this.MIN_GHOSTS + 1)) + this.MIN_GHOSTS;

    // Create ghosts
    this.ghosts = [];
    for (let i = 0; i < ghostCount; i++) {
      const ghost = this.createGhost(i, roomIds);
      this.ghosts.push(ghost);
    }

    // Initialize ghost locations in game state if not exists
    if (!gameState.ghostLocations) {
      gameState.ghostLocations = {};
    }

    for (const ghost of this.ghosts) {
      gameState.ghostLocations[ghost.id] = ghost.currentRoom;
    }

    console.log(`Spawned ${ghostCount} ghosts in the dungeon`);
    return this.ghosts;
  }

  /**
   * Create a new ghost
   */
  createGhost(index, roomIds) {
    const names = [
      'Ethereal Wraith',
      'Phantom Spirit',
      'Shadowy Specter',
      'Ancient Ghost',
      'Cursed Apparition',
      'Restless Soul',
      'Wandering Shade',
      'Spectral Entity'
    ];

    const descriptions = [
      'A translucent figure drifts silently through the chamber.',
      'An eerie presence fills the air with a bone-chilling cold.',
      'A ghostly form materializes, its eyes glowing with otherworldly light.',
      'Whispers of the dead echo from a spectral manifestation.',
      'A wraith-like entity floats aimlessly, moaning softly.'
    ];

    const startRoom = roomIds[Math.floor(Math.random() * roomIds.length)];

    return {
      id: `ghost_${index}`,
      name: names[index % names.length],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      currentRoom: startRoom,
      movesSinceSpawn: 0
    };
  }

  /**
   * Start ghost movement timer
   */
  startMovement(rooms, gameState, io) {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
    }

    console.log('Starting ghost movement system...');

    this.movementTimer = setInterval(() => {
      this.moveAllGhosts(rooms, gameState, io);
    }, this.MOVEMENT_INTERVAL);
  }

  /**
   * Stop ghost movement timer
   */
  stopMovement() {
    if (this.movementTimer) {
      clearInterval(this.movementTimer);
      this.movementTimer = null;
      console.log('Ghost movement stopped');
    }
  }

  /**
   * Move all ghosts to random adjacent rooms
   */
  moveAllGhosts(rooms, gameState, io) {
    for (const ghost of this.ghosts) {
      this.moveGhost(ghost, rooms, gameState, io);
    }
  }

  /**
   * Move a single ghost
   */
  moveGhost(ghost, rooms, gameState, io) {
    const currentRoom = rooms[ghost.currentRoom];
    if (!currentRoom) return;

    // Get available exits
    const exits = Object.keys(currentRoom.exits).filter(
      dir => currentRoom.exits[dir].type !== 'locked'
    );

    if (exits.length === 0) return;

    // Choose random direction
    const direction = exits[Math.floor(Math.random() * exits.length)];
    const newRoomId = currentRoom.exits[direction].to;

    // Move ghost
    const oldRoomId = ghost.currentRoom;
    ghost.currentRoom = newRoomId;
    ghost.movesSinceSpawn++;

    // Update game state
    gameState.ghostLocations[ghost.id] = newRoomId;

    // Broadcast to players in both rooms
    if (io) {
      this.broadcastGhostMovement(ghost, oldRoomId, newRoomId, gameState, io);
    }

    console.log(`${ghost.name} moved from ${oldRoomId} to ${newRoomId}`);
  }

  /**
   * Broadcast ghost movement to players
   */
  broadcastGhostMovement(ghost, fromRoomId, toRoomId, gameState, io) {
    // Notify players in the room the ghost left
    for (const sessionId in gameState.players) {
      const player = gameState.players[sessionId];
      if (player.currentRoom === fromRoomId) {
        io.to(sessionId).emit('message', {
          type: 'ghost',
          text: `${ghost.name} fades away and drifts through a wall.`
        });
      }
    }

    // Notify players in the room the ghost entered
    for (const sessionId in gameState.players) {
      const player = gameState.players[sessionId];
      if (player.currentRoom === toRoomId) {
        io.to(sessionId).emit('message', {
          type: 'ghost',
          text: `${ghost.name} materializes from the shadows!`
        });
      }
    }
  }

  /**
   * Check for ghost encounter when player enters room
   */
  checkEncounter(player, roomId, gameState) {
    // Find ghosts in this room
    const ghostsInRoom = this.ghosts.filter(ghost => ghost.currentRoom === roomId);

    if (ghostsInRoom.length === 0) {
      return null;
    }

    // Random encounter chance
    if (Math.random() > this.ENCOUNTER_CHANCE) {
      // No encounter, but player sees the ghost
      return {
        type: 'observation',
        ghost: ghostsInRoom[0],
        message: `You sense a supernatural presence. ${ghostsInRoom[0].description}`
      };
    }

    // Encounter occurs
    const ghost = ghostsInRoom[0];
    const result = this.processEncounter(player, ghost, gameState);

    return result;
  }

  /**
   * Process ghost encounter
   */
  processEncounter(player, ghost, gameState) {
    const playerGold = player.inventory.gold || 0;

    if (playerGold === 0) {
      return {
        type: 'encounter_no_gold',
        ghost: ghost,
        message: `${ghost.name} reaches for you with icy fingers, but you have no gold to lose!`,
        goldLost: 0
      };
    }

    // Calculate gold loss (10-30% of total)
    const lossPercent = this.MIN_GOLD_LOSS + Math.random() * (this.MAX_GOLD_LOSS - this.MIN_GOLD_LOSS);
    const goldLost = Math.max(1, Math.floor(playerGold * lossPercent));

    // Reduce player gold
    player.inventory.gold = Math.max(0, playerGold - goldLost);

    return {
      type: 'encounter',
      ghost: ghost,
      message: `${ghost.name} touches you with icy spectral hands! You feel your gold pouch lighten.`,
      goldLost: goldLost,
      goldRemaining: player.inventory.gold
    };
  }

  /**
   * Get ghosts in a specific room
   */
  getGhostsInRoom(roomId) {
    return this.ghosts.filter(ghost => ghost.currentRoom === roomId);
  }

  /**
   * Get all ghost locations
   */
  getAllLocations() {
    const locations = {};
    for (const ghost of this.ghosts) {
      locations[ghost.id] = ghost.currentRoom;
    }
    return locations;
  }

  /**
   * Get ghost statistics
   */
  getStats() {
    return {
      totalGhosts: this.ghosts.length,
      averageMoves: this.ghosts.reduce((sum, g) => sum + g.movesSinceSpawn, 0) / this.ghosts.length,
      ghostsByRoom: this.ghosts.reduce((acc, ghost) => {
        acc[ghost.currentRoom] = (acc[ghost.currentRoom] || 0) + 1;
        return acc;
      }, {})
    };
  }

  /**
   * Load ghost state from saved game state
   */
  loadState(rooms, gameState) {
    if (!gameState.ghostLocations) {
      return this.initialize(rooms, gameState);
    }

    // Restore ghost positions from saved state
    for (const ghost of this.ghosts) {
      if (gameState.ghostLocations[ghost.id]) {
        ghost.currentRoom = gameState.ghostLocations[ghost.id];
      }
    }

    console.log(`Loaded ${this.ghosts.length} ghosts from saved state`);
    return this.ghosts;
  }

  /**
   * Get room description addition for ghosts
   */
  getRoomGhostDescription(roomId) {
    const ghostsInRoom = this.getGhostsInRoom(roomId);

    if (ghostsInRoom.length === 0) {
      return null;
    }

    const descriptions = [];
    for (const ghost of ghostsInRoom) {
      descriptions.push(`${ghost.description}`);
    }

    return descriptions.join(' ');
  }
}

module.exports = new GhostManager();
