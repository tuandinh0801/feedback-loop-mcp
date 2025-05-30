# Development Guide

This document contains development and build information for the Feedback Loop MCP project.

## Build System

The build system uses a template-based approach for creating distributable packages.

### Directory Structure

```
feedback-loop-mcp/
├── src/                          # Source templates for NPM package
│   ├── bin/
│   │   └── feedback-loop-mcp.js  # Binary wrapper source
│   └── package.json              # NPM package.json template
├── scripts/
│   └── build-npm.js              # NPM package build script
├── build.sh                      # Main build script
└── npm-package/                  # Generated NPM package (output)
```

### Build Commands

#### Main Build Script (`build.sh`)

```bash
# Show help
./build.sh help

# Install dependencies
./build.sh install

# Clean build artifacts
./build.sh clean

# Package Electron app
./build.sh package

# Create distributables
./build.sh make

# Start development server
./build.sh start

# Create NPM package
./build.sh npm
```

#### NPM Package Build

The NPM package creation is handled by a dedicated Node.js script:

```bash
# Direct execution
node scripts/build-npm.js

# Via build script
./build.sh npm
```

### Template System

**Binary Wrapper (`src/bin/feedback-loop-mcp.js`)**

Contains the source code for the NPM package binary. It uses `child_process.spawn` to execute the MCP server, which fixes the global installation issue where `require()` prevented the main execution block from running.

**Package.json Template (`src/package.json`)**

Contains the NPM package metadata and dependencies. This file is copied directly to the output package.

### Build Process

The `scripts/build-npm.js` script performs the following steps:

1. **Clean Output**: Removes existing `npm-package` directory
2. **Create Directories**: Sets up the package structure
3. **Copy Source Files**: Copies main application files
4. **Copy Binary**: Copies and processes the binary wrapper
5. **Copy Package.json**: Copies the package metadata
6. **Make Executable**: Sets proper permissions on the binary

### Testing Built Package

After building the NPM package:

```bash
# Install globally
npm install -g ./npm-package

# Test the installation
npx feedback-loop-mcp

# Test with client
node test-mcp-client.js
```

### Publishing

To publish the package to NPM:

```bash
# Build the package
./build.sh npm

# Navigate to package directory
cd npm-package

# Publish (requires NPM account and login)
npm publish
```

### Build Dependencies

The build system requires:

- Node.js (>=16.0.0)
- npm
- fs-extra (dev dependency)

Install build dependencies:

```bash
npm install
```

## Development Mode

Run the application in development mode:
```bash
npm run dev
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
```

## Troubleshooting

### Common Issues

1. **Application won't start**: Ensure Node.js and npm are properly installed
2. **Settings not saving**: Verify write permissions in the application data directory

### Debug Mode

Run with debug output:
```bash
DEBUG=* npm start
```