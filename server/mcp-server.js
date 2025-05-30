import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import electronPath from 'electron';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Launch the Electron feedback UI
 * @param {string} projectDirectory - The project directory path
 * @param {string} summary - The feedback prompt/summary
 * @returns {Promise<Object>} - The feedback result
 */
function launchFeedbackUI(projectDirectory, summary) {
  return new Promise((resolve, reject) => {
    const entryPoint = path.join(__dirname, '..', 'main.mjs');

    console.error('⏵ spawning Electron →', electronPath, projectDirectory, summary);

    const env = { ...process.env };
    delete env.ELECTRON_RUN_AS_NODE;

    // spawn Electron, not node
    const electronApp = spawn(
      electronPath,
      [
        entryPoint,
        '--project-directory', projectDirectory,
        '--prompt', summary
      ],
      {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: undefined
        }
      }
    );

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
      reject(new Error(`Failed to start Electron app: ${error.message}`));
    });

    electronApp.on('close', (code) => {
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
        // log node version in json format
        console.error(JSON.stringify({
          node_version: process.version,
          node_platform: process.platform,
          node_arch: process.arch,
        }))
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
export {
  launchFeedbackUI,
  server
};

// If run directly, start the MCP server
if (import.meta.url === `file://${process.argv[1]}`) {
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const { ListToolsRequestSchema, CallToolRequestSchema, McpError, ErrorCode } = await import('@modelcontextprotocol/sdk/types.js');
  
  async function main() {
     // Keep the process alive from the start
     process.stdin.resume();
     
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

    // Register the feedback_loop tool
    mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
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
                  message: 'Feedback collection was cancelled by the user.'
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

    const transport = new StdioServerTransport();
    
    try {
       await mcpServer.connect(transport);
       
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
  