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
└── npm-package/                  # Generated NPM package (output)
```

### Build Commands

#### NPM Package Build

To prepare the package for NPM publishing, use the following command from the root directory:

```bash
npm run build:npm
```

This script (`scripts/build-npm.js`) will:
- Clean the `npm-package/` directory.
- Copy necessary source files, assets, and the `src/package.json` into `npm-package/`.
- Make the binary executable.

The output will be in the `npm-package/` directory, ready for publishing.

#### Development Server

To run the application in development mode (using Electron Forge's start mechanism):

```bash
npm run start
# or
npm run dev
```

#### Installing Dependencies

To install project dependencies:

```bash
npm install
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
npm run build:npm

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

### Build Outputs

- **NPM Package**: Use `npm run build:npm` to create a ready-to-publish NPM package structure in `npm-package/`

### Distribution Options

#### NPM Global Package
Create and publish an NPM package for global installation:

```bash
# Create NPM package structure
npm run build:npm

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