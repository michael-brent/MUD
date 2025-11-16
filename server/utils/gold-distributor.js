/**
 * Gold Distribution System
 * Distributes gold across rooms using normal distribution
 */

class GoldDistributor {
  constructor() {
    this.MIN_GOLD = 0;
    this.MAX_GOLD = 10;
    this.MEAN = 5;
    this.STD_DEV = 2.5;
  }

  /**
   * Distribute gold across all rooms
   */
  distribute(rooms) {
    console.log('Distributing gold across rooms...');

    let totalGold = 0;
    const roomIds = Object.keys(rooms);

    for (const roomId of roomIds) {
      const gold = this.generateGoldAmount();
      rooms[roomId].coins.amount = gold;
      totalGold += gold;
    }

    console.log(`Distributed ${totalGold} total gold across ${roomIds.length} rooms (avg: ${(totalGold / roomIds.length).toFixed(1)} per room)`);

    return rooms;
  }

  /**
   * Generate gold amount using normal distribution
   */
  generateGoldAmount() {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    // Convert to desired mean and standard deviation
    let gold = Math.round(z0 * this.STD_DEV + this.MEAN);

    // Clamp to min/max range
    gold = Math.max(this.MIN_GOLD, Math.min(this.MAX_GOLD, gold));

    return gold;
  }

  /**
   * Get statistics about gold distribution
   */
  getStats(rooms) {
    const amounts = Object.values(rooms).map(r => r.coins.amount);
    const total = amounts.reduce((sum, amt) => sum + amt, 0);
    const mean = total / amounts.length;

    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    return {
      total,
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(2),
      min: Math.min(...amounts),
      max: Math.max(...amounts)
    };
  }
}

module.exports = new GoldDistributor();
