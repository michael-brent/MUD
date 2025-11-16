/**
 * State Manager - Handles game state persistence
 */

const fs = require('fs').promises;
const path = require('path');
const mapGenerator = require('./utils/map-generator');
const goldDistributor = require('./utils/gold-distributor');
const itemGenerator = require('./utils/item-generator');
const lockManager = require('./utils/lock-manager');

const STATE_FILE = path.join(__dirname, '../data/game-state.json');
const AUTOSAVE_INTERVAL = 30000; // 30 seconds

class StateManager {
  constructor() {
    this.gameState = null;
    this.autosaveTimer = null;
  }

  /**
   * Load game state from file
   */
  async loadState() {
    try {
      const data = await fs.readFile(STATE_FILE, 'utf8');
      this.gameState = JSON.parse(data);
      console.log('Game state loaded successfully');
      return this.gameState;
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('No existing game state found, creating new state');
        this.gameState = await this.createInitialState();
        await this.saveState(this.gameState);
        return this.gameState;
      }
      console.error('Error loading game state:', error.message);
      console.log('Creating fresh state due to error');
      this.gameState = await this.createInitialState();
      return this.gameState;
    }
  }

  /**
   * Create initial game state from world data
   */
  async createInitialState() {
    const worldData = await this.loadWorldData();
    const initialState = {
      version: '1.0.0',
      lastSaved: new Date().toISOString(),
      players: {},
      characterLocks: {},
      roomStates: {}
    };

    // Initialize room states from world data
    for (const [roomId, roomData] of Object.entries(worldData.rooms)) {
      initialState.roomStates[roomId] = {
        coins: roomData.coins?.amount || 0,
        objectStates: {},
        lastCoinSpawn: null
      };

      // Initialize object states
      if (roomData.objects) {
        roomData.objects.forEach(obj => {
          initialState.roomStates[roomId].objectStates[obj.id] = obj.state;
        });
      }
    }

    return initialState;
  }

  /**
   * Save game state to file
   */
  async saveState(state) {
    try {
      state.lastSaved = new Date().toISOString();
      await fs.writeFile(
        STATE_FILE,
        JSON.stringify(state, null, 2),
        'utf8'
      );
      console.log('Game state saved successfully');
    } catch (error) {
      console.error('Error saving game state:', error.message);
    }
  }

  /**
   * Start autosave timer
   */
  startAutosave(getStateCallback) {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
    }

    this.autosaveTimer = setInterval(async () => {
      const state = getStateCallback();
      await this.saveState(state);
    }, AUTOSAVE_INTERVAL);

    console.log(`Autosave started (every ${AUTOSAVE_INTERVAL / 1000} seconds)`);
  }

  /**
   * Stop autosave timer
   */
  stopAutosave() {
    if (this.autosaveTimer) {
      clearInterval(this.autosaveTimer);
      this.autosaveTimer = null;
      console.log('Autosave stopped');
    }
  }

  /**
   * Load world data from JSON
   */
  async loadWorldData() {
    try {
      const worldPath = path.join(__dirname, '../data/world.json');
      const data = await fs.readFile(worldPath, 'utf8');
      const worldData = JSON.parse(data);
      console.log('World data loaded successfully');
      return worldData;
    } catch (error) {
      console.error('Error loading world data:', error.message);
      throw new Error('Failed to load world data');
    }
  }

  /**
   * Generate procedural world data (100-room dungeon)
   */
  async generateProceduralWorld() {
    console.log('Generating procedural 100-room dungeon...');

    // Generate 100-room map
    const { rooms, startingRoom } = mapGenerator.generate();

    // Distribute gold across rooms
    goldDistributor.distribute(rooms);

    // Distribute items across rooms
    itemGenerator.distribute(rooms);

    // Add locked doors and keys
    lockManager.addLocksAndKeys(rooms);

    console.log('Procedural world generation complete!');

    return {
      rooms,
      startingRoom,
      name: 'Procedural Dungeon',
      description: 'A vast, mysterious dungeon generated from the depths of chaos.'
    };
  }

  /**
   * Load or generate world data
   * For REQ-3, we use procedural generation
   */
  async loadOrGenerateWorld() {
    // Check if we should use procedural generation
    const useProceduralGen = process.env.USE_PROCEDURAL === 'true' || true;

    if (useProceduralGen) {
      return await this.generateProceduralWorld();
    } else {
      return await this.loadWorldData();
    }
  }

  /**
   * Load character data from JSON
   */
  async loadCharacterData() {
    try {
      const charPath = path.join(__dirname, '../data/characters.json');
      const data = await fs.readFile(charPath, 'utf8');
      const charData = JSON.parse(data);
      console.log('Character data loaded successfully');
      return charData;
    } catch (error) {
      console.error('Error loading character data:', error.message);
      throw new Error('Failed to load character data');
    }
  }

  /**
   * Load verb data from JSON
   */
  async loadVerbData() {
    try {
      const verbPath = path.join(__dirname, '../data/verbs.json');
      const data = await fs.readFile(verbPath, 'utf8');
      const verbData = JSON.parse(data);
      console.log('Verb data loaded successfully');
      return verbData;
    } catch (error) {
      console.error('Error loading verb data:', error.message);
      throw new Error('Failed to load verb data');
    }
  }
}

module.exports = new StateManager();
