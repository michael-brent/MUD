/**
 * Procedural Map Generator
 * Generates a 100-room dungeon with specified connectivity distribution
 */

class MapGenerator {
  constructor() {
    this.ROOM_COUNT = 100;
    this.CONNECTIVITY_DIST = {
      oneExit: 0.10,    // 10% dead ends
      twoExits: 0.80,   // 80% corridors
      manyExits: 0.10   // 10% hubs (3-4 exits)
    };
  }

  /**
   * Generate a complete 100-room dungeon
   */
  generate() {
    console.log('Generating procedural 100-room dungeon...');

    const rooms = this.createRooms();
    this.assignConnectivity(rooms);
    this.connectRooms(rooms);
    this.ensureReachability(rooms);

    console.log(`Generated ${rooms.length} rooms`);
    return { rooms, startingRoom: 'room_0' };
  }

  /**
   * Create 100 empty room objects
   */
  createRooms() {
    const rooms = {};

    for (let i = 0; i < this.ROOM_COUNT; i++) {
      const roomId = `room_${i}`;
      rooms[roomId] = {
        id: roomId,
        name: this.generateRoomName(i),
        description: this.generateRoomDescription(i),
        exits: {},
        objects: [],
        coins: {
          spawnType: 'initial-only',
          amount: 0 // Will be set by gold distribution
        },
        items: [], // Will be populated by item generator
        explored: false,
        position: null // Will be set during connectivity
      };
    }

    return rooms;
  }

  /**
   * Assign connectivity distribution to rooms
   */
  assignConnectivity(rooms) {
    const roomIds = Object.keys(rooms);
    const counts = {
      oneExit: Math.floor(this.ROOM_COUNT * this.CONNECTIVITY_DIST.oneExit),
      twoExits: Math.floor(this.ROOM_COUNT * this.CONNECTIVITY_DIST.twoExits),
      manyExits: Math.floor(this.ROOM_COUNT * this.CONNECTIVITY_DIST.manyExits)
    };

    // Ensure we have exactly 100 rooms
    const diff = this.ROOM_COUNT - (counts.oneExit + counts.twoExits + counts.manyExits);
    counts.twoExits += diff;

    // Shuffle room IDs
    this.shuffle(roomIds);

    // Assign exit counts
    let index = 0;

    // Assign 1-exit rooms
    for (let i = 0; i < counts.oneExit; i++) {
      rooms[roomIds[index]].targetExits = 1;
      index++;
    }

    // Assign 2-exit rooms
    for (let i = 0; i < counts.twoExits; i++) {
      rooms[roomIds[index]].targetExits = 2;
      index++;
    }

    // Assign 3-4 exit rooms
    for (let i = 0; i < counts.manyExits; i++) {
      rooms[roomIds[index]].targetExits = Math.random() < 0.5 ? 3 : 4;
      index++;
    }

    console.log(`Connectivity assigned: ${counts.oneExit} one-exit, ${counts.twoExits} two-exit, ${counts.manyExits} multi-exit rooms`);
  }

