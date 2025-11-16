/**
 * Lock Management System
 * Handles locked doors and key placement
 */

class LockManager {
  constructor() {
    this.MIN_LOCKS = 5;
    this.MAX_LOCKS = 10;
    this.MIN_KEY_DISTANCE = 10; // Minimum room distance between lock and key
  }

  /**
   * Add locked doors and keys to the dungeon
   */
  addLocksAndKeys(rooms) {
    console.log('Adding locked doors and keys...');

    const roomIds = Object.keys(rooms);
    const lockCount = Math.floor(Math.random() * (this.MAX_LOCKS - this.MIN_LOCKS + 1)) + this.MIN_LOCKS;

    const locks = [];

    for (let i = 0; i < lockCount; i++) {
      const lock = this.createLock(rooms, roomIds, locks);
      if (lock) {
        locks.push(lock);
        this.applyLock(rooms, lock);
        this.placeKey(rooms, roomIds, lock);
      }
    }

    console.log(`Created ${locks.length} locked doors with matching keys`);
    this.logLockStats(locks);

    return rooms;
  }

  /**
   * Create a new lock
   */
  createLock(rooms, roomIds, existingLocks) {
    // Try to find a suitable door to lock
    for (let attempt = 0; attempt < 50; attempt++) {
      const roomId = roomIds[Math.floor(Math.random() * roomIds.length)];
      const room = rooms[roomId];

      // Get available exits
      const exits = Object.keys(room.exits);
      if (exits.length === 0) continue;

      const direction = exits[Math.floor(Math.random() * exits.length)];
      const exit = room.exits[direction];

      // Check if this door is already locked
      const alreadyLocked = existingLocks.some(
        lock => lock.roomId === roomId && lock.direction === direction
      );

      if (!alreadyLocked && exit.type === 'open') {
        const keyId = `key_${existingLocks.length}`;
        const keyName = this.generateKeyName(existingLocks.length);

        return {
          roomId,
          direction,
          keyId,
          keyName,
          targetRoomId: exit.to
        };
      }
    }

    return null;
  }

  /**
   * Apply lock to door
   */
  applyLock(rooms, lock) {
    const room = rooms[lock.roomId];
    const targetRoom = rooms[lock.targetRoomId];

    if (!room || !targetRoom) return;

    // Lock the door in both directions
    room.exits[lock.direction] = {
      to: lock.targetRoomId,
      type: 'locked',
      keyRequired: lock.keyId
    };

    // Find reverse direction
    const reverseDir = this.getReverseDirection(lock.direction);
    if (reverseDir && targetRoom.exits[reverseDir]) {
      targetRoom.exits[reverseDir] = {
        to: lock.roomId,
        type: 'locked',
        keyRequired: lock.keyId
      };
    }
  }

  /**
   * Place key in a distant room
   */
  placeKey(rooms, roomIds, lock) {
    const lockRoom = rooms[lock.roomId];
    const candidates = [];

    // Find rooms that are sufficiently far from the locked door
    for (const candidateId of roomIds) {
      const candidate = rooms[candidateId];
      if (!candidate.position || !lockRoom.position) continue;

      const distance = Math.abs(candidate.position.x - lockRoom.position.x) +
                      Math.abs(candidate.position.y - lockRoom.position.y);

      if (distance >= this.MIN_KEY_DISTANCE) {
        candidates.push(candidateId);
      }
    }

    // If no distant rooms found, use any room
    if (candidates.length === 0) {
      candidates.push(...roomIds.filter(id => id !== lock.roomId));
    }

    // Place key in random candidate room
    if (candidates.length > 0) {
      const keyRoomId = candidates[Math.floor(Math.random() * candidates.length)];
      const keyRoom = rooms[keyRoomId];

      if (!keyRoom.items) {
        keyRoom.items = [];
      }

      keyRoom.items.push({
        id: lock.keyId,
        type: 'key',
        name: lock.keyName,
        description: `A key that might unlock a door somewhere in the dungeon.`,
        canTake: true,
        canDrop: true,
        unlocks: `${lock.roomId}_${lock.direction}`
      });
    }
  }

