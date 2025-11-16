/**
 * The Jungeon - Game Client
 * Handles WebSocket communication and UI updates
 */

class GameClient {
  constructor() {
    this.socket = null;
    this.username = null;
    this.character = null;
    this.commandHistory = [];
    this.historyIndex = -1;

    this.initializeUI();
  }

  /**
   * Initialize UI elements and event listeners
   */
  initializeUI() {
    // Get DOM elements
    this.loginModal = document.getElementById('login-modal');
    this.characterModal = document.getElementById('character-modal');
    this.usernameInput = document.getElementById('username-input');
    this.loginButton = document.getElementById('login-button');
    this.commandInput = document.getElementById('command-input');
    this.gameOutput = document.getElementById('game-output');
    this.goldCount = document.getElementById('gold-count');
    this.itemsList = document.getElementById('items-list');
    this.characterList = document.getElementById('character-list');

    // Login button click
    this.loginButton.addEventListener('click', () => this.handleLogin());

    // Username input enter key
    this.usernameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleLogin();
      }
    });

    // Command input enter key
    this.commandInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendCommand();
      }
    });

    // Command history navigation
    this.commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigateHistory('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigateHistory('down');
      }
    });

    // Focus username input on load
    this.usernameInput.focus();
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    this.socket = io();

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.addMessage('Connection lost. Attempting to reconnect...', 'error');
    });

    // Game events
    this.socket.on('available_characters', (data) => {
      this.showCharacterSelection(data.characters);
    });

    this.socket.on('room_description', (data) => {
      this.displayRoomDescription(data);
    });

    this.socket.on('room_event', (data) => {
      this.addMessage(data.message, 'room');
    });

    this.socket.on('private_message', (data) => {
      this.addMessage(data.message, 'system');
    });

    this.socket.on('inventory_update', (data) => {
      this.updateInventory(data);
    });

    this.socket.on('error', (data) => {
      this.addMessage(data.message, 'error');
    });

    this.socket.on('help', (data) => {
      this.displayHelp(data);
    });

    this.socket.on('pong', () => {
      // Heartbeat response
    });

    // Start heartbeat
    this.startHeartbeat();
  }

  /**
   * Handle login
   */
  handleLogin() {
    const username = this.usernameInput.value.trim();
    if (!username) {
      alert('Please enter a username');
      return;
    }

    this.username = username;
    this.connect();
    this.socket.emit('login', { username });
    this.loginModal.classList.add('hidden');
  }

  /**
   * Show character selection modal
   */
  showCharacterSelection(characters) {
    this.characterList.innerHTML = '';

    characters.forEach(char => {
      const charDiv = document.createElement('div');
      charDiv.className = 'character-item';
      charDiv.innerHTML = `
        <div class="character-name">${char.name}</div>
        <div class="character-description">${char.description}</div>
      `;
      charDiv.addEventListener('click', () => this.selectCharacter(char.id));
      this.characterList.appendChild(charDiv);
    });

    this.characterModal.classList.remove('hidden');
  }

  /**
   * Select character
   */
  selectCharacter(characterId) {
    this.socket.emit('select_character', { characterId });
    this.characterModal.classList.add('hidden');
    this.commandInput.focus();
  }

  /**
   * Send command to server
   */
  sendCommand() {
    const command = this.commandInput.value.trim();
    if (!command) return;

    // Add to history
    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;

    // Echo command to output
    this.addMessage(`> ${command}`, 'player');

    // Send to server
    this.socket.emit('command', { command });

    // Clear input
    this.commandInput.value = '';
  }

  /**
   * Navigate command history
   */
  navigateHistory(direction) {
    if (this.commandHistory.length === 0) return;

    if (direction === 'up') {
      if (this.historyIndex > 0) {
        this.historyIndex--;
      }
    } else if (direction === 'down') {
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
      } else {
        this.historyIndex = this.commandHistory.length;
        this.commandInput.value = '';
        return;
      }
    }

    this.commandInput.value = this.commandHistory[this.historyIndex] || '';
  }

  /**
   * Add message to game output
   */
  addMessage(message, type = 'system') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    this.gameOutput.appendChild(messageDiv);
    this.gameOutput.scrollTop = this.gameOutput.scrollHeight;
  }

  /**
   * Display room description
   */
  displayRoomDescription(data) {
    this.addMessage('', 'system'); // Blank line
    this.addMessage(data.name, 'room');
    this.addMessage(data.description, 'room');

    if (data.exits && data.exits.length > 0) {
      this.addMessage(`Exits: ${data.exits.join(', ')}`, 'system');
    }

    if (data.players && data.players.length > 0) {
      this.addMessage(`Players here: ${data.players.join(', ')}`, 'system');
    }

    if (data.coins > 0) {
      this.addMessage(`Gold coins: ${data.coins}`, 'system');
    }

    if (data.objects && data.objects.length > 0) {
      data.objects.forEach(obj => {
        this.addMessage(`You see: ${obj}`, 'system');
      });
    }
  }

  /**
   * Update inventory display
   */
  updateInventory(data) {
    this.goldCount.textContent = data.gold || 0;

    this.itemsList.innerHTML = '';
    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        this.itemsList.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = '(none)';
      li.style.color = '#006600';
      this.itemsList.appendChild(li);
    }
  }

  /**
   * Display help
   */
  displayHelp(data) {
    this.addMessage('', 'system');
    this.addMessage('=== Available Commands ===', 'system');
    data.commands.forEach(cmd => {
      this.addMessage(`  ${cmd}`, 'system');
    });
    if (data.verbs && data.verbs.length > 0) {
      this.addMessage('', 'system');
      this.addMessage('=== Action Verbs ===', 'system');
      this.addMessage(`  /${data.verbs.join(', /')}`, 'system');
    }
  }

  /**
   * Start heartbeat ping
   */
  startHeartbeat() {
    setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping');
      }
    }, 30000); // 30 seconds
  }
}

// Initialize game client when page loads
const gameClient = new GameClient();
