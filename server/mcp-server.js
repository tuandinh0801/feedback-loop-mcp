const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Debug logging
console.error('MCP Server starting...');
process.on('exit', (code) => {
  console.error(`MCP Server exiting with code: ${code}`);
});
process.on('SIGINT', () => {
  console.error('MCP Server received SIGINT');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.error('MCP Server received SIGTERM');
  process.exit(0);
});

/**
 * Launch the Electron feedback UI
 * @param {string} projectDirectory - The project directory path
 * @param {string} summary - The feedback prompt/summary
 * @returns {Promise<Object>} - The feedback result
 */
function launchFeedbackUI(projectDirectory, summary) {
  return new Promise((resolve, reject) => {
    const electronPath = path.join(__dirname, '..');
    
    console.log(`Launching Electron feedback UI for project: ${projectDirectory}`);
    console.log(`Prompt: ${summary}`);
    
    // Launch Electron app with arguments (no output file needed)
    const electronApp = spawn('npx', ['electron', '.', 
      '--project-directory', projectDirectory, 
      '--prompt', summary
    ], {
      cwd: electronPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let outputData = '';
    let errorData = '';

    // Collect stdout data
    electronApp.stdout.on('data', (data) => {
      outputData += data.toString();
    });

    // Collect stderr for debugging
    electronApp.stderr.on('data', (data) => {
      errorData += data.toString();
      console.error('Electron stderr:', data.toString());
    });

    // Handle process events
    electronApp.on('error', (error) => {
      console.error('Failed to start Electron app:', error);
      reject(new Error(`Failed to start Electron app: ${error.message}`));
    });

    electronApp.on('close', (code) => {
      console.log(`Electron app exited with code: ${code}`);
      
      // Parse output data
      if (outputData.trim()) {
        try {
          const result = JSON.parse(outputData.trim());
          resolve(result);
        } catch (error) {
          console.error('Failed to parse feedback result:', error);
          console.error('Raw output:', outputData);
          reject(new Error(`Failed to parse feedback result: ${error.message}`));
        }
      } else {
        // If no output data, assume user cancelled
        resolve({
          feedback: '',
          cancelled: true,
          timestamp: new Date().toISOString(),
          projectDirectory
        });
      }
    });
  });
}

// MCP Server implementation
const server = {
  name: 'feedback-loop',
  version: '1.0.0',
  
  tools: [
    {
      name: 'feedback_loop',
      description: 'Request feedback loop for a given project directory and summary using Electron UI',
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
    if (name === 'feedback_loop') {
      try {
        const result = await launchFeedbackUI(args.project_directory, args.summary);
        
        if (result.cancelled) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'cancelled',
                message: 'Feedback collection was cancelled by the user.',
              }, null, 2)
            }]
          };
        }
        
        const feedbackData = {
          status: 'success',
          feedback: result.feedback || '',
          projectDirectory: result.projectDirectory || args.project_directory
        };
        
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(feedbackData, null, 2)
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `Error launching feedback UI: ${error.message}`,
              timestamp: new Date().toISOString()
            }, null, 2)
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
  server
};

// If run directly, start the MCP server
if (require.main === module) {
  const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
  const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
  const { ListToolsRequestSchema, CallToolRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
  const { McpError, ErrorCode } = require('@modelcontextprotocol/sdk/types.js');
  
  async function main() {
     // Keep the process alive from the start
     process.stdin.resume();
     
     console.error('Creating MCP server instance...');
     const mcpServer = new Server(
       {
         name: 'feedback-loop-mcp',
         version: '1.0.0',
       },
       {
         capabilities: {
           tools: {},
         },
       }
     );

    console.error('Registering tools...');
    // Register the feedback_loop tool
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
      console.error('ListTools request received');
      return {
        tools: [
          {
            name: 'feedback_loop',
            description: 'Request feedback loop for a given project directory and summary using Electron UI',
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
            },
          },
        ],
      };
    });

    mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
      console.error(`CallTool request received: ${request.params.name}`);
      if (request.params.name === 'feedback_loop') {
        const { project_directory, summary } = request.params.arguments;
        try {
          const result = await launchFeedbackUI(project_directory, summary);
          
          if (result.cancelled) {
            return {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  status: 'cancelled',
                  message: 'Feedback collection was cancelled by the user.',
                  timestamp: new Date().toISOString()
                }, null, 2)
              }]
            };
          }
          
          const feedbackData = {
            status: 'success',
            feedback: result.feedback || '',
            projectDirectory: result.projectDirectory || project_directory
          };
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(feedbackData, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                message: `Error launching feedback UI: ${error.message}`
              }, null, 2)
            }]
          };
        }
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
      }
    });

    console.error('Creating transport...');
    const transport = new StdioServerTransport();
    console.error('Connecting server to transport...');
    
    try {
       await mcpServer.connect(transport);
       console.error('MCP server connected and ready!');
       
       // Keep the server running indefinitely
       await new Promise(() => {});
     } catch (error) {
       console.error('Failed to connect to transport:', error);
       throw error;
     }
   }
   
   main().catch((error) => {
     console.error('Failed to start MCP server:', error);
     process.exit(1);
   });
}
  