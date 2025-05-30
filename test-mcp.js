#!/usr/bin/env node

/**
 * Simple test script for the Electron MCP server
 * This script demonstrates how to use the MCP server programmatically
 */

import { launchFeedbackUI } from './server/mcp-server.js';
import path from 'path';

async function testMCPServer() {
  console.log('Testing Electron MCP Server...');
  
  try {
    const projectDirectory = process.cwd();
    const summary = 'Test feedback collection';
    
    console.log(`Project Directory: ${projectDirectory}`);
    console.log(`Summary: ${summary}`);
    console.log('\nLaunching Electron feedback UI...');
    console.log('(Please interact with the UI and submit feedback)');
    
    const result = await launchFeedbackUI(projectDirectory, summary);
    
    console.log('\n=== Feedback Result ===');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.cancelled) {
      console.log('\nFeedback collection was cancelled.');
    } else {
      console.log('\nFeedback collection completed successfully!');
    }
    
  } catch (error) {
    console.error('Error testing MCP server:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMCPServer();
}

export { testMCPServer };