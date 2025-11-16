/**
 * Coin Spawner - Manages coin spawning based on room configuration
 */

class CoinSpawner {
  constructor() {
    this.spawnTimers = new Map(); // roomId -> timer
  }

  /**
   * Initialize coin spawning for all rooms
   */
  initialize(rooms, gameState) {
    console.log('Initializing coin spawner...');

    // Set up respawn timers for rooms with respawn-timer strategy
    for (const [roomId, roomData] of Object.entries(rooms)) {
      if (roomData.coins && roomData.coins.spawnType === 'respawn-timer') {
        // Check if room currently has coins
        const roomState = gameState.roomStates[roomId];
        if (roomState.coins === 0 && roomState.lastCoinSpawn) {
          // Calculate time since last spawn
          const timeSinceSpawn = Date.now() - new Date(roomState.lastCoinSpawn).getTime();
          const respawnInterval = roomData.coins.respawnInterval || 300000; // Default 5 minutes

          if (timeSinceSpawn >= respawnInterval) {
            // Spawn coins immediately
            roomState.coins = roomData.coins.amount;
            roomState.lastCoinSpawn = null;
            console.log(`Spawned ${roomData.coins.amount} coins in ${roomId} (overdue)`);
          } else {
            // Start timer for remaining time
            const remainingTime = respawnInterval - timeSinceSpawn;
            this.startRespawnTimer(roomId, roomData.coins, gameState, remainingTime);
          }
        }
      }
    }

    console.log('Coin spawner initialized');
  }

  /**
   * Handle coin collection from a room
   */
  handleCollection(roomId, gameState, roomConfig) {
    const roomState = gameState.roomStates[roomId];

    // Mark collection time
    roomState.lastCoinSpawn = new Date().toISOString();

    // Handle respawn based on spawn type
    if (roomConfig && roomConfig.coins) {
      const spawnType = roomConfig.coins.spawnType;

      if (spawnType === 'respawn-timer') {
        // Start respawn timer
        this.startRespawnTimer(roomId, roomConfig.coins, gameState);
      }
      // For other spawn types, do nothing special on collection
    }
  }

  /**
   * Start respawn timer for a room (if configured)
   */
  startRespawnTimer(roomId, config, gameState, customDelay = null) {
    // Clear existing timer if any
    if (this.spawnTimers.has(roomId)) {
      clearTimeout(this.spawnTimers.get(roomId));
    }

    const respawnInterval = customDelay || config.respawnInterval || 300000; // Default 5 minutes
    const amount = config.amount || 0;

    const timer = setTimeout(() => {
      // Spawn coins
      const roomState = gameState.roomStates[roomId];
      roomState.coins = amount;
      roomState.lastCoinSpawn = null;

      console.log(`Respawned ${amount} coins in ${roomId}`);

      // Remove timer from map
      this.spawnTimers.delete(roomId);

      // Notify players in room (if needed, will be handled by game engine)
    }, respawnInterval);

    this.spawnTimers.set(roomId, timer);
    console.log(`Started respawn timer for ${roomId} (${respawnInterval / 1000}s)`);
  }

  /**
   * Spawn coins for random-events strategy
   */
  spawnRandomCoins(roomId, config, gameState) {
    // This would be called by a separate random event system
    const roomState = gameState.roomStates[roomId];
    roomState.coins += config.amount || 0;
    console.log(`Random event: Spawned ${config.amount} coins in ${roomId}`);
  }

  /**
   * Get rooms that are ready for respawn
   */
  getRoomsReadyForRespawn(rooms, gameState) {
    const ready = [];

    for (const [roomId, roomData] of Object.entries(rooms)) {
      if (roomData.coins && roomData.coins.spawnType === 'respawn-timer') {
        const roomState = gameState.roomStates[roomId];

        if (roomState.coins === 0 && roomState.lastCoinSpawn) {
          const timeSinceSpawn = Date.now() - new Date(roomState.lastCoinSpawn).getTime();
          const respawnInterval = roomData.coins.respawnInterval || 300000;

          if (timeSinceSpawn >= respawnInterval) {
            ready.push(roomId);
          }
        }
      }
    }

    return ready;
  }

  /**
   * Stop all spawn timers
   */
  stopAll() {
    for (const timer of this.spawnTimers.values()) {
      clearTimeout(timer);
    }
    this.spawnTimers.clear();
  }
}

module.exports = new CoinSpawner();
