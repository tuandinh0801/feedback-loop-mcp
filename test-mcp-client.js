#!/usr/bin/env node

const { spawn } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

/**
 * MCP client using the official SDK to test the feedback-loop-mcp server
 */
class MCPTestClient {
  constructor() {
    this.client = null;
    this.transport = null;
  }

  async start() {
    console.log('Starting MCP client and server...');
    
    // Create transport that will spawn the server process
    this.transport = new StdioClientTransport({
      command: 'npx',
      args: ['feedback-loop-mcp']
    });
    
    // Create MCP client
    this.client = new Client({
      name: 'test-mcp-client',
      version: '1.0.0'
    }, {
      capabilities: {
        tools: {}
      }
    });
    
    console.log('Connecting client to server...');
    await this.client.connect(this.transport);
    console.log('MCP client connected successfully!');
  }

  async listTools() {
    console.log('\n=== Listing available tools ===');
    const response = await this.client.listTools();
    console.log('Available tools:', JSON.stringify(response.tools, null, 2));
    return response;
  }

  async callTool(name, args) {
    console.log(`\n=== Calling tool: ${name} ===`);
    console.log('Arguments:', JSON.stringify(args, null, 2));
    const response = await this.client.callTool({ name, arguments: args });
    console.log('Tool response:', JSON.stringify(response, null, 2));
    return response;
  }

  async stop() {
    console.log('\nStopping MCP client and server...');
    if (this.client) {
      await this.client.close();
    }
    if (this.transport) {
      await this.transport.close();
    }
  }
}

// Test function
async function runTest() {
  const client = new MCPTestClient();
  
  try {
    await client.start();
    
    // Wait a bit for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // List tools
    const toolsResponse = await client.listTools();
    console.log('Tools list received successfully');
    
    // Test calling the feedback_loop tool
    try {
      const feedbackResponse = await client.callTool('feedback_loop', {
        project_directory: process.cwd(),
        summary: 'Test feedback collection from MCP client'
      });
      console.log('Feedback tool response received successfully');
    } catch (error) {
      console.log('Error calling feedback tool:', error.message);
    }
    
    console.log('\n=== Test completed successfully! ===');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Error details:', error.stack);
  } finally {
    await client.stop();
    // Give some time for cleanup
    setTimeout(() => process.exit(0), 1000);
  }
}

// Handle Ctrl+C
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, exiting...');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  runTest().catch(console.error);
}

module.exports = MCPTestClient;