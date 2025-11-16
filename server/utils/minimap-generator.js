/**
 * Minimap Generator
 * Generates 5x5 ASCII minimap showing player position and surrounding rooms
 */

class MinimapGenerator {
  constructor() {
    this.MAP_SIZE = 5;
    this.CENTER = 2; // Center position in 5x5 grid
  }

  /**
   * Generate ASCII minimap centered on player's current room
   */
  generate(currentRoom, rooms) {
    if (!currentRoom || !currentRoom.position) {
      return this.generateEmptyMap();
    }

    const grid = this.createGrid();
    const centerX = currentRoom.position.x;
    const centerY = currentRoom.position.y;

    // Populate grid with rooms
    for (let dy = -this.CENTER; dy <= this.CENTER; dy++) {
      for (let dx = -this.CENTER; dx <= this.CENTER; dx++) {
        const targetX = centerX + dx;
        const targetY = centerY + dy;

        const gridX = this.CENTER + dx;
        const gridY = this.CENTER + dy;

        // Find room at this position
        const room = this.findRoomAtPosition(targetX, targetY, rooms);

        if (room) {
          // Check if this is the player's current room
          if (dx === 0 && dy === 0) {
            grid[gridY][gridX] = '@'; // Player marker
          } else {
            grid[gridY][gridX] = this.getRoomSymbol(room, currentRoom, rooms);
          }
        }
      }
    }

    return this.renderGrid(grid);
  }

  /**
   * Create empty 5x5 grid
   */
  createGrid() {
    const grid = [];
    for (let y = 0; y < this.MAP_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < this.MAP_SIZE; x++) {
        grid[y][x] = ' '; // Empty space
      }
    }
    return grid;
  }

  /**
   * Find room at specific coordinates
   */
  findRoomAtPosition(x, y, rooms) {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.position && room.position.x === x && room.position.y === y) {
        return room;
      }
    }
    return null;
  }

  /**
   * Get symbol for room based on its properties
   */
  getRoomSymbol(room, currentRoom, rooms) {
    // Check if room is connected to current room
    const isConnected = this.isConnectedToCurrentRoom(room, currentRoom);

    // Check for locked doors
    const hasLockedDoor = this.hasLockedDoor(room);

    // Check for items
    const hasItems = room.items && room.items.length > 0;

    // Check for coins
    const hasCoins = this.getRoomCoins(room) > 0;

    // Priority order for symbols
    if (hasLockedDoor) {
      return '#'; // Locked door
    } else if (hasItems) {
      return '?'; // Contains items
    } else if (hasCoins) {
      return '$'; // Contains gold
    } else if (isConnected) {
      return '.'; // Connected room
    } else {
      return '·'; // Unconnected room
    }
  }

  /**
   * Check if room is directly connected to current room
   */
  isConnectedToCurrentRoom(room, currentRoom) {
    // Check if current room has exit to target room
    for (const direction in currentRoom.exits) {
      if (currentRoom.exits[direction].to === room.id) {
        return true;
      }
    }

    // Check if target room has exit to current room
    for (const direction in room.exits) {
      if (room.exits[direction].to === currentRoom.id) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if room has any locked doors
   */
  hasLockedDoor(room) {
    for (const direction in room.exits) {
      if (room.exits[direction].type === 'locked') {
        return true;
      }
    }
    return false;
  }

  /**
   * Get coin count for room
   */
  getRoomCoins(room) {
    // This will be updated to check game state
    return room.coins?.amount || 0;
  }

  /**
   * Render grid as ASCII art
   */
  renderGrid(grid) {
    const lines = [];

    // Top border
    lines.push('┌─────────┐');

    // Grid rows
    for (let y = 0; y < this.MAP_SIZE; y++) {
      let row = '│';
      for (let x = 0; x < this.MAP_SIZE; x++) {
        row += grid[y][x];
        if (x < this.MAP_SIZE - 1) {
          row += ' ';
        }
      }
      row += '│';
      lines.push(row);
    }

    // Bottom border
    lines.push('└─────────┘');

    // Legend
    lines.push('');
    lines.push('Legend:');
    lines.push('  @ = You');
    lines.push('  . = Room (connected)');
    lines.push('  · = Room (distant)');
    lines.push('  # = Locked door');
    lines.push('  ? = Items');
    lines.push('  $ = Gold');

    return lines.join('\n');
  }

  /**
   * Generate empty map when no position data available
   */
  generateEmptyMap() {
    return [
      '┌─────────┐',
      '│    ?    │',
      '│    ?    │',
      '│  ? @ ?  │',
      '│    ?    │',
      '│    ?    │',
      '└─────────┘',
      '',
      'Map data unavailable'
    ].join('\n');
  }

  /**
   * Generate minimap with game state data
   */
  generateWithState(currentRoom, rooms, gameState) {
    if (!currentRoom || !currentRoom.position) {
      return this.generateEmptyMap();
    }

    const grid = this.createGrid();
    const centerX = currentRoom.position.x;
    const centerY = currentRoom.position.y;

    // Populate grid with rooms using game state
    for (let dy = -this.CENTER; dy <= this.CENTER; dy++) {
      for (let dx = -this.CENTER; dx <= this.CENTER; dx++) {
        const targetX = centerX + dx;
        const targetY = centerY + dy;

        const gridX = this.CENTER + dx;
        const gridY = this.CENTER + dy;

        // Find room at this position
        const room = this.findRoomAtPosition(targetX, targetY, rooms);

        if (room) {
          // Check if this is the player's current room
          if (dx === 0 && dy === 0) {
            grid[gridY][gridX] = '@'; // Player marker
          } else {
            grid[gridY][gridX] = this.getRoomSymbolWithState(room, currentRoom, rooms, gameState);
          }
        }
      }
    }

    return this.renderGrid(grid);
  }

  /**
   * Get room symbol with game state information
   */
  getRoomSymbolWithState(room, currentRoom, rooms, gameState) {
    const isConnected = this.isConnectedToCurrentRoom(room, currentRoom);
    const hasLockedDoor = this.hasLockedDoor(room);

    // Get room state
    const roomState = gameState?.roomStates?.[room.id];
    const hasItems = room.items && room.items.length > 0;
    const hasCoins = roomState?.coins > 0;

    // Priority order for symbols
    if (hasLockedDoor) {
      return '#'; // Locked door
    } else if (hasItems) {
      return '?'; // Contains items
    } else if (hasCoins) {
      return '$'; // Contains gold
    } else if (isConnected) {
      return '.'; // Connected room
    } else {
      return '·'; // Unconnected room
    }
  }
}

module.exports = new MinimapGenerator();
