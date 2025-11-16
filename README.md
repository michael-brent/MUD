# The Jungeon

A browser-based multi-user dungeon (MUD) game with real-time player interaction via WebSockets.

## Features

- **Multi-user gameplay**: Support for 6-10 concurrent players
- **Real-time interaction**: WebSocket-based communication using Socket.io
- **10 unique characters**: Choose from pre-defined character archetypes
- **World exploration**: Navigate through interconnected rooms
- **Gold coin economy**: Collect and drop coins with configurable spawn strategies
- **Object interaction**: Touch, open, and press objects to trigger events
- **Social features**: Chat, emotes, and action verbs
- **State persistence**: Game state saved automatically every 30 seconds
- **Responsive UI**: 3-panel layout adapting to different screen sizes

## Technology Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Data Storage**: JSON files

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the Game

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on port 3000 by default. Access the game at:
- Local: http://localhost:3000
- Network: http://0.0.0.0:3000

## Deployment Modes

### Local Network
Run on your computer and allow others on the same Wi-Fi to connect:
```bash
npm start
```
Share your local IP address with other players (e.g., http://192.168.1.100:3000)

### Internet Deployment
Deploy to a hosting service (e.g., Heroku, DigitalOcean, AWS) and share the public URL.

## Project Structure

```
the-jungeon/
├── server/
│   ├── index.js                 # Main server entry point
│   ├── game-engine.js           # Core game logic & state management
│   ├── state-manager.js         # State persistence & loading
│   ├── command-parser.js        # Parse and validate player commands
│   ├── websocket-handler.js     # WebSocket connection management
│   └── utils/
│       ├── room-utils.js        # Room description generation
│       ├── coin-spawner.js      # Coin spawn logic per room config
│       └── timeout-manager.js   # Character release timeout handling
├── data/
│   ├── world.json               # World map definition
│   ├── characters.json          # 10 default character definitions
│   ├── verbs.json               # Extensible action verbs list
│   └── game-state.json          # Current game state (auto-generated)
├── client/
│   ├── index.html               # Main game UI
│   ├── styles.css               # 3-panel layout styling
│   └── game-client.js           # WebSocket client & UI updates
├── package.json
└── README.md
```

## Game Commands

- **Movement**: `go [north/south/east/west/up/down]`
- **Interaction**: `[touch/open/press] [object]`
- **Inventory**: `collect`, `drop`, `inventory`
- **Communication**: `say [message]`, `emote [action]`
- **Actions**: `/[verb]` (e.g., `/dance`, `/bow`, `/wave`)
- **System**: `help`, `look`

## Characters

1. Grimwald the Brave (warrior)
2. Elara Moonwhisper (elf)
3. Thorin Ironfoot (dwarf)
4. Zara the Swift (rogue)
5. Magnus the Wise (wizard)
6. Lyra Brightblade (paladin)
7. Shadow (mysterious figure)
8. Finn the Lucky (halfling)
9. Raven Nightshade (sorceress)
10. Boulder (half-orc)

## Development Status

🚧 **Work in Progress** 🚧

This project is currently under active development. Core features are being implemented.

## License

ISC

## Contributing

This is a private project for learning purposes. Contributions are not currently accepted.
