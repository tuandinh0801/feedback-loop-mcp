const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Launch the Electron feedback UI
 * @param {string} projectDirectory - The project directory path
 * @param {string} summary - The feedback prompt/summary
 * @returns {Promise<Object>} - The feedback result
 */
function launchFeedbackUI(projectDirectory, summary) {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(os.tmpdir(), `feedback-${Date.now()}.json`);
    const electronPath = path.join(__dirname, '..');
    
    console.log(`Launching Electron feedback UI for project: ${projectDirectory}`);
    console.log(`Prompt: ${summary}`);
    console.log(`Output file: ${tempFile}`);
    
    // Launch Electron app with arguments
    const electronApp = spawn('npx', ['electron', '.', 
      '--project-directory', projectDirectory, 
      '--prompt', summary, 
      '--output-file', tempFile
    ], {
      cwd: electronPath,
      stdio: 'ignore',
      detached: true
    });

    // Handle process events
    electronApp.on('error', (error) => {
      console.error('Failed to start Electron app:', error);
      reject(new Error(`Failed to start Electron app: ${error.message}`));
    });

    electronApp.on('close', (code) => {
      console.log(`Electron app exited with code: ${code}`);
      
      // Check if output file exists and read result
      if (fs.existsSync(tempFile)) {
        try {
          const result = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
          fs.unlinkSync(tempFile); // Clean up temp file
          resolve(result);
        } catch (error) {
          console.error('Failed to parse feedback result:', error);
          reject(new Error(`Failed to parse feedback result: ${error.message}`));
        }
      } else {
        // If no output file, assume user cancelled
        resolve({
          feedback: '',
          logs: '',
          cancelled: true,
          timestamp: new Date().toISOString(),
          projectDirectory
        });
      }
    });

    // Detach the process so it can run independently
    electronApp.unref();
  });
}

/**
 * Get the first line of text (utility function)
 * @param {string} text - Input text
 * @returns {string} - First line
 */
function firstLine(text) {
  if (!text) return '';
  return text.split('\n')[0].trim();
}

// MCP Server implementation
const server = {
  name: 'interactive-feedback-electron',
  version: '1.0.0',
  
  tools: [
    {
      name: 'interactive_feedback',
      description: 'Request interactive feedback for a given project directory and summary using Electron UI',
      inputSchema: {
        type: 'object',
        properties: {
          project_directory: {
            type: 'string',
            description: 'Full path to the project directory'
          },
          summary: {
            type: 'string',
            description: 'Short, one-line summary of the changes'
          }
        },
        required: ['project_directory', 'summary']
      }
    }
  ],
  
  async callTool(name, args) {
    if (name === 'interactive_feedback') {
      try {
        const result = await launchFeedbackUI(args.project_directory, args.summary);
        
        if (result.cancelled) {
          return {
            content: [{
              type: 'text',
              text: 'Feedback collection was cancelled by the user.'
            }]
          };
        }
        
        const feedbackSummary = firstLine(result.feedback);
        const hasLogs = result.logs && result.logs.trim().length > 0;
        
        let responseText = `Feedback received: ${feedbackSummary}`;
        if (hasLogs) {
          responseText += `\n\nCommand logs:\n${result.logs}`;
        }
        
        return {
          content: [{
            type: 'text',
            text: responseText
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error launching feedback UI: ${error.message}`
          }]
        };
      }
    }
    
    throw new Error(`Unknown tool: ${name}`);
  }
};

// Export for use as a module
module.exports = {
  launchFeedbackUI,
  firstLine,
  server
};

// If run directly, start the MCP server
if (require.main === module) {
  const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
  const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
  
  const mcpServer = new Server(
    {
      name: server.name,
      version: server.version
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  
  // Register tools
  server.tools.forEach(tool => {
    mcpServer.setRequestHandler({ method: 'tools/call', params: { name: tool.name } }, async (request) => {
      return await server.callTool(request.params.name, request.params.arguments);
    });
  });
  
  // Start server
  const transport = new StdioServerTransport();
  mcpServer.connect(transport);
  
  console.error('Electron Interactive Feedback MCP Server started');
}