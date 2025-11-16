/**
 * Item Generation System
 * Generates diverse items across the dungeon (1 item per 3 rooms)
 */

class ItemGenerator {
  constructor() {
    this.ITEMS_PER_ROOM_RATIO = 3; // 1 item per 3 rooms

    // Item templates organized by type
    this.itemTemplates = {
      weapons: [
        { name: 'Rusty Sword', description: 'An old iron sword covered in rust but still sharp enough to be useful.' },
        { name: 'Wooden Staff', description: 'A gnarled oak staff worn smooth by years of use.' },
        { name: 'Silver Dagger', description: 'A gleaming dagger with an ornate silver hilt.' },
        { name: 'Battle Axe', description: 'A heavy double-bladed axe with dried blood on the edges.' },
        { name: 'Elvish Bow', description: 'An elegantly curved bow made from white ash wood.' },
        { name: 'Iron Mace', description: 'A brutish mace with a spiked iron head.' }
      ],
      armor: [
        { name: 'Leather Vest', description: 'A well-worn leather vest with bronze studs.' },
        { name: 'Chain Mail', description: 'Interlocking metal rings forming a protective shirt.' },
        { name: 'Wooden Shield', description: 'A round shield reinforced with iron bands.' },
        { name: 'Iron Helmet', description: 'A dented but sturdy iron helmet with a nose guard.' },
        { name: 'Plate Gauntlets', description: 'Heavy steel gauntlets etched with runes.' },
        { name: 'Dragon Scale Armor', description: 'Shimmering scales from an ancient dragon, light but incredibly strong.' }
      ],
      potions: [
        { name: 'Red Potion', description: 'A vial filled with crimson liquid that glows faintly.' },
        { name: 'Blue Elixir', description: 'A small bottle containing swirling blue liquid.' },
        { name: 'Green Tonic', description: 'Murky green liquid in a cracked glass bottle.' },
        { name: 'Golden Philter', description: 'A shimmering golden potion in an ornate crystal vial.' },
        { name: 'Black Draught', description: 'An ominous black liquid that seems to absorb light.' }
      ],
      treasures: [
        { name: 'Ruby Pendant', description: 'A large ruby set in a gold pendant, worth a fortune.' },
        { name: 'Ancient Coins', description: 'A handful of gold coins from a long-dead empire.' },
        { name: 'Pearl Necklace', description: 'Perfectly matched pearls strung on silver thread.' },
        { name: 'Jeweled Crown', description: 'A crown encrusted with sapphires and emeralds.' },
        { name: 'Diamond Ring', description: 'A platinum ring with a flawless diamond.' },
        { name: 'Golden Chalice', description: 'An ornate chalice studded with precious gems.' }
      ],
      tools: [
        { name: 'Iron Key', description: 'A heavy iron key covered in strange symbols.' },
        { name: 'Brass Compass', description: 'A tarnished compass that still points true north.' },
        { name: 'Rope Coil', description: 'Fifty feet of sturdy hemp rope.' },
        { name: 'Lantern', description: 'A reliable oil lantern with a clear glass globe.' },
        { name: 'Lockpicks', description: 'A set of fine steel tools for opening locks.' },
        { name: 'Grappling Hook', description: 'A three-pronged iron hook attached to a rope.' }
      ],
      magical: [
        { name: 'Crystal Orb', description: 'A clear crystal sphere that pulses with inner light.' },
        { name: 'Spell Scroll', description: 'An ancient scroll covered in glowing runes.' },
        { name: 'Magic Wand', description: 'A slender wand made of crystallized starlight.' },
        { name: 'Enchanted Ring', description: 'A silver ring that hums with magical energy.' },
        { name: 'Rune Stone', description: 'A flat stone carved with powerful arcane symbols.' },
        { name: 'Amulet of Power', description: 'A bronze amulet radiating waves of magical force.' }
      ]
    };
  }

  /**
   * Distribute items across rooms
   */
  distribute(rooms) {
    console.log('Distributing items across rooms...');

    const roomIds = Object.keys(rooms);
    const itemCount = Math.floor(roomIds.length / this.ITEMS_PER_ROOM_RATIO);

    // Generate item pool
    const itemPool = this.generateItemPool(itemCount);

    // Shuffle room IDs
    const shuffledRooms = [...roomIds];
    this.shuffle(shuffledRooms);

    // Distribute items
    let itemsPlaced = 0;
    for (let i = 0; i < Math.min(itemPool.length, shuffledRooms.length); i++) {
      const roomId = shuffledRooms[i];
      const item = itemPool[i];

      if (!rooms[roomId].items) {
        rooms[roomId].items = [];
      }

      rooms[roomId].items.push(item);
      itemsPlaced++;
    }

    console.log(`Distributed ${itemsPlaced} items across ${roomIds.length} rooms`);
    this.logDistributionStats(itemPool);

    return rooms;
  }

  /**
   * Generate pool of items
   */
  generateItemPool(count) {
    const items = [];
    const allTypes = Object.keys(this.itemTemplates);

    // Calculate items per type (roughly equal distribution)
    const itemsPerType = Math.floor(count / allTypes.length);
    const remainder = count % allTypes.length;

    // Add items from each type
    for (let i = 0; i < allTypes.length; i++) {
      const type = allTypes[i];
      const templates = this.itemTemplates[type];
      const numToAdd = itemsPerType + (i < remainder ? 1 : 0);

      for (let j = 0; j < numToAdd; j++) {
        // Cycle through templates if we need more items than templates
        const template = templates[j % templates.length];
        items.push({
          id: `item_${items.length}`,
          type: type,
          name: template.name,
          description: template.description,
          canTake: true,
          canDrop: true
        });
      }
    }

    return items;
  }

  /**
   * Log distribution statistics
   */
  logDistributionStats(items) {
    const typeCount = {};

    for (const item of items) {
      typeCount[item.type] = (typeCount[item.type] || 0) + 1;
    }

    console.log('Item distribution by type:');
    for (const type in typeCount) {
      console.log(`  ${type}: ${typeCount[type]} items`);
    }
  }

  /**
   * Get item statistics
   */
  getStats(rooms) {
    const stats = {
      totalItems: 0,
      roomsWithItems: 0,
      itemsByType: {}
    };

    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.items && room.items.length > 0) {
        stats.roomsWithItems++;
        stats.totalItems += room.items.length;

        for (const item of room.items) {
          stats.itemsByType[item.type] = (stats.itemsByType[item.type] || 0) + 1;
        }
      }
    }

    return stats;
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

  /**
   * Get item by ID
   */
  getItemById(itemId, rooms) {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.items) {
        const item = room.items.find(i => i.id === itemId);
        if (item) {
          return { item, roomId };
        }
      }
    }
    return null;
  }

  /**
   * Remove item from room
   */
  removeItemFromRoom(itemId, roomId, rooms) {
    const room = rooms[roomId];
    if (room && room.items) {
      const index = room.items.findIndex(i => i.id === itemId);
      if (index !== -1) {
        const item = room.items.splice(index, 1)[0];
        return item;
      }
    }
    return null;
  }

  /**
   * Add item to room
   */
  addItemToRoom(item, roomId, rooms) {
    const room = rooms[roomId];
    if (room) {
      if (!room.items) {
        room.items = [];
      }
      room.items.push(item);
      return true;
    }
    return false;
  }
}

module.exports = new ItemGenerator();
