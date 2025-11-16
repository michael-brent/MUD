/**
 * Timeout Manager - Handles character release and idle detection
 */

const CHARACTER_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

class TimeoutManager {
  constructor() {
    this.characterTimers = new Map(); // sessionId -> timeout
    this.idleTimers = new Map(); // sessionId -> timeout
  }

  /**
   * Start character release timeout for a disconnected player
   */
  startCharacterTimeout(sessionId, onTimeout) {
    // Clear any existing timeout
    this.cancelCharacterTimeout(sessionId);

    // Start new timeout
    const timer = setTimeout(() => {
      console.log(`Character timeout for session ${sessionId}`);
      this.characterTimers.delete(sessionId);
      onTimeout(sessionId);
    }, CHARACTER_TIMEOUT);

    this.characterTimers.set(sessionId, timer);
    console.log(`Started character timeout for session ${sessionId} (${CHARACTER_TIMEOUT / 1000}s)`);
  }

  /**
   * Cancel character timeout (player reconnected)
   */
  cancelCharacterTimeout(sessionId) {
    const timer = this.characterTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.characterTimers.delete(sessionId);
      console.log(`Cancelled character timeout for session ${sessionId}`);
    }
  }

  /**
   * Update player activity (reset idle timer)
   */
  updateActivity(sessionId, onIdle) {
    // Clear existing idle timer
    const existingTimer = this.idleTimers.get(sessionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Start new idle timer
    const timer = setTimeout(() => {
      console.log(`Player idle: session ${sessionId}`);
      this.idleTimers.delete(sessionId);
      onIdle(sessionId);
    }, IDLE_TIMEOUT);

    this.idleTimers.set(sessionId, timer);
  }

  /**
   * Clear all timers for a session
   */
  clearSession(sessionId) {
    // Clear character timeout
    this.cancelCharacterTimeout(sessionId);

    // Clear idle timer
    const idleTimer = this.idleTimers.get(sessionId);
    if (idleTimer) {
      clearTimeout(idleTimer);
      this.idleTimers.delete(sessionId);
    }

    console.log(`Cleared all timers for session ${sessionId}`);
  }

  /**
   * Get status of timers for a session
   */
  getSessionStatus(sessionId) {
    return {
      hasCharacterTimeout: this.characterTimers.has(sessionId),
      hasIdleTimer: this.idleTimers.has(sessionId)
    };
  }

  /**
   * Stop all timers
   */
  stopAll() {
    for (const timer of this.characterTimers.values()) {
      clearTimeout(timer);
    }
    for (const timer of this.idleTimers.values()) {
      clearTimeout(timer);
    }
    this.characterTimers.clear();
    this.idleTimers.clear();
  }
}

module.exports = new TimeoutManager();
