/**
 * Command Parser - Parse and validate player commands
 */

class CommandParser {
  constructor() {
    this.commands = {
      // Movement
      go: this.parseMovement,

      // Interaction
      touch: this.parseInteraction,
      open: this.parseInteraction,
      press: this.parseInteraction,

      // Inventory
      collect: this.parseSimple,
      drop: this.parseSimple,
      inventory: this.parseSimple,

      // Communication
      say: this.parseSay,
      emote: this.parseEmote,

      // System
      help: this.parseSimple,
      look: this.parseSimple,
    };
  }

  /**
   * Parse incoming command string
   */
  parse(commandString) {
    const trimmed = commandString.trim();
    if (!trimmed) {
      return {
        type: 'error',
        message: 'Please enter a command.'
      };
    }

    // Preserve original case for say/emote commands
    const lowerTrimmed = trimmed.toLowerCase();

    // Check for action verb (starts with /)
    if (lowerTrimmed.startsWith('/')) {
      return this.parseActionVerb(lowerTrimmed);
    }

    // Split into command and args
    const parts = lowerTrimmed.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    // Special handling for 'say' to preserve case
    if (command === 'say') {
      const originalParts = trimmed.split(/\s+/);
      return this.parseSay(originalParts.slice(1));
    }

    // Special handling for 'emote' to preserve case
    if (command === 'emote') {
      const originalParts = trimmed.split(/\s+/);
      return this.parseEmote(originalParts.slice(1));
    }

    // Find matching command handler
    const handler = this.commands[command];
    if (!handler) {
      return {
        type: 'error',
        message: 'Invalid command. Type "help" for available commands.'
      };
    }

    return handler.call(this, args, command);
  }

  parseMovement(args) {
    if (args.length === 0) {
      return {
        type: 'error',
        message: 'Go where? Please specify a direction (north, south, east, west, up, down).'
      };
    }

    const direction = args[0].toLowerCase();
    const validDirections = ['north', 'south', 'east', 'west', 'up', 'down', 'n', 's', 'e', 'w', 'u', 'd'];

    if (!validDirections.includes(direction)) {
      return {
        type: 'error',
        message: 'Invalid direction. Valid directions are: north, south, east, west, up, down.'
      };
    }

    // Normalize short directions
    const directionMap = {
      'n': 'north',
      's': 'south',
      'e': 'east',
      'w': 'west',
      'u': 'up',
      'd': 'down'
    };

    return {
      type: 'movement',
      direction: directionMap[direction] || direction
    };
  }

  parseInteraction(args, verb) {
    if (args.length === 0) {
      return {
        type: 'error',
        message: `${verb.charAt(0).toUpperCase() + verb.slice(1)} what? Please specify an object.`
      };
    }

    return {
      type: 'interaction',
      verb: verb,
      target: args.join(' ')
    };
  }

  parseSimple(args, commandType) {
    return {
      type: commandType,
      command: commandType
    };
  }

  parseSay(args) {
    if (args.length === 0) {
      return {
        type: 'error',
        message: 'Say what? Please provide a message.'
      };
    }

    return {
      type: 'say',
      message: args.join(' ')
    };
  }

  parseEmote(args) {
    if (args.length === 0) {
      return {
        type: 'error',
        message: 'Emote what? Please provide an action.'
      };
    }

    return {
      type: 'emote',
      action: args.join(' ')
    };
  }

  parseActionVerb(command) {
    // Remove the leading /
    const verb = command.substring(1).toLowerCase();

    if (!verb) {
      return {
        type: 'error',
        message: 'Please specify an action verb (e.g., /dance, /wave, /bow).'
      };
    }

    return {
      type: 'action',
      verb: verb
    };
  }
}

module.exports = new CommandParser();