  /**
   * Connect rooms in a grid-like pattern ensuring reachability
   */
  connectRooms(rooms) {
    const roomIds = Object.keys(rooms);
    const gridSize = Math.ceil(Math.sqrt(this.ROOM_COUNT));

    // Assign grid positions
    for (let i = 0; i < roomIds.length; i++) {
      const x = i % gridSize;
      const y = Math.floor(i / gridSize);
      rooms[roomIds[i]].position = { x, y };
    }

    // Create minimum spanning tree to ensure connectivity
    const visited = new Set();
    const queue = ['room_0'];
    visited.add('room_0');

    while (queue.length > 0 && visited.size < roomIds.length) {
      const currentId = queue.shift();
      const current = rooms[currentId];

      // Try to connect to neighbors
      const neighbors = this.getUnconnectedNeighbors(current, rooms, visited);

      for (const neighbor of neighbors) {
        if (this.canAddConnection(current) && this.canAddConnection(rooms[neighbor])) {
          this.addBidirectionalConnection(current, rooms[neighbor]);
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    // Fill remaining connections to meet target exit counts
    this.fillRemainingConnections(rooms);
  }

  /**
   * Get unconnected neighbor rooms
   */
  getUnconnectedNeighbors(room, rooms, visited) {
    const neighbors = [];
    const directions = [
      { dx: 0, dy: -1, dir: 'north', opposite: 'south' },
      { dx: 0, dy: 1, dir: 'south', opposite: 'north' },
      { dx: 1, dy: 0, dir: 'east', opposite: 'west' },
      { dx: -1, dy: 0, dir: 'west', opposite: 'east' }
    ];

    for (const { dx, dy, dir } of directions) {
      const newPos = {
        x: room.position.x + dx,
        y: room.position.y + dy
      };

      // Find room at this position
      const neighborId = Object.keys(rooms).find(id => {
        const r = rooms[id];
        return r.position && r.position.x === newPos.x && r.position.y === newPos.y;
      });

      if (neighborId && !visited.has(neighborId) && !room.exits[dir]) {
        neighbors.push(neighborId);
      }
    }

    return neighbors;
  }

  /**
   * Check if room can add more connections
   */
  canAddConnection(room) {
    const currentExits = Object.keys(room.exits).length;
    return currentExits < (room.targetExits || 2);
  }

  /**
   * Add bidirectional connection between two rooms
   */
  addBidirectionalConnection(room1, room2) {
    const dx = room2.position.x - room1.position.x;
    const dy = room2.position.y - room1.position.y;

    let dir1, dir2;

    if (dx === 1) {
      dir1 = 'east';
      dir2 = 'west';
    } else if (dx === -1) {
      dir1 = 'west';
      dir2 = 'east';
    } else if (dy === 1) {
      dir1 = 'south';
      dir2 = 'north';
    } else if (dy === -1) {
      dir1 = 'north';
      dir2 = 'south';
    }

    if (dir1 && dir2) {
      room1.exits[dir1] = { to: room2.id, type: 'open' };
      room2.exits[dir2] = { to: room1.id, type: 'open' };
    }
  }

  /**
   * Fill remaining connections to meet target exit counts
   */
  fillRemainingConnections(rooms) {
    const roomIds = Object.keys(rooms);

    for (const roomId of roomIds) {
      const room = rooms[roomId];
      const currentExits = Object.keys(room.exits).length;
      const needed = (room.targetExits || 2) - currentExits;

      if (needed > 0) {
        // Try to add connections to adjacent rooms
        const directions = ['north', 'south', 'east', 'west'];
        const availableDirections = directions.filter(dir => !room.exits[dir]);

        for (let i = 0; i < needed && i < availableDirections.length; i++) {
          const dir = availableDirections[i];
          const neighbor = this.findNeighborInDirection(room, dir, rooms);

          if (neighbor && this.canAddConnection(neighbor)) {
            this.addBidirectionalConnection(room, neighbor);
          }
        }
      }
    }
  }

  /**
   * Find neighbor room in a specific direction
   */
  findNeighborInDirection(room, direction, rooms) {
    const deltas = {
      north: { dx: 0, dy: -1 },
      south: { dx: 0, dy: 1 },
      east: { dx: 1, dy: 0 },
      west: { dx: -1, dy: 0 }
    };

    const delta = deltas[direction];
    if (!delta) return null;

    const newPos = {
      x: room.position.x + delta.dx,
      y: room.position.y + delta.dy
    };

    return Object.values(rooms).find(r =>
      r.position && r.position.x === newPos.x && r.position.y === newPos.y
    );
  }

  /**
   * Ensure all rooms are reachable from starting room
   */
  ensureReachability(rooms) {
    const reachable = new Set();
    const queue = ['room_0'];
    reachable.add('room_0');

    while (queue.length > 0) {
      const currentId = queue.shift();
      const current = rooms[currentId];

      for (const direction in current.exits) {
        const neighborId = current.exits[direction].to;
        if (!reachable.has(neighborId)) {
          reachable.add(neighborId);
          queue.push(neighborId);
        }
      }
    }

    const unreachable = Object.keys(rooms).filter(id => !reachable.has(id));

    if (unreachable.length > 0) {
      console.log(`Connecting ${unreachable.length} unreachable rooms...`);

      // Connect unreachable rooms
      for (const unreachableId of unreachable) {
        const unreachableRoom = rooms[unreachableId];

        // Find nearest reachable room
        let nearestReachable = null;
        let minDistance = Infinity;

        for (const reachableId of reachable) {
          const reachableRoom = rooms[reachableId];
          const distance = Math.abs(unreachableRoom.position.x - reachableRoom.position.x) +
                          Math.abs(unreachableRoom.position.y - reachableRoom.position.y);

          if (distance < minDistance && distance === 1) {
            minDistance = distance;
            nearestReachable = reachableRoom;
          }
        }

        if (nearestReachable) {
          this.addBidirectionalConnection(unreachableRoom, nearestReachable);
          reachable.add(unreachableId);
        }
      }
    }

    console.log(`All ${reachable.size} rooms are reachable from starting room`);
  }

  /**
   * Generate room name
   */
  generateRoomName(index) {
    const prefixes = [
      'Dark', 'Ancient', 'Forgotten', 'Hidden', 'Dusty', 'Damp', 'Cold', 'Musty',
      'Shadowy', 'Crumbling', 'Narrow', 'Wide', 'Deep', 'Shallow', 'Twisted'
    ];

    const types = [
      'Chamber', 'Corridor', 'Hall', 'Passage', 'Room', 'Vault', 'Cavern',
      'Alcove', 'Gallery', 'Tunnel', 'Crypt', 'Cell', 'Den'
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const type = types[Math.floor(Math.random() * types.length)];

    return `${prefix} ${type}`;
  }

  /**
   * Generate room description
   */
  generateRoomDescription(index) {
    const descriptions = [
      'The walls are covered in ancient moss and mysterious symbols.',
      'Water drips steadily from cracks in the ceiling.',
      'Cobwebs hang thick in the corners of this abandoned space.',
      'The air is thick with dust and the smell of age.',
      'Faint scratch marks cover the stone floor.',
      'A cold draft whistles through unseen cracks.',
      'The flickering torchlight casts dancing shadows on the walls.',
      'Broken furniture lies scattered across the floor.',
      'Strange echoes suggest this room is larger than it appears.',
      'The darkness here feels almost alive.'
    ];

    return descriptions[Math.floor(Math.random() * descriptions.length)];
  }

  /**
   * Shuffle array in place
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

module.exports = new MapGenerator();
