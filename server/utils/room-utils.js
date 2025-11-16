/**
 * Room Utilities - Generate room descriptions and manage room state
 */

class RoomUtils {
  /**
   * Generate full room description including players, objects, and coins
   */
  static generateDescription(room, players, gameState) {
    const roomState = gameState.roomStates[room.id];
    const description = {
      name: room.name,
      description: room.description,
      exits: [],
      players: [],
      coins: roomState.coins || 0,
      objects: []
    };

    // Get available exits
    description.exits = this.getAvailableExits(room);

    // Get players in room
    const playersInRoom = this.getPlayersInRoom(room.id, players);
    description.players = this.formatPlayerList(playersInRoom);

    // Get objects in room with their current states
    if (room.objects && room.objects.length > 0) {
      room.objects.forEach(obj => {
        const currentState = roomState.objectStates[obj.id] || obj.state;
        let objectDesc = obj.description;

        // Add state to description if relevant
        if (currentState !== 'normal' && currentState !== obj.state) {
          objectDesc = `${obj.name} (${currentState})`;
        } else {
          objectDesc = obj.name;
        }

        description.objects.push(objectDesc);
      });
    }

    return description;
  }

  /**
   * Get list of available exits from a room
   */
  static getAvailableExits(room) {
    if (!room.exits) {
      return [];
    }

    return Object.keys(room.exits);
  }

  /**
   * Check if an exit is locked
   */
  static isExitLocked(room, direction, playerInventory) {
    if (!room.exits || !room.exits[direction]) {
      return { locked: true, reason: 'No exit in that direction' };
    }

    const exit = room.exits[direction];

    // Check if exit is locked
    if (exit.type === 'locked') {
      const requiredItem = exit.requiredItem;

      // Check if player has required item
      if (!playerInventory || !playerInventory.items) {
        return {
          locked: true,
          reason: `This exit is locked. You need a ${requiredItem} to unlock it.`,
          requiredItem: requiredItem
        };
      }

      const hasItem = playerInventory.items.some(item => item === requiredItem);
      if (!hasItem) {
        return {
          locked: true,
          reason: `This exit is locked. You need a ${requiredItem} to unlock it.`,
          requiredItem: requiredItem
        };
      }

      // Player has the key, exit can be unlocked
      return {
        locked: true,
        canUnlock: true,
        requiredItem: requiredItem,
        unlockMessage: exit.unlockMessage
      };
    }

    // Exit is open
    return { locked: false };
  }

  /**
   * Get list of players in a room
   */
  static getPlayersInRoom(roomId, allPlayers) {
    const playersInRoom = [];

    for (const [sessionId, player] of Object.entries(allPlayers)) {
      if (player.currentRoom === roomId) {
        playersInRoom.push({
          name: player.characterName,
          status: player.status || 'active',
          sessionId: sessionId
        });
      }
    }

    return playersInRoom;
  }

  /**
   * Format player list for room description
   */
  static formatPlayerList(players) {
    return players.map(player => {
      let playerDesc = player.name;
      if (player.status === 'idle') {
        playerDesc += ' (idle)';
      } else if (player.status === 'afk') {
        playerDesc += ' (AFK)';
      }
      return playerDesc;
    });
  }

  /**
   * Get object by name in room
   */
  static findObject(room, objectName) {
    if (!room.objects) {
      return null;
    }

    const lowerName = objectName.toLowerCase();
    return room.objects.find(obj =>
      obj.name.toLowerCase() === lowerName ||
      obj.id.toLowerCase() === lowerName
    );
  }

  /**
   * Check if object interaction is valid
   */
  static canInteractWith(object, verb, currentState) {
    if (!object.interactions || !object.interactions[verb]) {
      return {
        valid: false,
        message: `You can't ${verb} the ${object.name}.`
      };
    }

    const interaction = object.interactions[verb];
    const validStates = interaction.validStates || [];

    if (validStates.length > 0 && !validStates.includes(currentState)) {
      return {
        valid: false,
        message: `You can't ${verb} the ${object.name} right now.`
      };
    }

    return {
      valid: true,
      interaction: interaction
    };
  }
}

module.exports = RoomUtils;
