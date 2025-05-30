#!/usr/bin/env node
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the directory where this package is installed
const packageDir = path.dirname(path.dirname(__filename));
const mcpServerPath = path.join(packageDir, 'server', 'mcp-server.js');

// Execute the MCP server as a child process
const serverProcess = spawn('node', [mcpServerPath], {
  stdio: 'inherit'
});

// Handle process termination
process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
});

serverProcess.on('exit', (code) => {
  process.exit(code);
});