  /**
   * Generate key name
   */
  generateKeyName(index) {
    const materials = [
      'Iron', 'Brass', 'Silver', 'Bronze', 'Steel',
      'Copper', 'Gold', 'Rusted', 'Ornate', 'Ancient'
    ];

    const types = [
      'Key', 'Skeleton Key', 'Master Key', 'Old Key'
    ];

    const material = materials[index % materials.length];
    const type = types[Math.floor(index / materials.length) % types.length];

    return `${material} ${type}`;
  }

  /**
   * Get reverse direction
   */
  getReverseDirection(direction) {
    const reverseMap = {
      north: 'south',
      south: 'north',
      east: 'west',
      west: 'east'
    };
    return reverseMap[direction];
  }

  /**
   * Check if player has key for locked door
   */
  hasKey(playerInventory, keyRequired) {
    if (!playerInventory || !playerInventory.items) return false;
    return playerInventory.items.some(item => item.id === keyRequired);
  }

  /**
   * Unlock a door
   */
  unlockDoor(rooms, roomId, direction, keyId) {
    const room = rooms[roomId];
    if (!room || !room.exits[direction]) return false;

    const exit = room.exits[direction];
    if (exit.type !== 'locked' || exit.keyRequired !== keyId) return false;

    // Unlock both sides of the door
    room.exits[direction] = {
      to: exit.to,
      type: 'open'
    };

    const targetRoom = rooms[exit.to];
    const reverseDir = this.getReverseDirection(direction);

    if (targetRoom && reverseDir && targetRoom.exits[reverseDir]) {
      targetRoom.exits[reverseDir] = {
        to: roomId,
        type: 'open'
      };
    }

    return true;
  }

  /**
   * Lock a door (if player has key)
   */
  lockDoor(rooms, roomId, direction, keyId) {
    const room = rooms[roomId];
    if (!room || !room.exits[direction]) return false;

    const exit = room.exits[direction];
    if (exit.type === 'locked') return false; // Already locked

    // Lock both sides
    room.exits[direction] = {
      to: exit.to,
      type: 'locked',
      keyRequired: keyId
    };

    const targetRoom = rooms[exit.to];
    const reverseDir = this.getReverseDirection(direction);

    if (targetRoom && reverseDir && targetRoom.exits[reverseDir]) {
      targetRoom.exits[reverseDir] = {
        to: roomId,
        type: 'locked',
        keyRequired: keyId
      };
    }

    return true;
  }

  /**
   * Get door status
   */
  getDoorStatus(room, direction) {
    if (!room || !room.exits[direction]) {
      return null;
    }

    const exit = room.exits[direction];
    return {
      direction,
      destination: exit.to,
      isLocked: exit.type === 'locked',
      keyRequired: exit.keyRequired || null
    };
  }

  /**
   * Log lock statistics
   */
  logLockStats(locks) {
    const directionCount = {};

    for (const lock of locks) {
      directionCount[lock.direction] = (directionCount[lock.direction] || 0) + 1;
    }

    console.log('Locked doors by direction:');
    for (const dir in directionCount) {
      console.log(`  ${dir}: ${directionCount[dir]} doors`);
    }
  }

  /**
   * Get all locked doors in dungeon
   */
  getAllLockedDoors(rooms) {
    const lockedDoors = [];

    for (const roomId in rooms) {
      const room = rooms[roomId];
      for (const direction in room.exits) {
        const exit = room.exits[direction];
        if (exit.type === 'locked') {
          lockedDoors.push({
            roomId,
            roomName: room.name,
            direction,
            keyRequired: exit.keyRequired
          });
        }
      }
    }

    return lockedDoors;
  }

  /**
   * Get all keys in dungeon
   */
  getAllKeys(rooms) {
    const keys = [];

    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.items) {
        const roomKeys = room.items.filter(item => item.type === 'key');
        for (const key of roomKeys) {
          keys.push({
            keyId: key.id,
            keyName: key.name,
            roomId,
            roomName: room.name
          });
        }
      }
    }

    return keys;
  }
}

module.exports = new LockManager();
