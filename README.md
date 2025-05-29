# Feedback Loop MCP

Simple MCP Server to enable a human-in-the-loop workflow in AI-assisted development tools like Cursor. This server allows you to run commands, view their output, and provide textual feedback directly to the AI. It is also compatible with Cline and Windsurf.

## Features

- **Cross-platform**: Works on macOS, Windows, and Linux
- **Interactive UI**: Modern, responsive interface for collecting feedback
- **Settings persistence**: Save and restore UI preferences per project
- **MCP integration**: Seamlessly integrates with MCP-compatible AI assistants
- **macOS overlay support**: Native overlay window support on macOS

## Installation

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Setup

1. Clone or navigate to the project directory:
   ```bash
   cd feedback-loop-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Development Mode

Run the application in development mode:
```bash
npm run dev
```

### Production Mode

Start the application:
```bash
npm start
```

### Command Line Arguments

The application accepts the following command-line arguments:

- `--project-directory <path>`: Set the project directory
- `--prompt <text>`: Set the initial prompt/summary text
- `--output-file <path>`: Specify the output file for feedback results

Example:
```bash
npm start -- --project-directory "/path/to/project" --prompt "Please review this code" --output-file "/tmp/feedback.json"
```

### MCP Server

To use as an MCP server:

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Run the MCP server:
   ```bash
   node mcp-server.js
   ```

## Building

### Using the Build Script (Recommended)

A comprehensive build script (`build.sh`) is provided for easy building and packaging:

```bash
# Make the script executable (first time only)
chmod +x build.sh

# Full build process (clean, install dependencies, build all platforms)
./build.sh full

# Or simply run without arguments for full build
./build.sh
```

#### Build Script Options

```bash
# Install dependencies only
./build.sh install

# Clean previous builds
./build.sh clean

# Build for specific platforms
./build.sh mac        # macOS only
./build.sh windows    # Windows only
./build.sh linux      # Linux only
./build.sh all        # All platforms

# Create NPM package structure
./build.sh npm

# Show help
./build.sh help
```

### Manual Building (Alternative)

If you prefer to build manually:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-mac     # macOS
npm run build-win     # Windows
npm run build-linux   # Linux
```

### Build Outputs

- **Electron Apps**: Built applications will be available in the `dist/` directory
- **NPM Package**: When using `./build.sh npm`, a ready-to-publish NPM package structure is created in `npm-package/`

### Distribution Options

#### 1. Standalone Electron App
After building, distribute the platform-specific executables from the `dist/` directory.

#### 2. NPM Global Package
Create and publish an NPM package for global installation:

```bash
# Create NPM package structure
./build.sh npm

# Navigate to package directory
cd npm-package

# Publish to NPM (requires npm account)
npm publish

# Or install locally for testing
npm install -g .
```

#### 3. MCP Client Configuration
After installation, configure your MCP client (e.g., Claude Desktop) by adding to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "feedback-loop": {
      "command": "feedback-loop-mcp",
      "args": []
    }
  }
}
```

Built applications will be available in the `dist` directory.

## Project Structure

```
feedback-loop-mcp/
├── main.js              # Main Electron process
├── preload.js           # Preload script for secure IPC
├── package.json         # Project configuration
├── README.md           # This file
├── assets/             # Static assets
│   └── feedback.png    # Application icon
├── renderer/           # Renderer process files
│   ├── index.html      # Main UI
│   ├── styles.css      # Styling
│   └── renderer.js     # UI logic
└── server/             # MCP server
    └── mcp-server.js   # Node.js MCP server
```

## Configuration

The application automatically saves settings using Electron's built-in storage:

- **General settings**: Window size, position, and UI preferences
- **Project-specific settings**: Command history and project-specific configurations

Settings are stored in the standard application data directory for each platform.

## Features Overview

### Feedback Collection

- Rich text feedback input
- Automatic saving of feedback
- JSON output format for easy integration
- Timestamp and project information included

### UI Features

- Dark theme matching the original PyQt version
- Keyboard shortcuts
- Responsive design

## Migration from PyQt

This Electron version maintains full feature parity with the original PyQt implementation while offering:

- Better cross-platform consistency
- Easier maintenance and updates
- Modern web technologies
- Enhanced UI capabilities
- Improved packaging and distribution

## Troubleshooting

### Common Issues

1. **Application won't start**: Ensure Node.js and npm are properly installed
2. **Settings not saving**: Verify write permissions in the application data directory

### Debug Mode

Run with debug output:
```bash
DEBUG=* npm start
```

## License

ISC License - see package.json for details.